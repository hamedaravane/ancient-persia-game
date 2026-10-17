import { afterEach, expect, test, vi } from 'vitest';
import { AppPlatform } from '../src/pwa/app';
import { connectPlatform } from '../src/pwa/browser';
import { appContent, offlineLabel, updateContent } from '../src/pwa/markup';
import { GameSession } from '../src/game/ui/session';
import { applyUpdate, UpdateNotice } from '../src/pwa/updateFlow';
import { MatchStore } from '../src/game/persistence/matchStore';

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
});

test('confirmed updates cannot be activated twice', async () => {
    const app = new AppPlatform();
    app.updateReady = true;
    app.activateUpdate = vi.fn(async () => {});
    expect(await app.update()).toBe(true);
    expect(await app.update()).toBe(false);
    expect(app.activateUpdate).toHaveBeenCalledTimes(1);
});

test('failed updates can be retried and a dismissed installation prompt is not reused', async () => {
    const app = new AppPlatform();
    app.updateReady = true;
    app.activateUpdate = vi.fn(async () => {
        throw new Error('activation failed');
    });
    expect(await app.update()).toBe(false);
    expect(app.updating).toBe(false);
    expect(app.error).toBeTruthy();
    const prompt = vi.fn(async () => 'dismissed' as const);
    app.installPrompt = prompt;
    await app.install();
    await app.install();
    expect(prompt).toHaveBeenCalledTimes(1);
    expect(app.installed).toBe(false);
});

test('iPhone instructions and offline/update availability reflect capabilities and match state', () => {
    const app = new AppPlatform();
    const session = new GameSession();
    app.ios = true;
    app.updateReady = true;
    expect(appContent(app, session).body).toContain('Add to Home Screen');
    expect(offlineLabel(app)).not.toContain('آماده برای');
    session.start(3, false);
    expect(appContent(app, session).body).not.toMatch(/data-action="app-update"[^>]*disabled/);
    expect(updateContent(app, session).body).toContain('انتخاب‌های تأییدنشده');
    app.offline = 'ready';
    expect(offlineLabel(app)).toBe('آماده برای بازی آفلاین');
});

function browser() {
    vi.stubEnv('BASE_URL', './');
    const worker = Object.assign(new EventTarget(), { state: 'installing', postMessage: vi.fn() });
    const registration = Object.assign(new EventTarget(), {
        installing: worker,
        active: null as unknown,
        waiting: null as unknown,
        update: vi.fn(async () => {}),
    });
    const serviceWorker = Object.assign(new EventTarget(), {
        controller: null as unknown,
        register: vi.fn(async () => registration),
    });
    const location = { reload: vi.fn() };
    const windowMock = Object.assign(new EventTarget(), {
        isSecureContext: true,
        matchMedia: () => Object.assign(new EventTarget(), { matches: false }),
        location,
        setTimeout: globalThis.setTimeout,
        setInterval: globalThis.setInterval,
        clearInterval: globalThis.clearInterval,
    });
    vi.stubGlobal('window', windowMock);
    vi.stubGlobal(
        'document',
        Object.assign(new EventTarget(), {
            baseURI: 'https://example.com/ancient-persia-game/',
            visibilityState: 'visible',
        }),
    );
    vi.stubGlobal('navigator', {
        serviceWorker,
        platform: 'Linux',
        userAgent: 'Chrome',
        maxTouchPoints: 1,
        onLine: true,
    });
    return { worker, registration, serviceWorker, location };
}

