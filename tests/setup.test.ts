import { afterEach, expect, test, vi } from 'vitest';
import {
    createGame,
    buildRoad,
    buildSettlement,
    upgradeCity,
    rollDice,
    endTurn,
    tradeWithBank,
    getVictoryPoints,
} from '../src/game/core/game';
import { getPlacementError } from '../src/game/core/building';
import {
    getSetupTargets,
    getSetupPlacementError,
    isSetup,
    placeInitialPiece,
    rollForStart,
    setupPlayerIndex,
} from '../src/game/core/setup';
import { chooseBotCommand } from '../src/game/core/bot';
import { executeCommand } from '../src/game/core/commands';
import { RESOURCE_TYPES, type GameState } from '../src/game/core/types';
import { validGameState } from '../src/game/persistence/validateState';
import { decodeSave, MatchStore } from '../src/game/persistence/matchStore';
import { TutorialDirector } from '../src/game/tutorial/director';
import { GameSession } from '../src/game/ui/session';
import { sheetContent } from '../src/game/ui/sheets';
import { BotTurnRunner } from '../src/game/ui/botTurns';

const empty = () => ({ wood: 0, brick: 0, wheat: 0, wool: 0, stone: 0 });
function fresh(count = 4): GameState {
    return createGame(
        Array.from({ length: count }, (_, i) => `seat-${i}`),
        () => 0.42,
    );
}
function selectStarter(state: GameState, starter = 0): GameState {
    while (state.phase === 'setup-roll') {
        const result = rollForStart(state, () =>
            state.activePlayerIndex === starter ? 0.99 : 0.01,
        );
        if (!result.ok) throw new Error(result.reason);
        state = result.state;
    }
    return state;
}
function step(state: GameState): GameState {
    const snapshot = structuredClone(state);
    const command = chooseBotCommand(state)!;
    const result = executeCommand(state, command);
    expect(result.ok, JSON.stringify(command)).toBe(true);
    expect(state).toEqual(snapshot);
    if (!result.ok) throw new Error(result.reason);
    return result.state;
}
function saved(state: GameState) {
    return {
        version: 1,
        humanPlayerId: state.players[0].id,
        state,
        tutorial: new TutorialDirector().snapshot(),
        history: [],
    };
}
function rollSession(session: GameSession, starter = 0) {
    const previous = Math.random;
    try {
        Math.random = () => (session.state!.activePlayerIndex === starter ? 0.99 : 0.01);
        let steps = 0;
        while (session.state!.phase === 'setup-roll') {
            if (++steps > 8) throw new Error('Starter rolls stalled');
            if (session.isHumanTurn) session.primary();
            else session.advanceBot();
        }
    } finally {
        Math.random = previous;
    }
}
function finishBots(session: GameSession) {
    let steps = 0;
    while (!session.isHumanTurn && isSetup(session.state!)) {
        if (++steps > 24) throw new Error('Bot opening stalled');
        session.advanceBot();
    }
}
function confirmFirstTarget(session: GameSession) {
    session.preview(session.targets[0]);
    session.primary();
}
afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
});

test('a new board has no assigned pieces, score or resources; highest starter roll is not production', () => {
    let state = fresh();
    expect(state.phase).toBe('setup-roll');
    expect(Object.values(state.board.vertices).every((v) => !v.building)).toBe(true);
    expect(Object.values(state.board.edges).every((e) => !e.road)).toBe(true);
    expect(
        state.players.every(
            (p) =>
                getVictoryPoints(state, p.id) === 0 &&
                JSON.stringify(p.resources) === JSON.stringify(empty()),
        ),
    ).toBe(true);
    const board = state.board;
    for (const values of [
        [0.4, 0.55],
        [0.8, 0.8],
        [0.99, 0.99],
        [0.1, 0.1],
    ]) {
        let i = 0;
        const before = structuredClone(state);
        const result = rollForStart(state, () => values[i++]);
        expect(result.ok).toBe(true);
        expect(state).toEqual(before);
        state = result.state;
        expect(state.board).toBe(board);
        expect(state.lastRoll).toBeNull();
        expect(state.phase).not.toBe('robber');
        expect(state.players.every((p) => RESOURCE_TYPES.every((r) => p.resources[r] === 0))).toBe(
            true,
        );
        expect(validGameState(state)).toBe(true);
    }
    expect(state.startingPlayerIndex).toBe(2);
    expect(state.activePlayerIndex).toBe(2);
    expect(state.phase).toBe('setup-settlement');
});

