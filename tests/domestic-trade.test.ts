import { expect, test } from 'vitest';
import { createReadyGame } from './helpers/setup';
import {
    domesticTradeError,
    emptyBundle,
    TradeTable,
    tradeWithPlayer,
    type ResourceBundle,
    type TradeTerms,
} from '../src/game/core/domesticTrade';
import { RESOURCE_TYPES, type GamePhase } from '../src/game/core/types';
import { botTradeValue, evaluateBotTrade, proposeBotTrade } from '../src/game/core/botTrading';

const bundle = (parts: Partial<ResourceBundle>) => ({ ...emptyBundle(), ...parts });
function fixture() {
    const state = createReadyGame(['H', 'A', 'B', 'C'], () => 0.5);
    state.phase = 'actions';
    state.lastRoll = [2, 3];
    state.players.forEach((p) => {
        p.resources = bundle({ wood: 8, brick: 8, wheat: 8, wool: 8, stone: 8 });
    });
    const terms: TradeTerms = {
        from: 'player-1',
        to: 'player-2',
        give: bundle({ wood: 2, wool: 1 }),
        want: bundle({ wheat: 1, stone: 2 }),
    };
    return { state, terms };
}

test('multi-resource trades conserve every resource and change only the two hands atomically', () => {
    const { state, terms } = fixture();
    const before = structuredClone(state);
    const result = tradeWithPlayer(state, terms);
    expect(result.ok).toBe(true);
    expect(state).toEqual(before);
    expect(result.state.board).toBe(state.board);
    expect(result.state.players[2]).toBe(state.players[2]);
    expect(result.state.players[0].resources).toEqual(
        bundle({ wood: 6, brick: 8, wheat: 9, wool: 7, stone: 10 }),
    );
    for (const r of RESOURCE_TYPES)
        expect(result.state.players.reduce((n, p) => n + p.resources[r], 0)).toBe(
            state.players.reduce((n, p) => n + p.resources[r], 0),
        );
});

test.each<GamePhase>([
    'setup-roll',
    'setup-settlement',
    'setup-road',
    'roll',
    'robber',
    'finished',
])('domestic trades are forbidden during %s', (phase) => {
    const { state, terms } = fixture();
    state.phase = phase;
    expect(tradeWithPlayer(state, terms).ok).toBe(false);
});

test('only pairs involving the active player may trade, in either proposal direction', () => {
    const { state, terms } = fixture();
    expect(domesticTradeError(state, { ...terms, from: terms.to, to: terms.from })).toBeNull();
    for (const change of [{ from: 'player-3' }, { to: 'player-1' }, { to: 'missing' }]) {
        const result = tradeWithPlayer(state, { ...terms, ...change });
        expect(result).toEqual({ ok: false, state, reason: 'invalid-trade-partner' });
    }
});

test.each([
    {},
    { wood: -1 },
    { wood: 0.5 },
    { wood: NaN },
    { wood: Infinity },
    { wood: Number.MAX_SAFE_INTEGER + 1 },
])('empty/invalid outgoing bundle is rejected (%j)', (parts) => {
    const { state, terms } = fixture();
    expect(tradeWithPlayer(state, { ...terms, give: bundle(parts) }).ok).toBe(false);
});

test('no gifts, overlap, missing fields, extra card types, or overspending by either side', () => {
    const { state, terms } = fixture();
    for (const invalid of [
        { ...terms, want: emptyBundle() },
        { ...terms, want: bundle({ wood: 1 }) },
        { ...terms, give: bundle({ wood: 9 }) },
        { ...terms, want: bundle({ stone: 9 }) },
        { ...terms, give: { wood: 1 } as ResourceBundle },
        { ...terms, give: { ...terms.give, card: 1 } as ResourceBundle },
    ]) {
        const before = structuredClone(state);
        const result = tradeWithPlayer(state, invalid);
        expect(result.ok).toBe(false);
        expect(result.state).toBe(state);
        expect(state).toEqual(before);
    }
});

