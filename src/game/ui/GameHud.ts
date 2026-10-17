import { getBankTradeRatio } from '../core/ports';
import { PRACTICE_TASKS } from '../tutorial/practice';
import { LESSONS, type LessonId } from '../tutorial/lessons.fa';
import { BUILD_TYPES } from '../core/building';
import { isSetup } from '../core/setup';
import { getBuildOption } from '../core/queries';
import { RESOURCE_TYPES, type ResourceType, type TradeRatio } from '../core/types';
import { BottomSheet, type SheetContent } from './bottomSheet';
import { button, escape, number, tradeIcon } from './components';
import { FA } from './messages.fa';
import { BUILD_LABELS, costRow, sheetContent } from './sheets';
import { type GameSession } from './session';
import type { AppPlatform } from '../../pwa/app';
import { appContent, saveLabel, updateContent } from '../../pwa/markup';
import { applyUpdate } from '../../pwa/updateFlow';
import { menuContent } from './menu';
import { humanHeader, humanHand } from './humanHud';

export class GameHud {
    readonly boardViewport: HTMLElement;
    private sheet: BottomSheet;
    private unsubscribe: () => void;
    private unsubscribePlatform: () => void;
    private lastNotice = '';
    private sizeObserver: ResizeObserver;
    private lastPrimaryAt = -Infinity;
    private lastTradeReviewAt = -Infinity;
    private markup = new Map<string, string>();

    constructor(
        private parent: HTMLElement,
        private session: GameSession,
        private app: AppPlatform,
    ) {
        parent.className = 'game-app is-menu';
        parent.innerHTML = `<section class="main-menu" aria-label="آغاز بازی"><div class="menu-panel"></div></section>
            <section class="match-screen" aria-label="صفحه بازی" hidden>
                <header class="match-bar"></header>
                <div class="board-viewport"><div class="board-canvas" aria-hidden="true"></div><p class="board-loading">در حال آماده‌سازی جزیره…</p><div class="board-selection"></div></div>
                <div class="context-line"></div><section class="resource-hand" aria-label="منابع شما"></section><nav class="action-dock" aria-label="ابزارهای نوبت"></nav><div class="primary-row"></div><div class="bottom-space"></div>
            </section><div class="sr-only" role="status" aria-live="polite" aria-atomic="true"></div>`;
        this.boardViewport = parent.querySelector('.board-canvas')!;
        this.sheet = new BottomSheet(parent, () => session.closeSheet());
        parent.addEventListener('click', this.onClick);
        parent.addEventListener('input', this.onInput);
        document.addEventListener('selectionchange', this.syncNameInput);
        document.addEventListener('keydown', this.onKeyDown);
        this.unsubscribe = session.subscribe(() => this.render());
        this.unsubscribePlatform = app.subscribe(() => this.render());
        this.sizeObserver = new ResizeObserver(([entry]) => {
            if (entry.contentRect.height > 0)
                parent.classList.toggle('is-compact', entry.contentRect.height < 720);
        });
        this.sizeObserver.observe(this.part('.match-screen'));
        this.render();
        if (!app.installed) session.openSheet({ kind: 'app' });
    }

    boardReady(): void {
        this.part('.board-loading').hidden = true;
    }
    private part(selector: string): HTMLElement {
        return this.parent.querySelector(selector)!;
    }
    private updatePart(selector: string, markup: string): void {
        if (this.markup.get(selector) === markup) return;
        this.part(selector).innerHTML = markup;
        this.markup.set(selector, markup);
    }