test('only tied highest rollers roll again; multiple ties remain resumable and do not pick a biased starter', () => {
    let state = fresh();
    for (const value of [0.99, 0.2, 0.99, 0.1]) state = rollForStart(state, () => value).state;
    expect(state.setup).toMatchObject({ kind: 'starter', contenders: [0, 2], rolls: {} });
    state = rollForStart(state, () => 0.5).state;
    expect(state.activePlayerIndex).toBe(2);
    expect(validGameState(state)).toBe(true);
    expect(decodeSave(JSON.stringify(saved(state)))?.state).toEqual(state);
    state = rollForStart(state, () => 0.5).state;
    expect(state.setup).toMatchObject({ contenders: [0, 2], rolls: {} });
    state = rollForStart(state, () => 0.1).state;
    state = rollForStart(state, () => 0.99).state;
    expect(state.startingPlayerIndex).toBe(2);
    expect(state.phase).toBe('setup-settlement');
});

test.each([3, 4])(
    '%i seats complete exact forward/reverse pairs from every possible starter',
    (count) => {
        for (let starter = 0; starter < count; starter++) {
            let state = selectStarter(fresh(count), starter);
            const actual: number[] = [];
            const seats = Array.from({ length: count }, (_, i) => i);
            const clockwise = [...seats.slice(starter), ...seats.slice(0, starter)];
            const expected = [...clockwise, ...[...clockwise].reverse()];
            for (let pair = 0; pair < count * 2; pair++) {
                const owner = state.players[state.activePlayerIndex];
                actual.push(state.activePlayerIndex);
                expect(state.activePlayerIndex).toBe(setupPlayerIndex(count, starter, pair));
                const before = structuredClone(state);
                state = step(state);
                expect(state.phase).toBe('setup-road');
                expect(state.activePlayerIndex).toBe(before.activePlayerIndex);
                expect(validGameState(state)).toBe(true);
                expect(decodeSave(JSON.stringify(saved(state)))?.state).toEqual(state);
                const setup = state.setup!;
                if (setup.kind !== 'placement') throw new Error('Missing placement');
                const anchor = state.board.vertices[setup.settlementId!];
                const expectedResources = { ...owner.resources };
                if (pair >= count)
                    for (const tile of state.board.tiles)
                        if (tile.resource && anchor.tileIds.includes(tile.id))
                            expectedResources[tile.resource]++;
                expect(state.players.find((p) => p.id === owner.id)!.resources).toEqual(
                    expectedResources,
                );
                const resources = structuredClone(state.players);
                state = step(state);
                expect(state.players).toEqual(resources); // Road is free and cannot grant again.
                expect(validGameState(state)).toBe(true);
            }
            expect(actual).toEqual(expected);
            expect(actual[count - 1]).toBe(actual[count]);
            expect(state.phase).toBe('roll');
            expect(state.setup).toBeNull();
            expect(state.activePlayerIndex).toBe(starter);
            expect(state.turn).toBe(1);
            for (const player of state.players) {
                expect(getVictoryPoints(state, player.id)).toBe(2);
                expect(
                    Object.values(state.board.edges).filter((e) => e.road?.ownerId === player.id),
                ).toHaveLength(2);
            }
            for (let i = 0; i < count; i++) {
                state = { ...state, phase: 'actions', lastRoll: [1, 1] };
                state = endTurn(state).state;
                expect(state.turn).toBe(i === count - 1 ? 2 : 1);
            }
            expect(state.activePlayerIndex).toBe(starter);
        }
    },
);

