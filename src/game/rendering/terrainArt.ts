import type { TerrainType } from '../core/types';
import { ellipse, line, polygon, type ArtMark, type ArtPoint } from './vectorArt';

export const TERRAIN_TYPES: readonly TerrainType[] = [
    'forest',
    'pasture',
    'wheat',
    'mesa',
    'mountain',
    'desert',
];
export const TERRAIN_VARIANTS = 2;
export const TERRAIN_TEXTURE_SIZE = 320;
export const TERRAIN_TEXTURE_RADIUS = 152;
export const TERRAIN_PALETTES: Record<
    TerrainType,
    { ground: number; light: number; shade: number; ink: number }
> = {
    forest: { ground: 0x527260, light: 0x698773, shade: 0x456553, ink: 0x294d3f },
    pasture: { ground: 0x96aa78, light: 0xaabd8b, shade: 0x81996a, ink: 0x546c4a },
    wheat: { ground: 0xc5a965, light: 0xd5bb7b, shade: 0xb49554, ink: 0x806137 },
    mesa: { ground: 0xb57c61, light: 0xc78d70, shade: 0x9c6655, ink: 0x704b42 },
    mountain: { ground: 0x909b9c, light: 0xa4ada9, shade: 0x7d8a8d, ink: 0x52646b },
    desert: { ground: 0xd0bb8c, light: 0xdfcda2, shade: 0xbfa674, ink: 0x9b845b },
};
export const HEX_OUTLINE: readonly ArtPoint[] = Array.from({ length: 6 }, (_, i) => {
    const angle = ((-90 + 60 * i) * Math.PI) / 180;
    return [Math.cos(angle), Math.sin(angle)] as const;
});

