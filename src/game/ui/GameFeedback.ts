import type { GameScene } from '../scenes/GameScene';
import { RESOURCE_TYPES, type GameState, type ResourceType } from '../core/types';
import type { ProductionGrant } from '../core/production';
import { artSprite, color, number, resourceIcon } from './components';
import { AnimationGroup, MOTION, type Motion } from './motion';
import type { GameSession, Placement, Sheet } from './session';
import type { MatchTransition } from './transitions';

/** Bridges confirmed transitions to finite DOM/board effects; never submits a command. */
export class GameFeedback {
    private layer = document.createElement('div');
    private animation: AnimationGroup;
    private unsubscribe: () => void;
    private unsubscribeLayout: () => void;
    private lastId: number;
    private lastState: GameState | null;
    private lastSheet: Sheet | null;
    private lastPlacement: Placement | null;
    private lastError: string | null;
    private lastGive: ResourceType | null;
    private lastReceive: ResourceType | null;

    constructor(
        private parent: HTMLElement,
        private session: GameSession,
        private board: GameScene,
        private motion: Motion,
    ) {
        this.layer.className = 'feedback-layer';
        this.layer.setAttribute('aria-hidden', 'true');
        parent.append(this.layer);
        this.animation = new AnimationGroup(motion);
        this.lastId = session.transition?.id ?? 0;
        this.lastState = session.state;
        this.lastSheet = session.sheet;
        this.lastPlacement = session.placement;
        this.lastError = session.error;
        this.lastGive = session.give;
        this.lastReceive = session.receive;
        // Registered after HUD and board rendering, so all destination nodes are current.
        this.unsubscribe = session.subscribe(() => this.update());
        this.unsubscribeLayout = board.subscribeLayout(() => this.clear());
    }
    private clear(): void {
        this.animation.clear();
        this.layer.replaceChildren();
        this.board.clearEffects();
    }
    private query(selector: string): HTMLElement | null {
        return this.parent.querySelector<HTMLElement>(selector);
    }
    private pulse(element: HTMLElement | null, duration: number = MOTION.board): void {
        const scale = element?.classList.contains('resource-count') ? 1.18 : 1.035;
        if (element)
            this.animation.play(
                element,
                [
                    { transform: 'scale(1)' },
                    { transform: `scale(${scale})`, offset: 0.35 },
                    { transform: 'scale(1)' },
                ],
                { duration, easing: MOTION.ease },
                undefined,
                [{ opacity: 0.65 }, { opacity: 1 }],
            );
    }

    private update(): void {
        const state = this.session.state;
        if (
            state !== this.lastState ||
            (this.session.sheet && this.session.sheet !== this.lastSheet)
        )
            this.clear();
        if (state && !this.lastState) {
            const screen = this.query('.match-screen');
            if (screen)
                this.animation.play(
                    screen,
                    [{ opacity: 0.4 }, { opacity: 1 }],
                    { duration: MOTION.sheet },
                    undefined,
                    [{ opacity: 0.7 }, { opacity: 1 }],
                );
        }
        const transition = this.session.transition;
        if (transition && transition.id !== this.lastId) {
            this.lastId = transition.id;
            if (transition.after === state) this.play(transition);
        }
        if (this.session.placement?.targetId && this.session.placement !== this.lastPlacement)
            this.pulse(this.query('.primary-row button'), MOTION.fast);
        if (this.session.error && this.session.error !== this.lastError)
            this.pulse(
                this.query('dialog[open] .availability') ?? this.query('.context-line'),
                MOTION.fast,
            );
        if (this.session.give !== this.lastGive)
            this.pulse(
                this.query('dialog[open] [data-action^="trade:give:"][aria-pressed="true"]'),
                MOTION.fast,
            );
        if (this.session.receive !== this.lastReceive)
            this.pulse(
                this.query('dialog[open] [data-action^="trade:receive:"][aria-pressed="true"]'),
                MOTION.fast,
            );
        this.lastState = state;
        this.lastSheet = this.session.sheet;
        this.lastPlacement = this.session.placement;
        this.lastError = this.session.error;
        this.lastGive = this.session.give;
        this.lastReceive = this.session.receive;
    }