test('setup ignores network connection but enforces distance, occupancy, pair order and this exact road anchor', () => {
    let state = selectStarter(fresh());
    const vertexId = getSetupTargets(state).find(
        (id) => state.board.vertices[id].tileIds.length === 3,
    )!;
    expect(getPlacementError(state.board, state.players[0].id, 'settlement', vertexId)).toBe(
        'not-connected',
    );
    const snapshot = structuredClone(state);
    for (const result of [
        placeInitialPiece(state, 'road', Object.keys(state.board.edges)[0]),
        rollDice(state),
        endTurn(state),
        tradeWithBank(state, 'wood', 'brick'),
        buildSettlement(state, vertexId),
        upgradeCity(state, vertexId),
    ]) {
        expect(result.ok).toBe(false);
        expect(result.state).toBe(state);
    }
    expect(state).toEqual(snapshot);
    expect(placeInitialPiece(state, 'settlement', 'missing').ok).toBe(false);
    state = placeInitialPiece(state, 'settlement', vertexId).state;
    expect(getSetupTargets(state).sort()).toEqual(
        [...state.board.vertices[vertexId].edgeIds].sort(),
    );
    const remote = Object.keys(state.board.edges).find(
        (id) => !state.board.edges[id].vertexIds.includes(vertexId),
    )!;
    expect(placeInitialPiece(state, 'road', remote)).toMatchObject({
        ok: false,
        reason: 'not-connected',
    });
    expect(placeInitialPiece(state, 'settlement', vertexId)).toMatchObject({
        ok: false,
        reason: 'wrong-phase',
    });
    expect(buildRoad(state, getSetupTargets(state)[0]).ok).toBe(false);
    state = placeInitialPiece(state, 'road', getSetupTargets(state)[0]).state;
    expect(getSetupPlacementError(state, vertexId)).toBe('occupied');
    for (const id of state.board.vertices[vertexId].neighborIds)
        expect(getSetupPlacementError(state, id)).toBe('too-close');
    while (state.setup?.kind === 'placement' && state.setup.settlements.length < 7)
        state = step(state);
    expect(state.activePlayerIndex).toBe(0);
    const second = getSetupTargets(state)[0];
    expect(getPlacementError(state.board, state.players[0].id, 'settlement', second)).toBe(
        'not-connected',
    );
    state = placeInitialPiece(state, 'settlement', second).state;
    const oldRoad = state.board.vertices[vertexId].edgeIds.find(
        (id) => !state.board.edges[id].road,
    )!;
    expect(placeInitialPiece(state, 'road', oldRoad)).toMatchObject({
        ok: false,
        reason: 'not-connected',
    });
    expect(
        getSetupTargets(state).every((id) => state.board.edges[id].vertexIds.includes(second)),
    ).toBe(true);
});

