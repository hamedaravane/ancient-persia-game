import { BUILD_TYPES } from '../core/building';
import { getBuildOption, getPlayerSummary } from '../core/queries';
import { RESOURCE_TYPES, type ResourceType, type TradeRatio } from '../core/types';
import { BottomSheet } from './bottomSheet';
import { artSprite, button, diceFace, escape, number, resourceIcon } from './components';
import { FA } from './messages.fa';
import { BUILD_LABELS, PHASE_LABELS, costRow, sheetContent } from './sheets';
import { type GameSession } from './session';
import type { Motion } from './motion';

export class GameHud {
    readonly boardViewport: HTMLElement;
    private sheet: BottomSheet;
    private unsubscribe: () => void;
    private lastNotice = '';
    private sizeObserver: ResizeObserver;
    private lastPrimaryAt = -Infinity;
    private markup = new Map<string, string>();

    constructor(
        private parent: HTMLElement,
        private session: GameSession,
        motion: Motion,
    ) {
        parent.className = 'game-app is-menu';
        parent.innerHTML = `<section class="main-menu" aria-label="آغاز بازی"><div class="menu-panel">${artSprite('corner', 42, 'panel-corner panel-corner--start')}${artSprite('corner', 42, 'panel-corner panel-corner--end')}${artSprite('rosette', 44, 'menu-emblem')}<p class="eyebrow">سرزمین فرصت‌ها</p><h1>${FA.title}</h1><p>${FA.subtitle}</p>${artSprite('divider', 120, 'menu-divider')}<h2>${FA.choosePlayers}</h2><div class="menu-choices">${button(FA.threePlayers, 'start:3', { className: 'button button--primary' })}${button(FA.fourPlayers, 'start:4')}</div><p class="footnote">${FA.handover}</p></div></section>
            <section class="match-screen" aria-label="صفحه بازی" hidden>
                <header class="match-bar"></header><nav class="player-strip" aria-label="بازیکنان"></nav>
                <div class="board-viewport"><div class="board-canvas" aria-hidden="true"></div><p class="board-loading">در حال آماده‌سازی جزیره…</p><div class="board-selection"></div></div>
                <div class="context-line"></div><section class="resource-hand" aria-label="منابع بازیکن فعال"></section><nav class="action-dock" aria-label="ابزارهای نوبت"></nav><div class="primary-row"></div><div class="bottom-space"></div>
            </section><div class="sr-only" role="status" aria-live="polite" aria-atomic="true"></div>`;
        this.boardViewport = parent.querySelector('.board-canvas')!;
        this.sheet = new BottomSheet(parent, () => session.closeSheet(), motion);
        parent.addEventListener('click', this.onClick);
        parent.addEventListener('change', this.onChange);
        document.addEventListener('keydown', this.onKeyDown);
        this.unsubscribe = session.subscribe(() => this.render());
        this.sizeObserver = new ResizeObserver(([entry]) => {
            if (entry.contentRect.height > 0)
                parent.classList.toggle('is-compact', entry.contentRect.height < 720);
        });
        this.sizeObserver.observe(this.part('.match-screen'));
        this.render();
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
        if (!state) {
            this.sheet.render(null);
            return;
        }
        const active = state.players[state.activePlayerIndex];
        const placement = this.session.placement;
        const dice = state.lastRoll
            ? `<span class="dice-pair">${diceFace(state.lastRoll[0])}${diceFace(state.lastRoll[1])}</span><span class="dice-total">${number(state.lastRoll[0] + state.lastRoll[1])}</span>`
            : '<span>تاس —</span>';
        this.updatePart(
            '.match-bar',
            `<div class="turn-heading"><span>${escape(active.name)} <span class="muted">• دور ${number(state.turn)}</span></span><span class="phase-label">${PHASE_LABELS[state.phase]} <span class="muted">• هدف ${number(state.victoryTarget)} امتیاز</span></span></div><div class="dice-result" role="img" aria-label="${state.lastRoll ? `تاس‌ها ${number(state.lastRoll[0])} و ${number(state.lastRoll[1])}؛ مجموع ${number(state.lastRoll[0] + state.lastRoll[1])}` : 'هنوز تاس انداخته نشده'}">${dice}</div>${button('⋯', 'open:help', { className: 'icon-button', label: 'راهنما و هزینه‌های بازی' })}`,
        );
        this.updatePart(
            '.player-strip',
            state.players
                .map((p, i) => {
                    const summary = getPlayerSummary(state, p.id);
                    return button(
                        `<span class="player-name"><span class="owner-dot">${number(i + 1)}</span>${escape(p.name)}</span><span class="player-stats"><span>${number(summary.score)} امتیاز</span><span>${number(summary.resources)} منبع</span></span>`,
                        `player:${p.id}`,
                        {
                            className: `player-chip${p.id === active.id ? ' is-active' : ''}`,
                            ownerColor: p.color,
                            label: `${p.name}، ${number(summary.score)} امتیاز از ${number(state.victoryTarget)}، ${number(summary.resources)} منبع${p.id === active.id ? '، نوبت فعال' : ''}`,
                        },
                    );
                })
                .join(''),
        );
        const hint =
            this.session.error ||
            (placement
                ? placement.kind === 'robber'
                    ? 'خانه مقصد راهزن را انتخاب و تأیید کنید.'
                    : `${BUILD_LABELS[placement.kind]}: محل روشن را انتخاب و سپس ساخت را تأیید کنید.`
                : state.phase === 'roll'
                  ? FA.normalRoll
                  : this.session.notice || FA.buildHint);
        this.updatePart(
            '.context-line',
            button(
                `<span>${escape(hint)}</span><span aria-hidden="true">≡</span>`,
                'open:history',
                { className: 'context-button', label: `${hint}؛ دیدن رویدادها` },
            ),
        );
        this.updatePart(
            '.resource-hand',
            RESOURCE_TYPES.map(
                (r) =>
                    `<div class="hand-resource" data-resource="${r}" aria-label="${FA.resources[r]} ${number(active.resources[r])}">${resourceIcon(r)}<span class="resource-count">${number(active.resources[r])}</span><span class="resource-label">${FA.resources[r]}</span></div>`,
            ).join(''),
        );
        this.part('.resource-hand').setAttribute('aria-label', `منابع ${active.name}`);
        this.updatePart(
            '.action-dock',
            placement
                ? `<div class="placement-cost"><span>${placement.kind === 'robber' ? 'جابه‌جایی راهزن' : `هزینه ${BUILD_LABELS[placement.kind]}`}</span>${placement.kind === 'robber' ? '<span class="muted">خانه فعلی قابل انتخاب نیست</span>' : costRow(getBuildOption(state, placement.kind))}</div>${button(placement.kind === 'robber' ? 'پاک‌کردن انتخاب' : 'لغو', 'cancel-placement', { className: 'button button--quiet', disabled: placement.kind === 'robber' && !placement.targetId })}`
                : `${button('<span class="piece-symbol piece-symbol--settlement" aria-hidden="true"></span>ساخت‌وساز', 'open:build', { className: 'button dock-button', disabled: state.phase === 'finished' })}${button(`${artSprite('bank', 28)}${FA.bankTrade}`, 'open:trade', { className: 'button dock-button', disabled: state.phase === 'finished' })}`,
        );
        const primaryLabel = placement
            ? placement.kind === 'robber'
                ? 'تأیید جابه‌جایی راهزن'
                : `تأیید ساخت ${BUILD_LABELS[placement.kind]}`
            : state.phase === 'roll'
              ? FA.roll
              : state.phase === 'finished'
                ? 'نتیجه بازی'
                : FA.endTurn;
        this.updatePart(
            '.primary-row',
            button(primaryLabel, 'primary', {
                className: `button button--primary${state.phase === 'actions' && !placement ? ' button--end-turn' : ''}`,
                disabled: !!placement && !placement.targetId,
            }),
        );
        const targets = this.session.targets;
        this.part('.board-selection').classList.toggle('is-placing', !!placement);
        this.updatePart(
            '.board-selection',
            placement
                ? `<label class="target-picker"><span class="sr-only">انتخاب محل از فهرست</span><select data-action="target" aria-label="انتخاب محل از فهرست"><option value="">انتخاب محل (${number(targets.length)})</option>${targets.map((id, i) => `<option value="${escape(id)}"${id === placement.targetId ? ' selected' : ''}>${placement.kind === 'robber' ? this.tileLabel(id) : `محل ${number(i + 1)}`}</option>`).join('')}</select></label>`
                : `<label class="sr-only"><span>بررسی خانه</span><select data-action="inspect"><option value="">بررسی خانه</option>${state.board.tiles.map((tile) => `<option value="${escape(tile.id)}">${this.tileLabel(tile.id)}</option>`).join('')}</select></label>`,
        );
        if (focusAction && !this.session.sheet)
            [...this.parent.querySelectorAll<HTMLElement>('[data-action]')]
                .find((el) => el.dataset.action === focusAction && !el.closest('dialog'))
                ?.focus({ preventScroll: true });
        if (this.session.notice !== this.lastNotice) {
            this.part('[role="status"]').textContent = this.session.notice;
            this.lastNotice = this.session.notice;
        }
        this.sheet.render(this.session.sheet ? sheetContent(this.session) : null, focusAction);
    }

