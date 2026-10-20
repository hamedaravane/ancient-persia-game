import { afterEach, expect, test, vi } from 'vitest';
import { GameAudio } from '../src/game/ui/GameAudio';
import { GameFeedback } from '../src/game/ui/GameFeedback';
import { ExperiencePreferences } from '../src/game/ui/experiencePreferences';
import { GameSession } from '../src/game/ui/session';
import type { Motion } from '../src/game/ui/motion';
import type { GameScene } from '../src/game/scenes/GameScene';
import type { InterfaceScene } from '../src/game/ui/InterfaceScene';
import { executeCommand } from '../src/game/core/commands';
import { getBuildOption } from '../src/game/core/queries';
import type { MatchTransition } from '../src/game/ui/transitions';
import { ready } from './helpers/development';

class Target {
    listeners = new Map<string, Set<EventListener>>();
    addEventListener(name: string, listener: EventListener) {
        if (!this.listeners.has(name)) this.listeners.set(name, new Set());
        this.listeners.get(name)!.add(listener);
    }
    removeEventListener(name: string, listener: EventListener) {
        this.listeners.get(name)?.delete(listener);
    }
    emit(name: string, event: object = {}) {
        this.listeners.get(name)?.forEach((listener) => listener(event as Event));
    }
    querySelector() {
        return null;
    }
}
class KeyEvent {
    constructor(
        public key: string,
        public isTrusted = true,
    ) {}
}
class Parameter {
    value = 0;
    setValueAtTime = vi.fn();
    linearRampToValueAtTime = vi.fn();
    exponentialRampToValueAtTime = vi.fn();
}
class Node {
    frequency = new Parameter();
    gain = new Parameter();
    onended: (() => void) | null = null;
    start = vi.fn();
    stop = vi.fn();
    disconnect = vi.fn();
    connect(node: Node) {
        return node;
    }
}
class Context {
    static all: Context[] = [];
    state = 'suspended';
    currentTime = 0;
    sampleRate = 8000;
    destination = new Node();
    sources: Node[] = [];
    constructor() {
        Context.all.push(this);
    }
    resume = vi.fn(() => {
        this.state = 'running';
        return Promise.resolve();
    });
    suspend = vi.fn(() => {
        this.state = 'suspended';
        return Promise.resolve();
    });
    close = vi.fn(() => {
        this.state = 'closed';
        return Promise.resolve();
    });
    createOscillator() {
        const node = new Node();
        this.sources.push(node);
        return node;
    }
    createGain() {
        return new Node();
    }
    createBiquadFilter() {
        return new Node();
    }
    createBufferSource() {
        return this.createOscillator();
    }
    createBuffer(_channels: number, length: number) {
        return { getChannelData: () => new Float32Array(length) };
    }
}
const dispose: Array<() => void> = [];
afterEach(() => {
    dispose.splice(0).forEach((fn) => fn());
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});
function fixture() {
    Context.all = [];
    const document = Object.assign(new Target(), { hidden: false });
    const window = Object.assign(new Target(), { AudioContext: Context });
    const vibrate = vi.fn(() => true);
    vi.stubGlobal('document', document);
    vi.stubGlobal('window', window);
    vi.stubGlobal('navigator', { vibrate });
    vi.stubGlobal('KeyboardEvent', KeyEvent);
    vi.spyOn(performance, 'now').mockReturnValue(1000);
    const parent = new Target();
    const preferences = new ExperiencePreferences(null);
    const motion = { visible: true, subscribe: () => () => {} };
    const audio = new GameAudio(
        parent as unknown as HTMLElement,
        preferences,
        motion as unknown as Motion,
    );
    dispose.push(() => audio.destroy());
    return { audio, parent, preferences, motion, document, window, vibrate };
}
function road(): MatchTransition {
    const before = ready();
    const action = {
        kind: 'build' as const,
        type: 'road' as const,
        targetId: getBuildOption(before, 'road').legalTargetIds[0],
    };
    const result = executeCommand(before, action);
    expect(result.ok).toBe(true);
    return { id: 1, before, after: result.state, action, production: [] };
}