    private play(transition: MatchTransition): void {
        const { action, before, after } = transition;
        const active = after.players[after.activePlayerIndex];
        if (before.activePlayerIndex === after.activePlayerIndex) {
            const previous = before.players[before.activePlayerIndex];
            for (const resource of RESOURCE_TYPES) {
                const delta = active.resources[resource] - previous.resources[resource];
                if (delta)
                    this.delta(this.query(`.hand-resource[data-resource="${resource}"]`), delta);
            }
        }
        for (const player of after.players) {
            const previous = before.players.find(({ id }) => id === player.id)!;
            const delta = RESOURCE_TYPES.reduce(
                (sum, r) => sum + player.resources[r] - previous.resources[r],
                0,
            );
            if (delta)
                this.pulse(
                    this.query(`[data-action="player:${CSS.escape(player.id)}"] .player-stats`),
                );
        }
        if (action.kind === 'roll') {
            const dice = this.query('.dice-result');
            if (dice)
                this.animation.play(
                    dice,
                    [
                        { transform: 'rotate(-7deg) scale(0.9)' },
                        { transform: 'rotate(5deg) scale(1.08)', offset: 0.3 },
                        { transform: 'rotate(-2deg)', offset: 0.65 },
                        { transform: 'rotate(0) scale(1)' },
                    ],
                    { duration: MOTION.dice, easing: MOTION.ease },
                    undefined,
                    [{ opacity: 0.5 }, { opacity: 1 }],
                );
            if (!this.session.sheet)
                transition.production.forEach((grant, index) => this.fly(grant, index, active.id));
        }
        if (action.kind === 'end-turn') {
            this.pulse(this.query(`[data-action="player:${CSS.escape(active.id)}"]`));
            const hand = this.query('.resource-hand');
            if (hand)
                this.animation.play(
                    hand,
                    [{ opacity: 0.4 }, { opacity: 1 }],
                    { duration: MOTION.sheet },
                    undefined,
                    [{ opacity: 0.7 }, { opacity: 1 }],
                );
        }
        if (after.phase === 'finished') {
            this.pulse(this.query('dialog[open] .winner-name'), 500);
            this.victoryGlint();
        }
        if (!this.session.sheet) this.board.playTransition(transition);
    }

    private victoryGlint(): void {
        if (this.motion.reduced || !this.motion.visible) return;
        const emblem = this.query('dialog[open] .victory-art');
        if (!emblem) return;
        const glint = document.createElement('span');
        glint.className = 'victory-glint';
        glint.setAttribute('aria-hidden', 'true');
        glint.innerHTML = artSprite('glint', 64);
        emblem.append(glint);
        this.animation.play(
            glint,
            [
                { opacity: 0, transform: 'scale(0.6) rotate(-15deg)' },
                { opacity: 0.7, transform: 'scale(1)', offset: 0.35 },
                { opacity: 0, transform: 'scale(1.15) rotate(10deg)' },
            ],
            { duration: 650, easing: MOTION.ease },
            () => glint.remove(),
        );
    }

    private delta(cell: HTMLElement | null, amount: number): void {
        if (!cell) return;
        const badge = document.createElement('span');
        badge.className = `resource-delta${amount < 0 ? ' resource-delta--spent' : ''}`;
        badge.setAttribute('aria-hidden', 'true');
        badge.dir = 'ltr';
        badge.textContent = `${amount > 0 ? '+' : '−'}${number(Math.abs(amount))}`;
        cell.append(badge);
        this.pulse(cell.querySelector<HTMLElement>('.resource-count'));
        this.animation.play(
            badge,
            [
                { opacity: 0, transform: 'translateY(5px)' },
                { opacity: 1, transform: 'translateY(0)', offset: 0.12 },
                { opacity: 1, transform: 'translateY(0)', offset: 0.8 },
                { opacity: 0, transform: 'translateY(-8px)' },
            ],
            { duration: 1100, easing: MOTION.ease },
            () => badge.remove(),
            [{ opacity: 1 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }],
        );
    }

    private fly(grant: ProductionGrant, index: number, activeId: string): void {
        if (this.motion.reduced || !this.motion.visible) return;
        const source = this.board.tileAnchor(grant.tileId);
        const target =
            grant.playerId === activeId
                ? this.query(`.hand-resource[data-resource="${grant.resource}"] .resource-icon`)
                : this.query(
                      `[data-action="player:${CSS.escape(grant.playerId)}"] .player-stats > span:last-child`,
                  );
        if (!source || !target) return;
        const bounds = this.parent.getBoundingClientRect(),
            end = target.getBoundingClientRect();
        const dx = end.left + end.width / 2 - source.x,
            dy = end.top + end.height / 2 - source.y;
        const flight = document.createElement('span');
        flight.className = 'resource-flight';
        const owner = this.session.state!.players.find(({ id }) => id === grant.playerId)!;
        flight.style.setProperty('--owner', color(owner.color));
        flight.style.left = `${source.x - bounds.left - 20}px`;
        flight.style.top = `${source.y - bounds.top - 20}px`;
        flight.innerHTML = `${resourceIcon(grant.resource)}<span class="flight-amount">${number(grant.amount)}</span>`;
        this.layer.append(flight);
        const bend = index % 2 === 0 ? -14 : 14;
        this.animation.play(
            flight,
            [
                { transform: 'translate(0, 0) scale(0.7)', opacity: 0 },
                {
                    transform: `translate(${dx * 0.2 + bend}px, ${dy * 0.2 - 18}px) scale(1)`,
                    opacity: 1,
                    offset: 0.2,
                },
                {
                    transform: `translate(${dx * 0.7 + bend}px, ${dy * 0.7 - 12}px) scale(0.9)`,
                    opacity: 1,
                    offset: 0.7,
                },
                { transform: `translate(${dx}px, ${dy}px) scale(0.5)`, opacity: 0 },
            ],
            { duration: MOTION.flight, delay: 220 + index * 35, easing: MOTION.ease },
            () => flight.remove(),
        );
    }
    destroy(): void {
        this.unsubscribe();
        this.unsubscribeLayout();
        this.animation.destroy();
        this.board.clearEffects();
        this.layer.remove();
    }
}
