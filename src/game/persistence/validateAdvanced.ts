import { getPlacementError } from '../core/building';
import { DEVELOPMENT_COUNTS } from '../core/developmentDeck';
import { refreshAwards } from '../core/scoring';
import { eligibleVictims, resourceCount } from '../core/robber';
import { record, integer } from './validateState';
import type { GameState } from '../core/types';

/** Validate the complete card inventory and every in-progress mandatory operation. */
export function validAdvanced(state: GameState): boolean {
    if (!state.development)
        return (
            !['discard', 'steal', 'road-building'].includes(state.phase) &&
            state.victoryTarget === 6 &&
            !state.awards &&
            !state.robberResolution &&
            !state.roadBuilding
        );
    if (state.victoryTarget !== 10) return false;
    const dev = state.development;
    const ids = state.players.map((p) => p.id);
    const keyed = (v: unknown) =>
        record(v) &&
        Object.keys(v).length === ids.length &&
        ids.every((id) => Object.prototype.hasOwnProperty.call(v, id));
    if (
        !record(dev) ||
        !Array.isArray(dev.deck) ||
        !Array.isArray(dev.discard) ||
        !keyed(dev.hands) ||
        !keyed(dev.knights) ||
        typeof dev.playedThisTurn !== 'boolean'
    )
        return false;
    if (!ids.every((id) => Array.isArray(dev.hands[id]) && integer(dev.knights[id], 0, 14)))
        return false;
    const expected = new Set(
        Object.entries(DEVELOPMENT_COUNTS).flatMap(([kind, count]) =>
            Array.from({ length: count }, (_, i) => `${kind}-${i}`),
        ),
    );
    const cards = [...dev.deck, ...dev.discard, ...ids.flatMap((id) => dev.hands[id])];
    if (cards.length !== 25 || new Set(cards.map((c) => (record(c) ? c.id : null))).size !== 25)
        return false;
    for (const card of cards) {
        if (
            !record(card) ||
            typeof card.id !== 'string' ||
            !expected.has(card.id) ||
            !integer(card.boughtOnRound, 0, state.turn) ||
            card.kind !== card.id.slice(0, card.id.lastIndexOf('-'))
        )
            return false;
    }
    if (
        dev.deck.some((c) => c.boughtOnRound !== 0 || c.playedBy !== undefined) ||
        ids.some((id) =>
            dev.hands[id].some((c) => c.boughtOnRound < 1 || c.playedBy !== undefined),
        ) ||
        dev.discard.some(
            (c) =>
                c.kind === 'victory-point' ||
                c.boughtOnRound < 1 ||
                c.boughtOnRound >= state.turn ||
                !ids.includes(c.playedBy!),
        )
    )
        return false;
    if (
        ids.some(
            (id) =>
                dev.knights[id] !==
                dev.discard.filter((c) => c.kind === 'knight' && c.playedBy === id).length,
        )
    )
        return false;
    if (
        !record(state.awards) ||
        ![state.awards.longestRoad, state.awards.largestArmy].every(
            (id) => id === null || ids.includes(id),
        )
    )
        return false;
    if (
        state.players.some(
            (p) =>
                Object.values(state.board.edges).filter((e) => e.road?.ownerId === p.id).length >
                15,
        )
    )
        return false;
    const awards = refreshAwards(state).awards!;
    if (
        awards.longestRoad !== state.awards.longestRoad ||
        awards.largestArmy !== state.awards.largestArmy
    )
        return false;
    const pending = state.robberResolution;
    if (['discard', 'robber', 'steal'].includes(state.phase)) {
        if (
            !record(pending) ||
            !['seven', 'knight'].includes(pending.source) ||
            !['roll', 'actions'].includes(pending.returnPhase) ||
            !record(pending.discards) ||
            !Array.isArray(pending.victims)
        )
            return false;
        if (
            pending.source === 'seven' &&
            (pending.returnPhase !== 'actions' ||
                !state.lastRoll ||
                state.lastRoll[0] + state.lastRoll[1] !== 7)
        )
            return false;
        if (
            pending.source === 'knight' &&
            (!dev.playedThisTurn ||
                dev.discard[dev.discard.length - 1]?.kind !== 'knight' ||
                dev.discard[dev.discard.length - 1]?.playedBy !==
                    state.players[state.activePlayerIndex].id)
        )
            return false;
        if (pending.returnPhase === 'roll' && state.lastRoll !== null) return false;
        if (pending.returnPhase === 'actions' && state.lastRoll === null) return false;
        if (state.phase === 'discard') {
            if (
                pending.source !== 'seven' ||
                !Object.keys(pending.discards).length ||
                pending.victims.length
            )
                return false;
            for (const [id, count] of Object.entries(pending.discards)) {
                const player = state.players.find((p) => p.id === id);
                if (
                    !player ||
                    resourceCount(player.resources) <= 7 ||
                    count !== Math.floor(resourceCount(player.resources) / 2)
                )
                    return false;
            }
        } else if (Object.keys(pending.discards).length) return false;
        if (state.phase === 'steal') {
            const eligible = eligibleVictims(state, state.board.tiles.find((t) => t.robber)!.id);
            if (!eligible.length || JSON.stringify(eligible) !== JSON.stringify(pending.victims))
                return false;
        } else if (pending.victims.length) return false;
    } else if (pending !== undefined && pending !== null) return false;
    if (state.phase === 'road-building') {
        const free = state.roadBuilding;
        if (
            !record(free) ||
            !integer(free.remaining, 1, 2) ||
            !['roll', 'actions'].includes(free.returnPhase) ||
            !dev.playedThisTurn ||
            dev.discard[dev.discard.length - 1]?.kind !== 'road-building' ||
            dev.discard[dev.discard.length - 1]?.playedBy !==
                state.players[state.activePlayerIndex].id
        )
            return false;
        if (free.returnPhase === 'roll' ? state.lastRoll !== null : state.lastRoll === null)
            return false;
        const owner = state.players[state.activePlayerIndex].id;
        if (
            Object.values(state.board.edges).filter((e) => e.road?.ownerId === owner).length >=
                15 ||
            !Object.keys(state.board.edges).some(
                (id) => getPlacementError(state.board, owner, 'road', id) === null,
            )
        )
            return false;
    } else if (state.roadBuilding !== undefined && state.roadBuilding !== null) return false;
    return true;
}
