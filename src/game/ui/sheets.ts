import { BANK_TRADE_RATIO, getBankTradeError } from '../core/game';
import { BUILD_TYPES, type BuildType } from '../core/building';
import { getBuildOption, getPlayerSummary, getProductionProbability, type BuildOption } from '../core/queries';
import { RESOURCE_TYPES } from '../core/types';
import { artSprite, button, color, escape, number, resourceIcon, resourceValue } from './components';
import { FA } from './messages.fa';
import type { GameSession } from './session';

export const BUILD_LABELS: Record<BuildType, string> = { road: 'راه', settlement: 'آبادی', city: 'شهر' };
export const PHASE_LABELS = { roll: 'آغاز نوبت', robber: 'جابه‌جایی راهزن', actions: 'ساخت و تجارت', finished: 'پایان بازی' };

export function buildReason(option: BuildOption, session: GameSession): string {
    if (option.reason === 'wrong-phase') return session.state?.phase === 'robber' ? 'ابتدا راهزن را جابه‌جا کنید.' : 'ابتدا تاس را بیندازید.';
    if (option.reason === 'no-legal-targets') return 'محل مجازی برای این ساخت‌وساز ندارید.';
    if (option.reason === 'game-finished') return FA.errors['game-finished'];
    if (option.reason === 'insufficient-resources') return `کمبود: ${RESOURCE_TYPES.filter((r) => option.missing[r]).map((r) => `${number(option.missing[r])} ${FA.resources[r]}`).join('، ')}`;
    return `${number(option.legalTargetIds.length)} محل مجاز • انتخاب محل روی صفحه`;
}

export function costRow(option: BuildOption): string {
    return `<span class="cost-row">${RESOURCE_TYPES.filter((r) => option.cost[r]).map((r) => resourceValue(r, option.cost[r], option.missing[r])).join('')}</span>`;
}

