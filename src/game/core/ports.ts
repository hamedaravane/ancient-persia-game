import {
    RESOURCE_TYPES,
    type Board,
    type BoardEdge,
    type Port,
    type RandomSource,
    type ResourceType,
    type TradeRatio,
} from './types';

export const BANK_TRADE_RATIO = 4;

export function getPortTradeRatio(port: Port): 2 | 3 {
    return port.resource === null ? 3 : 2;
}

/** Clockwise coastal cycle, starting at the upper-leftmost top corner. */
function coastalEdges(board: Board): BoardEdge[] {
    const boundary = Object.values(board.edges).filter((edge) => edge.tileIds.length === 1);
    const vertices = [...new Set(boundary.flatMap((edge) => edge.vertexIds))]
        .map((id) => board.vertices[id])
        .sort((a, b) => a.y - b.y || a.x - b.x);
    const start = vertices[0].id;
    const result: BoardEdge[] = [];
    let current = start;
    let previous: string | null = null;
    do {
        const choices = boundary.filter(
            (edge) => edge.vertexIds.includes(current) && edge.id !== previous,
        );
        // Both first edges leave the top corner downward; start towards the right.
        const edge = choices.sort((a, b) => {
            const other = (candidate: BoardEdge) =>
                board.vertices[candidate.vertexIds.find((id) => id !== current)!];
            return other(b).x - other(a).x;
        })[0];
        if (!edge || result.length >= boundary.length)
            throw new Error('The island coast must form one closed loop.');
        result.push(edge);
        previous = edge.id;
        current = edge.vertexIds.find((id) => id !== current)!;
    } while (current !== start);
    return result;
}

/** Nine fixed, spaced coastal slots; shuffle types as in variable CATAN setup. */
export function createPorts(board: Board, random: RandomSource): Port[] {
    const edges = coastalEdges(board);
    if (edges.length !== 30) throw new Error('The base island requires 30 coastal edges.');
    const resources: Array<ResourceType | null> = [null, null, null, null, ...RESOURCE_TYPES];
    for (let i = resources.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [resources[i], resources[j]] = [resources[j], resources[i]];
    }
    // One or two unused edges between ports; no intersection serves two ports.
    // Anchor to projecting coast segments so offshore markers do not converge in coves.
    return [3, 6, 9, 13, 16, 19, 23, 26, 29].map((index, i) => ({
        id: `port-${i + 1}`,
        edgeId: edges[index].id,
        resource: resources[i],
    }));
}

export function getPortOwnerId(board: Board, port: Port): string | null {
    return (
        board.edges[port.edgeId].vertexIds
            .map((id) => board.vertices[id].building?.ownerId)
            .find((id) => id !== undefined) ?? null
    );
}

export function getOwnedPorts(board: Board, playerId: string): Port[] {
    return board.ports.filter((port) => getPortOwnerId(board, port) === playerId);
}

/** Sorted best-first; retain ordinary bank trade even when a port is available. */
export function getBankTradeRates(
    board: Board,
    playerId: string,
    give: ResourceType,
): TradeRatio[] {
    const ports = getOwnedPorts(board, playerId);
    const rates: TradeRatio[] = [];
    if (ports.some((port) => port.resource === give)) rates.push(2);
    if (ports.some((port) => port.resource === null)) rates.push(3);
    rates.push(BANK_TRADE_RATIO);
    return rates;
}

export function getBankTradeRatio(board: Board, playerId: string, give: ResourceType): TradeRatio {
    return getBankTradeRates(board, playerId, give)[0];
}