    private render(): void {
        const state = this.session.state;
        const focusAction = (document.activeElement as HTMLElement | null)?.dataset.action;
        this.parent.classList.toggle('is-menu', !state);
        this.part('.main-menu').hidden = state !== null;
        this.part('.match-screen').hidden = state === null;
        this.updatePart('.menu-panel', menuContent(this.app, this.session));
        if (!state) {
            this.sheet.render(this.content(), focusAction);
            if (focusAction && !this.session.sheet)
                [...this.parent.querySelectorAll<HTMLElement>('[data-action]')]
                    .find(
                        (element) =>
                            element.dataset.action === focusAction && !element.closest('dialog'),
                    )
                    ?.focus({ preventScroll: true });
            return;
        }
        const human = this.session.humanPlayer!;
        const humanTurn = this.session.isHumanTurn;
        const placement = this.session.placement;
        const opening = isSetup(state);
        const second =
            state.setup?.kind === 'placement' &&
            state.setup.settlements.length >= state.players.length;
        this.updatePart('.match-bar', humanHeader(this.session));
        const storageWarning = this.session.saveStatus === 'unavailable' && !placement;
        const availableBuilds = BUILD_TYPES.filter(
            (type) =>
                !getBuildOption(state, type, human.id).reason &&
                (!this.session.practice || this.session.practice.stage === type),
        );
        const bankReady = RESOURCE_TYPES.some(
            (r) => human.resources[r] >= getBankTradeRatio(state.board, human.id, r),
        );
        const hasCards = RESOURCE_TYPES.some((r) => human.resources[r] > 0);
        const partnerHasCards = state.players.some(
            (p) => p.id !== human.id && RESOURCE_TYPES.some((r) => p.resources[r] > 0),
        );
        const tradeHint = bankReady
            ? 'بانک آمادهٔ مبادله است'
            : hasCards && partnerHasCards
              ? 'می‌توانی پیشنهاد معامله بدهی'
              : 'برای معامله منابع کافی نیست';
        const actionHint = availableBuilds.length
            ? `قابل ساخت: ${availableBuilds.map((type) => BUILD_LABELS[type]).join('، ')}؛ ${tradeHint}؛ یا پایان نوبت.`
            : `ساخت آماده نیست؛ کمبود و محل را در ساخت ببین. ${tradeHint}؛ یا پایان نوبت.`;
        const hint =
            this.session.error ||
            (this.session.practice ? PRACTICE_TASKS[this.session.practice.stage] : '') ||
            (storageWarning ? 'ذخیره خودکار فعال نیست؛ برای جزئیات بزن.' : '') ||
            (!humanTurn && state.phase !== 'finished'
                ? this.session.notice ||
                  'رقبا دارن نوبتشون رو بازی می‌کنن؛ منابع پایین صفحه مال توئه.'
                : opening
                  ? state.phase === 'setup-roll'
                      ? state.setup?.kind === 'starter' &&
                        state.setup.contenders.length < state.players.length
                          ? 'بالاترین تاس مساوی شد؛ فقط همون بازیکن‌ها دوباره تاس می‌ندازن.'
                          : 'تاس آغازین فقط شروع‌کننده رو مشخص می‌کنه؛ هنوز محصولی نمی‌گیری.'
                      : state.phase === 'setup-road'
                        ? 'یک راه کنار همین آبادی انتخاب و تأیید کن؛ رایگانه.'
                        : second
                          ? 'آبادی دوم رو انتخاب کن؛ منابع آغازینت از زمین‌های کنار این آبادی میاد.'
                          : 'آبادی اولت رو روی یکی از تقاطع‌های روشن انتخاب و تأیید کن.'
                  : placement
                    ? placement.kind === 'robber'
                        ? 'خانه مقصد اهریمن را انتخاب و تأیید کنید.'
                        : `${BUILD_LABELS[placement.kind]}: محل روشن را انتخاب و سپس ساخت را تأیید کنید.`
                    : state.phase === 'roll'
                      ? FA.normalRoll
                      : this.session.tutorial.enabled
                        ? this.session.tutorial.objective({ state, placement })
                        : actionHint);
        this.updatePart(
            '.context-line',
            button(
                `<span>${escape(hint)}</span><span aria-hidden="true">≡</span>`,
                storageWarning
                    ? 'open-app'
                    : this.session.practice
                      ? 'open:help'
                      : this.session.tutorial.enabled
                        ? 'open:journal'
                        : 'open:history',
                {
                    className: 'context-button',
                    label: `${hint}؛ ${storageWarning ? 'جزئیات ذخیره بازی' : this.session.practice ? 'راهنمای تمرین' : this.session.tutorial.enabled ? 'دفتر سفر آناهیتا' : 'دیدن رویدادها'}`,
                },
            ),
        );
        this.updatePart('.resource-hand', humanHand(this.session));
        this.part('.resource-hand').setAttribute('aria-label', `منابع ${human.name}`);
        this.updatePart(
            '.action-dock',
            opening && placement
                ? `<div class="placement-cost"><span>${placement.kind === 'road' ? 'راه کنار آبادی تازه' : second ? 'آبادی دوم' : 'آبادی اول'}</span><span class="muted">جانمایی آغازین • بدون هزینه</span></div>${button('پاک‌کردن انتخاب', 'cancel-placement', { className: 'button button--quiet', disabled: !placement.targetId })}`
                : placement
                  ? `<div class="placement-cost"><span>${placement.kind === 'robber' ? 'جابه‌جایی اهریمن' : `هزینه ${BUILD_LABELS[placement.kind]}`}</span>${placement.kind === 'robber' ? '<span class="muted">خانه فعلی قابل انتخاب نیست</span>' : costRow(getBuildOption(state, placement.kind))}</div>${button(placement.kind === 'robber' ? 'پاک‌کردن انتخاب' : 'لغو', 'cancel-placement', { className: 'button button--quiet', disabled: placement.kind === 'robber' && !placement.targetId })}`
                  : `${button(`<span class="piece-symbol piece-symbol--settlement" aria-hidden="true"></span>ساخت • ${number(availableBuilds.length)} آماده`, 'open:build', { className: 'button dock-button', disabled: opening || state.phase === 'finished' })}${button(`${tradeIcon(28)}معامله`, this.session.practice ? 'open:trade' : 'open:domestic', { className: 'button dock-button', disabled: state.phase !== 'actions' || (!!this.session.practice && this.session.practice.stage !== 'trade') })}`,
        );
        const primaryLabel =
            this.session.practice && !placement && this.session.practice.stage !== 'roll'
                ? (
                      {
                          road: 'بازکردن ساخت راه',
                          trade: 'بازکردن بانک؛ دریافت پشم',
                          settlement: 'بازکردن ساخت آبادی',
                          complete: 'تمرین تمام شد؛ بازگشت به منو',
                      } as const
                  )[this.session.practice.stage]
                : !humanTurn && state.phase !== 'finished'
                  ? 'منتظر نوبت تو…'
                  : placement
                    ? placement.kind === 'robber'
                        ? 'تأیید جابه‌جایی اهریمن'
                        : opening
                          ? `تأیید ${placement.kind === 'road' ? 'راه آغازین' : second ? 'آبادی دوم' : 'آبادی اول'}`
                          : `تأیید ساخت ${BUILD_LABELS[placement.kind]}`
                    : state.phase === 'setup-roll'
                      ? 'تاس تعیین آغازکننده'
                      : state.phase === 'roll'
                        ? FA.roll
                        : state.phase === 'finished'
                          ? 'نتیجه بازی'
                          : FA.endTurn;
        this.updatePart(
            '.primary-row',
            button(primaryLabel, 'primary', {
                className: `button button--primary${state.phase === 'actions' && !placement && !this.session.practice ? ' button--end-turn' : ''}`,
                disabled:
                    (!humanTurn && state.phase !== 'finished') ||
                    (!!placement && !placement.targetId),
            }),
        );
        this.part('.board-selection').classList.toggle('is-placing', !!placement);
        this.updatePart(
            '.board-selection',
            placement
                ? `<div class="target-picker">${button(`انتخاب از ${number(this.session.targets.length)} محل مجاز`, 'open:targets', { className: 'button full-width' })}</div>`
                : '',
        );
        if (focusAction && !this.session.sheet)
            [...this.parent.querySelectorAll<HTMLElement>('[data-action]')]
                .find((el) => el.dataset.action === focusAction && !el.closest('dialog'))
                ?.focus({ preventScroll: true });
        if (this.session.notice !== this.lastNotice) {
            this.part('.sr-only[role="status"]').textContent = this.session.notice;
            this.lastNotice = this.session.notice;
        }
        this.sheet.render(this.content(), focusAction);
    }

