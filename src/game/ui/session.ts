import { getProduction } from '../core/production';
import type { MatchAction, MatchTransition } from './transitions';
import {
    buildRoad,
    buildSettlement,
    createGame,
    endTurn,
    moveRobber,
    rollDice,
    tradeWithBank,
    upgradeCity,
} from '../core/game';
import { getBuildOption } from '../core/queries';
import { getBankTradeRates, getBankTradeRatio, getPortOwnerId } from '../core/ports';
import type { BuildType } from '../core/building';
import type { ActionResult, GameState, ResourceType, TradeRatio } from '../core/types';
import { FA } from './messages.fa';
import { number } from './components';

export type Sheet =
    | {
          kind:
              | 'build'
              | 'trade'
              | 'history'
              | 'help'
              | 'results'
              | 'end-turn'
              | 'targets'
              | 'inspect';
      }
    | { kind: 'player' | 'tile' | 'port'; id: string };
export interface Placement {
    kind: BuildType | 'robber';
    targetId: string | null;
}
export interface MatchEvent {
    id: number;
    turn: number;
    player: string;
    text: string;
}

/** Local match adapter. Drafts never mutate or pay resources in authoritative state. */
export class GameSession {
    private gameState: GameState | null = null;
    private transitionId = 0;
    transition: MatchTransition | null = null;
    private listeners = new Set<() => void>();
    sheet: Sheet | null = null;
    placement: Placement | null = null;
    give: ResourceType | null = null;
    receive: ResourceType | null = null;
    private requestedTradeRatio: TradeRatio | null = null;
    notice = '';
    error: string | null = null;
    history: MatchEvent[] = [];

    get state(): GameState | null {
        return this.gameState;
    }
    get tradeRatio(): TradeRatio {
        if (!this.state || !this.give) return 4;
        return (
            this.requestedTradeRatio ??
            getBankTradeRatio(
                this.state.board,
                this.state.players[this.state.activePlayerIndex].id,
                this.give,
            )
        );
    }
    get targets(): string[] {
        if (!this.state || !this.placement) return [];
        return this.placement.kind === 'robber'
            ? this.state.board.tiles.filter(({ robber }) => !robber).map(({ id }) => id)
            : getBuildOption(this.state, this.placement.kind).legalTargetIds;
    }

    subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    private emit(): void {
        this.listeners.forEach((listener) => listener());
    }
    private record(text: string): void {
        if (!this.state) return;
        this.notice = text;
        this.history.push({
            id: (this.history[this.history.length - 1]?.id ?? 0) + 1,
            turn: this.state.turn,
            player: this.state.players[this.state.activePlayerIndex].name,
            text,
        });
        if (this.history.length > 100) this.history.shift();
    }

