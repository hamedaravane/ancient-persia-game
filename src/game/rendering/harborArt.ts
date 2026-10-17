import { ellipse, line, polygon, type ArtMark, type ArtPoint } from './vectorArt';

/** A miniature limestone quay: ashlar masonry, bronze fittings and a sheltered blue basin. */
export function harborArt(ownerColor?: number): ArtMark[] {
    const quay: ArtPoint[] = [
        [-0.62, -0.98],
        [0.5, -0.98],
        [0.94, -0.55],
        [0.98, 0.44],
        [0.56, 0.96],
        [-0.56, 0.92],
        [-0.98, 0.44],
        [-0.93, -0.5],
    ];
    const marks: ArtMark[] = [
        polygon(
            0x675e49,
            quay.map(([x, y]) => [x, y + 0.06]),
        ),
        polygon(0xbda77d, quay),
        polygon(
            0xe1c99a,
            quay.map(([x, y]) => [x * 0.9 - 0.015, y * 0.9 - 0.025]),
        ),
        polygon(
            0x837451,
            quay.map(([x, y]) => [x * 0.77, y * 0.8]),
        ),
        polygon(
            0x213d47,
            quay.map(([x, y]) => [x * 0.69, y * 0.72]),
        ),
        polygon(
            0x2d5158,
            [
                [-0.51, -0.41],
                [0.37, -0.56],
                [0.58, -0.32],
                [0.58, 0.16],
                [-0.55, 0.25],
            ],
            0.7,
        ),
        line(
            0xffe8b8,
            0.055,
            [
                [-0.86, 0.36],
                [-0.83, -0.47],
                [-0.55, -0.86],
                [0.46, -0.86],
            ],
            0.8,
        ),
        line(
            ownerColor ?? 0xb69a62,
            ownerColor === undefined ? 0.03 : 0.065,
            [...quay.map(([x, y]) => [x * 0.77, y * 0.8] as ArtPoint), [-0.62 * 0.77, -0.98 * 0.8]],
            0.95,
        ),
    ];
    // Radial masonry joints make the rim read as construction at mobile scale.
    for (const [x, y] of [
        [-0.65, -0.72],
        [0, -0.94],
        [0.72, -0.7],
        [0.94, 0],
        [-0.94, 0],
        [-0.7, 0.7],
        [0, 0.94],
        [0.7, 0.7],
    ]) {
        marks.push(
            line(
                0x766749,
                0.027,
                [
                    [x, y],
                    [x * 0.8, y * 0.8],
                ],
                0.8,
            ),
        );
    }
    for (const x of [-0.66, 0.66]) {
        marks.push(
            ellipse(0x293c3b, x + 0.02, -0.51, 0.13, 0.12, 0.7),
            ellipse(0xb28d50, x, -0.55, 0.1, 0.1),
            ellipse(0xf0d298, x - 0.015, -0.57, 0.05, 0.04),
        );
    }
    return marks;
}
