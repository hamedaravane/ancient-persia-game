import { canAfford, getPlacementError } from './building';
import { DEVELOPMENT_COST } from './developmentDeck';
import { beginRobber } from './robber';
import { getVictoryPoints, refreshAwards } from './scoring';
import {
    RESOURCE_TYPES,
    type ActionResult,
    type GameState,
    type ResourceType,
    type RuleErrorCode,
} from './types';

export type DevelopmentChoice = {
    resource?: ResourceType;
    resources?: [ResourceType, ResourceType];
};
const fail = (state: GameState, reason: RuleErrorCode): ActionResult => ({
    ok: false,
    state,
    reason,
});
export function developmentBuyError(state: GameState): RuleErrorCode | null {
    if (state.phase === 'finished') return 'game-finished';
    if (state.phase !== 'actions') return 'wrong-phase';
    if (!state.development?.deck.length) return 'deck-empty';
    return canAfford(state.players[state.activePlayerIndex], DEVELOPMENT_COST)
        ? null
        : 'insufficient-resources';
}
export function buyDevelopment(state: GameState): ActionResult {
    const error = developmentBuyError(state);
    if (error) return fail(state, error);
    const dev = state.development!;
    const player = state.players[state.activePlayerIndex];
    const card = { ...dev.deck[0], boughtOnRound: state.turn };
    const resources = Object.fromEntries(
        RESOURCE_TYPES.map((r) => [r, player.resources[r] - DEVELOPMENT_COST[r]]),
    ) as Record<ResourceType, number>;
    return {
        ok: true,
        state: {
            ...state,
            players: state.players.map((p) => (p.id === player.id ? { ...p, resources } : p)),
            development: {
                ...dev,
                deck: dev.deck.slice(1),
                hands: { ...dev.hands, [player.id]: [...dev.hands[player.id], card] },
            },
        },
    };
}
export function developmentPlayError(state: GameState, cardId: string): RuleErrorCode | null {
    if (state.phase === 'finished') return 'game-finished';
    if (!['roll', 'actions'].includes(state.phase)) return 'wrong-phase';
    const dev = state.development;
    const card = dev?.hands[state.players[state.activePlayerIndex].id].find((c) => c.id === cardId);
    if (!card || card.kind === 'victory-point') return 'invalid-card';
    if (dev!.playedThisTurn) return 'card-already-played';
    if (card.boughtOnRound >= state.turn) return 'card-too-new';
    if (card.kind === 'road-building') {
        const playerId = state.players[state.activePlayerIndex].id;
        if (
            Object.values(state.board.edges).filter((e) => e.road?.ownerId === playerId).length >=
            15
        )
            return 'road-supply';
        if (
            !Object.keys(state.board.edges).some(
                (id) => getPlacementError(state.board, playerId, 'road', id) === null,
            )
        )
            return 'not-connected';
    }
    return null;
}
export function playDevelopment(
    state: GameState,
    cardId: string,
    choice: DevelopmentChoice = {},
): ActionResult {
    const error = developmentPlayError(state, cardId);
    if (error) return fail(state, error);
    const dev = state.development!;
    const player = state.players[state.activePlayerIndex];
    const card = dev.hands[player.id].find((c) => c.id === cardId)!;
    if (card.kind === 'monopoly' && !RESOURCE_TYPES.includes(choice.resource!))
        return fail(state, 'invalid-card-choice');
    if (
        card.kind === 'year-of-plenty' &&
        (!Array.isArray(choice.resources) ||
            choice.resources.length !== 2 ||
            !choice.resources.every((r) => RESOURCE_TYPES.includes(r)))
    )
        return fail(state, 'invalid-card-choice');
    let next: GameState = {
        ...state,
        development: {
            ...dev,
            playedThisTurn: true,
            hands: {
                ...dev.hands,
                [player.id]: dev.hands[player.id].filter((c) => c.id !== cardId),
            },
            discard: [...dev.discard, { ...card, playedBy: player.id }],
        },
    };
    if (card.kind === 'knight') {
        next.development = {
            ...next.development!,
            knights: { ...dev.knights, [player.id]: dev.knights[player.id] + 1 },
        };
        return {
            ok: true,
            state: beginRobber(refreshAwards(next), 'knight', state.phase as 'roll' | 'actions'),
        };
    }
    if (card.kind === 'road-building')
        return {
            ok: true,
            state: {
                ...next,
                phase: 'road-building',
                roadBuilding: { remaining: 2, returnPhase: state.phase as 'roll' | 'actions' },
            },
        };
    if (card.kind === 'monopoly') {
        const resource = choice.resource!;
        const amount = state.players
            .filter((p) => p.id !== player.id)
            .reduce((sum, p) => sum + p.resources[resource], 0);
        if (!Number.isSafeInteger(player.resources[resource] + amount))
            return fail(state, 'invalid-card-choice');
        next = {
            ...next,
            players: state.players.map((p) => ({
                ...p,
                resources: {
                    ...p.resources,
                    [resource]: p.id === player.id ? p.resources[resource] + amount : 0,
                },
            })),
        };
    } else if (card.kind === 'year-of-plenty') {
        const resources = { ...player.resources };
        for (const r of choice.resources!) {
            resources[r]++;
            if (!Number.isSafeInteger(resources[r])) return fail(state, 'invalid-card-choice');
        }
        next = {
            ...next,
            players: state.players.map((p) => (p.id === player.id ? { ...p, resources } : p)),
        };
    }
    return { ok: true, state: next };
}
export function declareVictory(state: GameState): ActionResult {
    if (!['roll', 'actions'].includes(state.phase)) return fail(state, 'wrong-phase');
    const player = state.players[state.activePlayerIndex];
    return getVictoryPoints(state, player.id) >= state.victoryTarget
        ? { ok: true, state: { ...state, phase: 'finished', winnerId: player.id } }
        : fail(state, 'not-enough-points');
}
