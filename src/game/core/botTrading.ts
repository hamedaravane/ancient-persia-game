import { BUILD_COSTS, type ResourceCost } from './building';
import { expansionRoad } from './bot';
import { getBuildOption, getProductionProbability } from './queries';
import { getVictoryPoints } from './game';
import {
    emptyBundle,
    type ResourceBundle,
    type TradeOffer,
    type TradeTerms,
} from './domesticTrade';
import { RESOURCE_TYPES, type GameState } from './types';

function plan(state: GameState, playerId: string): ResourceCost {
    const index = state.players.findIndex((p) => p.id === playerId);
    const view = { ...state, activePlayerIndex: index, phase: 'actions' as const };
    const own = state.players[index].resources;
    const goals = (['city', 'settlement', 'road'] as const).filter((kind) =>
        kind === 'road'
            ? !!expansionRoad(view)
            : getBuildOption(view, kind).legalTargetIds.length > 0,
    );
    const value = (kind: (typeof goals)[number]) =>
        (kind === 'road' ? 1.5 : 4) /
        (1 + RESOURCE_TYPES.reduce((n, r) => n + Math.max(0, BUILD_COSTS[kind][r] - own[r]), 0));
    return BUILD_COSTS[goals.sort((a, b) => value(b) - value(a))[0] ?? 'city'];
}

function utility(
    state: GameState,
    playerId: string,
    hand: ResourceBundle,
    goal: ResourceCost,
): number {
    const production = emptyBundle();
    for (const tile of state.board.tiles)
        if (tile.resource && tile.number) {
            for (const vertexId of tile.vertexIds) {
                const building = state.board.vertices[vertexId].building;
                if (building?.ownerId === playerId)
                    production[tile.resource] +=
                        getProductionProbability(tile.number).outcomes *
                        (building.type === 'city' ? 2 : 1);
            }
        }
    return RESOURCE_TYPES.reduce(
        (n, r) => {
            const reserved = Math.min(hand[r], goal[r]);
            const spare = Math.max(0, hand[r] - goal[r]);
            return (
                n +
                reserved * (3.5 + (production[r] === 0 ? 0.5 : 0)) +
                Math.min(spare, 3) +
                Math.max(0, spare - 3) * 0.3
            );
        },
        RESOURCE_TYPES.every((r) => hand[r] >= goal[r]) ? 6 : 0,
    );
}

/** Deliberately reads only this bot's inventory plus public geometry/ownership/scores. */
export function botTradeValue(state: GameState, botId: string, terms: TradeTerms): number {
    const bot = state.players.find((p) => p.id === botId)!;
    const outgoing = terms.from === botId ? terms.give : terms.want;
    const incoming = terms.from === botId ? terms.want : terms.give;
    if (RESOURCE_TYPES.some((r) => outgoing[r] > bot.resources[r])) return -Infinity;
    const after = { ...bot.resources };
    for (const r of RESOURCE_TYPES) after[r] += incoming[r] - outgoing[r];
    const goal = plan(state, botId);
    return utility(state, botId, after, goal) - utility(state, botId, bot.resources, goal);
}

export type BotTradeDecision =
    | { kind: 'accept' | 'reject'; reason: TradeOffer['reason'] }
    | { kind: 'counter'; terms: TradeTerms; reason: 'better-price' };
export function evaluateBotTrade(
    state: GameState,
    botId: string,
    offer: TradeOffer,
): BotTradeDecision {
    const index = state.players.findIndex((p) => p.id === botId);
    const otherId = offer.from === botId ? offer.to : offer.from;
    const ownScore = getVictoryPoints(state, botId);
    if (
        getVictoryPoints(state, otherId) >= state.victoryTarget - 1 &&
        ownScore < state.victoryTarget - 1
    )
        return { kind: 'reject', reason: 'leader' };
    const threshold = [0.35, 0.6, 0.05][Math.max(0, index - 1) % 3];
    const gain = botTradeValue(state, botId, offer);
    if (gain >= threshold) return { kind: 'accept', reason: 'useful' };
    if (gain === -Infinity) return { kind: 'reject', reason: 'unavailable' };
    // One counter per bot per thread keeps autonomous bots out of endless bargaining loops.
    if (offer.parentId === undefined) {
        for (const r of RESOURCE_TYPES.filter((r) => offer.give[r] > 0)) {
            for (const extra of [1, 2]) {
                const terms = {
                    from: botId,
                    to: offer.from,
                    give: { ...offer.want },
                    want: { ...offer.give, [r]: offer.give[r] + extra },
                };
                if (botTradeValue(state, botId, terms) >= threshold)
                    return { kind: 'counter', terms, reason: 'better-price' };
            }
        }
        for (const r of RESOURCE_TYPES.filter((r) => offer.want[r] > 1)) {
            const terms = {
                from: botId,
                to: offer.from,
                give: { ...offer.want, [r]: offer.want[r] - 1 },
                want: { ...offer.give },
            };
            if (botTradeValue(state, botId, terms) >= threshold)
                return { kind: 'counter', terms, reason: 'better-price' };
        }
    }
    return { kind: 'reject', reason: 'protecting-plan' };
}

export function proposeBotTrade(
    state: GameState,
    botId: string,
    targetId: string,
): TradeTerms | null {
    if (state.phase !== 'actions' || botId === targetId) return null;
    const bot = state.players.find((p) => p.id === botId)!;
    if (
        getVictoryPoints(state, targetId) >= state.victoryTarget - 1 &&
        getVictoryPoints(state, botId) < state.victoryTarget - 1
    )
        return null;
    const goal = plan(state, botId);
    const wanted = RESOURCE_TYPES.filter((r) => bot.resources[r] < goal[r]);
    const surplus = RESOURCE_TYPES.filter((r) => bot.resources[r] > goal[r]).sort(
        (a, b) => bot.resources[b] - goal[b] - (bot.resources[a] - goal[a]),
    );
    for (const want of wanted)
        for (const give of surplus) {
            if (want === give) continue;
            const terms = {
                from: botId,
                to: targetId,
                give: { ...emptyBundle(), [give]: 1 },
                want: { ...emptyBundle(), [want]: 1 },
            };
            if (botTradeValue(state, botId, terms) > 0) return terms;
        }
    return null;
}
