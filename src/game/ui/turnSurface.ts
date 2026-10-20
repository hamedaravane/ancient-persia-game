import { developmentPlayError } from '../core/development';
import { getVictoryPoints } from '../core/scoring';
import { isSetup } from '../core/setup';
import { RESOURCE_TYPES, type GameState } from '../core/types';
import { number } from './components';
import { FA } from './messages.fa';
import type { MatchTransition } from './transitions';

/** A presentation projection; never grants an action or reads an opponent's private cards. */
export function turnSurface(state: GameState, humanId: string, practice = false) {
    const ownTurn = state.players[state.activePlayerIndex].id === humanId;
    const canDeclare =
        !practice &&
        ownTurn &&
        ['roll', 'actions'].includes(state.phase) &&
        getVictoryPoints(state, humanId) >= state.victoryTarget;
    return {
        ownTurn,
        canDeclare,
        hero: ownTurn && !canDeclare && ['roll', 'setup-roll'].includes(state.phase),
        opening: isSetup(state),
        actions: state.phase === 'actions',
        readyCards: ownTurn
            ? (state.development?.hands[humanId] ?? []).filter(
                  (c) => developmentPlayError(state, c.id) === null,
              ).length
            : 0,
    };
}

/** One concise, durable receipt, derived only from confirmed changes and public events. */
export function transitionReceipt(transition: MatchTransition | null, humanId: string): string {
    if (!transition) return '';
    const { before, after, action } = transition;
    const actor = before.players[before.activePlayerIndex];
    const own = actor.id === humanId;
    const previous = before.players.find((p) => p.id === humanId)!;
    const human = after.players.find((p) => p.id === humanId)!;
    if (action.kind === 'roll') {
        const total = after.lastRoll![0] + after.lastRoll![1];
        if (total === 7) return `${own ? 'تاس' : `تاس ${actor.name}`} ۷ · بدون تولید`;
        const gains = RESOURCE_TYPES.filter((r) => human.resources[r] > previous.resources[r]).map(
            (r) => `+${number(human.resources[r] - previous.resources[r])} ${FA.resources[r]}`,
        );
        return `تاس ${number(total)} · ${gains.join(' · ') || (own ? 'این بار منبعی نگرفتی' : `${actor.name} تاس ریخت`)}`;
    }
    if (action.kind === 'build') {
        const label = { road: 'راه', settlement: 'آبادی', city: 'شهر' }[action.type];
        return `${own ? '' : `${actor.name} · `}${label} ساخته شد${action.type === 'road' ? ' · گسترش شبکه' : ' · +۱ امتیاز'}`;
    }
    if (action.kind === 'buy-development')
        return own ? 'کارت تازه به دست مخفی تو اضافه شد' : `${actor.name} یک کارت توسعه خرید`;
    if (action.kind === 'play-development')
        return `${own ? 'تو' : actor.name} یک کارت توسعه بازی کرد`;
    if (action.kind === 'trade' || action.kind === 'domestic-trade')
        return 'معامله انجام شد · دارایی به‌روز است';
    if (action.kind === 'steal') return own ? 'یک منبع تصادفی گرفتی' : 'دزدی اهریمن کامل شد';
    if (action.kind === 'discard') return 'منابع انتخاب‌شده دور ریخته شد';
    if (action.kind === 'robber') return 'اهریمن جابه‌جا شد';
    return '';
}
