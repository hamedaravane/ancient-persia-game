import { RESOURCE_TYPES, type Board, type Player, type ResourceType, type RuleErrorCode } from './types';

export const BUILD_TYPES = ['road', 'settlement', 'city'] as const;
export type BuildType = (typeof BUILD_TYPES)[number];
export type ResourceCost = Readonly<Record<ResourceType, number>>;

export const ROAD_COST: ResourceCost = { wood: 1, brick: 1, wheat: 0, wool: 0, stone: 0 };
export const SETTLEMENT_COST: ResourceCost = { wood: 1, brick: 1, wheat: 1, wool: 1, stone: 0 };
export const CITY_COST: ResourceCost = { wood: 0, brick: 0, wheat: 2, wool: 0, stone: 3 };
export const BUILD_COSTS: Readonly<Record<BuildType, ResourceCost>> = {
    road: ROAD_COST, settlement: SETTLEMENT_COST, city: CITY_COST,
};

export function canAfford(player: Player, cost: ResourceCost): boolean {
    return RESOURCE_TYPES.every((resource) => player.resources[resource] >= cost[resource]);
}

/** Geometry/ownership validation shared by commands and read-only previews. */
export function getPlacementError(board: Board, playerId: string, type: BuildType, id: string): RuleErrorCode | null {
    if (type === 'road') {
        const edge = board.edges[id];
        if (!edge) return 'missing-target';
        if (edge.road) return 'occupied';
        const connected = edge.vertexIds.some((vertexId) => {
            const vertex = board.vertices[vertexId];
            if (vertex.building) return vertex.building.ownerId === playerId;
            return vertex.edgeIds.some((otherId) => otherId !== id && board.edges[otherId].road?.ownerId === playerId);
        });
        return connected ? null : 'not-connected';
    }
    const vertex = board.vertices[id];
    if (type === 'city') {
        return vertex?.building?.ownerId === playerId && vertex.building.type === 'settlement' ? null : 'missing-target';
    }
    if (!vertex) return 'missing-target';
    if (vertex.building) return 'occupied';
    if (vertex.neighborIds.some((neighborId) => board.vertices[neighborId].building)) return 'too-close';
    return vertex.edgeIds.some((edgeId) => board.edges[edgeId].road?.ownerId === playerId) ? null : 'not-connected';
}