test('offline readiness waits for activation and controller changes never reload another active tab', async () => {
    const fixture = browser();
    const app = new AppPlatform();
    const dispose = connectPlatform(app, true);
    await vi.waitFor(() => expect(fixture.serviceWorker.register).toHaveBeenCalled());
    const [url, options] = fixture.serviceWorker.register.mock.calls[0] as unknown as [
        URL,
        { scope: string },
    ];
    expect(url.href).toBe('https://example.com/ancient-persia-game/sw.js');
    expect(options.scope).toBe('/ancient-persia-game/');
    expect(app.offline).toBe('preparing');
    fixture.worker.state = 'activated';
    fixture.registration.active = fixture.worker;
    fixture.worker.dispatchEvent(new Event('statechange'));
    expect(app.offline).toBe('ready');
    fixture.serviceWorker.controller = fixture.worker;
    fixture.serviceWorker.dispatchEvent(new Event('controllerchange'));
    expect(fixture.location.reload).not.toHaveBeenCalled();
    expect(app.updateReady).toBe(false);
    const update = Object.assign(new EventTarget(), { state: 'installed', postMessage: vi.fn() });
    fixture.registration.waiting = update;
    fixture.serviceWorker.dispatchEvent(new Event('controllerchange'));
    expect(app.updateReady).toBe(true);
    const activating = app.update();
    expect(update.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    fixture.registration.waiting = null;
    fixture.serviceWorker.controller = update;
    fixture.serviceWorker.dispatchEvent(new Event('controllerchange'));
    await activating;
    expect(fixture.location.reload).toHaveBeenCalledTimes(1);
    dispose();
});

test('an interrupted first worker install exposes a retry instead of claiming offline support', async () => {
    const fixture = browser();
    const app = new AppPlatform();
    const dispose = connectPlatform(app, true);
    await vi.waitFor(() => expect(fixture.serviceWorker.register).toHaveBeenCalled());
    fixture.worker.state = 'redundant';
    fixture.worker.dispatchEvent(new Event('statechange'));
    expect(app.offline).toBe('error');
    app.retry();
    expect(app.offline).toBe('preparing');
    await vi.waitFor(() => expect(fixture.registration.update).toHaveBeenCalled());
    dispose();
});

test('installation copy distinguishes Android Chrome, other Android browsers, iOS and desktop', () => {
    const app = new AppPlatform();
    const session = new GameSession();
    app.android = app.chrome = true;
    const chrome = appContent(app, session).body;
    expect(chrome).toContain('Add to Home screen');
    expect(chrome).toContain('Install and create shortcut');
    expect(chrome).toContain('سه‌نقطه');
    expect(chrome).not.toContain('Safari');
    app.chrome = false;
    expect(appContent(app, session).body).toContain('همین لینک رو توی Chrome باز کن');
    app.ios = true;
    expect(appContent(app, session).body).toContain('Open as Web App');
    expect(appContent(app, session).body).not.toContain('سه‌نقطه');
    app.ios = app.android = false;
    expect(appContent(app, session).body).toContain('کنار نوار آدرس');
    app.installed = true;
    app.installPrompt = async () => 'accepted';
    const installed = appContent(app, session).body;
    expect(installed).not.toContain('data-action="app-install"');
    expect(installed).not.toContain('Add to Home');
});

test.each([
    [
        'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36',
        true,
        true,
    ],
    ['Mozilla/5.0 (Linux; Android 14) Chrome/130.0 SamsungBrowser/25.0', true, false],
    [
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) CriOS/130.0 Mobile Safari/604.1',
        false,
        false,
    ],
])('browser capabilities select the install path for %s', (userAgent, android, chrome) => {
    browser();
    Object.defineProperty(navigator, 'userAgent', { value: userAgent, configurable: true });
    const app = new AppPlatform();
    const dispose = connectPlatform(app, false);
    expect(app.android).toBe(android);
    expect(app.chrome).toBe(chrome);
    expect(app.ios).toBe(userAgent.includes('iPhone'));
    dispose();
});

test('update notice waits for Anahita, pauses bots, and stays dismissed until another update', () => {
    const app = new AppPlatform();
    const session = new GameSession();
    session.start(4, true);
    const notice = new UpdateNotice(app, session);
    app.updateReady = true;
    app.changed();
    expect(session.sheet?.kind).toBe('tutorial');
    session.setTutorialEnabled(false);
    expect(session.sheet?.kind).toBe('update');
    expect(session.botReady).toBe(false);
    session.closeSheet();
    app.changed();
    expect(session.sheet).toBeNull();
    app.updateReady = false;
    app.changed();
    app.updateReady = true;
    app.changed();
    expect(session.sheet?.kind).toBe('update');
    notice.destroy();
    session.closeSheet();
    app.changed();
    expect(session.sheet).toBeNull();
});

test('waiting updates prompt on installed menu startup without changing the two-button menu', () => {
    const app = new AppPlatform();
    app.installed = app.updateReady = true;
    const session = new GameSession();
    const notice = new UpdateNotice(app, session);
    expect(session.state).toBeNull();
    expect(session.sheet?.kind).toBe('update');
    expect(updateContent(app, session).body).toContain('data-action="app-update"');
    notice.destroy();
});

