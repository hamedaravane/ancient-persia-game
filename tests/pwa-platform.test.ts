import { afterEach, expect, test, vi } from 'vitest';
import { AppPlatform } from '../src/pwa/app';
import { connectPlatform } from '../src/pwa/browser';
import { appContent, offlineLabel } from '../src/pwa/markup';
import { GameSession } from '../src/game/ui/session';

afterEach(() => {
    vi.unstubAllGlobals();
});

test('updates stay deferred during a match and cannot be activated twice', async () => {
    const app = new AppPlatform();
    app.updateReady = true;
    app.activateUpdate = vi.fn(async () => {});
    expect(await app.update(true)).toBe(false);
    expect(app.activateUpdate).not.toHaveBeenCalled();
    expect(await app.update(false)).toBe(true);
    expect(await app.update(false)).toBe(false);
    expect(app.activateUpdate).toHaveBeenCalledTimes(1);
});

test('failed updates can be retried and a dismissed installation prompt is not reused', async () => {
    const app = new AppPlatform();
    app.updateReady = true;
    app.activateUpdate = vi.fn(async () => {
        throw new Error('activation failed');
    });
    expect(await app.update(false)).toBe(false);
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
    session.start(3);
    expect(appContent(app, session).body).toMatch(/data-action="app-update"[^>]*disabled/);
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
    const update = Object.assign(new EventTarget(), { state: 'installed', postMessage: vi.fn() });
    fixture.registration.waiting = update;
    fixture.serviceWorker.dispatchEvent(new Event('controllerchange'));
    expect(app.updateReady).toBe(true);
    const activating = app.update(false);
    expect(update.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    fixture.registration.waiting = null;
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