test('human choices are previewed and confirmed; reload between second settlement and road never grants twice', () => {
    const values = new Map<string, string>();
    const storage = {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => {
            values.set(key, value);
        },
    };
    let session = new GameSession(new MatchStore(storage));
    session.start(4, false);
    rollSession(session);
    const before = session.state!;
    const chosen = session.targets.at(-1)!;
    session.primary();
    expect(session.state).toBe(before);
    session.preview(chosen);
    expect(session.state).toBe(before);
    session.cancelPlacement();
    expect(session.placement).toEqual({ kind: 'settlement', targetId: null });
    session.openSheet({ kind: 'targets' });
    expect(sheetContent(session).body).toContain(`preview-target:${chosen}`);
    session.chooseTargetFromSheet(chosen);
    session.primary();
    expect(session.state!.board.vertices[chosen].building?.ownerId).toBe(session.humanPlayer!.id);
    expect(session.humanPlayer!.resources).toEqual(empty());
    expect(session.placement?.kind).toBe('road');
    session.cancelPlacement();
    expect(session.state!.board.vertices[chosen].building).not.toBeNull();
    confirmFirstTarget(session);
    finishBots(session);
    expect(session.state!.phase).toBe('setup-settlement');
    const second = session.targets[0];
    session.preview(second);
    session.primary();
    const resources = structuredClone(session.humanPlayer!.resources);
    const anchorState = structuredClone(session.state);
    session = new GameSession(new MatchStore(storage));
    session.resumeSaved();
    expect(session.state).toEqual(anchorState);
    expect(session.placement).toEqual({ kind: 'road', targetId: null });
    session.primary();
    session.chooseBuild('settlement');
    session.chooseTrade('give', 'wood');
    expect(session.humanPlayer!.resources).toEqual(resources);
    expect(session.placement?.kind).toBe('road');
    expect(
        session.targets.every((id) => session.state!.board.edges[id].vertexIds.includes(second)),
    ).toBe(true);
    confirmFirstTarget(session);
    expect(session.state!.phase).toBe('roll');
    expect(session.humanPlayer!.resources).toEqual(resources);
    expect(decodeSave(values.get('ancient-persia.match.v1')!)).not.toBeNull();
});

test('bots can win the starter roll while the human still chooses both of their own pairs', () => {
    const session = new GameSession();
    session.start(4, false);
    rollSession(session, 2);
    expect(session.state!.startingPlayerIndex).toBe(2);
    expect(session.isHumanTurn).toBe(false);
    expect(session.placement).toBeNull();
    finishBots(session);
    expect(session.state!.activePlayerIndex).toBe(0);
    expect(session.placement?.kind).toBe('settlement');
    expect(getVictoryPoints(session.state!, session.humanPlayer!.id)).toBe(0);
    for (let pair = 0; pair < 2; pair++) {
        confirmFirstTarget(session);
        confirmFirstTarget(session);
        finishBots(session);
    }
    expect(session.state!.phase).toBe('roll');
    expect(session.state!.activePlayerIndex).toBe(2);
    expect(getVictoryPoints(session.state!, session.humanPlayer!.id)).toBe(2);
});

test('setup narrator teaches the actual step and bots pause for dialogue instead of earning human practice', () => {
    vi.useFakeTimers();
    const session = new GameSession();
    session.start(4, true);
    expect(session.tutorial.current).toBe('welcome');
    session.continueTutorial();
    expect(session.tutorial.current).toBe('setup-order');
    session.continueTutorial();
    expect(session.tutorial.seen.has('roll')).toBe(false);
    rollSession(session);
    expect(session.tutorial.current).toBe('setup');
    session.continueTutorial();
    confirmFirstTarget(session);
    expect(session.tutorial.current).toBe('setup-road');
    expect(session.tutorial.practiced.has('settlement')).toBe(false);
    expect(session.tutorial.practiced.has('setup')).toBe(true);
    const runner = new BotTurnRunner(session, () => true, 10);
    const before = session.state;
    vi.advanceTimersByTime(100);
    expect(session.state).toBe(before);
    session.continueTutorial();
    confirmFirstTarget(session);
    vi.advanceTimersByTime(500);
    expect(session.isHumanTurn).toBe(true);
    expect(session.tutorial.current).toBe('setup-second');
    expect(session.tutorial.practiced.has('road')).toBe(false);
    runner.destroy();
});

