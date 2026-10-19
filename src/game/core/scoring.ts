import type { Board, GameState } from './types';

/** Longest edge-simple trail. Junctions may branch; no segment can be counted twice. */
export function longestRoad(board: Board, playerId: string): number {
    const edges = Object.values(board.edges).filter((e) => e.road?.ownerId === playerId);
    const indexes = new Map(edges.map((e, i) => [e.id, BigInt(i)]));
    const memo = new Map<string, number>();
    const walk = (id: string, used: bigint): number => {
        const vertex = board.vertices[id];
        if (used && vertex.building && vertex.building.ownerId !== playerId) return 0;
        const key = `${id}/${used}`;
        const cached = memo.get(key);
        if (cached !== undefined) return cached;
        let best = 0;
        for (const edgeId of vertex.edgeIds) {
            const index = indexes.get(edgeId);
            if (index === undefined) continue;
            const bit = 1n << index;
            if (used & bit) continue;
            const edge = board.edges[edgeId];
            best = Math.max(
                best,
                1 +
                    walk(
                        edge.vertexIds.find((v) => v !== id)!,
                        used | bit,
                    ),
            );
        }
        memo.set(key, best);
        return best;
    };
    return Math.max(
        0,
        ...[...new Set(edges.flatMap((e) => e.vertexIds))].map((id) => walk(id, 0n)),
    );
}

/** Incumbents keep tied titles. Without a tied incumbent, a tie leaves the title unowned. */
export function titleOwner(
    values: Record<string, number>,
    incumbent: string | null,
    minimum: number,
): string | null {
    const highest = Math.max(minimum, ...Object.values(values));
    const leaders = Object.keys(values).filter(
        (id) => values[id] >= minimum && values[id] === highest,
    );
    if (incumbent && leaders.includes(incumbent)) return incumbent;
    return leaders.length === 1 ? leaders[0] : null;
}

export function refreshAwards(state: GameState): GameState {
    const roads = Object.fromEntries(
        state.players.map((p) => [p.id, longestRoad(state.board, p.id)]),
    );
    const armies = Object.fromEntries(
        state.players.map((p) => [p.id, state.development?.knights[p.id] ?? 0]),
    );
    return {
        ...state,
        awards: {
            longestRoad: titleOwner(roads, state.awards?.longestRoad ?? null, 5),
            largestArmy: titleOwner(armies, state.awards?.largestArmy ?? null, 3),
        },
    };
}

export function getVictoryPoints(state: GameState, playerId: string, includeHidden = true): number {
    const buildings = Object.values(state.board.vertices).reduce(
        (score, { building }) =>
            score + (building?.ownerId === playerId ? (building.type === 'city' ? 2 : 1) : 0),
        0,
    );
    const hidden =
        includeHidden || state.winnerId === playerId
            ? (state.development?.hands[playerId] ?? []).filter((c) => c.kind === 'victory-point')
                  .length
            : 0;
    return (
        buildings +
        hidden +
        (state.awards?.longestRoad === playerId ? 2 : 0) +
        (state.awards?.largestArmy === playerId ? 2 : 0)
    );
}
export const getPublicVictoryPoints = (state: GameState, playerId: string): number =>
    getVictoryPoints(state, playerId, false);

/** Public ten-point scores win automatically; private VP cards are revealed by declaration. */
export function resolvePublicVictory(state: GameState): GameState {
    if (!['roll', 'actions', 'road-building'].includes(state.phase)) return state;
    const player = state.players[state.activePlayerIndex];
    return getPublicVictoryPoints(state, player.id) >= state.victoryTarget
        ? { ...state, phase: 'finished', winnerId: player.id, roadBuilding: null }
        : state;
}
