import { createBoard } from '../core/board';
import { getVictoryPoints } from '../core/game';
import { RESOURCE_TYPES, type GameState } from '../core/types';

export function record(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function integer(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): value is number {
    return typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;
}
export function label(value: unknown, max = 2000): value is string {
    return typeof value === 'string' && value.length > 0 && value.length <= max;
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
// Compare fixed geometry only. This source is deterministic and never rolls game randomness.
const topology = createBoard(() => 0.5);
const resourceFor = Object.fromEntries(topology.tiles.map((tile) => [tile.terrain, tile.resource]));

/** Validate untrusted/versioned JSON before any scene, query, or rule reads it. */
export function validGameState(value: unknown): value is GameState {
    if (!record(value) || !Array.isArray(value.players) || ![3, 4].includes(value.players.length))
        return false;
    const players = value.players;
    if (
        !players.every((player) => {
            if (
                !record(player) ||
                !label(player.id, 80) ||
                !label(player.name, 80) ||
                !integer(player.color, 0, 0xffffff) ||
                !record(player.resources)
            )
                return false;
            const resources = player.resources;
            return RESOURCE_TYPES.every((resource) => integer(resources[resource]));
        })
    )
        return false;
    const owners = new Set(players.map((player) => player.id as string));
    if (
        owners.size !== players.length ||
        !integer(value.activePlayerIndex, 0, players.length - 1) ||
        !integer(value.turn, 1) ||
        value.victoryTarget !== 6 ||
        typeof value.phase !== 'string' ||
        !['roll', 'robber', 'actions', 'finished'].includes(value.phase)
    )
        return false;
    if (
        value.lastRoll !== null &&
        !(
            Array.isArray(value.lastRoll) &&
            value.lastRoll.length === 2 &&
            value.lastRoll.every((die) => integer(die, 1, 6))
        )
    )
        return false;
    if (value.phase !== 'roll' && value.lastRoll === null) return false;
    if (value.phase === 'robber' && (value.lastRoll as number[]).reduce((a, b) => a + b, 0) !== 7)
        return false;
    const board = value.board;
    if (
        !record(board) ||
        !Array.isArray(board.tiles) ||
        board.tiles.length !== 19 ||
        !record(board.vertices) ||
        !record(board.edges) ||
        !Array.isArray(board.ports)
    )
        return false;
    const vertices = board.vertices,
        edges = board.edges;
    if (
        !same(Object.keys(vertices).sort(), Object.keys(topology.vertices).sort()) ||
        !same(Object.keys(edges).sort(), Object.keys(topology.edges).sort())
    )
        return false;
    if (
        !board.tiles.every((tile) => {
            if (!record(tile)) return false;
            const expected = topology.tiles.find(({ id }) => id === tile.id);
            return (
                expected &&
                ['q', 'r', 'x', 'y', 'vertexIds', 'edgeIds'].every((key) =>
                    same(tile[key], expected[key as keyof typeof expected]),
                ) &&
                typeof tile.terrain === 'string' &&
                Object.prototype.hasOwnProperty.call(resourceFor, tile.terrain) &&
                tile.resource === resourceFor[String(tile.terrain)] &&
                typeof tile.robber === 'boolean' &&
                (tile.resource === null
                    ? tile.number === null
                    : integer(tile.number, 2, 12) && tile.number !== 7)
            );
        })
    )
        return false;
    if (
        new Set(board.tiles.map((tile) => tile.id)).size !== 19 ||
        board.tiles.filter((tile) => tile.robber).length !== 1 ||
        !same(
            board.tiles.map((tile) => tile.terrain).sort(),
            topology.tiles.map((tile) => tile.terrain).sort(),
        ) ||
        !same(
            board.tiles.map((tile) => tile.number).sort(),
            topology.tiles.map((tile) => tile.number).sort(),
        )
    )
        return false;
    for (const [id, expected] of Object.entries(topology.vertices)) {
        const vertex = vertices[id];
        if (
            !record(vertex) ||
            !['id', 'x', 'y', 'tileIds', 'edgeIds', 'neighborIds'].every((key) =>
                same(vertex[key], expected[key as keyof typeof expected]),
            )
        )
            return false;
        const building = vertex.building;
        if (
            building !== null &&
            !(
                record(building) &&
                (building.type === 'settlement' || building.type === 'city') &&
                typeof building.ownerId === 'string' &&
                owners.has(building.ownerId)
            )
        )
            return false;
    }
    for (const [id, expected] of Object.entries(topology.edges)) {
        const edge = edges[id];
        if (
            !record(edge) ||
            !['id', 'vertexIds', 'tileIds'].every((key) =>
                same(edge[key], expected[key as keyof typeof expected]),
            )
        )
            return false;
        if (
            edge.road !== null &&
            !(
                record(edge.road) &&
                typeof edge.road.ownerId === 'string' &&
                owners.has(edge.road.ownerId)
            )
        )
            return false;
    }
    if (
        board.ports.length !== 9 ||
        new Set(board.ports.map((port) => (record(port) ? port.id : null))).size !== 9 ||
        !board.ports.every(
            (port) =>
                record(port) &&
                topology.ports.some(
                    (expected) => expected.id === port.id && expected.edgeId === port.edgeId,
                ) &&
                (port.resource === null || RESOURCE_TYPES.some((r) => r === port.resource)),
        ) ||
        !same(
            board.ports.map((port) => port.resource).sort(),
            topology.ports.map((port) => port.resource).sort(),
        )
    )
        return false;
    const state = value as unknown as GameState;
    if (
        Object.values(state.board.vertices).some(
            (v) => v.building && v.neighborIds.some((id) => state.board.vertices[id].building),
        )
    )
        return false;
    const winners = state.players.filter(
        (player) => getVictoryPoints(state, player.id) >= state.victoryTarget,
    );
    return state.phase === 'finished'
        ? winners.length === 1 &&
              winners[0].id === state.winnerId &&
              state.winnerId === state.players[state.activePlayerIndex].id
        : state.winnerId === null && winners.length === 0;
}
