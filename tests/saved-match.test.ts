import { completeSessionSetup } from './helpers/setup';
import { expect, test, vi } from 'vitest';
import { GameSession } from '../src/game/ui/session';
import { decodeSave, MatchStore, type SaveStorage } from '../src/game/persistence/matchStore';

function fixture() {
    const values = new Map<string, string>();
    const storage: SaveStorage = {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => {
            values.set(key, value);
        },
    };
    const session = new GameSession(new MatchStore(storage));
    session.start(3);
    completeSessionSetup(session);
    return { storage, session, values, reload: () => new GameSession(new MatchStore(storage)) };
}

test('a confirmed roll survives reopening without rolling again or replaying its animation', () => {
    const { session, reload } = fixture();
    session.primary();
    const expected = structuredClone(session.state);
    const restored = reload();
    expect(restored.state).toBeNull();
    const random = vi.spyOn(Math, 'random').mockImplementation(() => {
        throw new Error('Do not reroll a save');
    });
    restored.resumeSaved();
    expect(restored.state).toEqual(expected);
    expect(restored.transition).toBeNull();
    expect(restored.history).toEqual(session.history);
    random.mockRestore();
});

test('an interrupted robber relocation is still mandatory and starts without a stale preview', () => {
    const { session, reload } = fixture();
    const random = vi.spyOn(Math, 'random').mockReturnValueOnce(0.4).mockReturnValueOnce(0.55);
    session.primary();
    random.mockRestore();
    expect(session.state?.phase).toBe('robber');
    session.preview(session.targets[0]);
    const restored = reload();
    restored.resumeSaved();
    expect(restored.placement).toEqual({ kind: 'robber', targetId: null });
    const before = restored.state;
    restored.primary();
    expect(restored.state).toBe(before);
    restored.preview(restored.targets[0]);
    restored.primary();
    expect(restored.state?.phase).toBe('actions');
});

test('Anahita remembers acknowledged dialogue, pending dialogue, and paused guidance', () => {
    const { session, reload } = fixture();
    session.start(4, true);
    session.continueTutorial();
    const restored = reload();
    restored.resumeSaved();
    expect(restored.tutorial.snapshot()).toEqual(session.tutorial.snapshot());
    expect(restored.tutorial.current).toBe('setup-order');
    expect(restored.sheet?.kind).toBe('tutorial');
    restored.setTutorialEnabled(false);
    const paused = reload();
    paused.resumeSaved();
    expect(paused.tutorial.enabled).toBe(false);
    expect(paused.tutorial.seen.has('welcome')).toBe(true);
    expect(paused.tutorial.current).toBeNull();
});

test('Tutorial opens disposable practice without replacing reviewed guided progress', () => {
    const { session, reload } = fixture();
    const readDialogue = () => {
        while (session.sheet?.kind === 'tutorial') session.continueTutorial();
    };
    session.setTutorialEnabled(true);
    readDialogue();
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    session.primary();
    random.mockRestore();
    readDialogue();
    expect(session.state?.phase).toBe('actions');
    const saved = structuredClone(session.savedMatch);

    const resumed = reload();
    resumed.requestPlay();
    expect(resumed.state).toEqual(saved!.state);

    const tutorial = reload();
    tutorial.requestPlay(true);
    expect(tutorial.practice?.stage).toBe('roll');
    expect(tutorial.state?.phase).toBe('roll');
    expect(tutorial.savedMatch).toEqual(saved);
    expect(tutorial.tutorial.current).toBe('practice-intro');
    tutorial.returnToMenu();
    const afterPractice = reload();
    afterPractice.requestPlay();
    expect(afterPractice.state).toEqual(saved!.state);
});