export function sheetContent(session: GameSession): { title: string; body: string } {
    const state = session.state!;
    const player = state.players[state.activePlayerIndex];
    const sheet = session.sheet!;
    if (sheet.kind === 'end-turn') return { title: 'پایان نوبت؟', body: `<p>مبادله تأییدنشده دارید. با پایان نوبت این انتخاب کنار گذاشته می‌شود.</p>${button('بازگشت به مبادله', 'open:trade', { className: 'button full-width' })}${button('کنارگذاشتن مبادله و پایان نوبت', 'confirm-end-turn', { className: 'button button--primary full-width' })}` };
    if (sheet.kind === 'build') {
        const summary = getPlayerSummary(state, player.id);
        const built = { road: summary.roads, settlement: summary.settlements, city: summary.cities };
        return { title: 'ساخت‌وساز', body: `<p class="sheet-intro">${escape(player.name)} • منابع فقط پس از تأیید محل پرداخت می‌شوند.</p>
            <div class="build-list">${BUILD_TYPES.map((type) => {
                const option = getBuildOption(state, type);
                return `<article class="build-card"><div class="row-between"><h3><span class="piece-symbol piece-symbol--${type}" aria-hidden="true"></span>${BUILD_LABELS[type]}</h3><span class="muted">ساخته‌شده: ${number(built[type])}</span></div>
                    ${costRow(option)}<p class="${option.reason ? 'availability' : 'muted'}">${buildReason(option, session)}</p>
                    ${button('انتخاب محل', `build:${type}`, { disabled: option.reason !== null })}</article>`;
            }).join('')}</div><p class="footnote">تعداد قطعات در این نسخه محدود نیست. شهر جایگزین آبادی شما می‌شود و یک امتیاز می‌افزاید.</p>` };
    }
    if (sheet.kind === 'trade') {
        const error = session.give && session.receive ? getBankTradeError(state, session.give, session.receive) : null;
        const hint = state.phase !== 'actions' ? (state.phase === 'robber' ? 'ابتدا راهزن را جابه‌جا کنید.' : state.phase === 'finished' ? FA.errors['game-finished'] : 'ابتدا تاس را بیندازید.')
            : error ? FA.errors[error] : !session.give || !session.receive ? 'هر دو سوی مبادله را انتخاب کنید.' : 'مبادله آماده تأیید است.';
        const selector = (side: 'give' | 'receive', title: string, amount: number) => `<section class="trade-side" aria-label="${title}"><h3>${title} <span class="muted">${number(amount)} واحد</span></h3><div class="resource-selector">${RESOURCE_TYPES.map((r) => button(`${resourceIcon(r)}<span>${FA.resources[r]}</span><span class="muted">دارایی ${number(player.resources[r])}</span>`, `trade:${side}:${r}`, { className: 'resource-choice', pressed: session[side] === r, label: `${title}: ${FA.resources[r]}، دارایی ${number(player.resources[r])}` })).join('')}</div></section>`;
        let review = '';
        if (session.give && session.receive) {
            const give = session.give, receive = session.receive;
            review = `<section class="trade-review" aria-label="مرور مبادله"><p>می‌دهید: ${resourceValue(give, BANK_TRADE_RATIO)} ${FA.resources[give]}</p><p>می‌گیرید: ${resourceValue(receive, 1)} ${FA.resources[receive]}</p>${!error ? `<p class="muted">دارایی پس از مبادله: ${FA.resources[give]} ${number(player.resources[give] - BANK_TRADE_RATIO)}، ${FA.resources[receive]} ${number(player.resources[receive] + 1)}</p>` : ''}</section>`;
        }
        return { title: 'تجارت با بانک', body: `<div class="trade-intro">${artSprite('bank', 64)}<p class="sheet-intro">${escape(player.name)} • نرخ مبادله <bdi>${number(BANK_TRADE_RATIO)}:۱</bdi></p></div>${selector('give', 'می‌دهید', BANK_TRADE_RATIO)}${selector('receive', 'می‌گیرید', 1)}${review}<p class="availability" role="status">${hint}</p>${button('تأیید مبادله', 'confirm-trade', { className: 'button button--primary full-width', disabled: !session.give || !session.receive || error !== null })}` };
    }
    if (sheet.kind === 'player') {
        const selected = state.players.find(({ id }) => id === sheet.id)!;
        const summary = getPlayerSummary(state, selected.id);
        return { title: selected.name, body: `<div class="player-detail" style="--owner:${color(selected.color)}"><span class="owner-badge">${number(state.players.indexOf(selected) + 1)}</span><p class="score-large">${number(summary.score)} <span>از ${number(state.victoryTarget)} امتیاز</span></p></div><dl class="detail-list"><div><dt>راه</dt><dd>${number(summary.roads)}</dd></div><div><dt>آبادی</dt><dd>${number(summary.settlements)}</dd></div><div><dt>شهر</dt><dd>${number(summary.cities)}</dd></div><div><dt>مجموع منابع</dt><dd>${number(summary.resources)}</dd></div></dl><p class="footnote">هر آبادی یک امتیاز و هر شهر دو امتیاز دارد. تعداد قطعات محدود نیست.</p>` };
    }
    if (sheet.kind === 'tile') {
        const tile = state.board.tiles.find(({ id }) => id === sheet.id)!;
        const probability = tile.number === null ? null : getProductionProbability(tile.number);
        const adjacent = tile.vertexIds.map((id) => state.board.vertices[id].building).filter((building) => building !== null);
        return { title: tile.resource ? `خانه ${FA.resources[tile.resource]}` : FA.desert, body: `<dl class="detail-list"><div><dt>شماره</dt><dd>${tile.number === null ? '—' : number(tile.number)}</dd></div><div><dt>احتمال تولید در هر تاس</dt><dd>${probability ? `${number(probability.outcomes)} از ${number(probability.total)}` : 'بدون تولید'}</dd></div><div><dt>راهزن</dt><dd>${tile.robber ? 'تولید این خانه مسدود است' : 'در این خانه نیست'}</dd></div></dl><h3>ساختمان‌های مجاور</h3>${adjacent.length ? `<ul class="plain-list">${adjacent.map((building) => `<li>${escape(state.players.find(({ id }) => id === building.ownerId)!.name)} • ${BUILD_LABELS[building.type]} • تولید ${number(building.type === 'city' ? 2 : 1)} واحد</li>`).join('')}</ul>` : '<p class="muted">ساختمانی در کنار این خانه نیست.</p>'}` };
    }
    if (sheet.kind === 'history') return { title: 'رویدادهای بازی', body: `<ol class="history-list">${[...session.history].reverse().map((event) => `<li><span class="muted">دور ${number(event.turn)} • ${escape(event.player)}</span><p>${escape(event.text)}</p></li>`).join('')}</ol><p class="footnote">آخرین ۱۰۰ رویداد این بازی روی همین دستگاه نگه داشته می‌شود.</p>` };
    if (sheet.kind === 'results') {
        const winner = state.players.find(({ id }) => id === state.winnerId)!;
        return { title: FA.winnerTitle, body: `<div class="victory-art">${artSprite('victory', 112, 'victory-emblem')}</div><p class="winner-name" style="--owner:${color(winner.color)}">${escape(winner.name)} ${FA.winnerSuffix}</p><div class="results-list">${state.players.map((p) => { const s = getPlayerSummary(state, p.id); return `<article><div class="row-between"><h3>${escape(p.name)}</h3><span>${number(s.score)} امتیاز</span></div><p class="muted">${number(s.settlements)} آبادی + ${number(s.cities)} شهر</p></article>`; }).join('')}</div>${button('دیدن صفحه نهایی', 'close-sheet', { className: 'button full-width' })}${button(FA.newGame, 'new-game', { className: 'button button--primary full-width' })}` };
    }
    return { title: 'راهنمای بازی', body: `<p>بازی محلی برای سه یا چهار بازیکن است. در نوبت خود دستگاه را در اختیار بگیرید؛ منابع پایین صفحه متعلق به بازیکن فعال است.</p><ol class="help-list"><li>تاس را بیندازید. خانه‌های هم‌شماره برای آبادی‌های مجاور یک منبع و برای شهرها دو منبع تولید می‌کنند.</li><li>با تاس هفت، راهزن را به خانه دیگری ببرید. خانه دارای راهزن تولید ندارد؛ در این نسخه سرقت و دورریختن منابع وجود ندارد.</li><li>ساخت‌وساز را باز کنید تا هزینه و محل‌های مجاز را ببینید. محل را انتخاب و سپس ساخت را تأیید کنید.</li><li>در بانک، چهار منبع یکسان را با یک منبع دیگر مبادله کنید.</li><li>پس از انجام کارها، پایان نوبت را بزنید. رسیدن به ${number(state.victoryTarget)} امتیاز بازی را تمام می‌کند.</li></ol><p>راه باید به شبکه شما وصل باشد؛ ساختمان حریف ادامه راه را قطع می‌کند. بین آبادی‌ها یک تقاطع خالی لازم است. شهر فقط آبادی خودتان را ارتقا می‌دهد.</p><p class="footnote">برای جزئیات خانه آن را لمس کنید. برای انتخاب دقیق‌تر از فهرست محل‌ها استفاده کنید؛ محل انتخاب‌شده را پیش از تأیید بررسی کنید.</p>${button('دیدن هزینه‌های ساخت', 'open:build', { className: 'button full-width' })}` };
}
