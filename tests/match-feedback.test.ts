import { afterEach, expect, test, vi } from 'vitest';
import { executeCommand, type GameCommand } from '../src/game/core/commands';
import { getBuildOption } from '../src/game/core/queries';
import { beginRobber, moveRobber } from '../src/game/core/robber';
import type { GameState } from '../src/game/core/types';
import { feedbackEvent } from '../src/game/ui/feedbackEvents';
import { GameSession } from '../src/game/ui/session';
import { introductionContent } from '../src/game/ui/matchIntroduction';
import type { MatchTransition } from '../src/game/ui/transitions';
import { ready, giveCard } from './helpers/development';

afterEach(() => vi.restoreAllMocks());

function commit(before: GameState, action: GameCommand): MatchTransition {
    const result = executeCommand(before, action, () => 0.1);
    expect(result.ok).toBe(true);
    return { id: 1, action, before, after: result.state, production: [] };
}

test('construction payments use construction cues; an actual city point combines its reward', () => {
    const state = ready();
    const human = state.players[0].id;
    const targetId = getBuildOption(state, 'road').legalTargetIds[0];
    expect(feedbackEvent(commit(state, { kind: 'build', type: 'road', targetId }), human)).toEqual({
        cue: 'road',
        personal: true,
    });
    const settlement = Object.values(state.board.vertices).find(
        (v) => v.building?.ownerId === human,
    )!;
    const transition = commit(state, { kind: 'build', type: 'city', targetId: settlement.id });
    expect(feedbackEvent(transition, human)).toEqual({
        cue: 'point',
        personal: true,
        construction: 'city',
    });
    expect(state.players[0].resources.stone).toBe(10);
    expect(transition.after.players[0].resources.stone).toBe(7);
});

test('real theft warns its victim off-turn, and rewards only its recipient', () => {
    let state = ready();
    const human = state.players[0].id;
    state.activePlayerIndex = 1;
    state = beginRobber(state, 'knight', 'actions');
    const tile = state.board.tiles.find(
        (t) =>
            !t.robber &&
            t.vertexIds.some((id) => state.board.vertices[id].building?.ownerId === human),
    )!;
    state = moveRobber(state, tile.id).state;
    expect(state.phase).toBe('steal');
    const transition = commit(state, { kind: 'steal', victimId: human });
    expect(feedbackEvent(transition, human)).toEqual({ cue: 'loss', personal: true });
    expect(feedbackEvent(transition, state.players[1].id)).toEqual({
        cue: 'resources',
        personal: true,
    });
});

test('discard and Monopoly losses differ from agreed trades and resource receipts', () => {
    let state = ready();
    const human = state.players[0].id;
    state = beginRobber(state, 'seven', 'actions');
    const discard = commit(state, {
        kind: 'discard',
        playerId: human,
        resources: { wood: 10, brick: 10, wheat: 5, wool: 0, stone: 0 },
    });
    expect(feedbackEvent(discard, human)?.cue).toBe('loss');
    state = ready();
    state.activePlayerIndex = 1;
    const cardId = giveCard(state, 'monopoly', state.players[1].id);
    expect(
        feedbackEvent(
            commit(state, { kind: 'play-development', cardId, choice: { resource: 'wood' } }),
            human,
        )?.cue,
    ).toBe('loss');
    state = ready();
    expect(
        feedbackEvent(
            commit(state, { kind: 'trade', give: 'wood', receive: 'wool', ratio: 4 }),
            human,
        )?.cue,
    ).toBe('trade');
});

test('a seven warns without implying a resource loss; an unchanged rejected state is silent', () => {
    const before = ready();
    before.phase = 'roll';
    const result = executeCommand(
        before,
        { kind: 'roll' },
        (() => {
            const dice = [0.4, 0.55];
            return () => dice.shift()!;
        })(),
    );
    expect(result.state.phase).toBe('discard');
    expect(
        feedbackEvent(
            { id: 1, action: { kind: 'roll' }, before, after: result.state, production: [] },
            before.players[0].id,
        )?.cue,
    ).toBe('warning');
    expect(
        feedbackEvent(
            { id: 2, action: { kind: 'roll' }, before, after: before, production: [] },
            before.players[0].id,
        ),
    ).toBeNull();
});

test('opponent VP purchases never reveal hidden points through sound', () => {
    const before = ready();
    before.activePlayerIndex = 1;
    const deck = before.development!.deck;
    const index = deck.findIndex((c) => c.kind === 'victory-point');
    [deck[0], deck[index]] = [deck[index], deck[0]];
    const transition = commit(before, { kind: 'buy-development' });
    expect(feedbackEvent(transition, before.players[0].id)).toBeNull();
    expect(feedbackEvent(transition, before.players[1].id)?.cue).toBe('point');
});

test('participant introduction holds real setup and bots, then hands off to guidance without a command', () => {
    const session = new GameSession();
    session.requestPlay();
    session.playerNameDraft = '<مهسا>';
    session.confirmPlayerName();
    const before = structuredClone(session.state);
    expect(session.sheet?.kind).toBe('introduction');
    expect(session.botReady).toBe(false);
    expect(session.transition).toBeNull();
    session.primary();
    session.advanceBot();
    expect(session.state).toEqual(before);
    const roster = introductionContent(session, true);
    for (const player of session.state!.players) {
        expect(roster.body).toContain(player.color.toString(16));
    }
    expect(roster.body).toContain('&lt;مهسا&gt;');
    expect(roster.body.match(/data-avatar=/g)).toHaveLength(4);
    expect(introductionContent(session, false).footer).toContain(' disabled');
    session.setExperienceOption('sound');
    expect(session.preferences.snapshot.sound).toBe(true);
    expect(session.state).toEqual(before);
    session.closeSheet();
    expect(session.sheet?.kind).toBe('tutorial');
    expect(session.state).toEqual(before);
    expect(session.transition).toBeNull();
    session.setTutorialEnabled(false);
    session.returnToMenu();
    session.resumeSaved();
    expect(session.sheet).toBeNull();
    expect(session.state).toEqual(before);
});
