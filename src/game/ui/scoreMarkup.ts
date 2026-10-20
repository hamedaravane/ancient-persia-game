import { longestRoad } from '../core/scoring';
import type { GameState } from '../core/types';
import { actionEmblem } from './developmentMarkup';
import { escape, number } from './components';

export function scoreAwards(state: GameState, playerId: string): string {
    if (!state.development) return ''; // Historical six-point results had no scoring titles.
    const holder = (id: string | null | undefined) =>
        id ? escape(state.players.find((p) => p.id === id)!.name) : 'بدون صاحب';
    const road = longestRoad(state.board, playerId),
        army = state.development?.knights[playerId] ?? 0;
    return `<section class="score-awards"><div class="score-award">${actionEmblem('road', 32)}<span>طولانی‌ترین راه · ${holder(state.awards?.longestRoad)}<small>طول پیوستهٔ تو: ${number(road)} · حداقل ۵${state.awards?.longestRoad === playerId ? ' · +۲ امتیاز' : ''}</small></span></div><div class="score-award">${actionEmblem('knight', 32)}<span>بزرگ‌ترین ارتش · ${holder(state.awards?.largestArmy)}<small>شوالیهٔ بازی‌شدهٔ تو: ${number(army)} · حداقل ۳${state.awards?.largestArmy === playerId ? ' · +۲ امتیاز' : ''}</small></span></div></section>`;
}

export function awardChanges(before: GameState, after: GameState): string {
    return (['longestRoad', 'largestArmy'] as const)
        .filter((key) => before.awards?.[key] !== after.awards?.[key])
        .map((key) => {
            const label = key === 'longestRoad' ? 'طولانی‌ترین راه' : 'بزرگ‌ترین ارتش';
            const id = after.awards?.[key];
            return id
                ? `${label} به ${after.players.find((p) => p.id === id)!.name} رسید؛ ۲ امتیاز`
                : `${label} بی‌صاحب شد`;
        })
        .join('؛ ');
}
