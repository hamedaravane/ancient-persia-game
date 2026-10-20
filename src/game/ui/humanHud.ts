import { isSetup } from '../core/setup';
import { button, diceFace, escape, number, playerAvatar, resourceIcon } from './components';
import { RESOURCE_TYPES } from '../core/types';
import { FA } from './messages.fa';
import { PHASE_LABELS } from './sheets';
import type { GameSession } from './session';
import { headerPlayers } from './headerModel';

/** Personal status stays human-owned; a compact public scoreboard shows the competition. */
export function humanHeader(session: GameSession): string {
    const state = session.state!;
    const human = session.humanPlayer!;
    const standings = headerPlayers(state, human.id);
    const own = standings.find((p) => p.human)!;
    const active = state.players[state.activePlayerIndex];
    const phase = session.practice
        ? 'صفحهٔ تمرین • بدون حرکت رقبا'
        : state.phase === 'finished'
          ? PHASE_LABELS.finished
          : session.isHumanTurn
            ? PHASE_LABELS[state.phase]
            : state.phase === 'setup-roll'
              ? `تاس آغازین ${active.name}`
              : isSetup(state)
                ? `جانمایی ${active.name}`
                : `نوبت ${active.name}`;
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
        : session.isHumanTurn && ['roll', 'setup-roll'].includes(state.phase)
          ? '<span class="dice-placeholder" aria-hidden="true"></span>'
          : '';
    const rivals = standings
        .filter((p) => !p.human)
        .map((p) => {
            const status =
                p.id === state.winnerId
                    ? 'برنده'
                    : p.active
                      ? 'نوبت'
                      : p.leading
                        ? 'پیشتاز'
                        : 'امتیاز';
            return button(
                `${playerAvatar(p.avatar)}<span class="rival-copy"><span class="rival-name"><bdi>${escape(p.name)}</bdi> <span class="bot-label">ربات</span></span><span class="rival-score">${number(p.score)} / ${number(state.victoryTarget)} <span>${status}</span></span></span>`,
                'open:opponents',
                {
                    className: `rival-card${p.active ? ' is-active' : ''}${p.leading ? ' is-leading' : ''}`,
                    ownerColor: p.color,
                    label: `${p.name}، ربات؛ ${number(p.score)} از ${number(state.victoryTarget)} امتیاز؛ رتبه ${number(p.rank)}${p.active ? '؛ در حال بازی' : ''}${p.leading ? '؛ پیشتاز' : ''}؛ دیدن وضعیت رقبا`,
                },
            ).replace(
                '<button ',
                `<button data-score="${p.score}" data-target="${state.victoryTarget}" `,
            );
        })
        .join('');
    const self = button(
        `${playerAvatar(own.avatar)}<span class="turn-heading"><span class="human-name"><bdi>${escape(human.name)}</bdi> <span class="bot-label">تو</span></span><span class="human-score">${number(own.score)} / ${number(state.victoryTarget)} امتیاز • رتبهٔ نمایان ${number(own.rank)}</span><span class="phase-label">${escape(phase)} • ${isSetup(state) ? 'آغاز جزیره' : `دور ${number(state.turn)}`}</span></span>`,
        `player:${human.id}`,
        {
            className: `header-self${own.active ? ' is-active' : ''}`,
            ownerColor: human.color,
            label: `${human.name}، شما؛ ${number(own.score)} از ${number(state.victoryTarget)} امتیاز؛ رتبه ${number(own.rank)}؛ ${phase}؛ وضعیت من`,
        },
    );
    return `<div class="header-personal">${self}${dice}${button('⋯', 'open:help', { className: 'icon-button', label: 'منوی توقف بازی' })}</div><nav class="header-rivals" style="--rival-count:${standings.length - 1}" aria-label="امتیاز و نوبت رقبا">${rivals}</nav>`;
}

/** Passive production changes this inventory even on an opponent's roll. */
export function humanHand(session: GameSession): string {
    const human = session.humanPlayer!;
    return RESOURCE_TYPES.map(
        (r) =>
            `<div class="hand-resource" data-resource="${r}" aria-label="${FA.resources[r]} ${number(human.resources[r])}">${resourceIcon(r)}<span class="resource-count">${number(human.resources[r])}</span><span class="resource-label">${FA.resources[r]}</span></div>`,
    ).join('');
}
