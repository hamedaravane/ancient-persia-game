import type { ResourceType } from '../core/types';
import { ellipse, line, polygon, type ArtMark, type ArtPoint } from './vectorArt';

/** Sculpted material studies, with broad silhouettes that survive 14–28px display. */
export function resourceArt(resource: ResourceType): ArtMark[] {
    const marks: ArtMark[] = [ellipse(0x27362f, 0.04, 0.67, 1.55, 0.22, 0.22)];
    if (resource === 'wood') {
        for (const [x, y] of [
            [-0.24, -0.23],
            [0.17, 0.09],
            [-0.2, 0.36],
        ]) {
            marks.push(
                polygon(0x684b34, [
                    [x - 0.48, y - 0.19],
                    [x + 0.26, y - 0.37],
                    [x + 0.47, y - 0.1],
                    [x - 0.19, y + 0.2],
                ]),
            );
            marks.push(
                polygon(0xa87c4c, [
                    [x - 0.46, y - 0.19],
                    [x + 0.26, y - 0.37],
                    [x + 0.34, y - 0.26],
                    [x - 0.32, y - 0.04],
                ]),
            );
            marks.push(
                line(
                    0xd1aa6a,
                    0.035,
                    [
                        [x - 0.32, y - 0.13],
                        [x + 0.23, y - 0.28],
                    ],
                    0.7,
                ),
            );
            marks.push(
                ellipse(0x463c2b, x - 0.31, y + 0.015, 0.4, 0.42),
                ellipse(0xd6b67c, x - 0.32, y, 0.33, 0.35),
                ellipse(0x997144, x - 0.32, y, 0.22, 0.24),
                ellipse(0xe1c58d, x - 0.33, y - 0.01, 0.16, 0.18),
                ellipse(0x96754b, x - 0.33, y - 0.01, 0.055, 0.065),
            );
        }
    } else if (resource === 'brick') {
        for (const [x, y] of [
            [-0.3, 0.22],
            [0.3, 0.05],
            [-0.15, -0.32],
        ]) {
            marks.push(
                polygon(0x794d3d, [
                    [x - 0.44, y],
                    [x + 0.15, y - 0.19],
                    [x + 0.44, y - 0.03],
                    [x + 0.44, y + 0.25],
                    [x - 0.1, y + 0.46],
                    [x - 0.44, y + 0.26],
                ]),
            );
            marks.push(
                polygon(0xc98d63, [
                    [x - 0.44, y],
                    [x + 0.15, y - 0.19],
                    [x + 0.44, y - 0.03],
                    [x - 0.1, y + 0.19],
                ]),
            );
            marks.push(
                polygon(0xa76a4d, [
                    [x - 0.44, y],
                    [x - 0.1, y + 0.19],
                    [x - 0.1, y + 0.46],
                    [x - 0.44, y + 0.26],
                ]),
            );
            marks.push(
                line(
                    0xebbc86,
                    0.028,
                    [
                        [x - 0.4, y + 0.015],
                        [x + 0.15, y - 0.16],
                        [x + 0.39, y - 0.03],
                    ],
                    0.85,
                ),
            );
            marks.push(
                line(
                    0x6b4839,
                    0.022,
                    [
                        [x + 0.14, y + 0.18],
                        [x + 0.22, y + 0.23],
                        [x + 0.19, y + 0.28],
                    ],
                    0.6,
                ),
            );
        }
    } else if (resource === 'stone') {
        for (const [x, y, s] of [
            [0.33, 0.28, 0.63],
            [-0.24, 0.16, 0.85],
            [0.02, -0.27, 0.82],
        ]) {
            const points: ArtPoint[] = [
                [-0.54, 0.22],
                [-0.31, -0.4],
                [0.15, -0.53],
                [0.5, -0.12],
                [0.43, 0.4],
                [-0.12, 0.54],
            ];
            marks.push(
                polygon(
                    0x526264,
                    points.map(([px, py]) => [x + px * s, y + py * s]),
                ),
            );
            marks.push(
                polygon(
                    0xb5bbaa,
                    [points[0], points[1], points[2], [0.04, 0.02], points[5]].map(([px, py]) => [
                        x + px * s,
                        y + py * s,
                    ]),
                ),
            );
            marks.push(
                polygon(
                    0x83938d,
                    [points[2], points[3], [0.04, 0.02]].map(([px, py]) => [
                        x + px * s,
                        y + py * s,
                    ]),
                ),
            );
            marks.push(
                line(
                    0xe3e0c8,
                    0.026,
                    [
                        [x - 0.48 * s, y + 0.2 * s],
                        [x - 0.29 * s, y - 0.36 * s],
                        [x + 0.13 * s, y - 0.49 * s],
                    ],
                    0.8,
                ),
            );
            marks.push(
                line(
                    0x5c706b,
                    0.022,
                    [
                        [x - 0.16 * s, y - 0.15 * s],
                        [x - 0.04 * s, y - 0.06 * s],
                        [x - 0.1 * s, y + 0.13 * s],
                    ],
                    0.65,
                ),
            );
        }
    } else if (resource === 'wheat') {
        for (const [x, y, tilt] of [
            [-0.33, 0.05, -0.2],
            [0, -0.17, 0.04],
            [0.34, 0.02, 0.22],
        ]) {
            marks.push(
                line(0x815b2c, 0.036, [
                    [x * 0.3, 0.75],
                    [x, y - 0.48],
                ]),
            );
            marks.push(
                line(0xf0d491, 0.018, [
                    [x * 0.3 - 0.025, 0.68],
                    [x - 0.025, y - 0.48],
                ]),
            );
            for (let j = 0; j < 4; j++) {
                const py = y - 0.38 + j * 0.17,
                    px = x + (3 - j) * tilt * 0.12;
                for (const side of [-1, 1]) {
                    marks.push(
                        polygon(side < 0 ? 0xe9c576 : 0xbb8d43, [
                            [px, py + 0.13],
                            [px + side * 0.16, py + 0.03],
                            [px + side * 0.19, py - 0.11],
                            [px + side * 0.05, py - 0.045],
                        ]),
                    );
                    marks.push(
                        line(
                            0xf6dfa1,
                            0.016,
                            [
                                [px + side * 0.04, py + 0.045],
                                [px + side * 0.13, py - 0.07],
                                [px + side * 0.16, py - 0.18],
                            ],
                            0.85,
                        ),
                    );
                }
            }
        }
        marks.push(
            line(0x8c6740, 0.065, [
                [-0.19, 0.49],
                [0.17, 0.42],
            ]),
            line(0xd6b47a, 0.025, [
                [-0.19, 0.47],
                [0.17, 0.4],
            ]),
        );
    } else {
        marks.push(
            ellipse(0xa69e85, 0, 0.08, 1.35, 1.12),
            ellipse(0xe0d8b9, -0.045, -0.01, 1.25, 1.02),
        );
        // Overlapping arcing strands describe a skein instead of a cloud glyph.
        for (let i = 0; i < 8; i++) {
            const path: ArtPoint[] = Array.from({ length: 20 }, (_, j) => {
                const angle = -2.4 + (j * 3.95) / 19;
                return [
                    Math.cos(angle) * (0.32 + i * 0.034) - 0.12 + i * 0.024,
                    Math.sin(angle) * 0.45 + 0.025,
                ];
            });
            marks.push(
                line(0xafa68b, 0.035, path),
                line(
                    0xf5edd2,
                    0.018,
                    path.map(([x, y]) => [x - 0.018, y - 0.018]),
                ),
            );
        }
        for (let strand = 0; strand < 7; strand++) {
            const path: ArtPoint[] = Array.from({ length: 18 }, (_, j) => {
                const t = j / 17;
                return [
                    -0.46 + t * 0.95,
                    -0.28 + strand * 0.075 + Math.sin(t * Math.PI) * 0.09 - t * 0.06,
                ];
            });
            marks.push(
                line(0xb5aa8e, 0.028, path, 0.8),
                line(
                    0xf5ecd0,
                    0.018,
                    path.map(([x, y]) => [x, y - 0.02]),
                ),
            );
        }
        marks.push(
            line(0xc2b89b, 0.04, [
                [0.52, 0.27],
                [0.7, 0.46],
                [0.6, 0.62],
                [0.34, 0.6],
            ]),
        );
    }
    return marks;
}
