import { getSetupTargets, setupPlacementType } from './setup';
import { BUILD_COSTS, canAfford, type BuildType } from './building';
import type { GameCommand } from './commands';
import { getBuildOption, getProductionProbability } from './queries';
import { getVictoryPoints } from './game';
import { getBankTradeRatio } from './ports';
import { RESOURCE_TYPES, type GameState } from './types';

function siteValue(state: GameState, vertexId: string): number {
    const vertex = state.board.vertices[vertexId];
    const tiles = state.board.tiles.filter((t) => vertex.tileIds.includes(t.id) && t.resource);
    const production = tiles.reduce(
        (sum, tile) => sum + getProductionProbability(tile.number!).outcomes,
        0,
    );
    const variety = new Set(tiles.map((t) => t.resource)).size;
    const port = state.board.ports.some((p) =>
        state.board.edges[p.edgeId].vertexIds.includes(vertexId),
    );
    return production + variety * 2 + (port ? 2 : 0);
}

/** Find a useful expansion path, never build roads just to spend spare resources. */
function expansionRoad(state: GameState): string | null {
    const { board } = state;
    const owner = state.players[state.activePlayerIndex].id;
    const distances = new Map<string, { distance: number; firstEdge: string | null }>();
    const queue: string[] = [];
    for (const vertex of Object.values(board.vertices)) {
        if (vertex.building && vertex.building.ownerId !== owner) continue;
        if (
            vertex.building?.ownerId === owner ||
            vertex.edgeIds.some((id) => board.edges[id].road?.ownerId === owner)
        ) {
            distances.set(vertex.id, { distance: 0, firstEdge: null });
            queue.push(vertex.id);
        }
    }
    for (let i = 0; i < queue.length; i++) {
        const id = queue[i];
        const path = distances.get(id)!;
        for (const edgeId of board.vertices[id].edgeIds) {
            const edge = board.edges[edgeId];
            if (edge.road) continue;
            const next = edge.vertexIds.find((v) => v !== id)!;
            if (distances.has(next) || board.vertices[next].building) continue;
            distances.set(next, {
                distance: path.distance + 1,
                firstEdge: path.firstEdge ?? edgeId,
            });
            queue.push(next);
        }
    }
    return (
        [...distances]
            .filter(
                ([id, path]) =>
                    path.firstEdge &&
                    !board.vertices[id].building &&
                    board.vertices[id].neighborIds.every((n) => !board.vertices[n].building),
            )
            .sort(
                ([a, pa], [b, pb]) =>
                    (siteValue(state, b) + 1) / pb.distance -
                    (siteValue(state, a) + 1) / pa.distance,
            )[0]?.[1].firstEdge ?? null
    );
}

/** Deterministic, modest opponents: public board + own inventory, no dice/hand cheating. */
export function chooseBotCommand(state: GameState): GameCommand | null {
    if (state.phase === 'finished') return null;
    if (state.phase === 'setup-roll') return { kind: 'setup-roll' };
    const openingType = setupPlacementType(state);
    if (openingType) {
        const targets = getSetupTargets(state);
        const value = (id: string) =>
            openingType === 'settlement'
                ? siteValue(state, id)
                : Math.max(
                      ...state.board.edges[id].vertexIds.map((v) =>
                          Math.max(
                              ...state.board.vertices[v].neighborIds
                                  .filter((n) => !state.board.vertices[n].building)
                                  .map((n) => siteValue(state, n)),
                              0,
                          ),
                      ),
                  );
        targets.sort((a, b) => value(b) - value(a));
        return targets.length ? { kind: 'setup', type: openingType, targetId: targets[0] } : null;
    }
    if (state.phase === 'roll') return { kind: 'roll' };
    const player = state.players[state.activePlayerIndex];
    if (state.phase === 'robber') {
        const value = (id: string) => {
            const tile = state.board.tiles.find((t) => t.id === id)!;
            if (!tile.number) return 0;
            return tile.vertexIds.reduce((sum, vertexId) => {
                const building = state.board.vertices[vertexId].building;
                if (!building) return sum;
                const leader = getVictoryPoints(state, building.ownerId);
                return (
                    sum +
                    (building.ownerId === player.id ? -4 : 1 + leader / state.victoryTarget) *
                        (building.type === 'city' ? 2 : 1) *
                        getProductionProbability(tile.number!).outcomes
                );
            }, 0);
        };
        const target = state.board.tiles
            .filter((t) => !t.robber)
            .sort((a, b) => value(b.id) - value(a.id))[0];
        return { kind: 'robber', targetId: target.id };
    }
    const city = getBuildOption(state, 'city');
    const settlement = getBuildOption(state, 'settlement');
    const bestSite = (ids: string[]) =>
        [...ids].sort((a, b) => siteValue(state, b) - siteValue(state, a))[0];
    if (!city.reason)
        return { kind: 'build', type: 'city', targetId: bestSite(city.legalTargetIds) };
    if (!settlement.reason)
        return { kind: 'build', type: 'settlement', targetId: bestSite(settlement.legalTargetIds) };
    // Save a settlement's wood/brick instead of extending roads past a ready site.
    const road = settlement.legalTargetIds.length ? null : expansionRoad(state);
    if (road && canAfford(player, BUILD_COSTS.road))
        return { kind: 'build', type: 'road', targetId: road };
    const goals: BuildType[] = [];
    if (settlement.legalTargetIds.length) goals.push('settlement');
    if (city.legalTargetIds.length) goals.push('city');
    if (road) goals.push('road');
    const missing = (type: BuildType) =>
        RESOURCE_TYPES.reduce(
            (sum, r) => sum + Math.max(0, BUILD_COSTS[type][r] - player.resources[r]),
            0,
        );
    goals.sort((a, b) => missing(a) - missing(b));
    for (const goal of goals) {
        const cost = BUILD_COSTS[goal];
        for (const receive of RESOURCE_TYPES.filter((r) => player.resources[r] < cost[r])) {
            const give = RESOURCE_TYPES.find(
                (r) =>
                    r !== receive &&
                    player.resources[r] - cost[r] >= getBankTradeRatio(state.board, player.id, r),
            );
            if (give)
                return {
                    kind: 'trade',
                    give,
                    receive,
                    ratio: getBankTradeRatio(state.board, player.id, give),
                };
        }
    }
    return { kind: 'end-turn' };
}
