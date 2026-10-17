import type { Scene } from 'phaser';
import type { HexTile, TerrainType } from '../core/types';
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

/** Twenty-four small transparent textures, generated once per game and reused across board redraws. */
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

/** Unique compositions among each terrain's four tiles, stable under saved-array reordering. */
export function boardTerrainVariants(tiles: readonly HexTile[]): Map<string, number> {
    const result = new Map<string, number>();
    const used = new Map<TerrainType, Set<number>>();
    for (const tile of [...tiles].sort((a, b) => a.q - b.q || a.r - b.r)) {
        const occupied = used.get(tile.terrain) ?? new Set<number>();
        let variant = terrainVariant(tile.q, tile.r);
        for (let attempt = 0; attempt < TERRAIN_VARIANTS && occupied.has(variant); attempt++)
            variant = (variant + 1) % TERRAIN_VARIANTS;
        occupied.add(variant);
        used.set(tile.terrain, occupied);
        result.set(tile.id, variant);
    }
    return result;
}
