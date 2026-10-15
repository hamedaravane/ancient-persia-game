import {
    RESOURCE_TYPES,
    type ActionResult,
    type GameState,
    type ResourceType,
    type RuleErrorCode,
} from './types';

export type ResourceBundle = Record<ResourceType, number>;
export interface TradeTerms {
    from: string;
    to: string;
    give: ResourceBundle;
    want: ResourceBundle;
}
export const emptyBundle = (): ResourceBundle => ({
    wood: 0,
    brick: 0,
    wheat: 0,
    wool: 0,
    stone: 0,
});
export const bundleSize = (bundle: ResourceBundle): number =>
    RESOURCE_TYPES.reduce((n, r) => n + bundle[r], 0);

export function validBundle(value: unknown): value is ResourceBundle {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const bundle = value as Record<string, unknown>;
    return (
        Object.keys(bundle).length === RESOURCE_TYPES.length &&
        RESOURCE_TYPES.every((r) => Number.isSafeInteger(bundle[r]) && Number(bundle[r]) >= 0)
    );
}

/** Both hands pay simultaneously: receiving a card cannot fund the outgoing payment. */
export function domesticTradeError(state: GameState, terms: TradeTerms): RuleErrorCode | null {
    if (state.phase === 'finished') return 'game-finished';
    if (state.phase !== 'actions') return 'wrong-phase';
    const from = state.players.find((p) => p.id === terms.from);
    const to = state.players.find((p) => p.id === terms.to);
    const active = state.players[state.activePlayerIndex].id;
    if (!from || !to || from === to || (from.id !== active && to.id !== active))
        return 'invalid-trade-partner';
    if (
        !validBundle(terms.give) ||
        !validBundle(terms.want) ||
        !bundleSize(terms.give) ||
        !bundleSize(terms.want)
    )
        return 'invalid-trade-bundle';
    if (RESOURCE_TYPES.some((r) => terms.give[r] && terms.want[r])) return 'same-resource-trade';
    if (
        RESOURCE_TYPES.some(
            (r) => from.resources[r] < terms.give[r] || to.resources[r] < terms.want[r],
        )
    )
        return 'insufficient-resources';
    if (
        RESOURCE_TYPES.some(
            (r) =>
                !Number.isSafeInteger(from.resources[r] - terms.give[r] + terms.want[r]) ||
                !Number.isSafeInteger(to.resources[r] - terms.want[r] + terms.give[r]),
        )
    )
        return 'invalid-trade-bundle';
    return null;
}

export function tradeWithPlayer(state: GameState, terms: TradeTerms): ActionResult {
    const reason = domesticTradeError(state, terms);
    if (reason) return { ok: false, state, reason };
    return {
        ok: true,
        state: {
            ...state,
            players: state.players.map((p) => {
                if (p.id !== terms.from && p.id !== terms.to) return p;
                const direction = p.id === terms.from ? 1 : -1;
                const resources = { ...p.resources };
                for (const r of RESOURCE_TYPES)
                    resources[r] += direction * (terms.want[r] - terms.give[r]);
                return { ...p, resources };
            }),
        },
    };
}

export type OfferStatus =
    'open' | 'accepted' | 'rejected' | 'countered' | 'withdrawn' | 'completed' | 'expired';
export interface TradeOffer extends TradeTerms {
    id: number;
    parentId?: number;
    status: OfferStatus;
    reason?: 'useful' | 'protecting-plan' | 'better-price' | 'leader' | 'unavailable';
}
export interface TradeMemory {
    turn: number;
    activeId: string;
    nextId: number;
    offers: TradeOffer[];
    attempted: string[];
}
const live = (o: TradeOffer) => o.status === 'open' || o.status === 'accepted';

