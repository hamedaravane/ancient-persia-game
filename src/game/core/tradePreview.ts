import { emptyBundle, type ResourceBundle } from './domesticTrade';
import { RESOURCE_TYPES } from './types';

/** Personal balances and payment availability; never commits an exchange. */
export function previewTrade(
    hand: ResourceBundle,
    give: ResourceBundle = emptyBundle(),
    want: ResourceBundle = emptyBundle(),
) {
    const after = emptyBundle();
    const paymentMissing = emptyBundle();
    for (const r of RESOURCE_TYPES) {
        after[r] = hand[r] - give[r] + want[r];
        paymentMissing[r] = Math.max(0, give[r] - hand[r]);
    }
    return { after, paymentMissing };
}
