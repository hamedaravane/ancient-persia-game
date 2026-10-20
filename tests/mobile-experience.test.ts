import { afterEach, expect, test, vi } from 'vitest';
import { GameSession } from '../src/game/ui/session';
import { MatchStore, decodeSave, type SavedMatch } from '../src/game/persistence/matchStore';
import { TutorialDirector } from '../src/game/tutorial/director';
import { ready, giveCard } from './helpers/development';
import { turnSurface, transitionReceipt } from '../src/game/ui/turnSurface';
import { heroDice, actionDock, turnStatus } from '../src/game/ui/turnMarkup';
import { sheetContent } from '../src/game/ui/sheets';
import { goalMarkup, tradeBuildFeedback } from '../src/game/ui/buildFeedback';
import { getBuildOption } from '../src/game/core/queries';
import { buildRoad, getVictoryPoints } from '../src/game/core/game';
import { headerPlayers } from '../src/game/ui/headerModel';
import { validGameState } from '../src/game/persistence/validateState';

afterEach(() => vi.restoreAllMocks());
function stored(state = ready()) {
    let raw = JSON.stringify({
        version: 2,
        state,
        humanPlayerId: 'player-1',
        history: [],
        tutorial: new TutorialDirector().snapshot(),
    } satisfies SavedMatch);
    const storage = {
        getItem: () => raw,
        setItem: (_key: string, value: string) => {
            raw = value;
        },
    };
    const session = new GameSession(new MatchStore(storage));
    session.preferences.set('introduced', true);
    session.resumeSaved();
    expect(session.state).not.toBeNull();
    return {
        session,
        reload: () => {
            const next = new GameSession(new MatchStore(storage));
            next.resumeSaved();
            return next;
        },
        raw: () => raw,
    };
}

test('the real dice object rolls once, produces through core, and reveals the ordinary dock', () => {
    const state = ready();
    state.phase = 'roll';
    state.lastRoll = null;
    const { session, reload } = stored(state);
    expect(heroDice(session)).toContain('data-action="roll-dice"');
    expect(actionDock(session)).not.toContain('open:build');
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    session.roll();
    const committed = session.state,
        transition = session.transition;
    expect(random).toHaveBeenCalledTimes(2);
    expect(session.state!.lastRoll).toEqual([4, 4]);
    expect(session.state!.phase).toBe('actions');
    session.roll();
    expect(session.state).toBe(committed);
    expect(session.transition).toBe(transition);
    expect(random).toHaveBeenCalledTimes(2);
    expect(heroDice(session)).toBe('');
    expect(turnStatus(session)).toContain('تاس ۸');
    expect(actionDock(session)).toContain('data-emblem="hammer"');
    expect(actionDock(session)).toContain('development-back');
    expect(reload().state).toEqual(committed);
    expect(reload().transition).toBeNull();
});

test('pre-roll card play remains discoverable and a Knight returns to the unrolled dice', () => {
    const state = ready();
    state.phase = 'roll';
    state.lastRoll = null;
    const id = giveCard(state, 'knight');
    const { session } = stored(state);
    expect(turnSurface(session.state!, 'player-1').readyCards).toBe(1);
    expect(actionDock(session)).toContain('پیش از تاس');
    const hand = structuredClone(session.humanPlayer!.resources);
    session.openSheet({ kind: 'development' });
    session.selectDevelopment(id);
    session.playCard();
    expect(session.state!.phase).toBe('robber');
    expect(heroDice(session)).toBe('');
    expect(actionDock(session)).not.toContain('open:build');
    const empty = session.state!.board.tiles.find(
        (t) => !t.robber && t.vertexIds.every((v) => !session.state!.board.vertices[v].building),
    );
    expect(empty).toBeTruthy();
    session.preview(empty!.id);
    session.primary();
    expect(session.state!.phase).toBe('roll');
    expect(session.humanPlayer!.resources).toEqual(hand);
    expect(heroDice(session)).toContain('roll-dice');
    expect(turnSurface(session.state!, 'player-1').readyCards).toBe(0);
});

