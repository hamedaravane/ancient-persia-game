import type { Scene } from 'phaser';
import { RESOURCE_TYPES } from '../core/types';
import { resourceArt } from './resourceArt';
import { drawVectorArt, ellipse, line, type ArtMark } from './vectorArt';

export const RESOURCE_CELL_SIZE = 128;

/** One small generated atlas keeps hand, flights, costs, and harbor symbols identical. */
export function ensureResourceTextures(scene: Scene): void {
    if (scene.textures.exists('art-resources')) return;
    const g = scene.make.graphics({}, false);
    try {
        RESOURCE_TYPES.forEach((resource, i) =>
            drawVectorArt(
                g,
                resourceArt(resource),
                i * RESOURCE_CELL_SIZE + RESOURCE_CELL_SIZE / 2,
                RESOURCE_CELL_SIZE / 2,
                68,
            ),
        );
        g.generateTexture(
            'art-resources',
            RESOURCE_CELL_SIZE * RESOURCE_TYPES.length,
            RESOURCE_CELL_SIZE,
        );
        const texture = scene.textures.get('art-resources');
        RESOURCE_TYPES.forEach((resource, i) =>
            texture.add(
                resource,
                0,
                i * RESOURCE_CELL_SIZE,
                0,
                RESOURCE_CELL_SIZE,
                RESOURCE_CELL_SIZE,
            ),
        );
    } finally {
        g.destroy();
    }
}

/** Turned limestone with a bronze lip; the center stays clear for runtime digits. */
export const NUMBER_TOKEN_ART: readonly ArtMark[] = (() => {
    const marks: ArtMark[] = [
        ellipse(0x25362d, 0.04, 0.1, 2, 1.94, 0.32),
        ellipse(0x675940, 0, 0.025, 1.98, 1.98),
        ellipse(0xc4a165, 0, -0.025, 1.94, 1.94),
        ellipse(0xf3dfad, -0.025, -0.05, 1.82, 1.82),
        ellipse(0x9a8157, 0, 0, 1.66, 1.66),
        ellipse(0xe8d8b2, 0, -0.015, 1.56, 1.56),
        ellipse(0xf1e3c3, -0.025, -0.045, 1.4, 1.4),
    ];
    for (let i = 0; i < 24; i++) {
        const a = (i * Math.PI) / 12;
        marks.push(
            line(
                i < 12 ? 0x806c4a : 0xffedc0,
                0.024,
                [
                    [Math.cos(a) * 0.86, Math.sin(a) * 0.86],
                    [Math.cos(a) * 0.92, Math.sin(a) * 0.92],
                ],
                0.75,
            ),
        );
    }
    return marks;
})();
