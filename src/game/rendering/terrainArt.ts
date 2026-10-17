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
export const TERRAIN_VARIANTS = 4;
export const TERRAIN_TEXTURE_SIZE = 320;
export const TERRAIN_TEXTURE_RADIUS = 152;
export const TERRAIN_PALETTES: Record<
    TerrainType,
    { ground: number; light: number; shade: number; ink: number }
> = {
    forest: { ground: 0x64785b, light: 0x9ca67b, shade: 0x435d48, ink: 0x263f35 },
    pasture: { ground: 0x96a574, light: 0xc0c698, shade: 0x748b60, ink: 0x4b654b },
    wheat: { ground: 0xc3a264, light: 0xe9cd89, shade: 0xa6824f, ink: 0x77603c },
    mesa: { ground: 0xb78568, light: 0xdbb28a, shade: 0x98664f, ink: 0x704d42 },
    mountain: { ground: 0x89918a, light: 0xc7c8b3, shade: 0x687975, ink: 0x465d5c },
    desert: { ground: 0xcbb489, light: 0xe8d2a6, shade: 0xb49a71, ink: 0x917957 },
};
export const HEX_OUTLINE: readonly ArtPoint[] = Array.from({ length: 6 }, (_, i) => {
    const angle = ((-90 + 60 * i) * Math.PI) / 180;
    return [Math.cos(angle), Math.sin(angle)] as const;
});

/** Local visual noise is independent of state, dice, and redraw order. */
function visualRandom(seed: number): () => number {
    let value = seed >>> 0;
    return () => {
        value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
        return value / 4294967296;
    };
}

/** Clip broad landform washes to the tile instead of giving them rectangular edges. */
function clipToHex(points: readonly ArtPoint[]): ArtPoint[] {
    let output = [...points];
    for (let edge = 0; edge < 6; edge++) {
        const a = HEX_OUTLINE[edge],
            b = HEX_OUTLINE[(edge + 1) % 6];
        const side = ([x, y]: ArtPoint) => (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]);
        const input = output;
        output = [];
        for (let i = 0; i < input.length; i++) {
            const from = input[i],
                to = input[(i + 1) % input.length],
                f = side(from),
                t = side(to);
            if (f >= 0) output.push(from);
            if (f >= 0 !== t >= 0) {
                const ratio = f / (f - t);
                output.push([
                    from[0] + (to[0] - from[0]) * ratio,
                    from[1] + (to[1] - from[1]) * ratio,
                ]);
            }
        }
    }
    return output;
}

