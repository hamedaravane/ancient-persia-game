import { getProduction } from '../core/production';
import {
    getSetupTargets,
    isSetup,
    placeInitialPiece,
    rollForStart,
    setupPlacementType,
} from '../core/setup';
import { chooseBotCommand } from '../core/bot';
import { executeCommand } from '../core/commands';
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
import { TutorialDirector } from '../tutorial/director';
import type { LessonId } from '../tutorial/lessons.fa';
import type { MatchStore, SavedMatch } from '../persistence/matchStore';
import { PlayerTrading } from './playerTrading';
import { BOT_NAMES, playerName } from './playerIdentity';

export type Sheet =
    | {
          kind:
              | 'build'
              | 'trade'
              | 'domestic'
              | 'history'
              | 'help'
              | 'results'
              | 'end-turn'
              | 'targets'
              | 'inspect'
              | 'opponents'
              | 'tutorial'
              | 'journal';
      }
    | { kind: 'player' | 'tile' | 'port'; id: string }
    | { kind: 'app' | 'update' }
    | { kind: 'new-match' | 'player-name'; count: 3 | 4; guided: boolean };
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

/** One human controller and local bots; drafts never mutate authoritative state. */
export class GameSession {
    readonly tutorial = new TutorialDirector();
    readonly trading = new PlayerTrading(
        () => ({
            state: this.state,
            humanId: this.humanPlayer?.id ?? null,
            interactive: this.sheet?.kind === 'domestic',
        }),
        () => this.emit(),
        (result, text, action) => this.apply(result, text, action),
        () => {
            this.sheet = { kind: 'domestic' };
        },
    );
    private tutorialReturnSheet: Sheet | null = null;
    private gameState: GameState | null = null;
    private controlledPlayerId: string | null = null;
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
    savedMatch: SavedMatch | null = null;
    playerNameDraft = '';

    constructor(private store?: MatchStore) {
        this.savedMatch = store?.read() ?? null;
    }
    get saveStatus() {
        return this.store?.status ?? 'empty';
    }
    requestPlay(guided = false): void {
        if (this.state) return;
        // Tutorial is an entry from the beginning, even when a guided save
        // has already reviewed the opening lessons. Play resumes that save.
        if (!guided && this.savedMatch && this.savedMatch.state.phase !== 'finished')
            this.resumeSaved();
        else this.requestStart(4, guided);
    }
    requestStart(count: 3 | 4, guided = false): void {
        if (this.savedMatch) this.openSheet({ kind: 'new-match', count, guided });
        else this.requestName(count, guided);
    }
    confirmNewMatch(): void {
        if (this.sheet?.kind !== 'new-match') return;
        this.requestName(this.sheet.count, this.sheet.guided);
    }
    private requestName(count: 3 | 4, guided: boolean): void {
        const saved = this.savedMatch;
        const previous =
            this.humanPlayer?.name ??
            saved?.state.players.find(
                (p) => p.id === (saved.humanPlayerId ?? saved.state.players[0].id),
            )?.name;
        this.playerNameDraft = previous && previous !== 'شما' ? previous : '';
        this.openSheet({ kind: 'player-name', count, guided });
    }
    confirmPlayerName(): void {
        if (this.sheet?.kind !== 'player-name') return;
        this.start(this.sheet.count, this.sheet.guided, this.playerNameDraft);
    }
    resumeSaved(): void {
        if (this.state || !this.savedMatch) return;
        // The save is JSON data; keep resume compatible with the ES2020 browser target.
        const saved = JSON.parse(JSON.stringify(this.savedMatch)) as SavedMatch;
        this.gameState = saved.state;
        this.controlledPlayerId = saved.humanPlayerId ?? saved.state.players[0].id;
        this.history = saved.history;
        // Old automatic-opening saves may still have an obsolete setup instruction queued.
        const tutorial =
            !isSetup(saved.state) && !saved.tutorial.replaying
                ? {
                      ...saved.tutorial,
                      queue: saved.tutorial.queue.filter(
                          (id) =>
                              !['setup', 'setup-order', 'setup-road', 'setup-second'].includes(id),
                      ),
                  }
                : saved.tutorial;
        this.tutorial.restore(
            !saved.humanPlayerId && !this.isHumanTurn
                ? { ...tutorial, queue: [], replaying: false }
                : tutorial,
        );
        this.trading.restore(saved.trading);
        this.transition = null;
        this.transitionId = 0;
        this.tutorialReturnSheet = null;
        this.sheet =
            saved.state.phase === 'finished'
                ? { kind: 'results' }
                : this.trading.waitingForHuman
                  ? { kind: 'domestic' }
                  : null;
        this.placement = this.requiredPlacement();
        this.give = this.receive = null;
        this.requestedTradeRatio = null;
        this.error = null;
        this.notice = 'خوش برگشتی؛ از همون‌جا ادامه می‌دیم.';
        this.emit();
    }
    save(): void {
        if (!this.state) return;
        this.trading.sync();
        this.savedMatch = {
            version: 1,
            humanPlayerId: this.humanPlayer!.id,
            state: this.state,
            tutorial: this.tutorial.snapshot(),
            trading: this.trading.table.snapshot(),
            history: [...this.history],
        };
        this.store?.write(this.savedMatch);
    }

