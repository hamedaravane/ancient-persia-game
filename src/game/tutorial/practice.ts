import { createGame } from '../core/game';
import { getProduction } from '../core/production';
import type { GameState } from '../core/types';

export type PracticeStage = 'roll' | 'road' | 'trade' | 'settlement' | 'complete';
export interface Practice {
    stage: PracticeStage;
    roadId: string;
    settlementId: string;
    dice: [number, number];
}

/** An explicitly staged, disposable exercise. Ordinary matches never use this fixture. */
export function createPractice(): { state: GameState; practice: Practice } {
    const state = createGame(['بازیکن', 'داریوش', 'کوروش', 'آتوسا'], () => 0.42);
    const ownerId = state.players[0].id;
    for (const tile of state.board.tiles.filter((t) => t.resource === 'wood')) {
        for (const id of tile.vertexIds) {
            const anchor = state.board.vertices[id];
            if (anchor.tileIds.length !== 3) continue;
            // The exercise intentionally leaves wool missing after production.
            if (
                state.board.tiles.some(
                    (t) =>
                        anchor.tileIds.includes(t.id) &&
                        t.number === tile.number &&
                        t.resource === 'wool',
                )
            )
                continue;
            for (const firstId of anchor.edgeIds) {
                const first = state.board.edges[firstId];
                const middle = state.board.vertices[first.vertexIds.find((v) => v !== id)!];
                for (const secondId of middle.edgeIds.filter((e) => e !== firstId)) {
                    const endId = state.board.edges[secondId].vertexIds.find(
                        (v) => v !== middle.id,
                    )!;
                    if (anchor.neighborIds.includes(endId)) continue;
                    anchor.building = { type: 'settlement', ownerId };
                    first.road = { ownerId };
                    state.phase = 'roll';
                    state.setup = undefined;
                    const total = tile.number!;
                    const firstDie = Math.max(1, total - 6);
                    const dice: [number, number] = [firstDie, total - firstDie];
                    const income = getProduction(state, total).filter(
                        (g) => g.playerId === ownerId,
                    );
                    const hand = { wood: 6, brick: 2, wheat: 1, wool: 0, stone: 0 };
                    for (const grant of income) {
                        if (grant.resource !== 'stone') hand[grant.resource] -= grant.amount;
                    }
                    state.players[0].resources = hand;
                    return {
                        state,
                        practice: { stage: 'roll', roadId: secondId, settlementId: endId, dice },
                    };
                }
            }
        }
    }
    throw new Error('The practice board needs a productive anchor and a two-edge expansion path.');
}

export const PRACTICE_TASKS: Record<PracticeStage, string> = {
    roll: 'تمرین ۱ از ۴ • تاس را بینداز و منابع زمین کنار آبادی را دریافت کن.',
    road: 'تمرین ۲ از ۴ • ساخت‌وساز ← راه؛ یک مسیر نمونه را بساز، نه لزوماً بهترین مسیر.',
    trade: 'تمرین ۳ از ۴ • بانک: ۴ چوب بده، ۱ پشم بگیر؛ کمبود آبادی را قبل و بعد ببین.',
    settlement: 'تمرین ۴ از ۴ • ساخت‌وساز ← آبادی؛ محل تازه را تأیید کن و تغییر امتیاز را ببین.',
    complete: 'تمرین تمام شد • امتیازت از ۱ به ۲ رسید؛ هدف بازی واقعی ۱۰ امتیاز است.',
};
