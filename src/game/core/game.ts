import { getProduction } from './production';
import { canAfford, CITY_COST, ROAD_COST, SETTLEMENT_COST, getPlacementError } from './building';
export { CITY_COST, ROAD_COST, SETTLEMENT_COST } from './building';
import { createBoard } from './board';
import { getBankTradeRates, getBankTradeRatio } from './ports';
export { BANK_TRADE_RATIO } from './ports';
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
    type TradeRatio,
} from './types';

export const VICTORY_TARGET = 6;

// Saturated ownership hues stand apart from the green/gold/stone terrain art.
// These are session defaults; piece renderers accept any runtime RGB color.
export const PLAYER_COLORS = [0x438bff, 0xff526e, 0x26d4e8, 0xc16bff] as const;

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

    return Math.min(
        ...occupiedVertices.map((other) => (vertex.x - other.x) ** 2 + (vertex.y - other.y) ** 2),
    );
}

function placeStartingPieces(board: Board, players: Player[]): { board: Board; players: Player[] } {
    const vertices = Object.fromEntries(
        Object.entries(board.vertices).map(([id, vertex]) => [id, { ...vertex }]),
    );
    const edges = Object.fromEntries(
        Object.entries(board.edges).map(([id, edge]) => [id, { ...edge }]),
    );
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
            .filter((vertex) =>
                vertex.neighborIds.every((neighborId) => vertices[neighborId].building === null),
            )
            .sort(
                (a, b) =>
                    closestExistingDistance(b, occupied) - closestExistingDistance(a, occupied),
            );
        const settlementVertex = candidates[0];

        if (!settlementVertex) {
            throw new Error('Board setup could not place a starting settlement.');
        }

        settlementVertex.building = { type: 'settlement', ownerId: player.id };
        occupied.push(settlementVertex);

        const startingEdge = settlementVertex.edgeIds
            .map((edgeId) => edges[edgeId])
            .find(({ road }) => road === null);

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

    for (const grant of getProduction(state, total)) {
        const resources = gains.get(grant.playerId) ?? emptyResources();
        resources[grant.resource] += grant.amount;
        gains.set(grant.playerId, resources);
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

    const placementError = getPlacementError(state.board, player.id, 'road', edgeId);
    if (placementError) return failure(state, placementError);
    const edge = state.board.edges[edgeId];

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

    const placementError = getPlacementError(state.board, player.id, 'settlement', vertexId);
    if (placementError) return failure(state, placementError);
    const vertex = state.board.vertices[vertexId];

    if (!canAfford(player, SETTLEMENT_COST)) {
        return failure(state, 'insufficient-resources');
    }

    const updatedVertex: BoardVertex = {
        ...vertex,
        building: { type: 'settlement', ownerId: player.id },
    };
    const board = {
        ...state.board,
        vertices: { ...state.board.vertices, [vertexId]: updatedVertex },
    };
    return success(gameWithPlayerAndBoard(state, pay(player, SETTLEMENT_COST), board));
}

export function upgradeCity(state: GameState, vertexId: string): ActionResult {
    const player = currentActionsPlayer(state);

    if (!player) {
        return failure(state, state.phase === 'finished' ? 'game-finished' : 'wrong-phase');
    }

    const placementError = getPlacementError(state.board, player.id, 'city', vertexId);
    if (placementError) return failure(state, placementError);
    const vertex = state.board.vertices[vertexId];

    if (!canAfford(player, CITY_COST)) {
        return failure(state, 'insufficient-resources');
    }

    const updatedVertex: BoardVertex = {
        ...vertex,
        building: { type: 'city', ownerId: player.id },
    };
    const board = {
        ...state.board,
        vertices: { ...state.board.vertices, [vertexId]: updatedVertex },
    };
    return success(gameWithPlayerAndBoard(state, pay(player, CITY_COST), board));
}

export function tradeWithBank(
    state: GameState,
    give: ResourceType,
    receive: ResourceType,
    ratio: TradeRatio = getBankTradeRatio(
        state.board,
        state.players[state.activePlayerIndex].id,
        give,
    ),
): ActionResult {
    const player = currentActionsPlayer(state);

    if (!player) {
        return failure(state, state.phase === 'finished' ? 'game-finished' : 'wrong-phase');
    }

    const error = getBankTradeError(state, give, receive, ratio);
    if (error) return failure(state, error);

    const resources = { ...player.resources };
    resources[give] -= ratio;
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

/** Shared by bank commands and read-only exchange previews. */
export function getBankTradeError(
    state: GameState,
    give: ResourceType,
    receive: ResourceType,
    ratio: TradeRatio = getBankTradeRatio(
        state.board,
        state.players[state.activePlayerIndex].id,
        give,
    ),
): RuleErrorCode | null {
    if (state.phase === 'finished' || state.winnerId !== null) return 'game-finished';
    if (state.phase !== 'actions') return 'wrong-phase';
    if (give === receive) return 'same-resource-trade';
    const player = state.players[state.activePlayerIndex];
    if (!getBankTradeRates(state.board, player.id, give).includes(ratio))
        return 'invalid-trade-ratio';
    return player.resources[give] < ratio ? 'insufficient-resources' : null;
}