/** Provisional public consent ledger. Only confirm() transfers authoritative resources. */
export class TradeTable {
    private memory: TradeMemory = { turn: 0, activeId: '', nextId: 1, offers: [], attempted: [] };
    get contextKey(): string {
        return `${this.memory.turn}:${this.memory.activeId}`;
    }
    get offers(): readonly TradeOffer[] {
        return this.memory.offers;
    }
    get attempted(): readonly string[] {
        return this.memory.attempted;
    }
    reset(): void {
        this.memory = { turn: 0, activeId: '', nextId: 1, offers: [], attempted: [] };
    }
    snapshot(): TradeMemory {
        return copyMemory(this.memory);
    }
    restore(memory: TradeMemory): void {
        this.memory = copyMemory(memory);
    }
    sync(state: GameState): void {
        const activeId = state.players[state.activePlayerIndex].id;
        if (
            this.memory.turn !== state.turn ||
            this.memory.activeId !== activeId ||
            state.phase !== 'actions'
        ) {
            this.memory = {
                turn: state.turn,
                activeId,
                nextId: this.memory.nextId,
                offers: [],
                attempted: [],
            };
        }
    }
    attempt(key: string): void {
        if (!this.memory.attempted.includes(key)) this.memory.attempted.push(key);
    }
    find(id: number): TradeOffer | undefined {
        return this.memory.offers.find((o) => o.id === id);
    }
    pendingFor(id: string): TradeOffer[] {
        return this.memory.offers.filter((o) => live(o) && (o.from === id || o.to === id));
    }
    withdraw(id: number, actor: string): boolean {
        const offer = this.find(id);
        if (!offer || !live(offer) || (offer.from !== actor && offer.to !== actor)) return false;
        offer.status = offer.from === actor ? 'withdrawn' : 'rejected';
        return true;
    }
    propose(state: GameState, terms: TradeTerms, parentId?: number): TradeOffer | null {
        this.sync(state);
        // Only validate the proposer's hand here; a request does not reveal the recipient's hand.
        const sender = state.players.find((p) => p.id === terms.from);
        const recipient = state.players.find((p) => p.id === terms.to);
        if (!sender || !recipient) return null;
        const hypothetical = {
            ...state,
            players: state.players.map((p) =>
                p === recipient ? { ...p, resources: { ...terms.want } } : p,
            ),
        };
        if (domesticTradeError(hypothetical, terms)) return null;
        const parent = parentId === undefined ? null : this.find(parentId);
        if (
            parentId !== undefined &&
            (!parent || !live(parent) || parent.from !== terms.to || parent.to !== terms.from)
        )
            return null;
        if (parent) parent.status = 'countered';
        const offer: TradeOffer = {
            ...terms,
            give: { ...terms.give },
            want: { ...terms.want },
            id: this.memory.nextId++,
            status: 'open',
            ...(parent ? { parentId } : {}),
        };
        // Retain recent conversations, never prune unresolved consent.
        this.memory.offers = [
            ...this.memory.offers.filter((o, i, all) => live(o) || i >= all.length - 24),
            offer,
        ];
        return offer;
    }
    respond(
        state: GameState,
        id: number,
        actor: string,
        accept: boolean,
        reason?: TradeOffer['reason'],
    ): boolean {
        this.sync(state);
        const offer = this.find(id);
        if (!offer || offer.status !== 'open' || offer.to !== actor) return false;
        if (accept && domesticTradeError(state, offer)) return false;
        offer.status = accept ? 'accepted' : 'rejected';
        offer.reason = reason;
        return true;
    }
    confirm(state: GameState, id: number, actor: string): ActionResult {
        this.sync(state);
        const offer = this.find(id);
        if (!offer || offer.status !== 'accepted' || (actor !== offer.from && actor !== offer.to))
            return { ok: false, state, reason: 'stale-trade' };
        const result = tradeWithPlayer(state, offer);
        if (!result.ok) {
            offer.status = 'expired';
            return result;
        }
        for (const other of this.memory.offers)
            if (live(other)) other.status = other === offer ? 'completed' : 'withdrawn';
        return result;
    }
}

function copyMemory(memory: TradeMemory): TradeMemory {
    return {
        ...memory,
        attempted: [...memory.attempted],
        offers: memory.offers.map((o) => ({ ...o, give: { ...o.give }, want: { ...o.want } })),
    };
}