test('quiet defaults, trusted activation, bounded sound and deduplication require no match mutation', () => {
    const { audio, preferences, parent, vibrate } = fixture();
    const transition = road();
    const snapshot = structuredClone(transition);
    parent.emit('pointerdown', { isTrusted: true });
    expect(Context.all).toHaveLength(0);
    preferences.set('sound', true);
    preferences.set('haptics', true);
    parent.emit('pointerdown', { isTrusted: false });
    expect(Context.all).toHaveLength(0);
    parent.emit('keydown', new KeyEvent('a'));
    expect(Context.all).toHaveLength(0);
    parent.emit('keydown', new KeyEvent('Enter'));
    audio.play(transition, 'player-1');
    const context = Context.all[0];
    expect(context.sources.length).toBeGreaterThan(0);
    expect(context.sources.length).toBeLessThanOrEqual(5);
    const count = context.sources.length;
    audio.play(transition, 'player-1');
    expect(context.sources).toHaveLength(count);
    expect(vibrate).toHaveBeenCalledOnce();
    expect(transition).toEqual(snapshot);
});

test('hidden/locked events are consumed without replay; unsupported haptics and rejected resume are harmless', async () => {
    const { audio, preferences, parent, motion, document } = fixture();
    preferences.set('sound', true);
    vi.stubGlobal('navigator', {});
    preferences.set('haptics', true);
    const transition = road();
    audio.play(transition, 'player-1'); // Audio has not been unlocked.
    expect(Context.all).toHaveLength(0);
    parent.emit('click', { isTrusted: true });
    audio.play(transition, 'player-1');
    expect(Context.all[0].sources).toHaveLength(0);
    motion.visible = false;
    document.hidden = true;
    audio.play(road(), 'player-1');
    expect(Context.all[0].sources).toHaveLength(0);
    document.emit('visibilitychange');
    expect(Context.all[0].suspend).toHaveBeenCalled();
    document.hidden = false;
    motion.visible = true;
    Context.all[0].resume.mockImplementation(() => Promise.reject(new Error('policy')));
    expect(() => parent.emit('pointerdown', { isTrusted: true })).not.toThrow();
    await Promise.resolve();
    expect(() => audio.play(road(), 'player-1')).not.toThrow();
    expect(Context.all[0].sources).toHaveLength(0);
});

test('disabling preferences and hiding the page stop active nodes/vibration immediately', () => {
    const { audio, preferences, parent, document, vibrate } = fixture();
    preferences.set('sound', true);
    preferences.set('haptics', true);
    parent.emit('pointerdown', { isTrusted: true });
    audio.play(road(), 'player-1');
    const context = Context.all[0];
    preferences.set('sound', false);
    context.sources.forEach((node) => expect(node.stop).toHaveBeenCalledTimes(2));
    expect(vibrate).toHaveBeenLastCalledWith(0);
    document.hidden = true;
    document.emit('visibilitychange');
    expect(context.suspend).toHaveBeenCalledOnce();
    context.sources.forEach((node) => node.onended?.());
    context.sources.forEach((node) => expect(node.disconnect).toHaveBeenCalledOnce());
});

test('confirmed transitions still play after resume resets event IDs; sheets and drafts stay silent', () => {
    const { parent, motion } = fixture();
    const session = new GameSession();
    session.start(4, false);
    const board = {
        clearEffects: vi.fn(),
        subscribeLayout: () => () => {},
        playTransition: vi.fn(),
    };
    const play = vi.spyOn(GameAudio.prototype, 'play');
    const feedback = new GameFeedback(
        parent as unknown as HTMLElement,
        session,
        board as unknown as GameScene,
        {} as InterfaceScene,
        motion as unknown as Motion,
    );
    dispose.push(() => feedback.destroy());
    session.primary();
    expect(play).toHaveBeenCalledTimes(1);
    const first = session.transition!.id;
    session.openSheet({ kind: 'help' });
    session.closeSheet();
    expect(play).toHaveBeenCalledTimes(1);
    session.returnToMenu();
    session.resumeSaved();
    session.advanceBot();
    expect(session.transition!.id).toBe(first);
    expect(play).toHaveBeenCalledTimes(2);
    expect(board.playTransition).toHaveBeenCalledTimes(2);
});
