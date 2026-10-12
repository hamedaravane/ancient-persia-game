import { test } from 'vitest';
import assert from 'node:assert/strict';
import { createBoard } from '../src/game/core/board';
import {
    createGame,
    tradeWithBank,
    getBankTradeError,
    buildSettlement,
    upgradeCity,
    moveRobber,
} from '../src/game/core/game';
import {
    getOwnedPorts,
    getPortOwnerId,
    getBankTradeRates,
    getBankTradeRatio,
} from '../src/game/core/ports';
import {
    RESOURCE_TYPES,
    type GameState,
    type BuildingType,
    type ResourceType,
    type TradeRatio,
    type GamePhase,
} from '../src/game/core/types';
import { fitBoard, boardToScreen } from '../src/game/ui/layout';
import { getPortLayout, PORT_OFFSET, PORT_RADIUS } from '../src/game/rendering/ports';

function findPort(state: GameState, resource: ResourceType | null) {
    const port = state.board.ports.find((port) => port.resource === resource);
    assert(port);
    return port;
}

function seeded(seed: number) {
    return () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 2 ** 32;
    };
}
function fixture() {
    const state = createGame(['A', 'B', 'C'], seeded(42));
    state.phase = 'actions';
    for (const vertex of Object.values(state.board.vertices)) vertex.building = null;
    for (const edge of Object.values(state.board.edges)) edge.road = null;
    for (const resource of RESOURCE_TYPES) state.players[0].resources[resource] = 10;
    return state;
}
function grant(
    state: GameState,
    port: ReturnType<typeof findPort>,
    ownerId = state.players[0].id,
    type: BuildingType = 'settlement',
) {
    const id = state.board.edges[port.edgeId].vertexIds[0];
    state.board.vertices[id].building = { ownerId, type };
    return id;
}
function freeze<T>(value: T): T {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
        Object.freeze(value);
        Object.values(value).forEach((entry) => freeze(entry));
    }
    return value;
}

test('variable setup has nine separated coastal ports: four general and five distinct specialists', () => {
    const arrangements = new Set();
    for (let seed = 1; seed <= 100; seed++) {
        const board = createBoard(seeded(seed));
        assert.equal(board.ports.length, 9);
        assert.equal(board.ports.filter((port) => port.resource === null).length, 4);
        assert.deepEqual(
            board.ports
                .filter((port) => port.resource)
                .map((port) => port.resource)
                .sort(),
            [...RESOURCE_TYPES].sort(),
        );
        const endpoints = board.ports.flatMap((port) => {
            const edge = board.edges[port.edgeId];
            assert.equal(edge.tileIds.length, 1);
            return edge.vertexIds;
        });
        assert.equal(new Set(endpoints).size, 18, 'No two ports share an access intersection');
        assert.equal(new Set(board.ports.map((port) => port.edgeId)).size, 9);
        arrangements.add(JSON.stringify(board.ports));
        assert.deepEqual(
            board,
            createBoard(seeded(seed)),
            'Setup uses the supplied deterministic random source',
        );
    }
    assert(arrangements.size > 1);
});

test('a road or a nearby coastal building does not grant port access', () => {
    const state = fixture(),
        player = state.players[0];
    const port = findPort(state, 'wood');
    state.board.edges[port.edgeId].road = { ownerId: player.id };
    const nearby = Object.values(state.board.vertices).find(
        (v) =>
            v.edgeIds.some((id) => state.board.edges[id].tileIds.length === 1) &&
            !state.board.ports.some((p) => state.board.edges[p.edgeId].vertexIds.includes(v.id)),
    );
    assert(nearby);
    nearby.building = { ownerId: player.id, type: 'settlement' };
    assert.equal(getPortOwnerId(state.board, port), null);
    assert.deepEqual(getBankTradeRates(state.board, player.id, 'wood'), [4]);
});

test('either endpoint grants its owner access; opponents do not share it', () => {
    for (const endpoint of [0, 1]) {
        const state = fixture(),
            port = findPort(state, 'wood');
        const id = state.board.edges[port.edgeId].vertexIds[endpoint];
        state.board.vertices[id].building = { ownerId: state.players[1].id, type: 'settlement' };
        assert.equal(getPortOwnerId(state.board, port), state.players[1].id);
        assert.equal(getBankTradeRatio(state.board, state.players[1].id, 'wood'), 2);
        assert.equal(getBankTradeRatio(state.board, state.players[0].id, 'wood'), 4);
    }
});

test('generic port grants 3:1 for every payment resource', () => {
    const state = fixture(),
        player = state.players[0];
    grant(state, findPort(state, null));
    for (const resource of RESOURCE_TYPES)
        assert.deepEqual(getBankTradeRates(state.board, player.id, resource), [3, 4]);
});

test('each specialist applies only to the resource paid, never the resource received', () => {
    for (const resource of RESOURCE_TYPES) {
        const state = fixture(),
            player = state.players[0];
        grant(state, findPort(state, resource));
        for (const give of RESOURCE_TYPES)
            assert.equal(
                getBankTradeRatio(state.board, player.id, give),
                give === resource ? 2 : 4,
            );
        const other = RESOURCE_TYPES.find((r) => r !== resource)!;
        const result = tradeWithBank(state, other, resource);
        assert(result.ok);
        assert.equal(result.state.players[0].resources[other], 6);
    }
});

test('multiple ports choose the best rate without stacking discounts', () => {
    const state = fixture(),
        player = state.players[0];
    grant(state, findPort(state, null));
    grant(state, findPort(state, 'wood'));
    assert.deepEqual(getBankTradeRates(state.board, player.id, 'wood'), [2, 3, 4]);
    assert.equal(getBankTradeRatio(state.board, player.id, 'stone'), 3);
});