    get state(): GameState | null {
        return this.gameState;
    }
    get humanPlayer() {
        return this.state?.players.find((player) => player.id === this.controlledPlayerId) ?? null;
    }
    get isHumanTurn(): boolean {
        return (
            !!this.state &&
            this.state.players[this.state.activePlayerIndex].id === this.controlledPlayerId
        );
    }
    get botReady(): boolean {
        if (!this.state || this.state.phase === 'finished') return false;
        if (this.sheet && this.sheet.kind !== 'domestic') return false;
        if (this.trading.botWork) return true;
        if (this.isHumanTurn && !this.sheet) return this.trading.canPitchHuman;
        return !this.isHumanTurn && !this.sheet && !this.trading.waitingForHuman;
    }
    get tradeRatio(): TradeRatio {
        if (!this.state || !this.give) return 4;
        return (
            this.requestedTradeRatio ??
            getBankTradeRatio(this.state.board, this.humanPlayer!.id, this.give)
        );
    }
    private requiredPlacement(): Placement | null {
        if (!this.state || !this.isHumanTurn) return null;
        const openingType = setupPlacementType(this.state);
        if (openingType) return { kind: openingType, targetId: null };
        return this.state.phase === 'robber' ? { kind: 'robber', targetId: null } : null;
    }
    get targets(): string[] {
        if (!this.state || !this.isHumanTurn || !this.placement) return [];
        if (isSetup(this.state)) return getSetupTargets(this.state);
        return this.placement.kind === 'robber'
            ? this.state.board.tiles.filter(({ robber }) => !robber).map(({ id }) => id)
            : getBuildOption(this.state, this.placement.kind).legalTargetIds;
    }

    subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    private emit(): void {
        if (this.state) {
            this.trading.sync();
            this.tutorial.observe(this.tutorialContext());
            if (this.tutorial.current && this.sheet?.kind !== 'tutorial') {
                this.tutorialReturnSheet = this.sheet;
                this.sheet = { kind: 'tutorial' };
            }
        }
        this.save();
        this.listeners.forEach((listener) => listener());
    }
    private tutorialContext() {
        return {
            state: this.state!,
            sheet: this.sheet,
            placement: this.placement,
            transition: this.transition,
            humanPlayerId: this.humanPlayer!.id,
            reviewingTrade: !!this.give && !!this.receive && this.give !== this.receive,
        };
    }
    continueTutorial(): void {
        if (this.sheet?.kind !== 'tutorial') return;
        this.tutorial.acknowledge();
        if (!this.tutorial.current) {
            this.sheet = this.tutorialReturnSheet;
            this.tutorialReturnSheet = null;
        }
        this.emit();
    }
    setTutorialEnabled(enabled: boolean): void {
        if (!this.state) return;
        if (!enabled) {
            this.tutorial.pause();
            if (this.sheet?.kind === 'tutorial') {
                this.sheet = this.tutorialReturnSheet;
                this.tutorialReturnSheet = null;
            }
        } else this.tutorial.resume(this.tutorialContext());
        this.emit();
    }
    replayLesson(id: LessonId): void {
        if (!this.state || this.sheet?.kind !== 'journal') return;
        this.tutorial.replay(id);
        this.emit();
    }
    private record(
        text: string,
        actor = this.state?.players[this.state.activePlayerIndex].name,
    ): void {
        if (!this.state) return;
        this.notice = text;
        this.history.push({
            id: (this.history[this.history.length - 1]?.id ?? 0) + 1,
            turn: this.state.turn,
            player: actor!,
            text,
        });
        if (this.history.length > 100) this.history.shift();
    }

