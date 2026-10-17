import type { Scene, GameObjects } from 'phaser';
import { drawVectorArt, ellipse, line, polygon, type ArtMark } from './vectorArt';

export const AHRIMAN_OFFSET_RATIO = 0.43;
/** Original shadow-spirit emblem for this game, not a reconstruction of a historical depiction. */
export const AHRIMAN_ART: readonly ArtMark[] = [
    ellipse(0x15262a, 0, 14, 28, 8, 0.32),
    polygon(0x9d98ac, [
        [0, -8],
        [-5, -13],
        [-9, -16],
        [-8, -7],
        [-12, -5],
        [-16, -9],
        [-13, 1],
        [-8, 5],
        [-10, 12],
        [-4, 9],
        [0, 16],
        [4, 9],
        [10, 12],
        [8, 5],
        [13, 1],
        [16, -9],
        [12, -5],
        [8, -7],
        [9, -16],
        [5, -13],
    ]),
    polygon(0x292b3c, [
        [0, -6],
        [-5, -11],
        [-7, -13],
        [-6, -6],
        [-11, -3],
        [-13, -5],
        [-11, 0],
        [-6, 4],
        [-7, 9],
        [-3, 7],
        [0, 13],
        [3, 7],
        [7, 9],
        [6, 4],
        [11, 0],
        [13, -5],
        [11, -3],
        [6, -6],
        [7, -13],
        [5, -11],
    ]),
    polygon(
        0x535269,
        [
            [-5, -9],
            [-4, -4],
            [-4, 3],
            [0, 9],
            [-1, -1],
        ],
        0.8,
    ),
    line(0xdbbd83, 1.3, [
        [-5, -3],
        [-2, -2],
    ]),
    line(0xdbbd83, 1.3, [
        [2, -2],
        [5, -3],
    ]),
    polygon(0x171f2b, [
        [0, -1],
        [-2, 3],
        [0, 5],
        [2, 3],
    ]),
];

export function createAhriman(
    scene: Scene,
    x: number,
    y: number,
    height: number,
    preview = false,
): GameObjects.Container {
    const g = scene.add.graphics();
    drawVectorArt(g, AHRIMAN_ART, 0, 0, height / 34);
    return scene.add
        .container(x, y, [g])
        .setSize(height, height)
        .setAlpha(preview ? 0.5 : 1);
}
