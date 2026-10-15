import { bundleSize, validBundle, type TradeMemory } from '../core/domesticTrade';
import { RESOURCE_TYPES, type GameState } from '../core/types';
import { integer, record } from './validateState';

export function validTrading(value: unknown, state: GameState): value is TradeMemory {
    if (
        !record(value) ||
        value.turn !== state.turn ||
        value.activeId !== state.players[state.activePlayerIndex].id ||
        !integer(value.nextId, 1) ||
        !Array.isArray(value.offers) ||
        value.offers.length > 64 ||
        !Array.isArray(value.attempted)
    )
        return false;
    const ids = state.players.map((p) => p.id);
    const keys = [
        'pitch',
        ...ids.flatMap((a) => ids.filter((b) => a !== b).map((b) => `${a}:${b}`)),
    ];
    if (
        value.attempted.length > keys.length ||
        new Set(value.attempted).size !== value.attempted.length ||
        !value.attempted.every((k) => typeof k === 'string' && keys.includes(k))
    )
        return false;
    if (state.phase !== 'actions' && (value.offers.length || value.attempted.length)) return false;
    const seen = new Set<number>();
    return value.offers.every((offer) => {
        if (
            !record(offer) ||
            !integer(offer.id, 1, Number(value.nextId) - 1) ||
            seen.has(offer.id) ||
            typeof offer.from !== 'string' ||
            typeof offer.to !== 'string' ||
            !ids.includes(offer.from) ||
            !ids.includes(offer.to) ||
            offer.from === offer.to ||
            (offer.from !== value.activeId && offer.to !== value.activeId) ||
            !validBundle(offer.give) ||
            !validBundle(offer.want)
        )
            return false;
        seen.add(offer.id);
        const give = offer.give;
        const want = offer.want;
        if (
            !bundleSize(give) ||
            !bundleSize(want) ||
            RESOURCE_TYPES.some((r) => give[r] && want[r])
        )
            return false;
        if (
            ![
                'open',
                'accepted',
                'rejected',
                'countered',
                'withdrawn',
                'completed',
                'expired',
            ].includes(String(offer.status))
        )
            return false;
        if (offer.parentId !== undefined && !integer(offer.parentId, 1, offer.id - 1)) return false;
        return (
            offer.reason === undefined ||
            ['useful', 'protecting-plan', 'better-price', 'leader', 'unavailable'].includes(
                String(offer.reason),
            )
        );
    });
}
