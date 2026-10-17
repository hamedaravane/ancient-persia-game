import type { GameObjects } from 'phaser';
import { drawVectorArt, ellipse, line, polygon, type ArtMark } from './vectorArt';

/** Balanced stone scales with a bronze beam; legible in the 28px dock and larger workspace. */
export const TRADE_ART: readonly ArtMark[] = [
    ellipse(0x172c32, 0, 12, 27, 4, 0.24),
    polygon(0xbaa783, [
        [-12, 9],
        [12, 9],
        [14, 12],
        [-14, 12],
    ]),
    line(0xf2dfb8, 1.2, [
        [-10, 9],
        [10, 9],
    ]),
    polygon(0x8c7759, [
        [-3, 8],
        [-2, -10],
        [2, -10],
        [3, 8],
    ]),
    line(0xe7c781, 2.2, [
        [-12, -7],
        [12, -7],
    ]),
    ellipse(0xf1dba7, 0, -9, 4.5, 4.5),
    line(0x5b594c, 0.95, [
        [-11, -6],
        [-15, 2],
        [-7, 2],
        [-11, -6],
    ]),
    line(0x5b594c, 0.95, [
        [11, -6],
        [7, 2],
        [15, 2],
        [11, -6],
    ]),
    polygon(0xcbb98e, [
        [-16, 2],
        [-6, 2],
        [-8, 6],
        [-14, 6],
    ]),
    polygon(0xcbb98e, [
        [6, 2],
        [16, 2],
        [14, 6],
        [8, 6],
    ]),
    line(0xf4dfac, 1.1, [
        [-15, 2],
        [-7, 2],
    ]),
    line(0xf4dfac, 1.1, [
        [7, 2],
        [15, 2],
    ]),
];

export function drawTradeIcon(
    g: GameObjects.Graphics,
    box: { x: number; y: number; width: number; height: number },
    disabled = false,
): void {
    drawVectorArt(
        g,
        TRADE_ART,
        box.x + box.width / 2,
        box.y + box.height / 2,
        Math.min(box.width, box.height) / 36,
        disabled ? 0.45 : 1,
    );
}
