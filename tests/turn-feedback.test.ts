import { afterEach, expect, test, vi } from 'vitest';
import type { Scene } from 'phaser';
import { GraphicsFeedback } from '../src/game/ui/GraphicsFeedback';
import type { Motion } from '../src/game/ui/motion';

afterEach(() => vi.restoreAllMocks());
class Container {
    list: unknown[] = [];
    destroyed = false;
    constructor(
        public x = 0,
        public y = 0,
    ) {}
    add(value: unknown) {
        this.list.push(value);
        return this;
    }
    setScale() {
        return this;
    }
    setAngle() {
        return this;
    }
    destroy() {
        this.destroyed = true;
    }
    removeAll() {
        for (const item of this.list) (item as Container).destroy?.();
        this.list = [];
    }
}
function fixture(reduced = false, quick = false) {
    const methods = [
        'fillStyle',
        'beginPath',
        'moveTo',
        'lineTo',
        'closePath',
        'fillPath',
        'lineStyle',
        'strokePath',
        'fillRect',
        'fillRoundedRect',
        'strokeRoundedRect',
        'fillCircle',
        'strokeRect',
        'clear',
        'destroy',
        'lineBetween',
    ];
    const graphics: Record<string, ReturnType<typeof vi.fn>> = {};
    for (const method of methods) graphics[method] = vi.fn(() => graphics);
    const containers: Container[] = [];
    const scene = {
        add: {
            container: (x?: number, y?: number) => {
                const c = new Container(x, y);
                containers.push(c);
                return c;
            },
            graphics: () => graphics,
        },
        tweens: { add: vi.fn((config: Record<string, unknown>) => config), killTweensOf: vi.fn() },
    };
    const parent = { getBoundingClientRect: () => ({ left: 10, top: 5 }) } as HTMLElement;
    const destination = {
        getBoundingClientRect: () => ({ left: 200, top: 20, width: 51, height: 26 }),
    } as HTMLElement;
    const motion = {
        reduced,
        visible: true,
        duration: (ms: number) => (reduced ? 0 : quick ? ms * 0.55 : ms),
    } as Motion;
    const invalidate = vi.fn();
    const feedback = new GraphicsFeedback(scene as unknown as Scene, parent, motion, invalidate);
    return { feedback, scene, graphics, containers, destination, invalidate };
}

test('dice feedback uses actual faces, client coordinates and no rule randomness', () => {
    vi.spyOn(Math, 'random').mockImplementation(() => {
        throw new Error('Presentation cannot consume match randomness');
    });
    const { feedback, graphics, scene, containers, destination } = fixture();
    feedback.diceRoll({ x: 100, y: 200, width: 166, height: 78 }, destination, [2, 5]);
    expect(graphics.fillCircle).toHaveBeenCalledTimes(14); // Seven pips, each with a recessed highlight.
    expect(containers[1]).toMatchObject({ x: 173, y: 234 });
    expect(scene.tweens.add.mock.calls[1][0]).toMatchObject({ x: 215.5, y: 28 });
    expect(feedback.hides(destination)).toBe(true);
    const complete = scene.tweens.add.mock.calls[1][0].onComplete as () => void;
    complete();
    expect(containers[1].destroyed).toBe(true);
    expect(feedback.hides(destination)).toBe(false);
});

test('interruptions remove travelling dice and restore the committed header without waiting', () => {
    const { feedback, scene, containers, destination, invalidate } = fixture();
    feedback.diceRoll({ x: 100, y: 200, width: 166, height: 78 }, destination, [4, 4]);
    feedback.clear();
    expect(scene.tweens.killTweensOf).toHaveBeenCalledWith(containers[1]);
    expect(containers[1].destroyed).toBe(true);
    expect(containers[0].list).toHaveLength(0);
    expect(feedback.hides(destination)).toBe(false);
    expect(invalidate).toHaveBeenCalledTimes(2);
});

test('reduced motion retains the header result and creates no moving dice or card reveal', () => {
    const { feedback, scene, destination, containers } = fixture(true);
    feedback.diceRoll({ x: 100, y: 200, width: 166, height: 78 }, destination, [1, 6]);
    feedback.cardReveal(destination, 'knight');
    expect(feedback.hides(destination)).toBe(false);
    expect(containers).toHaveLength(1);
    expect(scene.tweens.add).not.toHaveBeenCalled();
});

test('quick feedback shortens presentation while keeping the same result and destination', () => {
    const { feedback, scene, destination } = fixture(false, true);
    feedback.diceRoll({ x: 100, y: 200, width: 166, height: 78 }, destination, [3, 4]);
    expect(scene.tweens.add.mock.calls[1][0]).toMatchObject({ x: 215.5, y: 28, duration: 154 });
    expect(scene.tweens.add.mock.calls[1][0].delay).toBeCloseTo(126.5);
});
