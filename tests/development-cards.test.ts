import { expect, test } from 'vitest';
import { buyDevelopment, playDevelopment, declareVictory } from '../src/game/core/development';
import { DEVELOPMENT_COUNTS } from '../src/game/core/developmentDeck';
import { buildRoad, endTurn, rollDice } from '../src/game/core/game';
import { getBuildOption } from '../src/game/core/queries';
import { getVictoryPoints } from '../src/game/core/scoring';
import { ready, giveCard } from './helpers/development';

test('the finite shuffled deck has the official distribution; multiple purchases pay full costs and exhaust it', () => {
    let state = ready();
    expect(
        Object.fromEntries(
            Object.keys(DEVELOPMENT_COUNTS).map((kind) => [
                kind,
                state.development!.deck.filter((c) => c.kind === kind).length,
            ]),
        ),
    ).toEqual(DEVELOPMENT_COUNTS);
    state.players[0].resources = { wood: 100, brick: 100, wheat: 100, wool: 100, stone: 100 };
    const before = structuredClone(state);
    const first = buyDevelopment(state);
    expect(first.ok).toBe(true);
    expect(state).toEqual(before);
    for (let n = 0; n < 25; n++) {
        const result = buyDevelopment(state);
        expect(result.ok).toBe(true);
        state = result.state;
    }
    expect(state.players[0].resources).toEqual({
        wood: 100,
        brick: 100,
        wheat: 75,
        wool: 75,
        stone: 75,
    });
    expect(state.development!.hands[state.players[0].id]).toHaveLength(25);
    expect(buyDevelopment(state)).toMatchObject({ ok: false, reason: 'deck-empty', state });
});

test('new cards wait until the owner’s next turn; only one non-VP card is permitted before or after rolling', () => {
    let state = ready();
    const newCard = giveCard(state, 'monopoly', undefined, state.turn);
    const oldCard = giveCard(state, 'year-of-plenty');
    const before = structuredClone(state);
    expect(playDevelopment(state, newCard, { resource: 'wood' })).toMatchObject({
        ok: false,
        reason: 'card-too-new',
    });
    expect(playDevelopment(state, oldCard, { resources: ['wood'] as never })).toMatchObject({
        ok: false,
        reason: 'invalid-card-choice',
    });
    expect(state).toEqual(before);
    state = playDevelopment(state, oldCard, { resources: ['stone', 'stone'] }).state;
    expect(state.players[0].resources.stone).toBe(12);
    expect(playDevelopment(state, newCard, { resource: 'wood' })).toMatchObject({
        ok: false,
        reason: 'card-already-played',
    });
    for (let n = 0; n < 3; n++) {
        state.phase = 'actions';
        state = endTurn(state).state;
    }
    expect(state.turn).toBe(3);
    expect(state.development!.playedThisTurn).toBe(false);
    const played = playDevelopment(state, newCard, { resource: 'wood' });
    expect(played.ok).toBe(true);
    expect(played.state.phase).toBe('roll');
});

test('Monopoly takes the chosen resource from every opponent atomically without touching other types', () => {
    const state = ready();
    const cardId = giveCard(state, 'monopoly');
    state.players[1].resources.wool = 3;
    state.players[2].resources.wool = 4;
    const before = structuredClone(state);
    const result = playDevelopment(state, cardId, { resource: 'wool' });
    expect(result.ok).toBe(true);
    expect(state).toEqual(before);
    expect(result.state.players.map((p) => p.resources.wool)).toEqual([17, 0, 0]);
    expect(result.state.players.map((p) => p.resources.wheat)).toEqual([10, 10, 10]);
    expect(result.state.development!.discard).toHaveLength(1);
});

