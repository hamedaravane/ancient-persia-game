import { expect, test } from 'vitest';
import { cameraProjection, canvasPixelSize } from '../src/game/rendering/displayGeometry';
import { rasterTextStyle } from '../src/game/rendering/sharpText';
import { boardToScreen, clientToBoard, fitBoard } from '../src/game/ui/layout';
import { textRunPosition } from '../src/game/ui/textGeometry';

test.each([1, 2, 3])('a reference phone renders at native %s× density', (density) => {
    expect(canvasPixelSize(390, 844, density)).toEqual({
        width: 390 * density,
        height: 844 * density,
    });
});

test('rendering has a density and pixel budget instead of unlimited supersampling', () => {
    expect(canvasPixelSize(390, 844, 5)).toEqual(canvasPixelSize(390, 844, 3));
    const large = canvasPixelSize(1600, 1200, 3);
    expect(large.width * large.height).toBeLessThanOrEqual(4_000_000);
    expect(large.width).toBeGreaterThan(1600);
    expect(canvasPixelSize(390, 844, NaN)).toEqual({ width: 390, height: 844 });
});

test.each([1, 1.25, 2, 2.625, 3])(
    'full-shell and inset camera projection preserve CSS geometry and taps at %s×',
    (density) => {
        const size = canvasPixelSize(390, 844, density);
        const display = {
            width: 390,
            height: 844,
            pixelWidth: size.width,
            pixelHeight: size.height,
        };
        for (const viewport of [
            { x: 0, y: 0, width: 390, height: 844 },
            { x: 0, y: 128, width: 390, height: 428 },
            { x: 12.5, y: 100.25, width: 365, height: 301.5 },
        ]) {
            const camera = cameraProjection(display, viewport);
            const layout = fitBoard(viewport.width, viewport.height);
            const point = boardToScreen({ x: Math.sqrt(3), y: 1.5 }, layout);
            // The installed Phaser camera matrix: center origin + zoom + scroll.
            const pixelX =
                camera.x +
                camera.width / 2 +
                (point.x - camera.scrollX - camera.width / 2) * camera.zoomX;
            const pixelY =
                camera.y +
                camera.height / 2 +
                (point.y - camera.scrollY - camera.height / 2) * camera.zoomY;
            expect(pixelX).toBeCloseTo(camera.x + point.x * camera.zoomX);
            expect(pixelY).toBeCloseTo(camera.y + point.y * camera.zoomY);
            const bounds = {
                left: 200 + viewport.x,
                top: viewport.y,
                width: viewport.width,
                height: viewport.height,
            };
            const client = {
                x: 200 + pixelX / (size.width / 390),
                y: pixelY / (size.height / 844),
            };
            const local = clientToBoard(
                client,
                {
                    width: camera.width / camera.zoomX,
                    height: camera.height / camera.zoomY,
                },
                bounds,
            );
            // Fractional viewport edges round to a physical pixel, never a touch-sized error.
            expect(Math.abs(local.x - point.x)).toBeLessThanOrEqual(1 / density);
            expect(Math.abs(local.y - point.y)).toBeLessThanOrEqual(1 / density);
            // Phaser's worldView also starts at logical zero, keeping culling correct.
            expect(camera.scrollX + camera.width / 2 - viewport.width / 2).toBeCloseTo(0);
            expect(camera.scrollY + camera.height / 2 - viewport.height / 2).toBeCloseTo(0);
        }
    },
);

test.each([1, 1.25, 2, 3])(
    'Persian text gains detail without changing its baseline or reading edge at %s×',
    (density) => {
        const metrics = { ascent: 14.6, descent: 5.4, fontSize: 20 };
        const style = rasterTextStyle(
            { fontSize: 16, rtl: true, metrics, padding: { x: 1, y: 3 }, strokeThickness: 2 },
            density,
        );
        expect(style.resolution).toBe(1); // Avoid the installed renderer's RTL resolution bug.
        expect(style.fontSize).toBe(16 * density);
        expect(style.metrics?.ascent).toBe(14.6 * density);
        expect(style.padding).toEqual({ x: density, y: 3 * density });
        expect(style.strokeThickness).toBe(2 * density);
        const rect = { left: 100, right: 180, top: 50, height: 24 };
        const position = textRunPosition(
            rect,
            82,
            metrics,
            { right: 1, top: 3 },
            { x: 0, y: 0 },
            true,
            density,
        );
        expect(position.x + 82 - 1).toBe(rect.right);
        expect(position.y + 3 + Math.round(metrics.ascent * density) / density).toBeCloseTo(
            rect.top + (rect.height * metrics.ascent) / 20,
        );
    },
);
