import type { GameScene } from '../scenes/GameScene';
import { RESOURCE_TYPES, type GameState, type ResourceType } from '../core/types';
import { number } from './components';
import type { Motion } from './motion';
import type { GameSession, Placement, Sheet } from './session';
import type { MatchTransition } from './transitions';
import type { InterfaceScene } from './InterfaceScene';

/** Bridges confirmed state to bounded Phaser effects; never submits a command. */
export class GameFeedback {
    private unsubscribe: () => void;
    private unsubscribeLayout: () => void;
    private unsubscribeMotion: () => void;
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
        private ui: InterfaceScene,
        motion: Motion,
    ) {
        this.lastId = session.transition?.id ?? 0;
        this.lastState = session.state;
        this.lastSheet = session.sheet;
        this.lastPlacement = session.placement;
        this.lastError = session.error;
        this.lastGive = session.give;
        this.lastReceive = session.receive;
        this.unsubscribe = session.subscribe(() => this.update());
        this.unsubscribeLayout = board.subscribeLayout(() => this.clear());
        this.unsubscribeMotion = motion.subscribe(() => this.clear());
    }
    private clear(): void {
        this.ui.feedback?.clear();
        this.board.clearEffects();
    }
    private query(selector: string): HTMLElement | null {
        return this.parent.querySelector<HTMLElement>(selector);
    }
    private update(): void {
        const state = this.session.state;
        if (state !== this.lastState || this.session.sheet !== this.lastSheet) this.clear();
        const transition = this.session.transition;
        if (transition && transition.id !== this.lastId) {
            this.lastId = transition.id;
            if (transition.after === state) this.play(transition);
        }
        if (this.session.placement?.targetId && this.session.placement !== this.lastPlacement)
            this.ui.feedback?.pulse(this.query('.primary-row button'));
        if (this.session.error && this.session.error !== this.lastError)
            this.ui.feedback?.pulse(
                this.query('dialog[open] .availability') ?? this.query('.context-line'),
                0xffb595,
            );
        if (this.session.give !== this.lastGive)
            this.ui.feedback?.pulse(
                this.query('dialog[open] [data-action^="trade:give:"][aria-pressed="true"]'),
            );
        if (this.session.receive !== this.lastReceive)
            this.ui.feedback?.pulse(
                this.query('dialog[open] [data-action^="trade:receive:"][aria-pressed="true"]'),
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
                    this.ui.feedback?.delta(
                        this.query(`.hand-resource[data-resource="${resource}"]`),
                        `${delta > 0 ? '+' : '−'}${number(Math.abs(delta))}`,
                        delta < 0,
                    );
            }
        }
        for (const player of after.players) {
            const previous = before.players.find(({ id }) => id === player.id)!;
            const delta = RESOURCE_TYPES.reduce(
                (sum, r) => sum + player.resources[r] - previous.resources[r],
                0,
            );
            if (delta)
                this.ui.feedback?.pulse(
                    this.query(`[data-action="player:${CSS.escape(player.id)}"]`),
                    player.color,
                );
        }
        if (action.kind === 'roll') {
            this.ui.feedback?.pulse(this.query('.dice-result'));
            if (!this.session.sheet)
                transition.production.forEach((grant, index) => {
                    const source = this.board.tileAnchor(grant.tileId);
                    const target =
                        grant.playerId === active.id
                            ? this.query(
                                  `.hand-resource[data-resource="${grant.resource}"] .resource-icon`,
                              )
                            : this.query(`[data-action="player:${CSS.escape(grant.playerId)}"]`);
                    const owner = after.players.find(({ id }) => id === grant.playerId)!;
                    if (source && target)
                        this.ui.feedback?.fly(
                            source,
                            target,
                            grant.resource,
                            number(grant.amount),
                            owner.color,
                            220 + index * 35,
                        );
                });
        }
        if (action.kind === 'end-turn')
            this.ui.feedback?.pulse(
                this.query(`[data-action="player:${CSS.escape(active.id)}"]`),
                active.color,
            );
        if (after.phase === 'finished') this.ui.feedback?.victory();
        if (!this.session.sheet) this.board.playTransition(transition);
    }
    destroy(): void {
        this.unsubscribe();
        this.unsubscribeLayout();
        this.unsubscribeMotion();
        this.clear();
    }
}