    start(count: 3 | 4): void {
        this.gameState = createGame(
            Array.from({ length: count }, (_, i) => `${FA.player} ${number(i + 1)}`),
        );
        this.sheet = null;
        this.placement = null;
        this.give = this.receive = null;
        this.requestedTradeRatio = null;
        this.history = [];
        this.transition = null;
        this.error = null;
        this.record(FA.startNote);
        this.emit();
    }
    returnToMenu(): void {
        this.gameState = null;
        this.sheet = this.placement = null;
        this.give = this.receive = null;
        this.requestedTradeRatio = null;
        this.history = [];
        this.transition = null;
        this.notice = '';
        this.error = null;
        this.emit();
    }
    openSheet(sheet: Sheet): void {
        this.sheet = sheet;
        this.emit();
    }
    closeSheet(): void {
        this.sheet = null;
        this.emit();
    }
    chooseBuild(kind: BuildType): void {
        if (!this.state || getBuildOption(this.state, kind).reason) return;
        this.placement = { kind, targetId: null };
        this.error = null;
        this.sheet = null;
        this.emit();
    }
    preview(targetId: string): void {
        if (this.sheet || !this.placement || !this.targets.includes(targetId)) return;
        this.placement = { ...this.placement, targetId };
        this.error = null;
        this.emit();
    }
    chooseTargetFromSheet(targetId: string): void {
        if (this.sheet?.kind !== 'targets' || !this.targets.includes(targetId)) return;
        this.sheet = null;
        this.preview(targetId);
    }
    cancelPlacement(): void {
        this.placement =
            this.placement?.kind === 'robber' ? { kind: 'robber', targetId: null } : null;
        this.error = null;
        this.emit();
    }
    chooseTrade(side: 'give' | 'receive', resource: ResourceType): void {
        if (side === 'give') this.requestedTradeRatio = null;
        this[side] = resource;
        this.emit();
    }
    chooseTradeRatio(ratio: TradeRatio): void {
        if (
            !this.state ||
            !this.give ||
            !getBankTradeRates(
                this.state.board,
                this.state.players[this.state.activePlayerIndex].id,
                this.give,
            ).includes(ratio)
        )
            return;
        this.requestedTradeRatio = ratio;
        this.emit();
    }
    tradeFromPort(id: string): void {
        if (!this.state) return;
        const port = this.state.board.ports.find((candidate) => candidate.id === id);
        if (
            !port ||
            getPortOwnerId(this.state.board, port) !==
                this.state.players[this.state.activePlayerIndex].id
        )
            return;
        this.give = port.resource ?? this.give;
        this.requestedTradeRatio = null;
        this.error = null;
        this.sheet = { kind: 'trade' };
        this.emit();
    }
    confirmTrade(): void {
        if (!this.state || !this.give || !this.receive) return;
        const ratio = this.tradeRatio;
        this.apply(
            tradeWithBank(this.state, this.give, this.receive, ratio),
            `${FA.tradeCompleted} پرداخت: ${number(ratio)} ${FA.resources[this.give]}؛ دریافت: ۱ ${FA.resources[this.receive]}`,
            { kind: 'trade', give: this.give, receive: this.receive, ratio },
        );
    }
    confirmEndTurn(): void {
        if (this.state && this.sheet?.kind === 'end-turn')
            this.apply(endTurn(this.state), FA.nextTurn, { kind: 'end-turn' });
    }
    primary(): void {
        if (!this.state || this.sheet) return;
        const state = this.state;
        if (this.placement) {
            const { kind, targetId } = this.placement;
            if (!targetId) return;
            if (kind === 'robber')
                this.apply(moveRobber(state, targetId), FA.robberMoved, {
                    kind: 'robber',
                    targetId,
                });
            if (kind === 'road')
                this.apply(buildRoad(state, targetId), FA.roadBuilt, {
                    kind: 'build',
                    type: 'road',
                    targetId,
                });
            if (kind === 'settlement')
                this.apply(buildSettlement(state, targetId), FA.settlementBuilt, {
                    kind: 'build',
                    type: 'settlement',
                    targetId,
                });
            if (kind === 'city')
                this.apply(upgradeCity(state, targetId), FA.cityBuilt, {
                    kind: 'build',
                    type: 'city',
                    targetId,
                });
        } else if (state.phase === 'roll') {
            const result = rollDice(state);
            let text = '';
            if (result.ok) {
                const dice = result.state.lastRoll!;
                text =
                    result.state.phase === 'robber'
                        ? FA.seven
                        : `${FA.rolled}: ${number(dice[0] + dice[1])}`;
                const before = state.players[state.activePlayerIndex].resources;
                const after = result.state.players[state.activePlayerIndex].resources;
                const gains = (Object.keys(before) as ResourceType[])
                    .filter((r) => after[r] > before[r])
                    .map((r) => `${number(after[r] - before[r])} ${FA.resources[r]}`);
                if (gains.length) text += `؛ دریافت شما: ${gains.join('، ')}`;
            }
            this.apply(result, text, { kind: 'roll' });
        } else if (state.phase === 'actions') {
            if (this.give || this.receive) this.openSheet({ kind: 'end-turn' });
            else this.apply(endTurn(state), FA.nextTurn, { kind: 'end-turn' });
        } else if (state.phase === 'finished') {
            this.openSheet({ kind: 'results' });
        }
    }
    private apply(result: ActionResult, text: string, action: MatchAction): void {
        if (!result.ok) {
            this.notice = FA.errors[result.reason];
            this.error = this.notice;
        } else {
            this.error = null;
            const before = this.gameState!;
            this.gameState = result.state;
            this.transition = {
                id: ++this.transitionId,
                action,
                before,
                after: result.state,
                production:
                    action.kind === 'roll' && result.state.lastRoll
                        ? getProduction(before, result.state.lastRoll[0] + result.state.lastRoll[1])
                        : [],
            };
            this.sheet = result.state.phase === 'finished' ? { kind: 'results' } : null;
            this.placement =
                result.state.phase === 'robber' ? { kind: 'robber', targetId: null } : null;
            this.give = this.receive = null;
            this.requestedTradeRatio = null;
            this.record(text);
        }
        this.emit();
    }
}