test('default trades pay the exact best rate and leave prior state and other players unchanged', () => {
    for (const ratio of [2, 3, 4]) {
        const state = fixture();
        if (ratio !== 4) grant(state, findPort(state, ratio === 2 ? 'wood' : null));
        freeze(state);
        const result = tradeWithBank(state, 'wood', 'stone');
        assert(result.ok);
        assert.equal(state.players[0].resources.wood, 10);
        assert.equal(result.state.players[0].resources.wood, 10 - ratio);
        assert.equal(result.state.players[0].resources.stone, 11);
        assert.equal(result.state.players[1], state.players[1]);
        assert.equal(result.state.board, state.board);
    }
});

test('4:1 stays legal with a specialist, but unowned or inapplicable rates are rejected', () => {
    const state = fixture();
    grant(state, findPort(state, 'wood'));
    const result = tradeWithBank(state, 'wood', 'stone', 4);
    assert(result.ok);
    assert.equal(result.state.players[0].resources.wood, 6);
    for (const [give, ratio] of [
        ['wood', 3],
        ['stone', 2],
        ['wood', 1],
    ] as const) {
        const invalid = tradeWithBank(state, give, 'brick', ratio as TradeRatio);
        assert(!invalid.ok);
        assert.equal(invalid.reason, 'invalid-trade-ratio');
        assert.equal(invalid.state, state);
    }
});

test('insufficient resources, same-resource trades, forced robber, roll and finished phases preserve state', () => {
    const state = fixture();
    grant(state, findPort(state, 'wood'));
    state.players[0].resources.wood = 1;
    assert.equal(getBankTradeError(state, 'wood', 'stone'), 'insufficient-resources');
    assert.equal(getBankTradeError(state, 'wood', 'wood'), 'same-resource-trade');
    for (const phase of ['roll', 'robber', 'finished'] satisfies GamePhase[]) {
        const before = { ...state, phase };
        const result = tradeWithBank(before, 'wood', 'stone');
        assert(!result.ok);
        assert.equal(result.state, before);
        assert.equal(result.reason, phase === 'finished' ? 'game-finished' : 'wrong-phase');
    }
});

test('a newly built coastal settlement activates its port immediately and city upgrade preserves access', () => {
    const state = fixture(),
        port = findPort(state, 'wood');
    const id = state.board.edges[port.edgeId].vertexIds[0];
    state.board.edges[port.edgeId].road = { ownerId: state.players[0].id };
    const built = buildSettlement(state, id);
    assert(built.ok);
    assert.equal(getBankTradeRatio(built.state.board, state.players[0].id, 'wood'), 2);
    const upgraded = upgradeCity(built.state, id);
    assert(upgraded.ok);
    assert.equal(getBankTradeRatio(upgraded.state.board, state.players[0].id, 'wood'), 2);
    assert.equal(getOwnedPorts(upgraded.state.board, state.players[0].id).length, 1);
    assert.equal(getPortOwnerId(state.board, port), null);
});

test('the land robber does not block a port', () => {
    const state = fixture(),
        port = findPort(state, 'wood');
    grant(state, port);
    state.phase = 'robber';
    const tileId = state.board.edges[port.edgeId].tileIds[0];
    const priorRobber = state.board.tiles.find((tile) => tile.id !== tileId)!;
    state.board.tiles.forEach((tile) => {
        tile.robber = tile === priorRobber;
    });
    const moved = moveRobber(state, tileId);
    assert(moved.ok);
    assert.equal(getBankTradeRatio(moved.state.board, state.players[0].id, 'wood'), 2);
});

test('islets fit at mobile/compact sizes, face outward and remain separated', () => {
    const board = createBoard(seeded(42));
    for (const [width, height] of [
        [320, 235],
        [320, 179],
        [390, 468],
        [390, 412],
        [480, 468],
        [480, 412],
    ]) {
        const layout = fitBoard(width, height);
        const positions = board.ports.map((port) => {
            const point = getPortLayout(board, port, layout);
            assert(point.x >= 19 && point.x <= width - 19);
            assert(point.y >= 19 && point.y <= height - 19);
            const edge = board.edges[port.edgeId];
            const [a, b] = edge.vertexIds.map((id) => boardToScreen(board.vertices[id], layout));
            assert(
                Math.abs(
                    Math.hypot(point.x - (a.x + b.x) / 2, point.y - (a.y + b.y) / 2) - PORT_OFFSET,
                ) < 1e-8,
            );
            for (const tile of board.tiles) {
                const center = boardToScreen(tile, layout);
                const dx = Math.abs(point.x - center.x) / layout.hexRadius,
                    dy = Math.abs(point.y - center.y) / layout.hexRadius;
                assert(
                    !(dx <= Math.sqrt(3) / 2 && dy <= 1 && dy + dx / Math.sqrt(3) <= 1),
                    'Port center must stay offshore',
                );
            }
            return point;
        });
        for (let i = 0; i < positions.length; i++)
            for (let j = i + 1; j < positions.length; j++) {
                const distance = Math.hypot(
                    positions[i].x - positions[j].x,
                    positions[i].y - positions[j].y,
                );
                assert(
                    distance > 2 * PORT_RADIUS,
                    `Port art overlaps at ${width}×${height}: ${i},${j}, distance ${distance}`,
                );
                // Nearest-marker picking resolves the small hit-area overlap on very short canvases.
                // Full-size DOM port buttons provide an alternative to board taps.
            }
    }
});
