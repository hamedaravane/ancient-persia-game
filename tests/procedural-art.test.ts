import { RESOURCE_TYPES } from '../src/game/core/types';
import { resourceArt } from '../src/game/rendering/resourceArt';
import { ensureResourceTextures, NUMBER_TOKEN_ART } from '../src/game/rendering/boardEmblems';
import { harborArt } from '../src/game/rendering/harborArt';
import { expect, test, vi } from 'vitest';
import type { GameObjects, Scene } from 'phaser';
import {
    terrainArt,
    TERRAIN_TYPES,
    TERRAIN_VARIANTS,
    TERRAIN_TEXTURE_SIZE,
} from '../src/game/rendering/terrainArt';
import {
    boardTerrainVariants,
    ensureTerrainTextures,
    terrainVariant,
} from '../src/game/rendering/terrainTextures';
import { AHRIMAN_ART, createAhriman } from '../src/game/rendering/ahriman';
import { TRADE_ART, drawTradeIcon } from '../src/game/rendering/tradeArt';
import { drawVectorArt, type ArtMark, type ArtPoint } from '../src/game/rendering/vectorArt';
import { createReadyGame } from './helpers/setup';
import { moveRobber, rollDice } from '../src/game/core/game';
import { getProduction } from '../src/game/core/production';
import { validGameState } from '../src/game/persistence/validateState';
import { GameSession } from '../src/game/ui/session';
import { sheetContent } from '../src/game/ui/sheets';
import { tradeIcon } from '../src/game/ui/components';

function bounds(mark: ArtMark): readonly ArtPoint[] {
    if (mark.kind !== 'ellipse') return mark.points;
    return [
        [mark.x - mark.width / 2, mark.y - mark.height / 2],
        [mark.x + mark.width / 2, mark.y - mark.height / 2],
        [mark.x - mark.width / 2, mark.y + mark.height / 2],
        [mark.x + mark.width / 2, mark.y + mark.height / 2],
    ];
}
function graphics() {
    const g = {} as Record<string, ReturnType<typeof vi.fn>>;
    for (const name of [
        'beginPath',
        'moveTo',
        'lineTo',
        'closePath',
        'fillStyle',
        'fillPath',
        'lineStyle',
        'strokePath',
        'fillEllipse',
        'clear',
        'destroy',
        'generateTexture',
    ])
        g[name] = vi.fn(() => g);
    return g;
}

test.each(TERRAIN_TYPES)(
    '%s is detailed, bounded to its hex, and leaves the token area quiet',
    (terrain) => {
        for (let variant = 0; variant < TERRAIN_VARIANTS; variant++) {
            const marks = terrainArt(terrain, variant);
            expect(marks.length).toBeGreaterThan(6);
            expect(marks.length).toBeLessThan(300);
            for (const mark of marks) {
                for (const [x, y] of bounds(mark)) {
                    expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
                    expect(Math.abs(x)).toBeLessThanOrEqual(Math.sqrt(3) / 2 + 0.001);
                    expect(Math.abs(y) + Math.abs(x) / Math.sqrt(3)).toBeLessThanOrEqual(1.001);
                }
            }
            // First three surfaces and final two rims frame the tile; the motifs stay above the token.
            for (const mark of marks.slice(3, -2))
                if ((mark.alpha ?? 1) > 0.5)
                    for (const [, y] of bounds(mark)) expect(y).toBeLessThan(0.3);
        }
    },
);

