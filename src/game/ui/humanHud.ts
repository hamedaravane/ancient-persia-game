import { isSetup } from '../core/setup';
import { button, diceFace, escape, number, playerAvatar, resourceIcon } from './components';
import { RESOURCE_TYPES } from '../core/types';
import { FA } from './messages.fa';
import { PHASE_LABELS } from './sheets';
import type { GameSession } from './session';
import { headerPlayers } from './headerModel';

/** Active-turn status plus four compact, individually inspectable public seats. */
export function humanHeader(session: GameSession): string {
    const state = session.state!,
        human = session.humanPlayer!;
    const standings = headerPlayers(state, human.id);
    const active =
        standings.find((p) => p.id === state.winnerId) ?? standings[state.activePlayerIndex];
    const phase = session.practice
        ? 'تمرین · بدون حرکت رقبا'
        : state.phase === 'finished'
          ? 'پایان بازی'
          : PHASE_LABELS[state.phase];
    const roll = state.phase === 'setup-roll' ? state.setup?.lastRoll?.dice : state.lastRoll;
    const dice = roll
        ? `<div class="dice-result" role="img" aria-label="آخرین تاس: ${number(roll[0])} و ${number(roll[1])}؛ مجموع ${number(roll[0] + roll[1])}"><span class="dice-pair">${diceFace(roll[0])}${diceFace(roll[1])}</span><span class="dice-total">${number(roll[0] + roll[1])}</span></div>`
        : '<span class="dice-placeholder" aria-hidden="true"></span>';
    const heading = button(
        `${playerAvatar(active.avatar)}<span class="turn-heading"><strong>${state.phase === 'finished' ? `${escape(active.name)} برنده شد` : active.human ? 'نوبت تو' : `نوبت ${escape(active.name)}`}</strong><span class="phase-label">${escape(phase)}${isSetup(state) ? '' : ` · دور ${number(state.turn)}`}</span></span>`,
        `player:${active.id}`,
        {
            className: 'header-active',
            ownerColor: active.color,
            label: `${active.name}؛ ${phase}؛ دیدن وضعیت بازیکن فعال`,
        },
    );
    const chips = standings
        .map((p) =>
            button(
                `<span class="seat-name"><bdi>${escape(p.name)}</bdi>${p.human ? '<small>تو</small>' : ''}</span><span class="seat-score${p.human ? ' human-score' : ''}"><bdi dir="ltr">${number(p.score)} <small>/ ${number(state.victoryTarget)}</small></bdi></span>`,
                `player:${p.id}`,
                {
                    className: `seat-chip${p.active ? ' is-active' : ''}${p.human ? ' is-human' : ''}`,
                    ownerColor: p.color,
                    pressed: session.sheet?.kind === 'player' && session.sheet.id === p.id,
                    label: `${p.name}${p.human ? '، تو' : '، ربات'}؛ ${number(p.score)} از ${number(state.victoryTarget)} امتیاز${p.active ? '؛ در حال بازی' : ''}؛ جزئیات بازیکن`,
                },
            ).replace(
                '<button ',
                `<button data-score="${p.score}" data-target="${state.victoryTarget}" `,
            ),
        )
        .join('');
    return `<div class="header-personal">${heading}${dice}${button('⋯', 'open:help', { className: 'icon-button header-menu', label: 'منوی توقف بازی' })}</div><div class="header-seats" style="--seat-count:${standings.length}" role="group" aria-label="بازیکنان؛ هدف ${number(state.victoryTarget)} امتیاز">${chips}</div>`;
}

/** Passive production changes this inventory even on an opponent's roll. */
export function humanHand(session: GameSession): string {
    const human = session.humanPlayer!;
    return RESOURCE_TYPES.map(
        (r) =>
            `<div class="hand-resource" data-resource="${r}" aria-label="${FA.resources[r]} ${number(human.resources[r])}">${resourceIcon(r)}<span class="resource-count">${number(human.resources[r])}</span><span class="resource-label">${FA.resources[r]}</span></div>`,
    ).join('');
}
