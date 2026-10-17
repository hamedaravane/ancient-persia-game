import type { GameObjects } from 'phaser';

export type ArtPoint = readonly [number, number];
/** Small, renderer-independent plans make the generated art inspectable without a browser. */
export type ArtMark =
    | { kind: 'polygon'; points: readonly ArtPoint[]; color: number; alpha?: number }
    | { kind: 'line'; points: readonly ArtPoint[]; color: number; width: number; alpha?: number }
    | {
          kind: 'ellipse';
          x: number;
          y: number;
          width: number;
          height: number;
          color: number;
          alpha?: number;
      };

export const polygon = (color: number, points: readonly ArtPoint[], alpha = 1): ArtMark => ({
    kind: 'polygon',
    points,
    color,
    alpha,
});
export const line = (
    color: number,
    width: number,
    points: readonly ArtPoint[],
    alpha = 1,
): ArtMark => ({ kind: 'line', points, color, width, alpha });
export const ellipse = (
    color: number,
    x: number,
    y: number,
    width: number,
    height: number,
    alpha = 1,
): ArtMark => ({ kind: 'ellipse', x, y, width, height, color, alpha });

/** One path per mark; no filters, masks, images, timers or renderer-specific shaders. */
export function drawVectorArt(
    g: GameObjects.Graphics,
    marks: readonly ArtMark[],
    x: number,
    y: number,
    scale: number,
    opacity = 1,
): void {
    for (const mark of marks) {
        const alpha = (mark.alpha ?? 1) * opacity;
        if (mark.kind === 'ellipse') {
            g.fillStyle(mark.color, alpha).fillEllipse(
                x + mark.x * scale,
                y + mark.y * scale,
                mark.width * scale,
                mark.height * scale,
            );
        } else {
            const points = mark.points.map(([px, py]) => ({
                x: x + px * scale,
                y: y + py * scale,
            }));
            g.beginPath().moveTo(points[0].x, points[0].y);
            for (const point of points.slice(1)) g.lineTo(point.x, point.y);
            if (mark.kind === 'line')
                g.lineStyle(mark.width * scale, mark.color, alpha).strokePath();
            else g.closePath().fillStyle(mark.color, alpha).fillPath();
        }
    }
}
