import type { GameObjects } from 'phaser';
import { drawRosette, drawSurface, type UiBox } from '../ui/graphicsTheme';

/** Broad original silhouettes, shared by the dock, cards and score details. */
export function drawActionEmblem(g: GameObjects.Graphics, box: UiBox, kind: string): void {
    const cx = box.x + box.width / 2,
        cy = box.y + box.height / 2;
    const scale = Math.min(box.width, box.height) / 40;
    const polygon = (points: readonly number[], color: number) => {
        g.fillStyle(color)
            .beginPath()
            .moveTo(cx + points[0] * scale, cy + points[1] * scale);
        for (let i = 2; i < points.length; i += 2)
            g.lineTo(cx + points[i] * scale, cy + points[i + 1] * scale);
        g.closePath().fillPath();
    };
    if (kind === 'hammer') {
        polygon([-12, 14, 6, -10, 12, -6, -6, 18], 0x977147);
        polygon(
            [-10, -12, -3, -19, 10, -10, 16, -11, 19, -3, 10, 2, 3, -3, -1, 1, -12, -6],
            0x344b46,
        );
        polygon([-8, -12, -3, -16, 7, -9, 3, -5], 0xc8d0bb);
    } else if (kind === 'knight') {
        polygon(
            [-10, 17, 14, 17, 10, 11, 8, -6, 5, -14, -5, -18, -3, -10, -15, 3, -8, 8, 0, 2, -4, 11],
            0xd0b27d,
        );
        g.fillStyle(0x344b46).fillCircle(cx - 4 * scale, cy - 5 * scale, 1.7 * scale);
    } else if (kind === 'road-building' || kind === 'road') {
        polygon([-17, 5, 8, -12, 15, -5, -10, 12], 0xc7b58d);
        polygon([-12, 12, 13, -5, 18, 1, -6, 18], 0x6f8b70);
        g.lineStyle(2 * scale, 0x344b46).lineBetween(
            cx - 3 * scale,
            cy - 5 * scale,
            cx + 5 * scale,
            cy + 8 * scale,
        );
    } else if (kind === 'monopoly') {
        for (const [dx, dy] of [
            [-9, 6],
            [8, 6],
            [0, -9],
        ]) {
            g.fillStyle(0xd0b27d).fillCircle(cx + dx * scale, cy + dy * scale, 6 * scale);
            g.lineStyle(1.5 * scale, 0x344b46).strokeCircle(
                cx + dx * scale,
                cy + dy * scale,
                3.5 * scale,
            );
        }
    } else if (kind === 'year-of-plenty') {
        for (const direction of [-1, 1]) {
            g.lineStyle(2 * scale, 0xc6a06a).lineBetween(
                cx + direction * 4 * scale,
                cy + 16 * scale,
                cx + direction * 7 * scale,
                cy - 14 * scale,
            );
            for (let i = 0; i < 3; i++)
                polygon(
                    [
                        direction * 6,
                        -13 + i * 8,
                        direction * 15,
                        -10 + i * 8,
                        direction * 7,
                        -3 + i * 8,
                    ],
                    0xd1b776,
                );
        }
    } else drawRosette(g, cx, cy, Math.min(box.width, box.height) * 0.39);
}

export function drawDevelopmentBack(g: GameObjects.Graphics, box: UiBox, stack = false): void {
    const width = stack ? box.width * 0.78 : box.width;
    const height = stack ? box.height * 0.87 : box.height;
    const x = box.x + (box.width - width) / 2,
        y = box.y + (box.height - height) / 2;
    if (stack)
        for (const offset of [-3, 3])
            drawSurface(g, { x: x + offset, y: y + (offset < 0 ? 3 : -2), width, height }, 'card', {
                radius: 4,
                flat: true,
            });
    drawSurface(g, { x, y, width, height }, 'basalt', { radius: 4, flat: true, accent: 0xbca16c });
    if (width > 22)
        g.lineStyle(1, 0xc6a06a, 0.75).strokeRect(x + 5, y + 5, width - 10, height - 10);
    drawRosette(g, x + width / 2, y + height / 2, Math.min(width, height) * 0.25);
}
