import { createBoard } from './board';
import {
    RESOURCE_TYPES,
    type ActionResult,
    type Board,
    type BoardEdge,
    type BoardVertex,
    type GameState,
    type Player,
    type RandomSource,
    type ResourceType,
    type RuleErrorCode,
} from './types';

export const BANK_TRADE_RATIO = 4;
export const CITY_COST: Readonly<Record<ResourceType, number>> = {
    wood: 0,
    brick: 0,
    wheat: 2,
    wool: 0,
    stone: 3,
};
export const ROAD_COST: Readonly<Record<ResourceType, number>> = {
    wood: 1,
    brick: 1,
    wheat: 0,
    wool: 0,
    stone: 0,
};
export const SETTLEMENT_COST: Readonly<Record<ResourceType, number>> = {
    wood: 1,
    brick: 1,
    wheat: 1,
    wool: 1,
    stone: 0,
};
export const VICTORY_TARGET = 6;

const PLAYER_COLORS = [0x5cb7b5, 0xd97745, 0xd5b452, 0x9d7ac8];

function emptyResources(): Player['resources'] {
    return { wood: 0, brick: 0, wheat: 0, wool: 0, stone: 0 };
}

function failure(state: GameState, reason: RuleErrorCode): ActionResult {
    return { ok: false, state, reason };
}

function success(state: GameState): ActionResult {
    return { ok: true, state };
}

function currentPlayer(state: GameState): Player {
    return state.players[state.activePlayerIndex];
}

function canAfford(player: Player, cost: Readonly<Record<ResourceType, number>>): boolean {
    return RESOURCE_TYPES.every((resource) => player.resources[resource] >= cost[resource]);
}

function pay(player: Player, cost: Readonly<Record<ResourceType, number>>): Player {
    const resources = { ...player.resources };

    for (const resource of RESOURCE_TYPES) {
        resources[resource] -= cost[resource];
    }

    return { ...player, resources };
}

function updateCurrentPlayer(state: GameState, updated: Player): GameState {
    const players = [...state.players];
    players[state.activePlayerIndex] = updated;
    return { ...state, players };
}

function currentActionsPlayer(state: GameState): Player | null {
    return state.phase === 'actions' && state.winnerId === null ? currentPlayer(state) : null;
}

function closestExistingDistance(vertex: BoardVertex, occupiedVertices: BoardVertex[]): number {
    if (occupiedVertices.length === 0) {
        return vertex.x * vertex.x + vertex.y * vertex.y;
    }

    return Math.min(...occupiedVertices.map((other) => (vertex.x - other.x) ** 2 + (vertex.y - other.y) ** 2));
}

function placeStartingPieces(board: Board, players: Player[]): { board: Board; players: Player[] } {
    const vertices = Object.fromEntries(
        Object.entries(board.vertices).map(([id, vertex]) => [id, { ...vertex }]),
    );
    const edges = Object.fromEntries(Object.entries(board.edges).map(([id, edge]) => [id, { ...edge }]));
    const tiles = board.tiles;
    const occupied: BoardVertex[] = [];
    const startingOrder = [...players, ...[...players].reverse()];
    const startingCounts = new Map<string, number>(players.map(({ id }) => [id, 0] as const));
    const startingResources = new Map<string, Player['resources']>(
        players.map(({ id }) => [id, emptyResources()] as const),
    );

    for (const player of startingOrder) {
        const candidates = Object.values(vertices)
            .filter((vertex) => vertex.building === null)
            .filter((vertex) => vertex.neighborIds.every((neighborId) => vertices[neighborId].building === null))
            .sort((a, b) => closestExistingDistance(b, occupied) - closestExistingDistance(a, occupied));
        const settlementVertex = candidates[0];

        if (!settlementVertex) {
            throw new Error('Board setup could not place a starting settlement.');
        }

        settlementVertex.building = { type: 'settlement', ownerId: player.id };
        occupied.push(settlementVertex);

        const startingEdge = settlementVertex.edgeIds.map((edgeId) => edges[edgeId]).find(({ road }) => road === null);

        if (!startingEdge) {
            throw new Error('Board setup could not place a starting road.');
        }

        startingEdge.road = { ownerId: player.id };

        const placedCount = (startingCounts.get(player.id) ?? 0) + 1;
        startingCounts.set(player.id, placedCount);

        if (placedCount === 2) {
            const resources = startingResources.get(player.id)!;

            for (const tileId of settlementVertex.tileIds) {
                const tile = tiles.find(({ id }) => id === tileId);

                if (tile?.resource && !tile.robber) {
                    resources[tile.resource] += 1;
                }
            }
        }
    }

    const playersWithStartingResources = players.map((player) => ({
        ...player,
        resources: startingResources.get(player.id)!,
    }));

    return { board: { ...board, vertices, edges }, players: playersWithStartingResources };
}