    start(count: 3 | 4, guided = false, name = 'بازیکن'): void {
        this.gameState = createGame([playerName(name), ...BOT_NAMES].slice(0, count));
        this.controlledPlayerId = this.gameState.players[0].id;
        this.trading.reset();
        this.sheet = null;
        this.placement = this.requiredPlacement();
        this.give = this.receive = null;
        this.requestedTradeRatio = null;
        this.history = [];
        this.transition = null;
        this.error = null;
        this.tutorialReturnSheet = null;
        this.tutorial.start(guided);
        this.record(FA.startNote);
        this.emit();
    }
    returnToMenu(): void {
        this.save();
        this.trading.reset();
        this.tutorial.start(false);
        this.tutorialReturnSheet = null;
        this.gameState = null;
        this.controlledPlayerId = null;
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
        if (sheet.kind === 'domestic' && !this.state) return;
        if (this.sheet?.kind === 'tutorial') return;
        if (
            this.state &&
            isSetup(this.state) &&
            ['build', 'trade', 'domestic', 'end-turn'].includes(sheet.kind)
        )
            return;
        if (!this.isHumanTurn && ['build', 'trade', 'targets', 'end-turn'].includes(sheet.kind))
            return;
        if (sheet.kind === 'player' && sheet.id !== this.humanPlayer?.id) return;
        if (this.sheet?.kind === 'domestic' && sheet.kind !== 'domestic') this.trading.dismiss();
        this.sheet = sheet;
        this.emit();
    }
    closeSheet(): void {
        if (this.sheet?.kind === 'domestic') this.trading.dismiss();
        if (this.sheet?.kind === 'tutorial') {
            this.setTutorialEnabled(false);
            return;
        }
        this.sheet = null;
        this.emit();
    }
    chooseBuild(kind: BuildType): void {
        if (this.state && isSetup(this.state)) return;
        if (!this.isHumanTurn) return;
        if (this.sheet?.kind === 'tutorial') return;
        if (!this.state || getBuildOption(this.state, kind).reason) return;
        this.placement = { kind, targetId: null };
        this.error = null;
        this.sheet = null;
        this.emit();
    }
    preview(targetId: string): void {
        if (!this.isHumanTurn) return;
        if (this.sheet || !this.placement || !this.targets.includes(targetId)) return;
        this.placement = { ...this.placement, targetId };
        this.error = null;
        this.emit();
    }
    chooseTargetFromSheet(targetId: string): void {
        if (!this.isHumanTurn) return;
        if (this.sheet?.kind !== 'targets' || !this.targets.includes(targetId)) return;
        this.sheet = null;
        this.preview(targetId);
    }
    cancelPlacement(): void {
        if (!this.isHumanTurn) return;
        if (this.sheet?.kind === 'tutorial') return;
        this.placement = this.requiredPlacement();
        this.error = null;
        this.emit();
    }
    chooseTrade(side: 'give' | 'receive', resource: ResourceType): void {
        if (this.state && isSetup(this.state)) return;
        if (!this.isHumanTurn) return;
        if (this.sheet?.kind === 'tutorial') return;
        if (side === 'give') this.requestedTradeRatio = null;
        this[side] = resource;
        this.emit();
    }
    chooseTradeRatio(ratio: TradeRatio): void {
        if (!this.isHumanTurn) return;
        if (this.sheet?.kind === 'tutorial') return;
        if (
            !this.state ||
            !this.give ||
            !getBankTradeRates(this.state.board, this.humanPlayer!.id, this.give).includes(ratio)
        )
            return;
        this.requestedTradeRatio = ratio;
        this.emit();
    }
    tradeFromPort(id: string): void {
        if (this.state && isSetup(this.state)) return;
        if (!this.isHumanTurn) return;
        if (this.sheet?.kind === 'tutorial') return;
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
        if (!this.isHumanTurn) return;
        if (this.sheet?.kind === 'tutorial') return;
        if (!this.state || !this.give || !this.receive) return;
        const ratio = this.tradeRatio;
        this.apply(
            tradeWithBank(this.state, this.give, this.receive, ratio),
            `${FA.tradeCompleted} پرداخت: ${number(ratio)} ${FA.resources[this.give]}؛ دریافت: ۱ ${FA.resources[this.receive]}`,
            { kind: 'trade', give: this.give, receive: this.receive, ratio },
        );
    }
    confirmEndTurn(): void {
        if (!this.isHumanTurn) return;
        if (this.state && this.sheet?.kind === 'end-turn')
            this.apply(endTurn(this.state), FA.nextTurn, { kind: 'end-turn' });
    }
    primary(): void {
        if (!this.isHumanTurn && this.state?.phase !== 'finished') return;
        if (!this.state || this.sheet) return;
        const state = this.state;
        if (state.phase === 'setup-roll') {
            const result = rollForStart(state);
            const dice = result.ok ? result.state.setup!.lastRoll!.dice : null;
            this.apply(result, dice ? `تاس تعیین آغازکننده: ${number(dice[0] + dice[1])}` : '', {
                kind: 'setup-roll',
            });
        } else if (this.placement) {
            const { kind, targetId } = this.placement;
            if (!targetId) return;
            if (isSetup(state) && (kind === 'settlement' || kind === 'road')) {
                this.apply(
                    placeInitialPiece(state, kind, targetId),
                    kind === 'road' ? 'راه آغازینت ثبت شد.' : 'آبادی آغازینت ثبت شد.',
                    { kind: 'setup', type: kind, targetId },
                );
                return;
            }
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
    advanceBot(expectedState: GameState = this.state!): void {
        if (!this.botReady || this.state !== expectedState) return;
        const state = this.state!;
        if (this.trading.botStep()) return;
        if (this.isHumanTurn) {
            this.trading.pitchHuman();
            return;
        }
        const command = chooseBotCommand(state);
        if (command && ['trade', 'end-turn'].includes(command.kind) && this.trading.initiateBot())
            return;
        if (!command) return;
        const result = executeCommand(state, command);
        const actor = state.players[state.activePlayerIndex].name;
        const text =
            command.kind === 'setup-roll' && result.ok
                ? `تاس تعیین آغازکننده: ${number(result.state.setup!.lastRoll!.dice[0] + result.state.setup!.lastRoll!.dice[1])}`
                : command.kind === 'setup'
                  ? command.type === 'road'
                      ? 'راه آغازین رو گذاشت.'
                      : 'آبادی آغازین رو گذاشت.'
                  : command.kind === 'roll' && result.ok
                    ? `تاس ${number(result.state.lastRoll![0] + result.state.lastRoll![1])}${result.state.phase === 'robber' ? '؛ جابه‌جایی راهزن' : ''}`
                    : command.kind === 'build'
                      ? { road: FA.roadBuilt, settlement: FA.settlementBuilt, city: FA.cityBuilt }[
                            command.type
                        ]
                      : command.kind === 'robber'
                        ? FA.robberMoved
                        : command.kind === 'trade'
                          ? FA.tradeCompleted
                          : 'نوبتش رو تموم کرد.';
        this.apply(result, `${actor}: ${text}`, command);
    }
    private apply(result: ActionResult, text: string, action: MatchAction): void {
        if (!result.ok) {
            this.tutorial.explainError(result.reason, this.state ? isSetup(this.state) : false);
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
            this.sheet =
                result.state.phase === 'finished'
                    ? { kind: 'results' }
                    : action.kind === 'domestic-trade' &&
                        [action.terms.from, action.terms.to].includes(this.humanPlayer!.id)
                      ? { kind: 'domestic' }
                      : null;
            this.placement = this.requiredPlacement();
            this.give = this.receive = null;
            this.requestedTradeRatio = null;
            if (action.kind === 'setup-roll') {
                if (result.state.phase === 'setup-settlement')
                    text += `؛ ${result.state.players[result.state.activePlayerIndex].name} جانمایی رو شروع می‌کنه.`;
                else if (
                    result.state.setup?.kind === 'starter' &&
                    !Object.keys(result.state.setup.rolls).length
                )
                    text += '؛ بالاترین تاس مساوی شد، دوباره تاس می‌ندازن.';
            }
            this.record(text, before.players[before.activePlayerIndex].name);
        }
        this.emit();
    }
}
