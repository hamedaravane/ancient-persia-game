import { BUILD_TYPES } from '../core/building';
import { getBuildOption } from '../core/queries';
import { resolutionActor } from '../core/robber';
import { isSetup } from '../core/setup';
import { PRACTICE_TASKS } from '../tutorial/practice';
import { button, diceFace, escape, number, tradeIcon } from './components';
import { actionEmblem, developmentBack } from './developmentMarkup';
import { goalMarkup } from './buildFeedback';
import { BUILD_LABELS } from './buildFeedback';
import { costRow } from './sheets';
import { transitionReceipt, turnSurface } from './turnSurface';
import type { GameSession } from './session';

export function heroDice(session: GameSession): string {
    const state = session.state!;
    if (!turnSurface(state, session.humanPlayer!.id, !!session.practice).hero) return '';
    return button(
        `<span class="hero-dice" aria-hidden="true">${diceFace(3)}${diceFace(5)}</span><span class="roll-caption">${state.phase === 'setup-roll' ? 'تاس تعیین آغازکننده' : 'برای تاس‌ریختن بزن'}</span>${!session.preferences.snapshot.introduced ? '<small>نتیجه بالای صفحه می‌ماند</small>' : ''}`,
        'roll-dice',
        {
            className: 'roll-object',
            label:
                state.phase === 'setup-roll'
                    ? 'ریختن دو تاس برای تعیین آغازکننده؛ بدون تولید منابع'
                    : 'ریختن دو تاس در نوبت تو',
        },
    );
}

export function turnStatus(session: GameSession): string {
    const state = session.state!,
        human = session.humanPlayer!;
    const actor = state.players[state.activePlayerIndex];
    let text = session.error || '';
    if (!text && state.phase === 'discard')
        text =
            resolutionActor(state) === human.id
                ? `۷ · ${number(state.robberResolution!.discards[human.id])} منبع انتخاب کن`
                : '۷ · منتظر انتخاب منابع حریف';
    if (!text && state.phase === 'steal') text = 'اهریمن · یک حریف مجاور انتخاب می‌شود';
    if (!text && state.phase === 'robber')
        text = session.isHumanTurn
            ? 'اهریمن را به خانه‌ای متفاوت ببر'
            : `${actor.name} اهریمن را جابه‌جا می‌کند`;
    if (!text && state.phase === 'road-building')
        text = `${number(state.roadBuilding!.remaining)} راه رایگان · محل را ببین و تأیید کن`;
    if (!text && session.placement)
        text = isSetup(state)
            ? 'جانمایی آغازین · بدون هزینه'
            : 'محل را انتخاب کن؛ سپس ساخت را تأیید کن';
    if (!text && session.practice) text = PRACTICE_TASKS[session.practice.stage];
    if (!text && session.saveStatus === 'unavailable')
        return button('ذخیره در دسترس نیست؛ جزئیات', 'open-app', {
            className: 'button context-button storage-warning',
        });
    if (
        !text &&
        !session.practice &&
        !session.tutorial.enabled &&
        !session.preferences.snapshot.introduced &&
        !session.buildGoal
    )
        return button('رابط تازه · راهنمای تاس، ساخت و کارت‌ها', 'open:experience-guide', {
            className: 'button context-button',
        });
    if (!text && session.buildGoal && state.phase === 'actions') return goalMarkup(session);
    if (!text)
        text = turnSurface(state, human.id, !!session.practice).hero
            ? state.phase === 'setup-roll'
                ? 'تاس آغازین فقط شروع‌کننده را مشخص می‌کند'
                : 'نوبت تو'
            : transitionReceipt(session.transition, human.id) ||
              (session.isHumanTurn
                  ? 'ساخت، معامله یا توسعه؛ انتخاب با توست'
                  : `نوبت ${actor.name}`);
    return `<p class="turn-receipt${session.error ? ' availability' : ''}">${escape(text)}</p>`;
}

export function actionDock(session: GameSession): string {
    const state = session.state!,
        human = session.humanPlayer!;
    const surface = turnSurface(state, human.id, !!session.practice);
    const placement = session.placement;
    if (placement)
        return `<div class="placement-cost"><span>${isSetup(state) ? 'جانمایی آغازین · رایگان' : state.phase === 'road-building' ? `راه رایگان · ${number(state.roadBuilding!.remaining)} باقی` : placement.kind === 'robber' ? 'خانهٔ فعلی قابل انتخاب نیست' : BUILD_LABELS[placement.kind]}</span>${!isSetup(state) && state.phase !== 'road-building' && placement.kind !== 'robber' ? costRow(getBuildOption(state, placement.kind)) : ''}</div>${button(placement.kind === 'robber' || isSetup(state) || state.phase === 'road-building' ? 'پاک‌کردن انتخاب' : 'لغو', 'cancel-placement', { className: 'button button--quiet', disabled: !placement.targetId && (placement.kind === 'robber' || isSetup(state) || state.phase === 'road-building') })}`;
    if (surface.hero)
        return surface.readyCards
            ? button(
                  `${developmentBack(24)}<span>پیش از تاس · ${number(surface.readyCards)} کارت آماده</span>`,
                  'open:development',
                  { className: 'button pre-roll-card' },
              )
            : '';
    if (
        isSetup(state) ||
        ['discard', 'robber', 'steal', 'road-building', 'finished'].includes(state.phase)
    )
        return '';
    const ready = BUILD_TYPES.filter(
        (kind) =>
            !getBuildOption(state, kind, human.id).reason &&
            (!session.practice || session.practice.stage === kind),
    ).length;
    return (
        button(
            `${actionEmblem('hammer', 30)}<span>ساخت${ready ? ` · ${number(ready)}` : ''}</span>`,
            'open:build',
            { className: 'button dock-button' },
        ) +
        button(
            `${tradeIcon(30)}<span>معامله</span>`,
            session.practice ? 'open:trade' : 'open:domestic',
            {
                className: 'button dock-button',
                disabled:
                    !surface.actions || (!!session.practice && session.practice.stage !== 'trade'),
            },
        ) +
        button(
            `${developmentBack(24)}<span>توسعه · ${number(state.development?.hands[human.id].length ?? 0)}</span>`,
            'open:development',
            { className: 'button dock-button dock-cards', disabled: !!session.practice },
        )
    );
}
