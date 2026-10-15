import type { ActionResult, GameState, RandomSource, RuleErrorCode } from './types';

export function isSetup(state: GameState): boolean {
    return (
        state.phase === 'setup-roll' ||
        state.phase === 'setup-settlement' ||
        state.phase === 'setup-road'
    );
}

/** Seats are clockwise. The last clockwise seat is also first counterclockwise. */
export function setupPlayerIndex(count: number, starter: number, pairIndex: number): number {
    return (starter + (pairIndex < count ? pairIndex : count * 2 - 1 - pairIndex)) % count;
}

export function setupPlacementType(state: GameState): 'settlement' | 'road' | null {
    return state.phase === 'setup-settlement'
        ? 'settlement'
        : state.phase === 'setup-road'
          ? 'road'
          : null;
}

function reject(state: GameState, reason: RuleErrorCode): ActionResult {
    return { ok: false, state, reason };
}

/** Opening rolls select the starter only: no production and no seven/robber effect. */
export function rollForStart(state: GameState, random: RandomSource = Math.random): ActionResult {
    if (state.phase !== 'setup-roll' || state.setup?.kind !== 'starter')
        return reject(state, 'wrong-phase');
    const setup = state.setup;
    const playerId = state.players[state.activePlayerIndex].id;
    const dice: [number, number] = [Math.floor(random() * 6) + 1, Math.floor(random() * 6) + 1];
    const rolls = { ...setup.rolls, [playerId]: dice };
    const lastRoll = { playerId, dice };
    const next = setup.contenders.find((index) => !rolls[state.players[index].id]);
    if (next !== undefined)
        return {
            ok: true,
            state: { ...state, activePlayerIndex: next, setup: { ...setup, rolls, lastRoll } },
        };
    const total = (index: number) =>
        rolls[state.players[index].id][0] + rolls[state.players[index].id][1];
    const highest = Math.max(...setup.contenders.map(total));
    const tied = setup.contenders.filter((index) => total(index) === highest);
    if (tied.length > 1)
        return {
            ok: true,
            state: {
                ...state,
                activePlayerIndex: tied[0],
                setup: { kind: 'starter', contenders: tied, rolls: {}, lastRoll },
            },
        };
    const starter = tied[0];
    return {
        ok: true,
        state: {
            ...state,
            activePlayerIndex: starter,
            startingPlayerIndex: starter,
            phase: 'setup-settlement',
            setup: { kind: 'placement', settlements: [], settlementId: null, lastRoll },
        },
    };
}

/** Initial settlements ignore road connection; initial roads attach to this pair's settlement. */
export function getSetupPlacementError(state: GameState, targetId: string): RuleErrorCode | null {
    if (state.setup?.kind !== 'placement') return 'wrong-phase';
    if (state.phase === 'setup-settlement') {
        const vertex = state.board.vertices[targetId];
        if (!vertex) return 'missing-target';
        if (vertex.building) return 'occupied';
        return vertex.neighborIds.some((id) => state.board.vertices[id].building)
            ? 'too-close'
            : null;
    }
    if (state.phase === 'setup-road') {
        const edge = state.board.edges[targetId];
        if (!edge) return 'missing-target';
        if (edge.road) return 'occupied';
        return state.setup.settlementId && edge.vertexIds.includes(state.setup.settlementId)
            ? null
            : 'not-connected';
    }
    return 'wrong-phase';
}

export function getSetupTargets(state: GameState): string[] {
    const ids =
        state.phase === 'setup-road'
            ? Object.keys(state.board.edges)
            : Object.keys(state.board.vertices);
    return ids.filter((id) => getSetupPlacementError(state, id) === null);
}

/** Free, confirmed placement. A second settlement grants its adjacent resources exactly once. */
export function placeInitialPiece(
    state: GameState,
    type: 'settlement' | 'road',
    targetId: string,
): ActionResult {
    if (setupPlacementType(state) !== type || state.setup?.kind !== 'placement')
        return reject(state, 'wrong-phase');
    const error = getSetupPlacementError(state, targetId);
    if (error) return reject(state, error);
    const setup = state.setup;
    const player = state.players[state.activePlayerIndex];
    if (type === 'settlement') {
        const vertex = state.board.vertices[targetId];
        const resources = { ...player.resources };
        if (setup.settlements.length >= state.players.length) {
            for (const tile of state.board.tiles)
                if (vertex.tileIds.includes(tile.id) && tile.resource)
                    resources[tile.resource] += 1;
        }
        const players = [...state.players];
        players[state.activePlayerIndex] = { ...player, resources };
        return {
            ok: true,
            state: {
                ...state,
                players,
                phase: 'setup-road',
                setup: { ...setup, settlementId: targetId },
                board: {
                    ...state.board,
                    vertices: {
                        ...state.board.vertices,
                        [targetId]: {
                            ...vertex,
                            building: { type: 'settlement', ownerId: player.id },
                        },
                    },
                },
            },
        };
    }
    const edge = state.board.edges[targetId];
    const board = {
        ...state.board,
        edges: { ...state.board.edges, [targetId]: { ...edge, road: { ownerId: player.id } } },
    };
    const settlements = [...setup.settlements, setup.settlementId!];
    if (settlements.length === state.players.length * 2)
        return {
            ok: true,
            state: {
                ...state,
                board,
                setup: null,
                phase: 'roll',
                activePlayerIndex: state.startingPlayerIndex ?? 0,
                lastRoll: null,
            },
        };
    return {
        ok: true,
        state: {
            ...state,
            board,
            phase: 'setup-settlement',
            activePlayerIndex: setupPlayerIndex(
                state.players.length,
                state.startingPlayerIndex ?? 0,
                settlements.length,
            ),
            setup: { ...setup, settlements, settlementId: null },
        },
    };
}
