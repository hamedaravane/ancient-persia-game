import { fitBoard } from './layout';

/** Shared by the actual board and its ocean controls; independent of turn/animation state. */
export function matchGeometry(width: number, height: number) {
    const compact = width < 360 || height < 420;
    const seaBand = height < 420 ? 96 : 112;
    const board = fitBoard(width, Math.max(1, height - seaBand));
    return { board, seaBand, dieSize: compact ? 48 : 56 };
}
