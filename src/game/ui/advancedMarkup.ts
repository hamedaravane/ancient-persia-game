import { developmentBuyError, developmentPlayError } from '../core/development';
import { resourceCount } from '../core/robber';
import { getVictoryPoints, longestRoad } from '../core/scoring';
import { RESOURCE_TYPES, type DevelopmentKind } from '../core/types';
import { button, escape, number, resourceIcon } from './components';
import { FA } from './messages.fa';
import type { GameSession } from './session';
import type { SheetContent } from './bottomSheet';

export const DEVELOPMENT_LABELS: Record<DevelopmentKind, string> = {
    knight: 'شوالیه',
    'victory-point': 'امتیاز مخفی',
    'road-building': 'راه‌سازی',
    monopoly: 'انحصار',
    'year-of-plenty': 'اختراع (سال فراوانی)',
};
const descriptions: Record<DevelopmentKind, string> = {
    knight: 'اهریمن را جابه‌جا کن و از یک حریف مجاور یک منبع تصادفی بگیر؛ دورریختن منابع ندارد. فقط شوالیه‌های بازی‌شده برای بزرگ‌ترین ارتش حساب می‌شوند.',
    'victory-point':
        'یک امتیاز مخفی؛ بازی نمی‌شود و فقط هنگام اعلام پیروزی خودت رو می‌شود. کارت تازه‌خریداری‌شده هم برای پیروزی حساب می‌شود.',
    'road-building':
        'دو راه رایگان با قوانین اتصال معمول بساز. اگر فقط یک قطعه یا یک محل مجاز باقی مانده باشد، همان یک راه ساخته می‌شود.',
    monopoly: 'یک نوع منبع را انتخاب کن؛ همهٔ کارت‌های آن نوع را از تمام حریف‌ها می‌گیری.',
    'year-of-plenty': 'دو منبع از بانک بگیر؛ می‌توانند از یک نوع یا دو نوع متفاوت باشند.',
};
export function advancedSheet(session: GameSession): SheetContent | null {
    const state = session.state!;
    const human = session.humanPlayer!;
    if (session.sheet?.kind === 'discard') {
        const required = state.robberResolution?.discards[human.id] ?? 0;
        const selected = resourceCount(session.discardDraft);
        return {
            title: 'تاس ۷؛ انتخاب منابع دورریختنی',
            body: `<p>بیش از ۷ منبع داری؛ دقیقاً ${number(required)} کارت (نصف دارایی، رو به پایین) را خودت انتخاب کن. کارت‌های توسعه شمرده نمی‌شوند. تا همه انتخاب نکنند، جابه‌جایی اهریمن و کارهای عادی ممکن نیست.</p><p role="status">انتخاب‌شده: ${number(selected)} از ${number(required)}</p>${RESOURCE_TYPES.map((r) => `<div class="deal-editor-row"><span class="deal-resource">${resourceIcon(r)}${FA.resources[r]} • داری ${number(human.resources[r])}</span><div class="deal-counter">${button('−', `discard-adjust:${r}:-1`, { className: 'icon-button', disabled: !session.discardDraft[r], label: `کم‌کردن ${FA.resources[r]}` })}<span>${number(session.discardDraft[r])}</span>${button('+', `discard-adjust:${r}:1`, { className: 'icon-button', disabled: session.discardDraft[r] >= human.resources[r] || selected >= required, label: `دورریختن ${FA.resources[r]}` })}</div></div>`).join('')}${session.error ? `<p class="availability">${escape(session.error)}</p>` : ''}`,
            footer: `${button('تأیید دورریختن منابع', 'confirm-discard', { className: 'button button--primary full-width', disabled: selected !== required })}${button('توقف بازی', 'open:help', { className: 'button full-width' })}`,
        };
    }
    if (session.sheet?.kind === 'steal')
        return {
            title: 'انتخاب حریف کنار اهریمن',
            body: `<p>از یک حریف مجاور که منبع دارد، یک کارت تصادفی می‌گیری. نوع کارت را خودت انتخاب نمی‌کنی؛ تعداد شهر یا آبادی حریف شانس اضافه‌ای به او نمی‌دهد.</p>${(
                state.robberResolution?.victims ?? []
            )
                .map((id) => {
                    const p = state.players.find((p) => p.id === id)!;
                    return button(
                        `${escape(p.name)} • ${number(resourceCount(p.resources))} کارت منبع`,
                        `steal:${id}`,
                        { className: 'button full-width' },
                    );
                })
                .join('')}`,
            footer: button('توقف بازی', 'open:help', { className: 'button full-width' }),
        };
    if (session.sheet?.kind !== 'development') return null;
    const dev = state.development;
    const cards = dev?.hands[human.id] ?? [];
    const selected = cards.find((c) => c.id === session.selectedDevelopmentId);
    const buyError = !session.isHumanTurn ? 'wrong-phase' : developmentBuyError(state);
    const playError = selected
        ? !session.isHumanTurn
            ? 'wrong-phase'
            : developmentPlayError(state, selected.id)
        : null;
    const resources = (index: 0 | 1) =>
        `<section><h3>منبع ${number(index + 1)}</h3><div class="resource-selector">${RESOURCE_TYPES.map((r) => button(`${resourceIcon(r)}${FA.resources[r]}`, `development-resource:${index}:${r}`, { className: 'resource-choice', pressed: session.developmentResources[index] === r })).join('')}</div></section>`;
    const holder = (id: string | null | undefined) =>
        id ? escape(state.players.find((p) => p.id === id)!.name) : 'بدون صاحب';
    const hidden = cards.filter((c) => c.kind === 'victory-point').length;
    return {
        title: 'کارت‌های توسعهٔ تو',
        body: `<p>دستهٔ اولیه: ۱۴ شوالیه، ۵ امتیاز، و از راه‌سازی، انحصار و اختراع هرکدام ۲ کارت. کارت خریداری‌شده تا نوبت بعد قابل بازی نیست؛ در هر نوبت فقط یک کارت غیرامتیازی، قبل یا بعد از تاس.</p><h3>خرید کارت مخفی • ${number(dev?.deck.length ?? 0)} کارت در دسته</h3><p>هزینه: ۱ سنگ + ۱ گندم + ۱ پشم. داری: سنگ ${number(human.resources.stone)}، گندم ${number(human.resources.wheat)}، پشم ${number(human.resources.wool)}.</p>${buyError ? `<p class="availability">${FA.errors[buyError]}</p>` : '<p>تا منابع داری می‌توانی باز هم کارت بخری.</p>'}${button('خرید یک کارت توسعه', 'buy-development', { className: 'button button--primary full-width', disabled: !!buyError || !!session.practice })}<h3>دارایی مخفی تو</h3>${cards.length ? cards.map((c) => button(`${DEVELOPMENT_LABELS[c.kind]}${c.boughtOnRound >= state.turn && c.kind !== 'victory-point' ? ' • از نوبت بعد' : ''}`, `development-select:${c.id}`, { className: 'button full-width', pressed: c.id === selected?.id })).join('') : '<p>هنوز کارتی نخریده‌ای.</p>'}${selected ? `<h3>${DEVELOPMENT_LABELS[selected.kind]}</h3><p>${descriptions[selected.kind]}</p>${selected.kind === 'monopoly' || selected.kind === 'year-of-plenty' ? resources(0) : ''}${selected.kind === 'year-of-plenty' ? resources(1) : ''}${playError ? `<p class="availability">${FA.errors[playError]}</p>` : ''}${selected.kind !== 'victory-point' ? button('بازی‌کردن کارت انتخابی', 'play-development', { className: 'button button--primary full-width', disabled: !!playError || !!session.practice }) : ''}` : ''}<h3>امتیاز و عنوان‌ها</h3><p>طولانی‌ترین راه: ${holder(state.awards?.longestRoad)} • بزرگ‌ترین ارتش: ${holder(state.awards?.largestArmy)}</p><p>امتیاز تو با ${number(hidden)} کارت امتیاز مخفی: ${number(getVictoryPoints(state, human.id))} از ${number(state.victoryTarget)}. امتیاز مخفی حریف‌ها نمایش داده نمی‌شود.</p><p>طول پیوستهٔ راه تو: ${number(longestRoad(state.board, human.id))}؛ شوالیهٔ بازی‌شده: ${number(dev?.knights[human.id] ?? 0)}.</p><p>طولانی‌ترین راه از ۵ قطعه و بزرگ‌ترین ارتش از ۳ شوالیهٔ بازی‌شده، هرکدام ۲ امتیاز دارند. تساوی، عنوان را از صاحب فعلی نمی‌گیرد؛ برای گرفتن عنوان باید از او جلو بزنی.</p>${button('اعلام پیروزی و نمایش کارت‌های امتیازی', 'declare-victory', { className: 'button button--primary full-width', disabled: !session.isHumanTurn || !['roll', 'actions'].includes(state.phase) || getVictoryPoints(state, human.id) < state.victoryTarget || !!session.practice })}`,
    };
}
