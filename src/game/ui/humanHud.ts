import { isSetup } from '../core/setup';
import { getPlayerSummary } from '../core/queries';
import { button, diceFace, escape, number, resourceIcon } from './components';
import { RESOURCE_TYPES } from '../core/types';
import { FA } from './messages.fa';
import { PHASE_LABELS } from './sheets';
import type { GameSession } from './session';

/** The header belongs to this device's human, never the currently acting opponent. */
export function humanHeader(session: GameSession): string {
    const state = session.state!;
    const human = session.humanPlayer!;
    const score = getPlayerSummary(state, human.id).score;
    const phase =
        state.phase === 'finished'
            ? PHASE_LABELS.finished
            : session.isHumanTurn
              ? PHASE_LABELS[state.phase]
              : isSetup(state)
                ? 'منتظر نوبت جانمایی تو'
                : 'نوبت تو به‌زودی می‌رسه';
    const roll =
        state.phase === 'setup-roll'
            ? state.setup?.lastRoll?.playerId === human.id
                ? state.setup.lastRoll.dice
                : null
            : session.isHumanTurn
              ? state.lastRoll
              : null;
    const dice = roll
        ? `<div class="dice-result" role="img" aria-label="تاس شما: ${number(roll[0])} و ${number(roll[1])}؛ مجموع ${number(roll[0] + roll[1])}"><span class="dice-pair">${diceFace(roll[0])}${diceFace(roll[1])}</span><span class="dice-total">${number(roll[0] + roll[1])}</span></div>`
        : '';
    return `<div class="turn-heading"><span><span class="human-color" style="color:#${human.color.toString(16).padStart(6, '0')}">●</span> ${escape(human.name)} <span class="human-score">• ${number(score)} از ${number(state.victoryTarget)} امتیاز</span></span><span class="phase-label">${phase} • ${isSetup(state) ? 'آغاز جزیره' : `دور ${number(state.turn)}`}</span></div>${dice}${button('⋯', 'open:help', { className: 'icon-button', label: 'راهنما و وضعیت بازی' })}`;
}

/** Passive production changes this inventory even on an opponent's roll. */
export function humanHand(session: GameSession): string {
    const human = session.humanPlayer!;
    return RESOURCE_TYPES.map(
        (r) =>
            `<div class="hand-resource" data-resource="${r}" aria-label="${FA.resources[r]} ${number(human.resources[r])}">${resourceIcon(r)}<span class="resource-count">${number(human.resources[r])}</span><span class="resource-label">${FA.resources[r]}</span></div>`,
    ).join('');
}