test('a seven has no production and cannot reveal actions before mandatory choices finish', () => {
    const state = ready();
    state.phase = 'roll';
    state.lastRoll = null;
    const { session, reload } = stored(state);
    const hand = structuredClone(session.humanPlayer!.resources);
    const dice = [0.4, 0.55];
    vi.spyOn(Math, 'random').mockImplementation(() => dice.shift()!);
    session.roll();
    expect(session.state!.phase).toBe('discard');
    expect(session.transition!.production).toEqual([]);
    expect(session.humanPlayer!.resources).toEqual(hand);
    expect(turnSurface(session.state!, 'player-1').actions).toBe(false);
    expect(actionDock(session)).not.toContain('open:build');
    expect(heroDice(session)).toBe('');
    expect(transitionReceipt(session.transition, 'player-1')).toContain('بدون تولید');
    expect(reload().sheet?.kind).toBe('discard');
});

test('pre-roll free roads retain the mandatory dock through reload and return to the same unrolled turn', () => {
    const state = ready();
    state.phase = 'roll';
    state.lastRoll = null;
    const id = giveCard(state, 'road-building');
    const { session, reload } = stored(state);
    const resources = structuredClone(session.humanPlayer!.resources);
    session.openSheet({ kind: 'development' });
    session.selectDevelopment(id);
    session.playCard();
    expect(session.state!.phase).toBe('road-building');
    expect(actionDock(session)).not.toContain('open:build');
    session.preview(session.targets[0]);
    session.primary();
    const resumed = reload();
    expect(resumed.state).toEqual(session.state);
    expect(resumed.state!.roadBuilding!.remaining).toBe(1);
    expect(resumed.placement?.kind).toBe('road');
    expect(actionDock(resumed)).not.toContain('open:build');
    resumed.preview(resumed.targets[0]);
    resumed.primary();
    expect(resumed.state!.phase).toBe('roll');
    expect(resumed.state!.lastRoll).toBeNull();
    expect(resumed.humanPlayer!.resources).toEqual(resources);
    expect(heroDice(resumed)).toContain('roll-dice');
    expect(actionDock(resumed)).not.toContain('open:build');
});

test('winning hidden points take priority over rolling without exposing an opponent hand', () => {
    const state = ready();
    state.phase = 'roll';
    state.lastRoll = null;
    Object.values(state.board.vertices)
        .filter((v) => v.building?.ownerId === 'player-1')
        .forEach((v) => {
            v.building!.type = 'city';
        });
    // Pure projection test: the rules still decide how the two title points are earned.
    state.awards = { longestRoad: 'player-1', largestArmy: 'player-1' };
    giveCard(state, 'victory-point');
    giveCard(state, 'victory-point');
    expect(turnSurface(state, 'player-1')).toMatchObject({ hero: false, canDeclare: true });
    expect(turnSurface(state, 'player-2')).toMatchObject({
        hero: false,
        canDeclare: false,
        readyCards: 0,
    });
});

test('purchases stay in the real private hand, select the drawn card and never dismiss/reopen consent', () => {
    const state = ready();
    const opponent = giveCard(state, 'victory-point', 'player-2');
    const { session, reload } = stored(state);
    session.openSheet({ kind: 'development' });
    const before = structuredClone(session.state!);
    const panels: Array<string | undefined> = [];
    const stop = session.subscribe(() => panels.push(session.sheet?.kind));
    session.buyCard();
    session.buyCard();
    stop();
    expect(panels).toEqual(['development', 'development']);
    expect(session.state!.development!.deck).toHaveLength(before.development!.deck.length - 2);
    const cards = session.state!.development!.hands['player-1'];
    expect(session.selectedDevelopmentId).toBe(cards[cards.length - 1].id);
    expect(session.humanPlayer!.resources.stone).toBe(before.players[0].resources.stone - 2);
    expect(session.humanPlayer!.resources.wheat).toBe(before.players[0].resources.wheat - 2);
    expect(session.humanPlayer!.resources.wool).toBe(before.players[0].resources.wool - 2);
    const content = sheetContent(session);
    expect(content.body).toContain(`data-development-id="${session.selectedDevelopmentId}"`);
    expect(content.body).not.toContain(`development-select:${opponent}`);
    expect(headerPlayers(session.state!, 'player-1').find((p) => p.id === 'player-2')!.score).toBe(
        2,
    );
    expect(reload().transition).toBeNull();
    expect(reload().state).toEqual(session.state);
});