export function createGame(playerNames: string[], random: RandomSource = Math.random): GameState {
    if (playerNames.length < 3 || playerNames.length > 4) {
        throw new RangeError('The local MVP supports three or four players.');
    }

    const players = playerNames.map((name, index): Player => ({
        id: `player-${index + 1}`,
        name: name.trim() || `Player ${index + 1}`,
        color: PLAYER_COLORS[index],
        resources: emptyResources(),
    }));
    const setup = placeStartingPieces(createBoard(random), players);

    return {
        board: setup.board,
        players: setup.players,
        activePlayerIndex: 0,
        turn: 1,
        phase: 'roll',
        lastRoll: null,
        winnerId: null,
        victoryTarget: VICTORY_TARGET,
    };
}

export function getVictoryPoints(state: GameState, playerId: string): number {
    return Object.values(state.board.vertices).reduce((score, { building }) => {
        if (building?.ownerId !== playerId) {
            return score;
        }

        return score + (building.type === 'city' ? 2 : 1);
    }, 0);
}

export function rollDice(state: GameState, random: RandomSource = Math.random): ActionResult {
    if (state.phase !== 'roll') {
        return failure(state, 'wrong-phase');
    }

    const first = Math.floor(random() * 6) + 1;
    const second = Math.floor(random() * 6) + 1;
    const total = first + second;
    const lastRoll: [number, number] = [first, second];

    if (total === 7) {
        return success({ ...state, lastRoll, phase: 'robber' });
    }

    const gains = new Map<string, Player['resources']>();

    for (const tile of state.board.tiles) {
        if (tile.number !== total || tile.robber || tile.resource === null) {
            continue;
        }

        for (const vertexId of tile.vertexIds) {
            const building = state.board.vertices[vertexId].building;

            if (!building) {
                continue;
            }

            const player = state.players.find(({ id }) => id === building.ownerId);

            if (!player) {
                continue;
            }

            const resources = gains.get(player.id) ?? emptyResources();
            resources[tile.resource] += building.type === 'city' ? 2 : 1;
            gains.set(player.id, resources);
        }
    }

    const players = state.players.map((player) => {
        const produced = gains.get(player.id);

        if (!produced) {
            return player;
        }

        const resources = { ...player.resources };

        for (const resource of RESOURCE_TYPES) {
            resources[resource] += produced[resource];
        }

        return { ...player, resources };
    });

    return success({ ...state, players, lastRoll, phase: 'actions' });
}

export function moveRobber(state: GameState, tileId: string): ActionResult {
    if (state.phase !== 'robber') {
        return failure(state, 'wrong-phase');
    }

    if (!state.board.tiles.some(({ id }) => id === tileId)) {
        return failure(state, 'missing-target');
    }

    if (state.board.tiles.find(({ robber }) => robber)?.id === tileId) {
        return failure(state, 'same-robber-tile');
    }

    const tiles = state.board.tiles.map((tile) => ({ ...tile, robber: tile.id === tileId }));
    return success({ ...state, board: { ...state.board, tiles }, phase: 'actions' });
}

function gameWithPlayerAndBoard(state: GameState, player: Player, board: Board): GameState {
    const changed = updateCurrentPlayer(state, player);
    const next = { ...changed, board };
    const points = getVictoryPoints(next, player.id);

    if (points >= state.victoryTarget) {
        return { ...next, winnerId: player.id, phase: 'finished' };
    }

    return next;
}

