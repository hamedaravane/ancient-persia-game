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
        const humanId = this.session.humanPlayer!.id;
        const human = after.players.find((p) => p.id === humanId)!;
        const previousHuman = before.players.find((p) => p.id === humanId)!;
        for (const resource of RESOURCE_TYPES) {
            const delta = human.resources[resource] - previousHuman.resources[resource];
            if (delta)
                this.ui.feedback?.delta(
                    this.query(`.hand-resource[data-resource="${resource}"]`),
                    `${delta > 0 ? '+' : '−'}${number(Math.abs(delta))}`,
                    delta < 0,
                );
        }
        if (action.kind === 'roll') {
            if (this.session.isHumanTurn) this.ui.feedback?.pulse(this.query('.dice-result'));
            if (!this.session.sheet)
                transition.production.forEach((grant, index) => {
                    const source = this.board.tileAnchor(grant.tileId);
                    const target =
                        grant.playerId === humanId
                            ? this.query(
                                  `.hand-resource[data-resource="${grant.resource}"] .resource-icon`,
                              )
                            : null;
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
        if (action.kind === 'end-turn' && this.session.isHumanTurn)
            this.ui.feedback?.pulse(this.query('.turn-heading'), active.color);
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