test('offers and counteroffers hold no resources; only the recipient can accept, then participants confirm once', () => {
    const { state, terms } = fixture();
    const table = new TradeTable();
    const before = structuredClone(state);
    const offer = table.propose(state, terms)!;
    expect(table.respond(state, offer.id, 'player-3', true)).toBe(false);
    expect(table.confirm(state, offer.id, terms.from).ok).toBe(false);
    const counter = table.propose(
        state,
        { from: terms.to, to: terms.from, give: terms.want, want: bundle({ wood: 3 }) },
        offer.id,
    )!;
    expect(offer.status).toBe('countered');
    expect(table.respond(state, offer.id, terms.to, true)).toBe(false);
    expect(table.respond(state, counter.id, terms.from, true)).toBe(true);
    expect(state).toEqual(before);
    expect(table.confirm(state, counter.id, 'player-3').ok).toBe(false);
    const result = table.confirm(state, counter.id, terms.from);
    expect(result.ok).toBe(true);
    expect(table.confirm(result.state, counter.id, terms.from).ok).toBe(false);
});

test('a request does not need recipient inventory knowledge; final acceptance and commit revalidate it', () => {
    const { state, terms } = fixture();
    state.players[1].resources = emptyBundle();
    const table = new TradeTable();
    const offer = table.propose(state, terms)!;
    expect(offer.status).toBe('open');
    expect(table.respond(state, offer.id, terms.to, true)).toBe(false);
    state.players[1].resources = bundle({ stone: 2, wheat: 1 });
    expect(table.respond(state, offer.id, terms.to, true)).toBe(true);
    state.players[1].resources.stone = 0;
    expect(table.confirm(state, offer.id, terms.from).ok).toBe(false);
    expect(offer.status).toBe('expired');
});

test('accepting one broadcast cancels competing promises, and turn changes expire all offers', () => {
    const { state, terms } = fixture();
    const table = new TradeTable();
    const one = table.propose(state, terms)!;
    const two = table.propose(state, { ...terms, to: 'player-3' })!;
    table.respond(state, one.id, one.to, true);
    table.respond(state, two.id, two.to, true);
    const result = table.confirm(state, one.id, one.from);
    expect(result.ok).toBe(true);
    expect(two.status).toBe('withdrawn');
    expect(table.confirm(result.state, two.id, two.from).ok).toBe(false);
    table.propose(result.state, terms);
    const snapshot = table.snapshot();
    snapshot.offers[0].give.wood = 123;
    expect(table.offers[0].give.wood).toBe(2);
    table.sync({ ...result.state, activePlayerIndex: 1 });
    expect(table.offers).toEqual([]);
});

test('bots protect their plans, value useful requests, counter bad prices, and do not inspect private hands', () => {
    const { state } = fixture();
    state.players[1].resources = bundle({ wood: 4, stone: 3, wheat: 1 });
    const proposal = proposeBotTrade(state, 'player-2', 'player-1');
    expect(proposal).not.toBeNull();
    const terms = {
        from: 'player-1',
        to: 'player-2',
        give: bundle({ wheat: 1 }),
        want: bundle({ wood: 1 }),
    };
    const offer = { ...terms, id: 1, status: 'open' as const };
    expect(evaluateBotTrade(state, 'player-2', offer).kind).toBe('accept');
    const value = botTradeValue(state, 'player-2', terms);
    for (const p of state.players.filter((p) => p.id !== 'player-2'))
        p.resources = bundle({ wood: 999, brick: 999, wheat: 999, wool: 999, stone: 999 });
    expect(proposeBotTrade(state, 'player-2', 'player-1')).toEqual(proposal);
    expect(botTradeValue(state, 'player-2', terms)).toBe(value);
    expect(evaluateBotTrade(state, 'player-2', offer).kind).toBe('accept');
    const expensive = { ...offer, give: bundle({ wool: 1 }), want: bundle({ wood: 3 }) };
    expect(evaluateBotTrade(state, 'player-2', expensive).kind).toBe('counter');
    const protecting = {
        ...offer,
        give: bundle({ wool: 1 }),
        want: bundle({ stone: 3 }),
        parentId: 9,
    };
    expect(evaluateBotTrade(state, 'player-2', protecting).kind).toBe('reject');
});
