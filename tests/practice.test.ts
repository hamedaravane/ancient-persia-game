import { expect, test, vi } from 'vitest';
import { GameSession } from '../src/game/ui/session';
import { getVictoryPoints } from '../src/game/core/game';
import { getBuildOption } from '../src/game/core/queries';
import { MatchStore, type SaveStorage } from '../src/game/persistence/matchStore';
import { sheetContent } from '../src/game/ui/sheets';
import { BotTurnRunner } from '../src/game/ui/botTurns';

function read(session: GameSession) {
    let count = 0;
    while (session.sheet?.kind === 'tutorial') {
        if (++count > 10) throw new Error('Dialogue stalled');
        session.continueTutorial();
    }
}
function build(session: GameSession, kind: 'road' | 'settlement') {
    session.primary(); // The primary action opens the relevant construction workspace.
    expect(session.sheet?.kind).toBe('build');
    session.chooseBuild(kind);
    expect(session.targets).toHaveLength(1);
    const target = session.targets[0];
    const before = structuredClone(session.state);
    session.preview(target);
    expect(session.state).toEqual(before); // Preview never pays or scores.
    session.primary();
    expect(session.error).toBeNull();
    if (kind === 'settlement') {
        const content = sheetContent(session);
        expect(content.footer).toContain('دیدن آبادی و امتیاز تازه');
        expect(content.footer).toContain('data-action="tutorial-next"');
    }
    read(session);
    return target;
}

test('beginner performs the entire production → expansion → trade → point loop through real commands', () => {
    const session = new GameSession();
    session.requestPlay(true);
    expect(session.tutorial.current).toBe('practice-intro');
    const playerId = session.humanPlayer!.id;
    expect(getVictoryPoints(session.state!, playerId)).toBe(1);
    read(session);
    const before = session.humanPlayer!.resources.wood;
    session.primary();
    expect(session.tutorial.current).toBe('practice-income');
    expect(session.humanPlayer!.resources.wood).toBeGreaterThan(before);
    expect(
        session.transition!.production.some(
            (g) => g.playerId === playerId && g.resource === 'wood',
        ),
    ).toBe(true);
    expect(session.humanPlayer!.resources).toMatchObject({ wood: 6, brick: 2, wheat: 1, wool: 0 });
    read(session);
    const road = build(session, 'road');
    expect(session.state!.board.edges[road].road?.ownerId).toBe(playerId);
    expect(getVictoryPoints(session.state!, playerId)).toBe(1);
    expect(session.humanPlayer!.resources).toMatchObject({ wood: 5, brick: 1 });
    expect(getBuildOption(session.state!, 'settlement').missing.wool).toBe(1);
    expect(getBuildOption(session.state!, 'settlement').legalTargetIds).toContain(
        session.practice!.settlementId,
    );
    session.primary();
    session.chooseTrade('give', 'wood');
    session.chooseTrade('receive', 'wool');
    const hand = { ...session.humanPlayer!.resources };
    const content = sheetContent(session).body;
    expect(content).toContain('اثر معامله بر ساخت');
    expect(content).toContain('پس از معامله قابل ساخت');
    expect(session.humanPlayer!.resources).toEqual(hand);
    session.confirmTrade();
    expect(session.tutorial.current).toBe('practice-build');
    expect(session.humanPlayer!.resources).toMatchObject({ wood: 1, brick: 1, wheat: 1, wool: 1 });
    read(session);
    const settlement = build(session, 'settlement');
    expect(session.state!.board.vertices[settlement].building).toEqual({
        type: 'settlement',
        ownerId: playerId,
    });
    expect(session.humanPlayer!.resources).toMatchObject({ wood: 0, brick: 0, wheat: 0, wool: 0 });
    expect(getVictoryPoints(session.state!, playerId)).toBe(2);
    expect(session.practice!.stage).toBe('complete');
    expect(session.tutorial.practiced).toEqual(
        new Set(['roll', 'production', 'road', 'bank', 'settlement']),
    );
    session.primary();
    expect(session.state).toBeNull();
    expect(session.savedMatch).toBeNull();
});

test('practice protects the saved game, blocks bot activity and accidental actions, and exits cleanly', () => {
    let raw: string | null = null;
    const storage: SaveStorage = {
        getItem: () => raw,
        setItem: (_key, value) => {
            raw = value;
        },
    };
    const session = new GameSession(new MatchStore(storage));
    session.start(4, false, 'مهسا');
    session.returnToMenu();
    const saved = raw;
    session.requestPlay(true);
    read(session);
    const runner = new BotTurnRunner(session);
    const before = structuredClone(session.state);
    session.advanceBot();
    session.chooseBuild('city');
    session.chooseBuild('road'); // Still awaiting the exercise roll.
    session.confirmEndTurn();
    expect(session.state).toEqual(before);
    expect(session.botReady).toBe(false);
    session.primary();
    read(session);
    build(session, 'road');
    session.primary();
    session.chooseTrade('give', 'wood');
    session.chooseTrade('receive', 'stone');
    const hand = { ...session.humanPlayer!.resources };
    session.confirmTrade();
    expect(session.humanPlayer!.resources).toEqual(hand);
    expect(session.error).toContain('پشم');
    session.save();
    expect(raw).toBe(saved);
    session.openSheet({ kind: 'help' });
    session.returnToMenu();
    expect(session.practice).toBeNull();
    expect(raw).toBe(saved);
    session.requestPlay();
    expect(session.humanPlayer!.name).toBe('مهسا');
    expect(session.state!.phase).toBe('setup-roll');
    runner.destroy();
});

test('closing the practice narrator exits without saving; starting a real match uses random dice', () => {
    const session = new GameSession();
    session.requestPlay(true);
    session.closeSheet();
    expect(session.state).toBeNull();
    expect(session.practice).toBeNull();
    session.requestPlay();
    expect(session.sheet?.kind).toBe('player-name');
    session.confirmPlayerName();
    expect(session.tutorial.enabled).toBe(true);
    while (session.sheet?.kind === 'tutorial') session.continueTutorial();
    const source = vi.spyOn(Math, 'random').mockReturnValue(0.99);
    session.primary();
    expect(source).toHaveBeenCalledTimes(2);
    source.mockRestore();
    expect(session.state!.setup?.lastRoll?.dice).toEqual([6, 6]);
});
