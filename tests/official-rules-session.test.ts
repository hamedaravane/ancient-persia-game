import { expect, test, vi } from 'vitest';
import { GameSession } from '../src/game/ui/session';
import { MatchStore, decodeSave, type SavedMatch } from '../src/game/persistence/matchStore';
import { TutorialDirector } from '../src/game/tutorial/director';
import { ready, giveCard } from './helpers/development';
import { beginRobber, moveRobber, discardResources } from '../src/game/core/robber';
import { buildRoad } from '../src/game/core/game';
import { getBuildOption } from '../src/game/core/queries';
import { playDevelopment } from '../src/game/core/development';
import { validGameState } from '../src/game/persistence/validateState';
import { RESOURCE_TYPES, type GameState } from '../src/game/core/types';
import { humanHeader } from '../src/game/ui/humanHud';
import { headerPlayers } from '../src/game/ui/headerModel';
import { sheetContent } from '../src/game/ui/sheets';

function saved(state: GameState): SavedMatch {
    return {
        version: 2,
        humanPlayerId: 'player-1',
        state,
        tutorial: new TutorialDirector().snapshot(),
        history: [],
    };
}
function stored(state: GameState) {
    let raw = JSON.stringify(saved(state));
    const storage = {
        getItem: () => raw,
        setItem: (_key: string, value: string) => {
            raw = value;
        },
    };
    const session = new GameSession(new MatchStore(storage));
    session.resumeSaved();
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

test('a human chooses their discard during a bot turn; drafts never pay or auto-resume', () => {
    let state = ready();
    state.activePlayerIndex = 1;
    state.players.forEach((p) => {
        p.resources = { wood: 0, brick: 0, wheat: 0, wool: 0, stone: 0 };
    });
    state.players[0].resources.wood = 9;
    state.lastRoll = [3, 4];
    state = beginRobber(state, 'seven', 'actions');
    expect(validGameState(state)).toBe(true);
    const { session, reload } = stored(state);
    expect(session.isHumanTurn).toBe(false);
    expect(session.botReady).toBe(false);
    expect(session.sheet?.kind).toBe('discard');
    session.adjustDiscard('wood', 1);
    expect(session.humanPlayer!.resources.wood).toBe(9);
    const resumed = reload();
    expect(resumed.discardDraft.wood).toBe(0);
    expect(resumed.sheet?.kind).toBe('discard');
    resumed.openSheet({ kind: 'help' });
    expect(resumed.sheet?.kind).toBe('help');
    resumed.closeSheet();
    expect(resumed.sheet?.kind).toBe('discard');
    for (let i = 0; i < 4; i++) resumed.adjustDiscard('wood', 1);
    resumed.confirmDiscard();
    expect(resumed.humanPlayer!.resources.wood).toBe(5);
    expect(resumed.state!.phase).toBe('robber');
    expect(resumed.botReady).toBe(true);
    expect(validGameState(resumed.state)).toBe(true);
});

test('partial discards, a pending theft and a pre-roll Knight survive strict save decoding', () => {
    let state = ready();
    state.lastRoll = [3, 4];
    state = beginRobber(state, 'seven', 'actions');
    state = discardResources(state, 'player-1', {
        wood: 10,
        brick: 10,
        wheat: 5,
        wool: 0,
        stone: 0,
    }).state;
    const loaded = decodeSave(JSON.stringify(saved(state)))!;
    expect(loaded.state).toEqual(state);
    expect(loaded.state.robberResolution!.discards).not.toHaveProperty('player-1');
    state.phase = 'actions';
    state.robberResolution = null;
    state.lastRoll = null;
    state.phase = 'roll';
    const cardId = giveCard(state, 'knight');
    state = playDevelopment(state, cardId).state;
    expect(decodeSave(JSON.stringify(saved(state)))!.state).toEqual(state);
    const target = state.board.tiles.find(
        (t) =>
            !t.robber &&
            t.vertexIds.some((id) => state.board.vertices[id].building?.ownerId === 'player-2'),
    )!;
    state = moveRobber(state, target.id).state;
    expect(state.phase).toBe('steal');
    const { session, reload } = stored(state);
    expect(session.sheet?.kind).toBe('steal');
    expect(reload().state).toEqual(state);
    const before = structuredClone(session.state);
    session.stealFrom('player-1');
    expect(session.state).toEqual(before);
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    session.stealFrom('player-2');
    random.mockRestore();
    expect(session.state!.phase).toBe('roll');
    expect(session.state!.lastRoll).toBeNull();
    expect(validGameState(session.state)).toBe(true);
});

test('a half-completed Road Building card resumes its required free placement and cannot end the turn', () => {
    let state = ready();
    state.phase = 'roll';
    state.lastRoll = null;
    state = playDevelopment(state, giveCard(state, 'road-building')).state;
    state = buildRoad(state, getBuildOption(state, 'road').legalTargetIds[0]).state;
    expect(state.roadBuilding!.remaining).toBe(1);
    expect(validGameState(state)).toBe(true);
    const { session, reload } = stored(state);
    expect(session.placement).toEqual({ kind: 'road', targetId: null });
    const hand = structuredClone(session.humanPlayer!.resources);
    session.confirmEndTurn();
    session.cancelPlacement();
    expect(session.state!.phase).toBe('road-building');
    session.preview(session.targets[0]);
    session.primary();
    expect(session.state!.phase).toBe('roll');
    expect(session.humanPlayer!.resources).toEqual(hand);
    expect(reload().state).toEqual(session.state);
});

test('hidden Victory Points never leak through opponent standings; personal totals and own declaration include them', () => {
    const state = ready();
    const { session } = stored(state);
    const before = humanHeader(session);
    for (let i = 0; i < 3; i++) giveCard(session.state!, 'victory-point', 'player-2');
    expect(humanHeader(session)).toBe(before);
    expect(headerPlayers(session.state!, 'player-1').find((p) => p.id === 'player-2')!.score).toBe(
        2,
    );
    giveCard(session.state!, 'victory-point');
    expect(headerPlayers(session.state!, 'player-1').find((p) => p.human)!.score).toBe(3);
    session.openSheet({ kind: 'development' });
    expect(sheetContent(session).body).toContain('امتیاز مخفی حریف‌ها نمایش داده نمی‌شود');
});

test('new save validation rejects forged decks, played counters, pending victims and tampered titles', () => {
    const state = ready();
    const corruptions = [
        (s: GameState) => {
            s.development!.deck.pop();
        },
        (s: GameState) => {
            s.development!.deck[0] = { ...s.development!.deck[1] };
        },
        (s: GameState) => {
            s.development!.knights['player-1'] = 3;
        },
        (s: GameState) => {
            s.awards!.largestArmy = 'player-1';
        },
        (s: GameState) => {
            s.robberResolution = {
                source: 'seven',
                returnPhase: 'actions',
                discards: {},
                victims: ['player-1'],
            };
        },
    ];
    for (const corrupt of corruptions) {
        const candidate = structuredClone(state);
        corrupt(candidate);
        expect(decodeSave(JSON.stringify(saved(candidate)))).toBeNull();
    }
});

test('unfinished six-point saves migrate deterministically, while completed historical results retain their old target', () => {
    const state = ready();
    state.victoryTarget = 6;
    delete state.development;
    delete state.awards;
    delete state.roadBuilding;
    delete state.robberResolution;
    const raw = JSON.stringify({ ...saved(state), version: 1 });
    const random = vi.spyOn(Math, 'random').mockImplementation(() => {
        throw new Error('Migration must be repeatable');
    });
    const a = decodeSave(raw)!;
    const b = decodeSave(raw)!;
    random.mockRestore();
    expect(a).toEqual(b);
    expect(a.state.victoryTarget).toBe(10);
    expect(a.state.development!.deck).toHaveLength(25);
    expect(a.state.board).toEqual(state.board);
    expect(a.state.players).toEqual(state.players);
    // A legacy completed result needs six public points and remains a historical result.
    Object.values(state.board.vertices)
        .filter((v) => v.building?.ownerId === 'player-1')
        .forEach((v) => {
            v.building!.type = 'city';
        });
    const site = Object.values(state.board.vertices).find(
        (v) => !v.building && v.neighborIds.every((id) => !state.board.vertices[id].building),
    )!;
    site.building = { ownerId: 'player-1', type: 'city' };
    state.phase = 'finished';
    state.winnerId = 'player-1';
    const done = decodeSave(JSON.stringify({ ...saved(state), version: 1 }))!;
    expect(done.state.victoryTarget).toBe(6);
    expect(done.state.phase).toBe('finished');
    expect(
        RESOURCE_TYPES.every(
            (r) => done.state.players[0].resources[r] === state.players[0].resources[r],
        ),
    ).toBe(true);
});