test('accepting an update saves confirmed setup and narrator progress before activation', async () => {
    let raw: string | null = null;
    const storage = {
        getItem: () => raw,
        setItem: (_key: string, value: string) => {
            raw = value;
        },
    };
    const session = new GameSession(new MatchStore(storage));
    session.start(4, true);
    const expected = structuredClone(session.state);
    const app = new AppPlatform();
    app.updateReady = true;
    app.activateUpdate = vi.fn(async () => {
        const restored = new GameSession(new MatchStore(storage));
        restored.resumeSaved();
        expect(restored.state).toEqual(expected);
        expect(restored.tutorial.current).toBe('welcome');
    });
    expect(await applyUpdate(app, session)).toBe(true);
    expect(app.activateUpdate).toHaveBeenCalledTimes(1);
});

test('a failed save keeps an unfinished match open; menu updates remain possible', async () => {
    const session = new GameSession(new MatchStore(null));
    session.start(4, false);
    const app = new AppPlatform();
    app.updateReady = true;
    app.activateUpdate = vi.fn(async () => {});
    expect(await applyUpdate(app, session)).toBe(false);
    expect(app.activateUpdate).not.toHaveBeenCalled();
    expect(app.error).toContain('بازی ذخیره نشد');
    session.returnToMenu();
    expect(await applyUpdate(app, session)).toBe(true);
});

test('update checks run periodically only online/visible and stop at teardown', async () => {
    vi.useFakeTimers();
    const fixture = browser();
    const app = new AppPlatform();
    const dispose = connectPlatform(app, true);
    await vi.advanceTimersByTimeAsync(0);
    expect(fixture.registration.update).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    expect(fixture.registration.update).toHaveBeenCalledTimes(2);
    Object.assign(document, { visibilityState: 'hidden' });
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    expect(fixture.registration.update).toHaveBeenCalledTimes(2);
    Object.assign(document, { visibilityState: 'visible' });
    Object.assign(navigator, { onLine: false });
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    expect(fixture.registration.update).toHaveBeenCalledTimes(2);
    Object.assign(navigator, { onLine: true });
    window.dispatchEvent(new Event('online'));
    await vi.advanceTimersByTimeAsync(0);
    expect(fixture.registration.update).toHaveBeenCalledTimes(3);
    dispose();
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(fixture.registration.update).toHaveBeenCalledTimes(3);
});

test('a downloaded waiting worker notifies through its lifecycle without controllerchange', async () => {
    const fixture = browser();
    fixture.serviceWorker.controller = fixture.worker;
    fixture.registration.active = fixture.worker;
    const app = new AppPlatform();
    const dispose = connectPlatform(app, true);
    await vi.waitFor(() => expect(fixture.registration.update).toHaveBeenCalled());
    fixture.registration.dispatchEvent(new Event('updatefound'));
    fixture.registration.waiting = fixture.worker;
    fixture.worker.state = 'installed';
    fixture.worker.dispatchEvent(new Event('statechange'));
    expect(app.updateReady).toBe(true);
    expect(fixture.location.reload).not.toHaveBeenCalled();
    dispose();
});

test('another tab activating a release prompts this older page and reloads only on consent', async () => {
    const fixture = browser();
    fixture.serviceWorker.controller = fixture.worker;
    const app = new AppPlatform();
    const dispose = connectPlatform(app, true);
    await vi.waitFor(() => expect(fixture.registration.update).toHaveBeenCalled());
    fixture.serviceWorker.controller = { state: 'activated' };
    fixture.serviceWorker.dispatchEvent(new Event('controllerchange'));
    expect(app.updateReady).toBe(true);
    expect(fixture.location.reload).not.toHaveBeenCalled();
    expect(await app.update()).toBe(true);
    expect(fixture.location.reload).toHaveBeenCalledTimes(1);
    dispose();
});

test('activation timeout allows retry and an unrelated controller cannot cause an early reload', async () => {
    vi.useFakeTimers();
    const fixture = browser();
    fixture.serviceWorker.controller = fixture.worker;
    const app = new AppPlatform();
    const dispose = connectPlatform(app, true);
    await vi.advanceTimersByTimeAsync(0);
    fixture.registration.waiting = fixture.worker;
    fixture.worker.dispatchEvent(new Event('statechange'));
    const pending = app.update();
    fixture.serviceWorker.controller = { state: 'activated' };
    fixture.serviceWorker.dispatchEvent(new Event('controllerchange'));
    expect(fixture.location.reload).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(15_000);
    expect(await pending).toBe(false);
    expect(app.updating).toBe(false);
    expect(app.error).toBeTruthy();
    dispose();
    expect(vi.getTimerCount()).toBe(0);
});