export function buildRoad(state: GameState, edgeId: string): ActionResult {
    const player = currentActionsPlayer(state);

    if (!player) {
        return failure(state, state.phase === 'finished' ? 'game-finished' : 'wrong-phase');
    }

    const edge = state.board.edges[edgeId];

    if (!edge) {
        return failure(state, 'missing-target');
    }

    if (edge.road) {
        return failure(state, 'occupied');
    }

    const connectsToNetwork = edge.vertexIds.some((vertexId) => {
        const vertex = state.board.vertices[vertexId];

        if (vertex.building) {
            return vertex.building.ownerId === player.id;
        }

        return vertex.edgeIds.some((connectedEdgeId) => (
            connectedEdgeId !== edgeId && state.board.edges[connectedEdgeId].road?.ownerId === player.id
        ));
    });

    if (!connectsToNetwork) {
        return failure(state, 'not-connected');
    }

    if (!canAfford(player, ROAD_COST)) {
        return failure(state, 'insufficient-resources');
    }

    const updatedEdge: BoardEdge = { ...edge, road: { ownerId: player.id } };
    const board = { ...state.board, edges: { ...state.board.edges, [edgeId]: updatedEdge } };
    return success(gameWithPlayerAndBoard(state, pay(player, ROAD_COST), board));
}

export function buildSettlement(state: GameState, vertexId: string): ActionResult {
    const player = currentActionsPlayer(state);

    if (!player) {
        return failure(state, state.phase === 'finished' ? 'game-finished' : 'wrong-phase');
    }

    const vertex = state.board.vertices[vertexId];

    if (!vertex) {
        return failure(state, 'missing-target');
    }

    if (vertex.building) {
        return failure(state, 'occupied');
    }

    if (vertex.neighborIds.some((neighborId) => state.board.vertices[neighborId].building !== null)) {
        return failure(state, 'too-close');
    }

    if (!vertex.edgeIds.some((edgeId) => state.board.edges[edgeId].road?.ownerId === player.id)) {
        return failure(state, 'not-connected');
    }

    if (!canAfford(player, SETTLEMENT_COST)) {
        return failure(state, 'insufficient-resources');
    }

    const updatedVertex: BoardVertex = {
        ...vertex,
        building: { type: 'settlement', ownerId: player.id },
    };
    const board = { ...state.board, vertices: { ...state.board.vertices, [vertexId]: updatedVertex } };
    return success(gameWithPlayerAndBoard(state, pay(player, SETTLEMENT_COST), board));
}

export function upgradeCity(state: GameState, vertexId: string): ActionResult {
    const player = currentActionsPlayer(state);

    if (!player) {
        return failure(state, state.phase === 'finished' ? 'game-finished' : 'wrong-phase');
    }

    const vertex = state.board.vertices[vertexId];

    if (!vertex?.building || vertex.building.ownerId !== player.id || vertex.building.type !== 'settlement') {
        return failure(state, 'missing-target');
    }

    if (!canAfford(player, CITY_COST)) {
        return failure(state, 'insufficient-resources');
    }

    const updatedVertex: BoardVertex = {
        ...vertex,
        building: { type: 'city', ownerId: player.id },
    };
    const board = { ...state.board, vertices: { ...state.board.vertices, [vertexId]: updatedVertex } };
    return success(gameWithPlayerAndBoard(state, pay(player, CITY_COST), board));
}

export function tradeWithBank(
    state: GameState,
    give: ResourceType,
    receive: ResourceType,
): ActionResult {
    const player = currentActionsPlayer(state);

    if (!player) {
        return failure(state, state.phase === 'finished' ? 'game-finished' : 'wrong-phase');
    }

    if (give === receive) {
        return failure(state, 'same-resource-trade');
    }

    if (player.resources[give] < BANK_TRADE_RATIO) {
        return failure(state, 'insufficient-resources');
    }

    const resources = { ...player.resources };
    resources[give] -= BANK_TRADE_RATIO;
    resources[receive] += 1;
    return success(updateCurrentPlayer(state, { ...player, resources }));
}

export function endTurn(state: GameState): ActionResult {
    if (state.phase !== 'actions' || state.winnerId !== null) {
        return failure(state, state.phase === 'finished' ? 'game-finished' : 'wrong-phase');
    }

    const activePlayerIndex = (state.activePlayerIndex + 1) % state.players.length;
    const turn = state.turn + (activePlayerIndex === 0 ? 1 : 0);

    return success({ ...state, activePlayerIndex, turn, phase: 'roll', lastRoll: null });
}

export function getPlayerById(state: GameState, playerId: string): Player | undefined {
    return state.players.find(({ id }) => id === playerId);
}
