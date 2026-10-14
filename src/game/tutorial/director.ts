import { getBuildOption, getPlayerSummary } from '../core/queries';
import { getPortOwnerId } from '../core/ports';
import type { GameState, RuleErrorCode } from '../core/types';
import type { Placement, Sheet } from '../ui/session';
import type { MatchTransition } from '../ui/transitions';
import { LESSONS, type LessonId } from './lessons.fa';

export interface TutorialContext {
    state: GameState;
    sheet: Sheet | null;
    placement: Placement | null;
    transition: MatchTransition | null;
    reviewingTrade: boolean;
}

/** Local narrative memory. Reads confirmed rules; never changes a match or random source. */
export class TutorialDirector {
    enabled = false;
    readonly seen = new Set<LessonId>();
    readonly practiced = new Set<LessonId>();
    private queue: LessonId[] = [];
    private observedTransition = 0;
    private replaying = false;

    get current(): LessonId | null {
        return this.queue[0] ?? null;
    }
    get next(): LessonId | null {
        return this.queue[1] ?? null;
    }
    get remaining(): number {
        return this.queue.length;
    }

    start(enabled: boolean): void {
        this.enabled = enabled;
        this.seen.clear();
        this.practiced.clear();
        this.queue = [];
        this.observedTransition = 0;
        this.replaying = false;
        if (enabled) this.offer('welcome', 'setup', 'roll');
    }
    private offer(...ids: LessonId[]): void {
        if (!this.enabled) return;
        for (const id of ids)
            if (!this.seen.has(id) && !this.queue.includes(id)) this.queue.push(id);
    }
    acknowledge(): void {
        const id = this.queue.shift();
        if (id) this.seen.add(id);
        if (!this.queue.length) this.replaying = false;
    }
    pause(): void {
        this.enabled = false;
        this.queue = [];
        this.replaying = false;
    }
    resume(context: TutorialContext): void {
        this.enabled = true;
        // Historical commands must not become fresh narrative after resuming.
        this.observedTransition = context.transition?.id ?? 0;
        this.observe(context);
    }
    replay(id: LessonId): void {
        this.queue = [id];
        this.replaying = true;
    }
    explainError(reason: RuleErrorCode): void {
        const lesson: Partial<Record<RuleErrorCode, LessonId>> = {
            'insufficient-resources': 'shortage',
            'too-close': 'settlement',
            'not-connected': 'road',
            'same-resource-trade': 'bank',
            'same-robber-tile': 'seven',
            'invalid-trade-ratio': 'trade-review',
        };
        if (lesson[reason]) this.offer(lesson[reason]);
    }
    observe(context: TutorialContext): void {
        if (!this.enabled || this.current || this.replaying) return;
        const { state, sheet, placement, transition } = context;
        const player = state.players[state.activePlayerIndex];
        if (transition && transition.id !== this.observedTransition) {
            this.observedTransition = transition.id;
            const action = transition.action;
            if (action.kind === 'roll') {
                this.practiced.add('roll');
                if (state.phase !== 'robber') {
                    this.practiced.add('production');
                    this.offer('production');
                    if (!transition.production.some((grant) => grant.playerId === player.id))
                        this.offer('no-income');
                }
            }
            if (action.kind === 'build') {
                this.practiced.add(action.type);
                this.practiced.add('preview');
                this.offer(`built-${action.type}`);
                if (
                    state.board.ports.some(
                        (port) =>
                            getPortOwnerId(state.board, port) === player.id &&
                            getPortOwnerId(transition.before.board, port) !== player.id,
                    )
                ) {
                    this.practiced.add('port-access');
                    this.offer('port-access');
                }
            }
            if (action.kind === 'trade') {
                this.practiced.add('bank');
                this.practiced.add('trade-review');
                this.offer('traded');
            }
            if (action.kind === 'robber') {
                this.practiced.add('seven');
                this.offer('robber-moved');
            }
            if (action.kind === 'end-turn') {
                this.practiced.add('actions');
                this.offer('handover');
            }
        }
        // Mandatory situations outrank optional celebrations; don't leave stale prompts at victory.
        if (state.phase === 'finished') {
            this.queue = [];
            this.offer('victory');
            return;
        }
        if (state.phase === 'robber') {
            this.queue = [];
            this.offer('seven');
            return;
        }
        if (this.current) return;
        if (sheet?.kind === 'tutorial' || sheet?.kind === 'journal' || sheet?.kind === 'results')
            return;
        if (sheet?.kind === 'port') {
            const port = state.board.ports.find((p) => p.id === sheet.id);
            if (port) this.offer(port.resource ? 'port-specialist' : 'port-general');
        } else if (sheet?.kind === 'tile') {
            const tile = state.board.tiles.find((t) => t.id === sheet.id);
            if (tile?.robber) this.offer('blocked');
            else this.offer('terrain', 'probability');
        } else if (sheet?.kind === 'trade') {
            this.offer('bank');
            if (context.reviewingTrade) this.offer('trade-review');
        } else if (placement && placement.kind !== 'robber') {
            this.offer(placement.kind);
            if (placement.targetId) this.offer('preview');
        } else if (sheet?.kind === 'build' && state.phase === 'actions') {
            // Teach an affordable opportunity, never ask the player to build an unavailable piece.
            const available = (['road', 'settlement', 'city'] as const).find(
                (kind) => !getBuildOption(state, kind).reason && !this.seen.has(kind),
            );
            if (available) this.offer(available);
            else if (
                (['road', 'settlement', 'city'] as const).every(
                    (kind) => getBuildOption(state, kind).reason,
                )
            )
                this.offer('shortage');
        } else if (!sheet) {
            if (state.phase === 'roll') this.offer('roll');
            else if (state.phase === 'actions') {
                this.offer('actions');
                if (getPlayerSummary(state, player.id).score === state.victoryTarget - 1)
                    this.offer('near-victory');
            }
        }
    }

    objective({ state, placement }: Pick<TutorialContext, 'state' | 'placement'>): string {
        if (state.phase === 'finished') return LESSONS.victory.task;
        if (state.phase === 'robber') return LESSONS.seven.task;
        if (placement)
            return placement.targetId
                ? LESSONS.preview.task
                : LESSONS[placement.kind === 'robber' ? 'seven' : placement.kind].task;
        if (state.phase === 'roll') return LESSONS.roll.task;
        const available = (['road', 'settlement', 'city'] as const).find(
            (kind) => !getBuildOption(state, kind).reason && !this.practiced.has(kind),
        );
        return available
            ? `فرصت تمرین: ${LESSONS[available].title}؛ ساخت‌وساز رو باز کن.`
            : 'بساز، مبادله کن یا نوبت رو تموم کن؛ تصمیم با توئه.';
    }
}