/** A quiet lower third leaves the number token clear. Detail never uses gameplay randomness. */
export function terrainArt(terrain: TerrainType, variant = 0): ArtMark[] {
    const p = TERRAIN_PALETTES[terrain];
    const shift = variant % TERRAIN_VARIANTS === 0 ? -0.025 : 0.025;
    const marks: ArtMark[] = [
        polygon(p.ground, HEX_OUTLINE),
        polygon(
            p.light,
            [
                [0, -1],
                [0.866, -0.5],
                [0.55, -0.36],
                [-0.55, -0.36],
                [-0.866, -0.5],
            ],
            0.38,
        ),
        polygon(
            p.shade,
            [
                [-0.866, 0.5],
                [0, 1],
                [0.866, 0.5],
                [0.6, 0.4],
                [0, 0.75],
                [-0.6, 0.4],
            ],
            0.34,
        ),
    ];
    if (terrain === 'forest') {
        // Cypress silhouettes: broad almond crowns, restrained two-tone facets and trunks.
        for (const [x, y, s] of [
            [-0.34, -0.04, 0.83],
            [0.03 + shift, -0.22, 1],
            [0.36, 0.02, 0.78],
        ]) {
            marks.push(ellipse(p.shade, x, y + 0.21, 0.38 * s, 0.09, 0.7));
            marks.push(
                line(0x786449, 0.045, [
                    [x, y + 0.04],
                    [x, y + 0.23],
                ]),
            );
            const crown: ArtPoint[] = [
                [x, y - 0.43 * s],
                [x + 0.17 * s, y - 0.08],
                [x + 0.13 * s, y + 0.11],
                [x, y + 0.19],
                [x - 0.13 * s, y + 0.11],
                [x - 0.17 * s, y - 0.08],
            ];
            marks.push(polygon(p.ink, crown));
            marks.push(
                polygon(
                    0x66876a,
                    [
                        [x, y - 0.35 * s],
                        [x, y + 0.12],
                        [x - 0.12 * s, y + 0.06],
                        [x - 0.12 * s, y - 0.09],
                    ],
                    0.75,
                ),
            );
        }
    } else if (terrain === 'pasture') {
        marks.push(
            polygon(
                p.light,
                [
                    [-0.72, -0.23],
                    [-0.42, -0.39],
                    [-0.12, -0.32],
                    [0.2, -0.05],
                    [0.66, -0.12],
                    [0.68, 0.06],
                    [-0.72, 0.06],
                ],
                0.85,
            ),
        );
        marks.push(
            line(p.shade, 0.026, [
                [-0.6, 0.17],
                [-0.34, 0.08],
                [-0.04, 0.16],
                [0.3, 0.08],
                [0.61, 0.15],
            ]),
        );
        for (const [x, y] of [
            [-0.26 + shift, -0.12],
            [0.3, -0.02],
        ]) {
            marks.push(ellipse(p.shade, x, y + 0.13, 0.33, 0.08));
            marks.push(
                line(p.ink, 0.028, [
                    [x - 0.08, y + 0.04],
                    [x - 0.08, y + 0.14],
                ]),
                line(p.ink, 0.028, [
                    [x + 0.08, y + 0.04],
                    [x + 0.08, y + 0.14],
                ]),
            );
            marks.push(
                ellipse(0xe8e0c7, x, y, 0.31, 0.2),
                ellipse(p.ink, x + 0.15, y - 0.015, 0.1, 0.12),
            );
            marks.push(ellipse(0xf4eedb, x - 0.035, y - 0.04, 0.18, 0.1));
        }
        for (const x of [-0.54, 0.02, 0.52])
            marks.push(
                line(
                    p.ink,
                    0.018,
                    [
                        [x - 0.04, -0.36],
                        [x, -0.29],
                        [x + 0.02, -0.39],
                    ],
                    0.6,
                ),
            );
    } else if (terrain === 'wheat') {
        marks.push(
            polygon(
                p.shade,
                [
                    [-0.62, -0.03],
                    [0.04, -0.42],
                    [0.65, -0.12],
                    [0.18, 0.22],
                    [-0.6, 0.16],
                ],
                0.6,
            ),
        );
        for (let i = 0; i < 5; i++) {
            const y = -0.13 + i * 0.075;
            marks.push(
                line(
                    p.light,
                    0.024,
                    [
                        [-0.5, y],
                        [-0.09, y - 0.25],
                        [0.49, y - 0.01],
                    ],
                    0.85,
                ),
            );
        }
        for (const [x, y] of [
            [-0.27, -0.25],
            [0.04 + shift, -0.36],
            [0.34, -0.2],
        ]) {
            marks.push(
                line(p.ink, 0.023, [
                    [x, y - 0.12],
                    [x, y + 0.26],
                ]),
            );
            for (let i = 0; i < 3; i++) {
                const py = y - 0.1 + i * 0.085;
                marks.push(
                    polygon(
                        0xe8ce8c,
                        [
                            [x, py + 0.07],
                            [x - 0.09, py + 0.015],
                            [x - 0.08, py - 0.045],
                            [x, py],
                        ],
                        1,
                    ),
                );
                marks.push(
                    polygon(
                        p.ink,
                        [
                            [x, py + 0.07],
                            [x + 0.09, py + 0.015],
                            [x + 0.08, py - 0.045],
                            [x, py],
                        ],
                        0.65,
                    ),
                );
            }
        }
    } else if (terrain === 'mesa') {
        for (const [x, y, s] of [
            [-0.25, -0.22, 1],
            [0.3 + shift, 0.02, 0.78],
        ]) {
            marks.push(
                polygon(
                    p.ink,
                    [
                        [x - 0.3 * s, y + 0.2],
                        [x - 0.19 * s, y - 0.2],
                        [x + 0.16 * s, y - 0.2],
                        [x + 0.3 * s, y + 0.2],
                    ],
                    0.88,
                ),
            );
            marks.push(
                polygon(p.light, [
                    [x - 0.19 * s, y - 0.2],
                    [x + 0.16 * s, y - 0.2],
                    [x + 0.22 * s, y - 0.09],
                    [x - 0.23 * s, y - 0.09],
                ]),
            );
            for (const dy of [0, 0.1])
                marks.push(
                    line(
                        p.ground,
                        0.035,
                        [
                            [x - 0.21 * s, y + dy],
                            [x + 0.2 * s, y + dy],
                        ],
                        0.9,
                    ),
                );
        }
    } else if (terrain === 'mountain') {
        for (const [x, y, s] of [
            [0.27, -0.03, 0.8],
            [-0.2 + shift, -0.1, 1],
        ]) {
            marks.push(
                polygon(p.ink, [
                    [x - 0.36 * s, y + 0.29],
                    [x + 0.02, y - 0.48 * s],
                    [x + 0.36 * s, y + 0.29],
                ]),
            );
            marks.push(
                polygon(
                    p.light,
                    [
                        [x - 0.36 * s, y + 0.29],
                        [x + 0.02, y - 0.48 * s],
                        [x - 0.06, y + 0.19],
                    ],
                    0.9,
                ),
            );
            marks.push(
                polygon(
                    0xdce0d4,
                    [
                        [x - 0.1, y - 0.24 * s],
                        [x + 0.02, y - 0.48 * s],
                        [x + 0.13, y - 0.23 * s],
                        [x + 0.03, y - 0.27 * s],
                        [x - 0.02, y - 0.19 * s],
                    ],
                    0.9,
                ),
            );
        }
    } else {
        marks.push(
            polygon(
                p.shade,
                [
                    [-0.7, -0.06],
                    [-0.46, -0.32],
                    [-0.06 + shift, -0.45],
                    [0.25, -0.22],
                    [0.68, -0.03],
                    [0.63, 0.14],
                    [-0.65, 0.14],
                ],
                0.7,
            ),
        );
        marks.push(
            polygon(
                p.light,
                [
                    [-0.7, -0.06],
                    [-0.46, -0.32],
                    [-0.06 + shift, -0.45],
                    [-0.21, -0.19],
                    [0.05, 0.01],
                    [-0.29, -0.08],
                ],
                0.9,
            ),
        );
        marks.push(
            line(
                p.ink,
                0.022,
                [
                    [-0.57, 0.2],
                    [-0.24, 0.11],
                    [0.03, 0.2],
                    [0.34, 0.13],
                    [0.54, 0.2],
                ],
                0.48,
            ),
        );
    }
    // Shared edges frame terrain consistently without illustrated seams or individual masks.
    marks.push(line(0xe7d8b4, 0.012, [...HEX_OUTLINE.slice(4), ...HEX_OUTLINE.slice(0, 2)], 0.55));
    marks.push(line(0x3c514b, 0.012, HEX_OUTLINE.slice(1, 5), 0.5));
    return marks;
}