test('malformed partial openings are rejected; finished legacy openings need no new setup fields', () => {
    const initial = fresh();
    const settled = step(selectStarter(initial));
    const corruptions = [
        { ...initial, setup: null },
        { ...initial, activePlayerIndex: 2 },
        { ...initial, setup: { ...initial.setup, contenders: [0, 0, 2, 3] } },
        { ...initial, lastRoll: [3, 4] },
        { ...settled, phase: 'setup-settlement' },
        { ...settled, setup: { ...settled.setup, settlements: ['missing'] } },
        { ...settled, setup: { ...settled.setup, settlementId: 'missing' } },
        {
            ...settled,
            players: settled.players.map((p, i) =>
                i ? p : { ...p, resources: { ...p.resources, wood: 1 } },
            ),
        },
    ];
    for (const state of corruptions)
        expect(decodeSave(JSON.stringify(saved(state as GameState)))).toBeNull();
    let state = selectStarter(fresh());
    while (isSetup(state)) state = step(state);
    delete state.setup;
    delete state.startingPlayerIndex;
    expect(decodeSave(JSON.stringify(saved(state)))).not.toBeNull();
});

test('starting resources count each productive hex, including repeated resource types and coastal/desert sites', () => {
    let checkedDuplicate = false,
        checkedDesert = false,
        checkedCoast = false;
    for (let seed = 1; seed <= 30 && !(checkedDuplicate && checkedDesert && checkedCoast); seed++) {
        let nextSeed = seed;
        const random = () => {
            nextSeed = (nextSeed * 1664525 + 1013904223) >>> 0;
            return nextSeed / 4294967296;
        };
        let state = selectStarter(createGame(['one', 'two', 'three', 'four'], random));
        while (state.setup?.kind === 'placement' && state.setup.settlements.length < 7)
            state = step(state);
        for (const id of getSetupTargets(state)) {
            const tiles = state.board.tiles.filter((t) =>
                state.board.vertices[id].tileIds.includes(t.id),
            );
            const resources = empty();
            for (const tile of tiles) if (tile.resource) resources[tile.resource]++;
            const placed = placeInitialPiece(state, 'settlement', id);
            expect(placed.ok).toBe(true);
            expect(placed.state.players[0].resources).toEqual(resources);
            checkedDuplicate ||= Object.values(resources).some((n) => n > 1);
            checkedDesert ||= tiles.some((t) => !t.resource);
            checkedCoast ||= tiles.length < 3;
        }
    }
    expect(checkedDuplicate).toBe(true);
    expect(checkedDesert).toBe(true);
    expect(checkedCoast).toBe(true);
});

test('a saved opening contest resumes the next actor without rerolling already recorded dice', () => {
    const values = new Map<string, string>();
    const storage = {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => {
            values.set(key, value);
        },
    };
    const session = new GameSession(new MatchStore(storage));
    session.start(4, false);
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.99);
    session.primary();
    random.mockImplementation(() => {
        throw new Error('Resume must not roll');
    });
    const restored = new GameSession(new MatchStore(storage));
    restored.resumeSaved();
    expect(restored.state).toEqual(session.state);
    expect(restored.botReady).toBe(true);
    expect(restored.placement).toBeNull();
    expect(restored.state!.setup).toMatchObject({ kind: 'starter', rolls: { 'player-1': [6, 6] } });
    random.mockReturnValue(0.01);
    restored.advanceBot();
    expect(restored.state!.activePlayerIndex).toBe(2);
    expect(restored.state!.setup).toMatchObject({
        rolls: { 'player-1': [6, 6], 'player-2': [1, 1] },
    });
});

test('completed legacy matches discard obsolete automatic-setup prompts without restarting placement', () => {
    let state = selectStarter(fresh());
    while (isSetup(state)) state = step(state);
    delete state.setup;
    delete state.startingPlayerIndex;
    const snapshot = saved(state);
    snapshot.tutorial.enabled = true;
    snapshot.tutorial.queue = ['setup', 'roll'];
    const session = new GameSession(
        new MatchStore({ getItem: () => JSON.stringify(snapshot), setItem: () => {} }),
    );
    session.resumeSaved();
    expect(session.state!.phase).toBe('roll');
    expect(session.state!.board).toEqual(state.board);
    expect(session.placement).toBeNull();
    expect(session.tutorial.current).toBe('roll');
});
