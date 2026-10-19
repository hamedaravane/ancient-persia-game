import { expect, test } from 'vitest';
import {
    longestRoad,
    titleOwner,
    refreshAwards,
    getVictoryPoints,
    resolvePublicVictory,
} from '../src/game/core/scoring';
import type { Board } from '../src/game/core/types';
import { buildRoad } from '../src/game/core/game';
import { playDevelopment } from '../src/game/core/development';
import { ready, giveCard } from './helpers/development';

function graph(paths: Array<{ owner: string; vertices: string[] }>): Board {
    const board: Board = { tiles: [], ports: [], vertices: {}, edges: {} };
    for (const { owner, vertices } of paths)
        for (let n = 1; n < vertices.length; n++) {
            const [a, b] = [vertices[n - 1], vertices[n]];
            const id = [a, b].sort().join('-');
            board.edges[id] = { id, vertexIds: [a, b], tileIds: [], road: { ownerId: owner } };
            for (const [v, other] of [
                [a, b],
                [b, a],
            ]) {
                board.vertices[v] ??= {
                    id: v,
                    x: 0,
                    y: 0,
                    building: null,
                    tileIds: [],
                    edgeIds: [],
                    neighborIds: [],
                };
                if (!board.vertices[v].edgeIds.includes(id)) {
                    board.vertices[v].edgeIds.push(id);
                    board.vertices[v].neighborIds.push(other);
                }
            }
        }
    return board;
}
const path = (owner: string, prefix: string, length: number) => ({
    owner,
    vertices: Array.from({ length: length + 1 }, (_, i) => `${prefix}${i}`),
});

test('branches and disconnected segments do not inflate the continuous route; loops never reuse edges', () => {
    const fork = graph([
        { owner: 'a', vertices: ['x', 'c', 'y'] },
        { owner: 'a', vertices: ['u', 'c', 'v'] },
        { owner: 'a', vertices: ['p', 'q', 'r'] },
    ]);
    expect(Object.keys(fork.edges)).toHaveLength(6);
    expect(longestRoad(fork, 'a')).toBe(2);
    const loop = graph([{ owner: 'a', vertices: ['a', 'b', 'c', 'a', 'd', 'e'] }]);
    expect(longestRoad(loop, 'a')).toBe(5);
    loop.vertices.a.building = { type: 'settlement', ownerId: 'b' };
    expect(longestRoad(loop, 'a')).toBe(3);
    const straight = graph([path('a', 's', 6)]);
    straight.vertices.s3.building = { type: 'city', ownerId: 'b' };
    expect(longestRoad(straight, 'a')).toBe(3);
    straight.vertices.s3.building.ownerId = 'a';
    expect(longestRoad(straight, 'a')).toBe(6);
});

test('official title thresholds, ties and strict surpassing preserve the incumbent or leave a tie unowned', () => {
    expect(titleOwner({ a: 4, b: 3 }, null, 5)).toBeNull();
    expect(titleOwner({ a: 5, b: 5 }, 'a', 5)).toBe('a');
    expect(titleOwner({ a: 5, b: 6 }, 'a', 5)).toBe('b');
    expect(titleOwner({ a: 4, b: 5, c: 5 }, 'a', 5)).toBeNull();
    expect(titleOwner({ a: 4, b: 5, c: 4 }, 'a', 5)).toBe('b');
    expect(titleOwner({ a: 2, b: 3 }, null, 3)).toBe('b');
    expect(titleOwner({ a: 3, b: 3 }, 'a', 3)).toBe('a');
    expect(titleOwner({ a: 3, b: 4 }, 'a', 3)).toBe('b');
});

test('a newly placed opponent building can split the title holder and transfer two points immediately', () => {
    let state = ready();
    state.board = graph([path('player-1', 'a', 6), path('player-2', 'b', 5)]);
    state = refreshAwards(state);
    expect(state.awards!.longestRoad).toBe('player-1');
    expect(getVictoryPoints(state, 'player-1')).toBe(2);
    state.board.vertices.a3.building = { type: 'settlement', ownerId: 'player-3' };
    state = refreshAwards(state);
    expect(state.awards!.longestRoad).toBe('player-2');
    expect(getVictoryPoints(state, 'player-1')).toBe(0);
    expect(getVictoryPoints(state, 'player-2')).toBe(2);
});

test('a title/score acquired off-turn cannot win until the player’s own turn', () => {
    const state = ready();
    state.board = graph([]);
    for (let i = 0; i < 5; i++)
        state.board.vertices[String(i)] = {
            id: String(i),
            x: 0,
            y: 0,
            tileIds: [],
            edgeIds: [],
            neighborIds: [],
            building: { type: 'city', ownerId: 'player-2' },
        };
    expect(resolvePublicVictory(state).phase).toBe('actions');
    state.activePlayerIndex = 1;
    state.phase = 'roll';
    state.lastRoll = null;
    expect(resolvePublicVictory(state)).toMatchObject({ phase: 'finished', winnerId: 'player-2' });
});

test('total scoring combines settlements, cities, hidden cards and both titles', () => {
    let state = ready();
    state.board = graph([path('player-1', 'a', 5)]);
    state.board.vertices.a0.building = { type: 'settlement', ownerId: 'player-1' };
    state.board.vertices.a2.building = { type: 'city', ownerId: 'player-1' };
    state.development!.knights['player-1'] = 3;
    giveCard(state, 'victory-point');
    state = refreshAwards(state);
    expect(state.awards).toEqual({ longestRoad: 'player-1', largestArmy: 'player-1' });
    expect(getVictoryPoints(state, 'player-1')).toBe(8);
    expect(getVictoryPoints(state, 'player-1', false)).toBe(7);
});

test('a winning first free road ends the game immediately without requiring the second placement', () => {
    let state = ready();
    state.board = graph([path('player-1', 'a', 5)]);
    state.board.edges['a4-a5'].road = null;
    for (const id of ['a0', 'a1', 'a2', 'a3'])
        state.board.vertices[id].building = { type: 'city', ownerId: 'player-1' };
    const resources = structuredClone(state.players[0].resources);
    state = playDevelopment(state, giveCard(state, 'road-building')).state;
    const built = buildRoad(state, 'a4-a5');
    expect(built.ok).toBe(true);
    expect(built.state).toMatchObject({
        phase: 'finished',
        winnerId: 'player-1',
        roadBuilding: null,
        awards: { longestRoad: 'player-1' },
    });
    expect(built.state.players[0].resources).toEqual(resources);
    expect(getVictoryPoints(built.state, 'player-1')).toBe(10);
});