test('Road Building reserves mandatory placements, pays no resources, and resumes a pre-roll turn after two roads', () => {
    let state = ready();
    state.phase = 'roll';
    state.lastRoll = null;
    const cardId = giveCard(state, 'road-building');
    const hand = structuredClone(state.players);
    state = playDevelopment(state, cardId).state;
    expect(state.phase).toBe('road-building');
    expect(buyDevelopment(state)).toMatchObject({ ok: false, reason: 'wrong-phase' });
    expect(endTurn(state)).toMatchObject({ ok: false, reason: 'wrong-phase' });
    for (let n = 0; n < 2; n++) {
        const id = getBuildOption(state, 'road').legalTargetIds[0];
        const result = buildRoad(state, id);
        expect(result.ok).toBe(true);
        state = result.state;
    }
    expect(state.phase).toBe('roll');
    expect(state.roadBuilding).toBeNull();
    expect(state.players).toEqual(hand);
});

test('Victory Point cards cannot be played, include freshly bought cards, and reveal only at an own-turn declaration', () => {
    const state = ready();
    // Five existing cities score ten publicly; use four cities for eight plus two hidden cards.
    Object.values(state.board.vertices).forEach((v) => {
        v.building = null;
    });
    Object.values(state.board.vertices)
        .slice(0, 4)
        .forEach((v) => {
            v.building = { ownerId: state.players[0].id, type: 'city' };
        });
    const id = giveCard(state, 'victory-point', undefined, state.turn);
    giveCard(state, 'victory-point');
    expect(getVictoryPoints(state, state.players[0].id)).toBe(10);
    expect(getVictoryPoints(state, state.players[0].id, false)).toBe(8);
    expect(playDevelopment(state, id)).toMatchObject({ ok: false, reason: 'invalid-card' });
    state.activePlayerIndex = 1;
    expect(declareVictory(state)).toMatchObject({ ok: false, reason: 'not-enough-points' });
    expect(state.phase).toBe('actions');
    state.activePlayerIndex = 0;
    const won = declareVictory(state);
    expect(won.state).toMatchObject({ phase: 'finished', winnerId: state.players[0].id });
    expect(getVictoryPoints(won.state, state.players[0].id, false)).toBe(10);
    expect(buyDevelopment(won.state)).toMatchObject({ ok: false, reason: 'game-finished' });
});

test('Road Building uses a single remaining piece and cannot exceed the fifteen-road supply', () => {
    let state = ready();
    state.players[0].resources.wood = state.players[0].resources.brick = 100;
    while (
        Object.values(state.board.edges).filter((e) => e.road?.ownerId === 'player-1').length < 14
    ) {
        const result = buildRoad(state, getBuildOption(state, 'road').legalTargetIds[0]);
        expect(result.ok).toBe(true);
        state = result.state;
    }
    const cardId = giveCard(state, 'road-building');
    const resources = structuredClone(state.players[0].resources);
    state = playDevelopment(state, cardId).state;
    state = buildRoad(state, getBuildOption(state, 'road').legalTargetIds[0]).state;
    expect(state.phase).toBe('actions');
    expect(state.roadBuilding).toBeNull();
    expect(state.players[0].resources).toEqual(resources);
    expect(
        Object.values(state.board.edges).filter((e) => e.road?.ownerId === 'player-1'),
    ).toHaveLength(15);
    expect(getBuildOption(state, 'road').reason).toBe('road-supply');
    expect(buildRoad(state, Object.keys(state.board.edges)[0])).toMatchObject({
        ok: false,
        reason: 'road-supply',
    });
});

test('playing before the dice does not reset the one-card limit when the dice are rolled', () => {
    let state = ready();
    state.phase = 'roll';
    state.lastRoll = null;
    const plenty = giveCard(state, 'year-of-plenty');
    const knight = giveCard(state, 'knight');
    state = playDevelopment(state, plenty, { resources: ['wood', 'brick'] }).state;
    state = rollDice(state, () => 0.5).state;
    expect(state.phase).toBe('actions');
    expect(playDevelopment(state, knight)).toMatchObject({
        ok: false,
        reason: 'card-already-played',
    });
});