    private content(): SheetContent | null {
        if (!this.session.sheet) return null;
        if (this.session.sheet.kind === 'update') return updateContent(this.app, this.session);
        if (this.session.sheet.kind === 'app') return appContent(this.app, this.session);
        const content = sheetContent(this.session);
        if (this.session.sheet.kind === 'help')
            content.body += `${this.session.saveStatus === 'unavailable' ? `<p class="availability">${escape(saveLabel(this.session))}</p>` : ''}${button(this.app.updateReady ? 'نسخه تازه و برنامه آفلاین' : 'نصب و بازی آفلاین', 'open-app', { className: 'button full-width' })}${button('ذخیره و بازگشت به منو', 'new-game', { className: 'button full-width' })}${button('شروع بازی تازه', 'restart-match', { className: 'button full-width' })}`;
        return content;
    }

    private onClick = (event: MouseEvent): void => {
        const target = (event.target as Element).closest<HTMLButtonElement>('button[data-action]');
        if (!target || target.disabled) return;
        if (this.app.updating) return;
        const [action, value, resource] = target.dataset.action!.split(':');
        const targetId = target.dataset.action!.slice(action.length + 1);
        if (action === 'play' || action === 'tutorial')
            this.session.requestPlay(action === 'tutorial');
        if (action === 'resume-match') this.session.resumeSaved();
        if (action === 'restart-match') this.session.requestStart(4);
        if (action === 'confirm-new-match') this.session.confirmNewMatch();
        if (action === 'confirm-player-name') {
            const input = this.parent.querySelector<HTMLInputElement>('#player-name');
            if (input) this.session.playerNameDraft = input.value;
            this.session.confirmPlayerName();
        }
        if (action === 'open-app') this.session.openSheet({ kind: 'app' });
        if (action === 'app-install') void this.app.install();
        if (action === 'app-retry') this.app.retry();
        if (action === 'app-update') {
            void applyUpdate(this.app, this.session);
        }
        if (action === 'tutorial-next') this.session.continueTutorial();
        if (action === 'tutorial-pause') this.session.setTutorialEnabled(false);
        if (action === 'tutorial-resume') this.session.setTutorialEnabled(true);
        if (action === 'lesson' && Object.prototype.hasOwnProperty.call(LESSONS, value))
            this.session.replayLesson(value as LessonId);
        if (
            action === 'open' &&
            [
                'build',
                'trade',
                'domestic',
                'help',
                'history',
                'targets',
                'inspect',
                'journal',
                'opponents',
            ].includes(value)
        )
            this.session.openSheet({
                kind: value as
                    | 'build'
                    | 'trade'
                    | 'domestic'
                    | 'help'
                    | 'history'
                    | 'targets'
                    | 'inspect'
                    | 'journal'
                    | 'opponents',
            });
        if (
            action === 'inspect' &&
            this.session.state?.board.tiles.some((tile) => tile.id === targetId)
        )
            this.session.openSheet({ kind: 'tile', id: targetId });
        if (action === 'preview-target') this.session.chooseTargetFromSheet(targetId);
        if (action === 'port' && this.session.state?.board.ports.some((port) => port.id === value))
            this.session.openSheet({ kind: 'port', id: value });
        if (action === 'trade-port') this.session.tradeFromPort(value);
        if (action === 'trade-rate' && [2, 3, 4].includes(Number(value)))
            this.session.chooseTradeRatio(Number(value) as TradeRatio);
        if (action === 'player') this.session.openSheet({ kind: 'player', id: value });
        if (action === 'close-sheet') this.session.closeSheet();
        if (action === 'build' && BUILD_TYPES.some((type) => type === value))
            this.session.chooseBuild(value as (typeof BUILD_TYPES)[number]);
        if (
            action === 'trade' &&
            (value === 'give' || value === 'receive') &&
            RESOURCE_TYPES.some((r) => r === resource)
        )
            this.session.chooseTrade(value, resource as ResourceType);
        if (this.session.sheet?.kind === 'domestic') {
            const market = this.session.trading;
            if (
                action === 'deal-adjust' &&
                (value === 'give' || value === 'want') &&
                RESOURCE_TYPES.includes(resource as ResourceType)
            )
                market.adjust(
                    value,
                    resource as ResourceType,
                    Number(target.dataset.action!.split(':')[3]),
                );
            if (action === 'deal-target') market.selectTarget(value === 'all' ? null : value);
            if (action === 'deal-send') market.send();
            if (action === 'deal-new') market.edit();
            if (action === 'deal-counter') market.edit(Number(value));
            if (action === 'deal-accept') {
                this.lastTradeReviewAt = performance.now();
                market.respond(Number(value), true);
            }
            if (action === 'deal-reject') market.respond(Number(value), false);
            if (action === 'deal-review') {
                this.lastTradeReviewAt = performance.now();
                market.review(Number(value));
            }
            if (action === 'deal-withdraw') market.withdraw(Number(value));
            if (action === 'deal-finish' && performance.now() - this.lastTradeReviewAt >= 300)
                market.finish(Number(value));
        }
        if (action === 'confirm-trade') this.session.confirmTrade();
        if (action === 'confirm-end-turn') this.session.confirmEndTurn();
        if (action === 'primary') {
            // A rapid second tap must not hit End Turn just after Confirm Build.
            const now = performance.now();
            if (now - this.lastPrimaryAt >= 300) {
                this.lastPrimaryAt = now;
                this.session.primary();
            }
        }
        if (action === 'cancel-placement') this.session.cancelPlacement();
        if (action === 'new-game') {
            this.session.returnToMenu();
            if (this.app.updateReady) this.session.openSheet({ kind: 'update' });
        }
    };
    private onInput = (event: Event): void => {
        const input = event.target;
        if (!(input instanceof HTMLInputElement) || input.dataset.action !== 'player-name') return;
        this.session.playerNameDraft = input.value;
        this.syncNameInput();
    };
    private syncNameInput = (): void => {
        const input = this.parent.querySelector<HTMLInputElement>('#player-name');
        const value = input?.parentElement?.querySelector<HTMLElement>('.name-entry-value');
        if (!input || !value) return;
        const text = input.value || 'اسمت رو بنویس…';
        if (value.textContent !== text) value.textContent = text;
        value.classList.toggle('is-empty', !input.value);
        value.scrollLeft = input.scrollLeft;
    };
    private onKeyDown = (event: KeyboardEvent): void => {
        if (
            event.key === 'Enter' &&
            !event.isComposing &&
            this.session.sheet?.kind === 'player-name' &&
            event.target instanceof HTMLInputElement &&
            !this.app.updating
        ) {
            event.preventDefault();
            this.session.playerNameDraft = event.target.value;
            this.session.confirmPlayerName();
        }
        if (event.key === 'Escape' && !this.session.sheet && this.session.placement)
            this.session.cancelPlacement();
    };
    destroy(): void {
        this.unsubscribe();
        this.unsubscribePlatform();
        this.sizeObserver.disconnect();
        this.sheet.destroy();
        this.parent.removeEventListener('click', this.onClick);
        this.parent.removeEventListener('input', this.onInput);
        document.removeEventListener('selectionchange', this.syncNameInput);
        document.removeEventListener('keydown', this.onKeyDown);
    }
}