test('art is reproducible, has distinct terrain silhouettes, and never advances gameplay randomness', () => {
    const random = vi.spyOn(Math, 'random').mockImplementation(() => {
        throw new Error('Art must not roll dice');
    });
    try {
        const all = TERRAIN_TYPES.map((type) => terrainArt(type, 0));
        expect(
            new Set(all.map((marks) => JSON.stringify(marks.map((m) => ({ ...m, color: 0 })))))
                .size,
        ).toBe(6);
        for (const type of TERRAIN_TYPES) {
            expect(terrainArt(type, 1)).toEqual(terrainArt(type, 1));
            expect(terrainArt(type, 0)).not.toEqual(terrainArt(type, 1));
        }
        for (let q = -2; q <= 2; q++)
            for (let r = -2; r <= 2; r++) {
                expect(terrainVariant(q, r)).toBeGreaterThanOrEqual(0);
                expect(terrainVariant(q, r)).toBeLessThan(TERRAIN_VARIANTS);
            }
        expect(random).not.toHaveBeenCalled();
    } finally {
        random.mockRestore();
    }
});

test('texture generation is bounded to 24 small textures and reused after a scene restart', () => {
    const cached = new Set<string>();
    const g = graphics();
    g.generateTexture.mockImplementation((key: string, width: number, height: number) => {
        expect(width).toBe(320);
        expect(height).toBe(320);
        cached.add(key);
        return g;
    });
    const scene = {
        textures: { exists: (key: string) => cached.has(key) },
        make: { graphics: () => g },
    } as unknown as Scene;
    ensureTerrainTextures(scene);
    expect(g.generateTexture).toHaveBeenCalledTimes(24);
    expect(g.destroy).toHaveBeenCalledTimes(1);
    ensureTerrainTextures(scene);
    expect(g.generateTexture).toHaveBeenCalledTimes(24);
    expect(cached.size * TERRAIN_TEXTURE_SIZE ** 2 * 4).toBe(9_830_400);
});

test('drawing cache setup releases scratch graphics if generation fails', () => {
    const g = graphics();
    g.generateTexture.mockImplementation(() => {
        throw new Error('texture failure');
    });
    const scene = {
        textures: { exists: () => false },
        make: { graphics: () => g },
    } as unknown as Scene;
    expect(() => ensureTerrainTextures(scene)).toThrow('texture failure');
    expect(g.destroy).toHaveBeenCalledOnce();
});

test('Ahriman uses static geometry with an independent translucent preview; trade scales fit 28px', () => {
    const g = graphics();
    const marker = { setSize: vi.fn().mockReturnThis(), setAlpha: vi.fn().mockReturnThis() };
    const add = { graphics: () => g, container: vi.fn(() => marker) };
    const scene = { add } as unknown as Scene;
    createAhriman(scene, 30, 40, 34, true);
    expect(add.container).toHaveBeenCalledWith(30, 40, [g]);
    expect(marker.setAlpha).toHaveBeenLastCalledWith(0.5);
    createAhriman(scene, 30, 40, 34);
    expect(marker.setAlpha).toHaveBeenLastCalledWith(1);
    expect(AHRIMAN_ART.length).toBeLessThan(10);
    expect(TRADE_ART.length).toBeLessThan(15);
    for (const mock of Object.values(g)) mock.mockClear();
    drawTradeIcon(
        g as unknown as GameObjects.Graphics,
        { x: 0, y: 0, width: 28, height: 28 },
        true,
    );
    expect(g.fillStyle.mock.calls.some(([, alpha]) => alpha === 0.45)).toBe(true);
    const coords = [...g.moveTo.mock.calls, ...g.lineTo.mock.calls].slice(-30);
    for (const [x, y] of coords) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(28);
        expect(y).toBeLessThanOrEqual(28);
    }
    expect(tradeIcon(28)).toContain('class="trade-icon art-sprite"');
    expect(tradeIcon(28)).not.toContain('data-art=');
});

