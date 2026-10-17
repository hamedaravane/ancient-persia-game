import { expect, test } from 'vitest';
import { CITY, CITY_INSET, SETTLEMENT, type Polygon } from '../src/game/rendering/pieceShapes';

function inside(shape: Polygon, x: number, y: number): boolean {
    let hit = false;
    for (let i = 0, j = shape.length - 1; i < shape.length; j = i++) {
        const a = shape[i],
            b = shape[j];
        if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0])
            hit = !hit;
    }
    return hit;
}

// Binary sampling at CSS-pixel centers ignores ownership color, shading and fine detail.
test.each([21, 25])(
    'building silhouettes retain a broad distinguishing opening at %i CSS pixels',
    (size) => {
        const raster = (shape: Polygon, base: number) =>
            Array.from({ length: size * size }, (_, i) =>
                inside(
                    shape,
                    (((i % size) + 0.5 - size / 2) * base) / size,
                    ((Math.floor(i / size) + 0.5 - size / 2) * base) / size,
                ),
            );
        const city = raster(CITY, 25);
        const settlement = raster(SETTLEMENT, 21);
        const differences = city.filter((pixel, i) => pixel !== settlement[i]).length;
        expect(differences / city.length).toBeGreaterThan(0.25);
        // The entire upper-right quarter is open in the city but solid in the settlement.
        for (let y = -8; y <= -3; y++)
            for (let x = 3; x <= 8; x++) {
                expect(inside(CITY, x, y)).toBe(false);
                expect(inside(SETTLEMENT, x, y)).toBe(true);
            }
    },
);

test('city ownership inset stays inside its stone footprint, preserving the open silhouette', () => {
    for (let x = -12; x < 13; x += 0.5)
        for (let y = -12; y < 13; y += 0.5) {
            if (inside(CITY_INSET, x, y)) expect(inside(CITY, x, y)).toBe(true);
        }
});
