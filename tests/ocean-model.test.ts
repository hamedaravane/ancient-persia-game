import { expect, test, vi } from 'vitest';
import {
    advanceOceanTime,
    oceanNoise,
    oceanTextureSize,
    OCEAN_LOOP_SECONDS,
    OCEAN_TEXTURE_LIMIT,
    OCEAN_WAVES,
    sampleOceanWaves,
} from '../src/game/rendering/oceanModel';

test('wave geometry and depth noise never consume the match random source', () => {
    const random = vi.spyOn(Math, 'random').mockImplementation(() => {
        throw new Error('Match randomness consumed by ocean');
    });
    const first = sampleOceanWaves(173, 281, 17.25);
    expect(sampleOceanWaves(173, 281, 17.25)).toEqual(first);
    expect(oceanNoise(-3.4, 6.7)).toBe(oceanNoise(-3.4, 6.7));
    expect(random).not.toHaveBeenCalled();
});

test('surface normals agree with height derivatives across the wave field', () => {
    const epsilon = 0.001;
    for (const [x, y, time] of [
        [0, 0, 0],
        [34, 290, 8],
        [195, 422, 75],
        [479, 1200, 490],
    ]) {
        const sample = sampleOceanWaves(x, y, time);
        const dx =
            (sampleOceanWaves(x + epsilon, y, time).height -
                sampleOceanWaves(x - epsilon, y, time).height) /
            (2 * epsilon);
        const dy =
            (sampleOceanWaves(x, y + epsilon, time).height -
                sampleOceanWaves(x, y - epsilon, time).height) /
            (2 * epsilon);
        expect(sample.dx).toBeCloseTo(dx, 7);
        expect(sample.dy).toBeCloseTo(dy, 7);
    }
});

test('small waves remain bounded and the long animation loop has no phase seam', () => {
    const maximum = OCEAN_WAVES.reduce((sum, wave) => sum + wave.amplitude, 0);
    expect(maximum).toBeLessThan(1);
    for (let time = 0; time < 90; time += 7) {
        for (let x = 0; x <= 480; x += 29) {
            const first = sampleOceanWaves(x, x * 2.1, time);
            const loop = sampleOceanWaves(x, x * 2.1, time + OCEAN_LOOP_SECONDS);
            expect(Math.abs(first.height)).toBeLessThanOrEqual(maximum);
            expect(loop.height).toBeCloseTo(first.height, 10);
            expect(loop.dx).toBeCloseTo(first.dx, 10);
            expect(loop.dy).toBeCloseTo(first.dy, 10);
        }
    }
});

test('paused, reduced-motion and hidden states keep phase; resuming never catches up a long gap', () => {
    const time = 31;
    expect(advanceOceanTime(time, 16, false)).toBe(time);
    expect(advanceOceanTime(time, 900000, false)).toBe(time);
    expect(advanceOceanTime(time, 900000, true)).toBeCloseTo(time + 0.05);
    expect(advanceOceanTime(time, -100, true)).toBe(time);
    expect(advanceOceanTime(time, NaN, true)).toBe(time);
    expect(advanceOceanTime(OCEAN_LOOP_SECONDS - 0.01, 20, true)).toBeCloseTo(0.01);
});

test.each([
    [320, 568],
    [390, 844],
    [480, 1200],
    [1200, 480],
    [1, 1],
])('render target stays inside its mobile pixel budget at %ix%i', (width, height) => {
    const size = oceanTextureSize(width, height);
    expect(size.width).toBeLessThanOrEqual(OCEAN_TEXTURE_LIMIT.width);
    expect(size.height).toBeLessThanOrEqual(OCEAN_TEXTURE_LIMIT.height);
    expect(size.width * size.height).toBeLessThanOrEqual(204800);
    expect(Math.abs(size.width - (size.height * width) / height)).toBeLessThanOrEqual(2);
});

test('fallback depth noise is continuous at cell boundaries and bounded', () => {
    for (let x = -10; x < 10; x++) {
        const value = oceanNoise(x, 3.73);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
        expect(oceanNoise(x - 0.00001, 3.73)).toBeCloseTo(value, 7);
        expect(oceanNoise(x + 0.00001, 3.73)).toBeCloseTo(value, 7);
    }
});
