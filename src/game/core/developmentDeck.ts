import type { DevelopmentCard, DevelopmentState, Player, RandomSource } from './types';
export const DEVELOPMENT_COUNTS = {
    knight: 14,
    'victory-point': 5,
    'road-building': 2,
    monopoly: 2,
    'year-of-plenty': 2,
} as const;
export const DEVELOPMENT_COST = { wood: 0, brick: 0, wheat: 1, wool: 1, stone: 1 } as const;
export function createDevelopment(players: Player[], random: RandomSource): DevelopmentState {
    const deck: DevelopmentCard[] = Object.entries(DEVELOPMENT_COUNTS).flatMap(([kind, count]) =>
        Array.from({ length: count }, (_, i) => ({
            id: `${kind}-${i}`,
            kind: kind as DevelopmentCard['kind'],
            boughtOnRound: 0,
        })),
    );
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return {
        deck,
        discard: [],
        hands: Object.fromEntries(players.map((p) => [p.id, []])),
        knights: Object.fromEntries(players.map((p) => [p.id, 0])),
        playedThisTurn: false,
    };
}
