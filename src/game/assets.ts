import type { ResourceType } from './core/types';

/** Inspected source rectangles, in original image pixels. No source art is rewritten. */
export interface ArtFrame {
    file: string;
    source: readonly [number, number];
    frame: readonly [number, number, number, number];
    clip?: string;
}

export const assetUrl = (file: string): string => `${import.meta.env.BASE_URL}assets/${file}`;

export const ART = {
    robber: { file: 'pieces/robber/robber.png', source: [1254, 1254], frame: [380, 60, 610, 1130] },
    number: { file: 'board/tokens/number.png', source: [1254, 1254], frame: [95, 75, 1065, 1075] },
    corner: {
        file: 'ui/ornaments/ornaments.png',
        source: [1254, 1254],
        frame: [35, 390, 380, 400],
    },
    divider: {
        file: 'ui/ornaments/ornaments.png',
        source: [1254, 1254],
        frame: [385, 575, 485, 110],
    },
    rosette: {
        file: 'ui/ornaments/ornaments.png',
        source: [1254, 1254],
        frame: [930, 480, 310, 310],
    },
    victory: { file: 'ui/emblems/victory.png', source: [1254, 1254], frame: [40, 50, 1175, 1135] },
    bank: { file: 'ui/illustrations/bank.png', source: [1254, 1254], frame: [15, 80, 1225, 1095] },
    spark: { file: 'effects/spark.png', source: [1283, 1226], frame: [0, 0, 1283, 1226] },
    glint: { file: 'effects/glint.png', source: [1278, 1230], frame: [0, 0, 1278, 1230] },
    dust: { file: 'effects/dust.png', source: [1254, 1254], frame: [125, 210, 1010, 850] },
} as const satisfies Record<string, ArtFrame>;

export type ArtName = keyof typeof ART;

/** Same inspected resource crops used by the DOM hand; shared by port symbols. */
export const RESOURCE_FRAMES: Readonly<
    Record<ResourceType, readonly [number, number, number, number]>
> = {
    wood: [44, 164, 476, 404],
    brick: [544, 164, 440, 404],
    wheat: [984, 88, 428, 492],
    wool: [244, 608, 484, 392],
    stone: [768, 584, 496, 420],
};

// The supplied RGB sheet contains a baked checkerboard. Clip inside the painted
// silhouette instead of treating the background as alpha or altering the source.
const DICE_CLIP =
    'polygon(4% 26%, 7% 19%, 21% 8%, 29% 4%, 36% 3%, 75% 4%, 92% 7%, 96% 11%, 97% 17%, 96% 62%, 94% 70%, 90% 76%, 84% 80%, 80% 84%, 78% 90%, 74% 94%, 68% 95%, 12% 92%, 6% 88%, 4% 82%)';
export const DICE_FACES: readonly ArtFrame[] = [
    [96, 80],
    [590, 80],
    [1084, 80],
    [96, 542],
    [590, 542],
    [1084, 542],
].map(([x, y]) => ({
    file: 'dice/faces.png',
    source: [1536, 1024],
    frame: [x, y, 344, 346],
    clip: DICE_CLIP,
}));
