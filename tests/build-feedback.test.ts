import { expect, test } from 'vitest';
import { getBuildOption } from '../src/game/core/queries';
import { tradeWithBank } from '../src/game/core/game';
import { sheetContent } from '../src/game/ui/sheets';
import { buildInventory, tradeBuildFeedback } from '../src/game/ui/buildFeedback';
import { GameSession } from '../src/game/ui/session';
import { completeSessionSetup } from './helpers/setup';

function ready() {
    const session = new GameSession();
    session.start(4, false);
    completeSessionSetup(session);
    session.state!.phase = 'actions';
    session.state!.lastRoll = [2, 3];
    return session;
}

test('construction shows cost, actual hand, exact shortages and disconnected locations independently', () => {
    const session = ready();
    const state = session.state!;
    session.humanPlayer!.resources = { wood: 7, brick: 0, wheat: 1, wool: 0, stone: 0 };
    // An empty network cannot reach a paid settlement even after a resource shortage is fixed.
    for (const edge of Object.values(state.board.edges)) edge.road = null;
    const option = getBuildOption(state, 'settlement');
    expect(option.missing).toEqual({ wood: 0, brick: 1, wheat: 0, wool: 1, stone: 0 });
    expect(option.legalTargetIds).toHaveLength(0);
    const inventory = buildInventory(option, session.humanPlayer!.resources);
    expect(inventory).toContain('role="columnheader">هزینه');
    expect(inventory).toContain('role="columnheader">داری');
    expect(inventory).toContain('role="columnheader">کمبود');
    expect(inventory).toContain('role="cell">۷');
    session.openSheet({ kind: 'build' });
    expect(sheetContent(session).body).toContain('آجر؛ هزینه ۱؛ داری ۰؛ ۱ کم');
    expect(sheetContent(session).body).toContain('پشم؛ هزینه ۱؛ داری ۰؛ ۱ کم');
    expect(sheetContent(session).body).toContain('برای رسیدن به محل تازه، راه را گسترش دهید');
});

test.each([4, 5])('bank comparison includes wood payment: %i wood for a missing wool', (wood) => {
    const session = ready();
    session.humanPlayer!.resources = { wood, brick: 1, wheat: 1, wool: 0, stone: 0 };
    const before = structuredClone(session.state);
    const outcome = tradeWithBank(session.state!, 'wood', 'wool', 4);
    expect(outcome.ok).toBe(true);
    const after = outcome.state.players[0].resources;
    const preview = tradeBuildFeedback(session, after);
    const projected = getBuildOption(outcome.state, 'settlement');
    expect(projected.missing.wool).toBe(0);
    expect(projected.missing.wood).toBe(wood === 4 ? 1 : 0);
    expect(preview).toContain(wood === 4 ? 'بعد: ۱ چوب' : 'بعد: هیچ');
    expect(session.state).toEqual(before);
});

test('inspection during a bot turn uses only the human hand and denies building until their turn', () => {
    const session = ready();
    session.state!.activePlayerIndex = 1;
    session.state!.players[1].resources.wood = 987;
    session.humanPlayer!.resources.wood = 2;
    session.openSheet({ kind: 'build' });
    const content = sheetContent(session).body;
    expect(content).toContain('ساخت در نوبت خودتان');
    expect(content).not.toContain('۹۸۷');
    expect(content).toContain('role="cell">۲');
    const before = session.state;
    session.chooseBuild('road');
    expect(session.state).toBe(before);
    expect(session.placement).toBeNull();
});
