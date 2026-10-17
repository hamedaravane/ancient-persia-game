import type { Scene } from 'phaser';
import type { TerrainType } from '../core/types';
import { drawVectorArt } from './vectorArt';
import {
    terrainArt,
    TERRAIN_TEXTURE_RADIUS,
    TERRAIN_TEXTURE_SIZE,
    TERRAIN_TYPES,
    TERRAIN_VARIANTS,
} from './terrainArt';

export const terrainTextureKey = (terrain: TerrainType, variant: number): string =>
    `procedural-terrain-${terrain}-${variant % TERRAIN_VARIANTS}`;

/** Twelve small transparent textures, generated once per game and reused across board redraws. */
export function ensureTerrainTextures(scene: Scene): void {
    const g = scene.make.graphics({}, false);
    try {
        for (const terrain of TERRAIN_TYPES) {
            for (let variant = 0; variant < TERRAIN_VARIANTS; variant++) {
                const key = terrainTextureKey(terrain, variant);
                if (scene.textures.exists(key)) continue;
                g.clear();
                drawVectorArt(
                    g,
                    terrainArt(terrain, variant),
                    TERRAIN_TEXTURE_SIZE / 2,
                    TERRAIN_TEXTURE_SIZE / 2,
                    TERRAIN_TEXTURE_RADIUS,
                );
                g.generateTexture(key, TERRAIN_TEXTURE_SIZE, TERRAIN_TEXTURE_SIZE);
            }
        }
    } finally {
        g.destroy();
    }
}

/** Stable visual variation without consuming a single gameplay random number. */
export function terrainVariant(q: number, r: number): number {
    return (((q - r) % TERRAIN_VARIANTS) + TERRAIN_VARIANTS) % TERRAIN_VARIANTS;
}
