import { expect, test } from 'vitest';
import { rollDice, buildRoad, endTurn, tradeWithBank } from '../src/game/core/game';
import {
    beginRobber,
    discardResources,
    moveRobber,
    stealResource,
    resolutionActor,
    resourceCount,
} from '../src/game/core/robber';
import { playDevelopment, buyDevelopment } from '../src/game/core/development';
import { getProduction } from '../src/game/core/production';
import { ready, giveCard } from './helpers/development';

const hand = (wood: number) => ({ wood, brick: 0, wheat: 0, wool: 0, stone: 0 });

test('seven snapshots exact discard obligations, blocks actions, and waits for every player’s own choice', () => {
    let state = ready();
    state.phase = 'roll';
    state.lastRoll = null;
    [7, 8, 9].forEach((n, i) => {
        state.players[i].resources = hand(n);
    });
    giveCard(state, 'knight');
    giveCard(state, 'knight');
    const before = structuredClone(state);
    const dice = [0.4, 0.55];
    const result = rollDice(state, () => dice.shift()!);
    expect(result.ok).toBe(true);
    expect(state).toEqual(before);
    state = result.state;
    expect(state.phase).toBe('discard');
    expect(state.players).toEqual(before.players);
    expect(state.robberResolution!.discards).toEqual({ 'player-2': 4, 'player-3': 4 });
    expect(getProduction(state, 7)).toEqual([]);
    expect(resolutionActor(state)).toBe('player-2');
    for (const r of [
        endTurn(state),
        buyDevelopment(state),
        tradeWithBank(state, 'wood', 'wool'),
        buildRoad(state, Object.keys(state.board.edges)[0]),
        moveRobber(state, state.board.tiles[0].id),
    ])
        expect(r.ok).toBe(false);
    expect(discardResources(state, 'player-2', hand(3))).toMatchObject({
        ok: false,
        reason: 'invalid-discard',
    });
    expect(discardResources(state, 'player-3', hand(4))).toMatchObject({
        ok: false,
        reason: 'wrong-phase',
    });
    state = discardResources(state, 'player-2', hand(4)).state;
    expect(state.phase).toBe('discard');
    expect(resourceCount(state.players[1].resources)).toBe(4);
    state = discardResources(state, 'player-3', hand(4)).state;
    expect(state.phase).toBe('robber');
    expect(resourceCount(state.players[2].resources)).toBe(5);
});

test('movement allows desert, rejects the occupied tile, and skips theft when nobody has a resource', () => {
    let state = ready();
    state.players.forEach((p) => {
        p.resources = hand(0);
    });
    const desert = state.board.tiles.find((t) => t.terrain === 'desert')!;
    state.board.tiles.forEach((t) => {
        t.robber = t !== desert && t === state.board.tiles.find((t) => t.resource);
    });
    state = beginRobber(state, 'knight', 'actions');
    const occupied = state.board.tiles.find((t) => t.robber)!;
    expect(moveRobber(state, occupied.id)).toMatchObject({ ok: false, reason: 'same-robber-tile' });
    const result = moveRobber(state, desert.id);
    expect(result.ok).toBe(true);
    expect(result.state.phase).toBe('actions');
    expect(result.state.board.tiles.find((t) => t.robber)!.id).toBe(desert.id);
    expect(result.state.robberResolution).toBeNull();
});

test.each([0, 0.25, 0.5, 0.75])(
    'theft samples resource cards uniformly, after explicitly choosing a unique eligible victim (%s)',
    (random) => {
        let state = ready();
        state.players.forEach((p) => {
            p.resources = hand(0);
        });
        Object.values(state.board.vertices).forEach((v) => {
            v.building = null;
        });
        const target = state.board.tiles.find((t) => !t.robber)!;
        state.board.vertices[target.vertexIds[0]].building = {
            type: 'settlement',
            ownerId: 'player-2',
        };
        state.board.vertices[target.vertexIds[1]].building = { type: 'city', ownerId: 'player-2' };
        state.board.vertices[target.vertexIds[3]].building = { type: 'city', ownerId: 'player-3' };
        state.players[1].resources = { ...hand(3), stone: 1 };
        state = beginRobber(state, 'knight', 'actions');
        state = moveRobber(state, target.id).state;
        expect(state.phase).toBe('steal');
        expect(state.robberResolution!.victims).toEqual(['player-2']);
        expect(stealResource(state, 'player-3')).toMatchObject({
            ok: false,
            reason: 'invalid-victim',
        });
        expect(endTurn(state).ok).toBe(false);
        const before = structuredClone(state);
        const result = stealResource(state, 'player-2', () => random);
        expect(state).toEqual(before);
        expect(result.state.phase).toBe('actions');
        expect(resourceCount(result.state.players[0].resources)).toBe(1);
        expect(resourceCount(result.state.players[1].resources)).toBe(3);
        expect(result.state.players[0].resources[random < 0.75 ? 'wood' : 'stone']).toBe(1);
        expect(
            getProduction(result.state, target.number!).some((g) => g.tileId === target.id),
        ).toBe(false);
    },
);

test('a pre-roll Knight moves/steals without discarding, counts only played Knights, and returns to the roll', () => {
    const state = ready();
    state.phase = 'roll';
    state.lastRoll = null;
    const id = giveCard(state, 'knight');
    giveCard(state, 'knight');
    giveCard(state, 'knight');
    const result = playDevelopment(state, id);
    expect(result.ok).toBe(true);
    expect(result.state.phase).toBe('robber');
    expect(result.state.players).toEqual(state.players);
    expect(result.state.robberResolution!.discards).toEqual({});
    expect(result.state.development!.knights['player-1']).toBe(1);
    expect(result.state.awards!.largestArmy).toBeNull();
    const empty = result.state.board.tiles.find(
        (t) => !t.robber && t.vertexIds.every((v) => !result.state.board.vertices[v].building),
    )!;
    const moved = moveRobber(result.state, empty.id);
    expect(moved.state.phase).toBe('roll');
    expect(moved.state.lastRoll).toBeNull();
});

test('only the third actually played Knight awards Largest Army; a tied challenger must play a fourth', () => {
    let state = ready();
    state.players.forEach((p) => {
        p.resources = hand(0);
    });
    const play = (owner: number) => {
        state.activePlayerIndex = owner;
        state.turn++;
        state.phase = 'actions';
        state.lastRoll = [2, 3];
        state.development!.playedThisTurn = false;
        const cardId = giveCard(state, 'knight', state.players[owner].id);
        state = playDevelopment(state, cardId).state;
        state = moveRobber(state, state.board.tiles.find((t) => !t.robber)!.id).state;
    };
    play(0);
    play(0);
    expect(state.awards!.largestArmy).toBeNull();
    giveCard(state, 'knight');
    expect(state.development!.knights['player-1']).toBe(2);
    play(0);
    expect(state.awards!.largestArmy).toBe('player-1');
    play(1);
    play(1);
    play(1);
    expect(state.awards!.largestArmy).toBe('player-1');
    play(1);
    expect(state.awards!.largestArmy).toBe('player-2');
    expect(state.development!.knights).toMatchObject({ 'player-1': 3, 'player-2': 4 });
});