test('Ahriman naming preserves existing state/save commands and only blocks production on its tile', () => {
    const state = createReadyGame(['Human', 'Bot A', 'Bot B'], () => 0.42);
    const rolled = rollDice(
        state,
        (() => {
            const dice = [0.4, 0.55];
            return () => dice.shift()!;
        })(),
    ).state;
    expect(rolled.phase).toBe('robber');
    const target = rolled.board.tiles.find(
        (t) => t.resource && rolled.board.vertices[t.vertexIds[0]].building,
    )!;
    const moved = moveRobber(rolled, target.id);
    expect(moved.ok).toBe(true);
    expect(moved.state.players).toEqual(state.players);
    expect(validGameState(moved.state)).toBe(true);
    expect(getProduction(moved.state, target.number!).some((g) => g.tileId === target.id)).toBe(
        false,
    );
    const session = new GameSession();
    session.start(4, false);
    session.openSheet({ kind: 'tile', id: session.state!.board.tiles[0].id });
    expect(sheetContent(session).body).toContain('اهریمن');
    expect(sheetContent(session).body).not.toContain('راهزن');
});

test('vector plans draw through portable paths and ellipses without canvas-only masks', () => {
    const g = graphics();
    drawVectorArt(g as unknown as GameObjects.Graphics, terrainArt('mountain'), 128, 128, 120);
    expect(g.fillPath).toHaveBeenCalled();
    expect(g.strokePath).toHaveBeenCalled();
});

test('repeated terrains receive different compositions and save order does not change them', () => {
    const tiles = createReadyGame(['A', 'B', 'C'], () => 0.42).board.tiles;
    const variants = boardTerrainVariants(tiles);
    expect(variants).toEqual(boardTerrainVariants([...tiles].reverse()));
    for (const terrain of TERRAIN_TYPES) {
        const same = tiles.filter((tile) => tile.terrain === terrain);
        expect(new Set(same.map((tile) => variants.get(tile.id))).size).toBe(same.length);
    }
});

test('resource materials remain inside their shared frames, deterministic and distinct without color', () => {
    const plans = RESOURCE_TYPES.map(resourceArt);
    expect(
        new Set(plans.map((marks) => JSON.stringify(marks.map((m) => ({ ...m, color: 0 }))))).size,
    ).toBe(5);
    for (const resource of RESOURCE_TYPES) {
        const marks = resourceArt(resource);
        expect(marks).toEqual(resourceArt(resource));
        for (const mark of marks)
            for (const [x, y] of bounds(mark)) {
                expect(Math.abs(x)).toBeLessThan(0.9);
                expect(Math.abs(y)).toBeLessThan(0.9);
            }
    }
});

test('all resource consumers share one generated atlas, reused on scene restart', () => {
    const g = graphics();
    const add = vi.fn();
    let cached = false;
    g.generateTexture.mockImplementation(() => {
        cached = true;
        return g;
    });
    const scene = {
        textures: { exists: () => cached, get: () => ({ add }) },
        make: { graphics: () => g },
    } as unknown as Scene;
    ensureResourceTextures(scene);
    ensureResourceTextures(scene);
    expect(g.generateTexture).toHaveBeenCalledExactlyOnceWith('art-resources', 640, 128);
    expect(add).toHaveBeenCalledTimes(5);
    RESOURCE_TYPES.forEach((resource, i) =>
        expect(add).toHaveBeenNthCalledWith(i + 1, resource, 0, i * 128, 0, 128, 128),
    );
    expect(g.destroy).toHaveBeenCalledOnce();
});

test('resource generation releases scratch graphics on upload failure; token and quay geometry are finite', () => {
    const g = graphics();
    g.generateTexture.mockImplementation(() => {
        throw new Error('upload');
    });
    expect(() =>
        ensureResourceTextures({
            textures: { exists: () => false },
            make: { graphics: () => g },
        } as unknown as Scene),
    ).toThrow('upload');
    expect(g.destroy).toHaveBeenCalledOnce();
    for (const marks of [NUMBER_TOKEN_ART, harborArt(), harborArt(0x123abc)]) {
        for (const mark of marks)
            for (const [x, y] of bounds(mark)) {
                expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
                expect(Math.abs(x)).toBeLessThanOrEqual(1.1);
                expect(Math.abs(y)).toBeLessThanOrEqual(1.1);
            }
    }
    expect(harborArt(0x123abc).some((m) => m.color === 0x123abc)).toBe(true);
});