test('pin, trade, preview and settlement confirmation use real resources and survive recovery', () => {
    let state = ready();
    state.players[0].resources.wood = state.players[0].resources.brick = 30;
    for (let n = 0; !getBuildOption(state, 'settlement').legalTargetIds.length && n < 10; n++) {
        const roads = getBuildOption(state, 'road').legalTargetIds;
        const opensSite = roads.find(
            (id) => getBuildOption(buildRoad(state, id).state, 'settlement').legalTargetIds.length,
        );
        state = buildRoad(state, opensSite ?? roads[0]).state;
    }
    expect(getBuildOption(state, 'settlement').legalTargetIds.length).toBeGreaterThan(0);
    state.players[0].resources = { wood: 5, brick: 1, wheat: 1, wool: 0, stone: 0 };
    const { session, reload, raw } = stored(state);
    session.setBuildGoal('settlement');
    expect(goalMarkup(session)).toContain('۱ پشم کم');
    expect(reload().buildGoal).toBe('settlement');
    session.tradeForResource('wool');
    expect(session.receive).toBe('wool');
    expect(session.give).toBeNull();
    session.chooseTrade('give', 'wood');
    expect(sheetContent(session).body).toContain('آمادهٔ ساخت');
    const before = structuredClone(session.humanPlayer!.resources);
    expect(before.wood).toBe(5); // Preview has not paid.
    session.confirmTrade();
    expect(session.sheet).toBeNull();
    expect(session.humanPlayer!.resources).toEqual({
        wood: 1,
        brick: 1,
        wheat: 1,
        wool: 1,
        stone: 0,
    });
    const points = getVictoryPoints(session.state!, 'player-1');
    session.chooseBuild('settlement');
    session.preview(session.targets[0]);
    expect(session.humanPlayer!.resources.wood).toBe(1);
    session.primary();
    expect(session.humanPlayer!.resources).toEqual({
        wood: 0,
        brick: 0,
        wheat: 0,
        wool: 0,
        stone: 0,
    });
    expect(getVictoryPoints(session.state!, 'player-1')).toBe(points + 1);
    expect(validGameState(session.state)).toBe(true);
    expect(reload().state).toEqual(session.state);
    expect(decodeSave(raw())!.buildGoal).toBe('settlement');
});

test('goal comparison includes newly created shortages and never mistakes resources for a legal location', () => {
    const { session } = stored();
    session.setBuildGoal('settlement');
    session.humanPlayer!.resources = { wood: 4, brick: 1, wheat: 1, wool: 0, stone: 0 };
    const before = structuredClone(session.state);
    const after = { wood: 0, brick: 1, wheat: 1, wool: 1, stone: 0 };
    expect(tradeBuildFeedback(session, after)).toContain('۱ چوب کم');
    expect(session.state).toEqual(before);
    for (const edge of Object.values(session.state!.board.edges)) edge.road = null;
    expect(goalMarkup(session, { wood: 1, brick: 1, wheat: 1, wool: 1, stone: 0 }, true)).toContain(
        'راه را گسترش دهید',
    );
    expect(
        goalMarkup(session, { wood: 1, brick: 1, wheat: 1, wool: 1, stone: 0 }, true),
    ).not.toContain('آمادهٔ ساخت ✓');
});

test('invalid goal metadata is rejected; a goal and preference change never submit a rule command', () => {
    const { session, raw } = stored();
    const before = session.state,
        transition = session.transition;
    session.setBuildGoal('city');
    session.openSheet({ kind: 'experience' });
    session.setExperienceOption('quick');
    expect(session.state).toBe(before);
    expect(session.transition).toBe(transition);
    expect(session.botReady).toBe(false);
    for (const bad of ['village', ['road'], 1, {}]) {
        const candidate = JSON.parse(raw()) as Record<string, unknown>;
        candidate.buildGoal = bad;
        expect(decodeSave(JSON.stringify(candidate))).toBeNull();
    }
});