    private tileLabel(id: string): string {
        const tile = this.session.state!.board.tiles.find((t) => t.id === id)!;
        return `${tile.resource ? FA.resources[tile.resource] : FA.desert}${tile.number === null ? '' : ` ${number(tile.number)}`} (${number(tile.q + 3)}، ${number(tile.r + 3)})`;
    }
    private onClick = (event: MouseEvent): void => {
        const target = (event.target as Element).closest<HTMLButtonElement>('button[data-action]');
        if (!target || target.disabled) return;
        const [action, value, resource] = target.dataset.action!.split(':');
        if (action === 'start') this.session.start(value === '3' ? 3 : 4);
        if (action === 'open' && ['build', 'trade', 'help', 'history'].includes(value))
            this.session.openSheet({ kind: value as 'build' | 'trade' | 'help' | 'history' });
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
        if (action === 'new-game') this.session.returnToMenu();
    };
    private onChange = (event: Event): void => {
        const target = event.target as HTMLSelectElement;
        if (!target.value) {
            if (target.dataset.action === 'target')
                target.value = this.session.placement?.targetId ?? '';
            return;
        }
        if (target.dataset.action === 'target') this.session.preview(target.value);
        if (target.dataset.action === 'inspect') {
            const id = target.value;
            target.value = '';
            this.session.openSheet({ kind: 'tile', id });
        }
    };
    private onKeyDown = (event: KeyboardEvent): void => {
        if (event.key === 'Escape' && !this.session.sheet && this.session.placement)
            this.session.cancelPlacement();
    };
    destroy(): void {
        this.unsubscribe();
        this.sizeObserver.disconnect();
        this.sheet.destroy();
        this.parent.removeEventListener('click', this.onClick);
        this.parent.removeEventListener('change', this.onChange);
        document.removeEventListener('keydown', this.onKeyDown);
    }
}
