import { expect, test } from 'vitest';
import { emptyBundle } from '../src/game/core/domesticTrade';
import { previewTrade } from '../src/game/core/tradePreview';

test('trade preview shows exact resulting balances without mutating the hand', () => {
    const hand = { ...emptyBundle(), wheat: 2, wood: 4, stone: 2 };
    const result = previewTrade(
        hand,
        { ...emptyBundle(), wood: 2 },
        { ...emptyBundle(), stone: 1 },
    );
    expect(result.paymentMissing).toEqual(emptyBundle());
    expect(result.after).toEqual({ ...hand, wood: 2, stone: 3 });
    expect(hand.wood).toBe(4);
});

test('trade preview includes unchanged resources in the resulting hand', () => {
    const hand = { ...emptyBundle(), wood: 1, brick: 1, wheat: 1, wool: 1 };
    const result = previewTrade(
        hand,
        { ...emptyBundle(), wood: 1 },
        { ...emptyBundle(), stone: 2 },
    );
    expect(result.after).toEqual({ ...hand, wood: 0, stone: 2 });
});

test('incoming resources cannot hide an unaffordable outgoing payment', () => {
    const result = previewTrade(
        emptyBundle(),
        { ...emptyBundle(), wood: 2 },
        { ...emptyBundle(), brick: 1 },
    );
    expect(result.paymentMissing).toEqual({ ...emptyBundle(), wood: 2 });
});
