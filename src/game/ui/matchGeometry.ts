import { fitBoard } from './layout';

/** Shared by the actual board and its ocean controls; independent of turn/animation state. */
export function matchGeometry(width: number, height: number) {
    const compact = width < 360 || height < 420;
    // On short screens the dice occupy the action ledge, preserving readable hexes.
    const diceOnLedge = height < 420;
    const seaBand = diceOnLedge ? 0 : 104;
    const board = fitBoard(width, Math.max(1, height - seaBand));
    return { board, seaBand, diceOnLedge, dieSize: compact ? 48 : 56 };
}