test('unconfirmed construction and trade drafts never pay resources or resume automatically', () => {
    const { session, reload } = fixture();
    session.state!.phase = 'actions';
    session.state!.lastRoll = [1, 2];
    session.state!.players[0].resources.wood = 10;
    session.state!.players[0].resources.brick = 10;
    session.chooseBuild('road');
    session.preview(session.targets[0]);
    const before = structuredClone(session.state);
    const restored = reload();
    restored.resumeSaved();
    expect(restored.state).toEqual(before);
    expect(restored.placement).toBeNull();
    restored.chooseTrade('give', 'wood');
    restored.chooseTrade('receive', 'stone');
    const again = reload();
    again.resumeSaved();
    expect(again.give).toBeNull();
    expect(again.receive).toBeNull();
    expect(again.state).toEqual(before);
    again.chooseBuild('road');
    again.preview(again.targets[0]);
    again.primary();
    expect(again.state?.players[0].resources.wood).toBe(9);
    const after = reload();
    after.resumeSaved();
    expect(after.state).toEqual(again.state);
});

test('returning to the menu preserves the match; replacing it needs explicit confirmation', () => {
    const { session, reload } = fixture();
    const before = structuredClone(session.state);
    session.returnToMenu();
    expect(session.savedMatch?.state).toEqual(before);
    session.requestStart(4, true);
    expect(session.state).toBeNull();
    expect(session.sheet).toEqual({ kind: 'new-match', count: 4, guided: true });
    session.closeSheet();
    const restored = reload();
    restored.resumeSaved();
    expect(restored.state).toEqual(before);
    session.requestStart(4, true);
    session.confirmNewMatch();
    session.confirmPlayerName();
    expect(session.state?.players).toHaveLength(4);
    expect(session.tutorial.enabled).toBe(true);
});

test.each([
    'broken-json',
    'future-version',
    'bad-owner',
    'missing-edge',
    'negative-resources',
    'unknown-lesson',
    'invalid-winner',
])('unsafe save %s is rejected before reaching the renderer', (problem) => {
    const { values, session, reload } = fixture();
    const saved = structuredClone(session.savedMatch!);
    if (problem === 'future-version') (saved as { version: number }).version = 99;
    if (problem === 'bad-owner')
        Object.values(saved.state.board.vertices).find((v) => v.building)!.building!.ownerId =
            'missing';
    if (problem === 'missing-edge')
        delete saved.state.board.edges[Object.keys(saved.state.board.edges)[0]];
    if (problem === 'negative-resources') saved.state.players[0].resources.wood = -1;
    if (problem === 'unknown-lesson') saved.tutorial.seen = ['unknown' as never];
    if (problem === 'invalid-winner') saved.state.winnerId = saved.state.players[0].id;
    const raw = problem === 'broken-json' ? '{oops' : JSON.stringify(saved);
    expect(decodeSave(raw)).toBeNull();
    values.set('ancient-persia.match.v1', raw);
    const restored = reload();
    expect(restored.savedMatch).toBeNull();
    expect(restored.saveStatus).toBe('invalid');
    expect(values.get('ancient-persia.match.v1')).toBe(raw);
});

test('storage denial and quota errors keep play usable and expose the missing persistence', () => {
    const denied = new GameSession(new MatchStore(null));
    denied.start(3);
    completeSessionSetup(denied);
    expect(denied.saveStatus).toBe('unavailable');
    denied.primary();
    expect(denied.state?.lastRoll).not.toBeNull();
    const failing = new GameSession(
        new MatchStore({
            getItem: () => null,
            setItem: () => {
                throw new Error('Quota exceeded');
            },
        }),
    );
    expect(() => failing.start(3)).not.toThrow();
    expect(failing.saveStatus).toBe('unavailable');
    failing.returnToMenu();
    failing.resumeSaved();
    expect(failing.state).not.toBeNull();
});

test('finished matches reopen their results without reopening play', () => {
    const { session, reload } = fixture();
    const state = session.state!;
    const owner = state.players[0].id;
    for (const vertex of Object.values(state.board.vertices))
        if (vertex.building?.ownerId === owner) vertex.building.type = 'city';
    const extra = Object.values(state.board.vertices).find(
        (vertex) =>
            !vertex.building &&
            vertex.neighborIds.every((id) => !state.board.vertices[id].building),
    )!;
    extra.building = { type: 'city', ownerId: owner };
    state.phase = 'finished';
    state.winnerId = owner;
    state.lastRoll = [3, 4];
    session.save();
    const restored = reload();
    restored.resumeSaved();
    expect(restored.state).toEqual(state);
    expect(restored.sheet?.kind).toBe('results');
    expect(restored.transition).toBeNull();
});