/** Miniature landscapes, with layered landforms rather than oversized resource pictograms. */
export function terrainArt(terrain: TerrainType, variant = 0): ArtMark[] {
    const v = ((variant % TERRAIN_VARIANTS) + TERRAIN_VARIANTS) % TERRAIN_VARIANTS;
    const rand = visualRandom(713 + TERRAIN_TYPES.indexOf(terrain) * 131 + v * 977);
    const p = TERRAIN_PALETTES[terrain];
    const marks: ArtMark[] = [
        polygon(p.ground, HEX_OUTLINE),
        polygon(
            p.light,
            clipToHex([
                [-1, -1],
                [1, -1],
                [1, -0.3],
                [0.4, -0.36],
                [-0.2, -0.18],
                [-1, -0.3],
            ]),
            0.23,
        ),
        polygon(
            p.shade,
            clipToHex([
                [-1, 0.4],
                [-0.4, 0.31],
                [0.2, 0.6],
                [0.6, 0.49],
                [1, 0.5],
                [1, 1],
                [-1, 1],
            ]),
            0.23,
        ),
    ];
    // Fine stipple is subdued and stays in the landscape, away from the medallion.
    for (let i = 0; i < 100; i++) {
        const x = (rand() - 0.5) * 1.36,
            y = -0.48 + rand() * 0.72;
        marks.push(ellipse(i % 2 ? p.light : p.ink, x, y, 0.009 + rand() * 0.015, 0.006, 0.12));
    }
    // Undulating contour bands give every terrain a common engraved-landscape language.
    for (let band = 0; band < 3; band++) {
        const path: ArtPoint[] = Array.from({ length: 25 }, (_, i) => {
            const x = -0.78 + (i * 1.56) / 24;
            return [x, -0.37 + band * 0.21 + Math.sin(x * 5 + v * 1.7 + band) * 0.06];
        });
        marks.push(
            polygon(band % 2 ? p.shade : p.light, clipToHex([...path, [1, 1], [-1, 1]]), 0.18),
        );
        marks.push(line(p.light, 0.009, path, 0.45));
    }
    if (terrain === 'forest') {
        const groves: readonly (readonly ArtPoint[])[] = [
            [
                [-0.48, -0.2],
                [-0.28, -0.37],
                [-0.08, -0.25],
                [0.23, -0.3],
                [0.48, -0.18],
                [-0.53, 0.05],
                [-0.32, -0.02],
                [0.04, -0.01],
                [0.35, -0.04],
                [0.52, 0.15],
                [-0.38, 0.17],
                [0.16, 0.16],
            ],
            [
                [-0.35, -0.28],
                [-0.1, -0.4],
                [0.11, -0.3],
                [-0.52, -0.08],
                [-0.28, -0.08],
                [-0.02, -0.07],
                [0.38, -0.17],
                [0.56, -0.02],
                [-0.48, 0.14],
                [-0.2, 0.15],
                [0.27, 0.17],
                [0.48, 0.17],
            ],
            [
                [-0.45, -0.19],
                [-0.23, -0.31],
                [0.02, -0.36],
                [0.3, -0.28],
                [0.49, -0.12],
                [-0.57, 0.12],
                [-0.31, 0.04],
                [-0.08, -0.05],
                [0.14, -0.02],
                [0.42, 0.11],
                [-0.04, 0.18],
                [0.17, 0.18],
            ],
            [
                [-0.51, -0.16],
                [-0.26, -0.34],
                [0, -0.32],
                [0.27, -0.31],
                [0.48, -0.13],
                [-0.37, -0.05],
                [-0.1, -0.09],
                [0.16, -0.07],
                [0.37, 0.1],
                [-0.52, 0.15],
                [-0.26, 0.16],
                [0.02, 0.18],
            ],
        ];
        const trees = groves[v]
            .map(([x, y]) => ({ x: x + (rand() - 0.5) * 0.045, y, s: 0.67 + rand() * 0.3 }))
            .sort((a, b) => a.y - b.y);
        for (const { x, y, s } of trees)
            marks.push(ellipse(p.ink, x, y + 0.035, s * 0.38, 0.16, 0.16));
        const trail: ArtPoint[] = Array.from({ length: 20 }, (_, i) => {
            const y = -0.4 + i * 0.032;
            return [Math.sin(y * 5 + v) * 0.2, y];
        });
        marks.push(line(0xb0a67b, 0.027, trail, 0.55));
        for (const { x, y, s } of trees) {
            marks.push(ellipse(p.ink, x + 0.04, y + 0.08, s * 0.24, 0.055, 0.3));
            marks.push(
                line(0x79654b, 0.018, [
                    [x, y],
                    [x, y + 0.1],
                ]),
            );
            const outline: ArtPoint[] = [
                [0, -0.32],
                [0.055, -0.27],
                [0.1, -0.16],
                [0.12, -0.04],
                [0.085, 0.035],
                [0, 0.075],
                [-0.08, 0.035],
                [-0.115, -0.04],
                [-0.09, -0.19],
                [-0.04, -0.3],
            ];
            marks.push(
                polygon(
                    p.ink,
                    outline.map(([px, py]) => [x + px * s, y + py * s]),
                ),
            );
            marks.push(
                polygon(0x526f4e, [
                    [x, y - 0.3 * s],
                    [x - 0.08 * s, y - 0.13 * s],
                    [x - 0.075 * s, y + 0.02],
                    [x, y + 0.04],
                ]),
            );
            for (let j = 0; j < 4; j++) {
                const py = y - 0.25 * s + j * 0.065 * s;
                marks.push(
                    line(
                        0x9cab74,
                        0.009,
                        [
                            [x - 0.018, py - 0.035],
                            [x - 0.065 * s, py],
                            [x - 0.018, py - 0.015],
                        ],
                        0.42,
                    ),
                );
            }
        }
    } else if (terrain === 'wheat') {
        type Plot = readonly [ArtPoint, ArtPoint, ArtPoint, ArtPoint];
        const layouts: readonly (readonly Plot[])[] = [
            [
                [
                    [-0.65, -0.28],
                    [-0.18, -0.5],
                    [-0.08, -0.08],
                    [-0.61, 0.14],
                ],
                [
                    [-0.12, -0.5],
                    [0.54, -0.3],
                    [0.38, 0.03],
                    [-0.04, -0.1],
                ],
                [
                    [0.02, -0.05],
                    [0.6, 0.01],
                    [0.55, 0.25],
                    [-0.3, 0.19],
                ],
            ],
            [
                [
                    [-0.64, -0.2],
                    [-0.25, -0.47],
                    [0.01, -0.18],
                    [-0.46, 0.12],
                ],
                [
                    [-0.18, -0.48],
                    [0.42, -0.38],
                    [0.62, -0.06],
                    [0.06, -0.14],
                ],
                [
                    [-0.37, 0.15],
                    [0.12, -0.09],
                    [0.58, 0.03],
                    [0.36, 0.24],
                ],
            ],
            [
                [
                    [-0.59, -0.33],
                    [-0.02, -0.52],
                    [0.04, -0.18],
                    [-0.6, 0.01],
                ],
                [
                    [0.04, -0.49],
                    [0.6, -0.24],
                    [0.5, 0.18],
                    [0.11, -0.1],
                ],
                [
                    [-0.55, 0.07],
                    [0.04, -0.11],
                    [0.37, 0.24],
                    [-0.44, 0.24],
                ],
            ],
            [
                [
                    [-0.62, -0.24],
                    [-0.25, -0.48],
                    [0.18, -0.31],
                    [-0.2, 0.01],
                ],
                [
                    [0.23, -0.32],
                    [0.62, -0.19],
                    [0.61, 0.21],
                    [0.22, 0.1],
                ],
                [
                    [-0.61, -0.08],
                    [-0.22, 0.06],
                    [0.14, 0.15],
                    [-0.42, 0.24],
                ],
            ],
        ];
        const lerp = (a: ArtPoint, b: ArtPoint, t: number): ArtPoint => [
            a[0] + (b[0] - a[0]) * t,
            a[1] + (b[1] - a[1]) * t,
        ];
        for (const [index, plot] of layouts[v].entries()) {
            marks.push(polygon(index % 2 ? 0xa5854f : 0xd1ae66, plot));
            for (let row = 1; row < 12; row++) {
                const start = lerp(plot[0], plot[1], row / 12),
                    end = lerp(plot[3], plot[2], row / 12);
                marks.push(line(0x896d41, 0.012, [start, end], 0.65));
                marks.push(
                    line(
                        p.light,
                        0.019,
                        [start, end].map(([x, y]) => [x - 0.012, y]),
                        0.85,
                    ),
                );
            }
            marks.push(line(0xf0daa3, 0.016, [...plot, plot[0]], 0.65));
        }
        // Small foreground stalks are accents, not the entire landscape.
        for (let i = 0; i < 7; i++) {
            const x = -0.47 + i * 0.15,
                y = 0.05 + rand() * 0.09;
            marks.push(
                line(
                    p.ink,
                    0.009,
                    [
                        [x, y],
                        [x + 0.02, y - 0.16],
                    ],
                    0.7,
                ),
            );
            for (let j = 0; j < 3; j++)
                marks.push(
                    ellipse(
                        p.light,
                        x + 0.015 + (j % 2 ? 0.025 : -0.015),
                        y - 0.12 + j * 0.025,
                        0.035,
                        0.022,
                    ),
                );
        }
    } else if (terrain === 'pasture') {
        // Winding irrigation channel and rolling meadow contours.
        const channel: ArtPoint[] = Array.from({ length: 22 }, (_, i) => {
            const y = -0.49 + i * 0.033;
            return [0.3 + Math.sin(i * 0.22 + v) * 0.13, y];
        });
        marks.push(line(0xbfc3a0, 0.05, channel, 0.8), line(0x6b9290, 0.024, channel, 0.8));
        for (let i = 0; i < 28; i++) {
            const x = -0.61 + rand() * 1.15,
                y = -0.4 + rand() * 0.6;
            marks.push(
                line(
                    p.ink,
                    0.008,
                    [
                        [x - 0.018, y],
                        [x, y - 0.03],
                        [x + 0.01, y],
                    ],
                    0.45,
                ),
            );
        }
        for (let i = 0; i < 3; i++) {
            const x = -0.4 + i * 0.23 + (rand() - 0.5) * 0.08,
                y = -0.19 + (i % 2) * 0.28;
            marks.push(ellipse(p.ink, x + 0.025, y + 0.06, 0.18, 0.055, 0.3));
            marks.push(
                line(p.ink, 0.014, [
                    [x - 0.05, y],
                    [x - 0.05, y + 0.065],
                ]),
                line(p.ink, 0.014, [
                    [x + 0.04, y],
                    [x + 0.04, y + 0.065],
                ]),
            );
            marks.push(
                ellipse(0xc9c3a8, x, y, 0.17, 0.105),
                ellipse(0xf1e9ce, x - 0.015, y - 0.022, 0.14, 0.077),
                ellipse(0x4a5142, x + 0.09, y + 0.005, 0.055, 0.063),
            );
        }
    } else if (terrain === 'mountain' || terrain === 'mesa') {
        const mountain = terrain === 'mountain';
        const formations = mountain
            ? [
                  [-0.39, -0.27, 0.24],
                  [0.34, -0.2, 0.28],
                  [-0.05, -0.12, 0.34],
              ]
            : v % 2
              ? [
                    [-0.38, -0.24, 0.29],
                    [0.03, -0.07, 0.3],
                    [0.4, -0.16, 0.24],
                ]
              : [
                    [-0.27, -0.22, 0.4],
                    [0.35, -0.04, 0.3],
                ];
        for (const formation of formations) {
            const x = formation[0] + (rand() - 0.5) * 0.09,
                y = formation[1] + (rand() - 0.5) * 0.06;
            const height = 0.26 + rand() * 0.16,
                w = formation[2];
            const ridge: ArtPoint[] = mountain
                ? [
                      [x - w, y + 0.32],
                      [x - 0.07, y - height * 0.65],
                      [x + 0.015, y - height],
                      [x + 0.1, y - height * 0.4],
                      [x + w, y + 0.32],
                  ]
                : [
                      [x - w, y + 0.32],
                      [x - w * 0.65, y - height * 0.65],
                      [x + 0.04, y - height * 0.62],
                      [x + w * 0.65, y - height * 0.55],
                      [x + w, y + 0.32],
                  ];
            marks.push(polygon(p.ink, ridge));
            marks.push(polygon(p.light, [ridge[0], ridge[1], ridge[2], [x - 0.02, y + 0.26]], 0.9));
            marks.push(
                polygon(p.shade, [ridge[2], ridge[3], ridge[4], [x - 0.02, y + 0.26]], 0.85),
            );
            if (mountain)
                marks.push(
                    polygon(
                        0xe2dfc9,
                        [
                            [x - 0.07, y - height * 0.65],
                            [x + 0.015, y - height],
                            [x + 0.07, y - height * 0.62],
                            [x + 0.02, y - height * 0.68],
                            [x - 0.015, y - height * 0.49],
                        ],
                        0.95,
                    ),
                );
            for (let j = 0; j < 6; j++) {
                const py = y + 0.03 + j * 0.051;
                marks.push(
                    line(
                        j % 2 ? p.light : p.ground,
                        0.012,
                        [
                            [x - w * 0.67, py],
                            [x - 0.04, py - 0.025],
                            [x + w * 0.65, py + 0.01],
                        ],
                        0.65,
                    ),
                );
            }
            marks.push(
                line(
                    p.ink,
                    0.012,
                    [
                        [x + 0.08, y - 0.05],
                        [x + 0.05, y + 0.08],
                        [x + 0.13, y + 0.23],
                    ],
                    0.5,
                ),
            );
        }
    } else {
        for (let dune = 0; dune < 4; dune++) {
            const crest: ArtPoint[] = Array.from({ length: 30 }, (_, i) => {
                const x = -0.68 + (i * 1.36) / 29;
                return [x, -0.43 + dune * 0.17 + Math.sin(x * 4 + v + dune) * 0.07];
            });
            marks.push(
                polygon(dune % 2 ? p.shade : p.light, clipToHex([...crest, [1, 1], [-1, 1]]), 0.36),
            );
            marks.push(line(0xf3dfb3, 0.015, crest, 0.8));
            for (let j = 1; j < 4; j++)
                marks.push(
                    line(
                        p.ink,
                        0.006,
                        crest.map(([x, y]) => [x, y + j * 0.017]),
                        0.19,
                    ),
                );
        }
    }
    marks.push(line(0xefe0b9, 0.012, [...HEX_OUTLINE.slice(4), ...HEX_OUTLINE.slice(0, 2)], 0.55));
    marks.push(line(0x35473f, 0.012, HEX_OUTLINE.slice(1, 5), 0.5));
    return marks;
}
