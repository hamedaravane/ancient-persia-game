import type { GameObjects } from 'phaser';

export interface UiBox {
    x: number;
    y: number;
    width: number;
    height: number;
}
export type Material = 'limestone' | 'honey' | 'basalt' | 'inset' | 'card' | 'ivory';

export const UI_INK = {
    ivory: 0xf3ead8,
    gold: 0xc6a06a,
    muted: 0xc0c7bd,
    shadow: 0x101715,
    navy: 0x34362f,
};
const MATERIALS: Record<Material, readonly [number, number, number, number]> = {
    limestone: [0xd0c4ae, 0xb9ac93, 0xf4e7cc, 0x746a59],
    honey: [0xe1c58e, 0xd1ac70, 0xf7deb0, 0x8f6c42],
    ivory: [0xece3cf, 0xd6cbb5, 0xfff6dd, 0x8f846f],
    basalt: [0x596762, 0x3d4c48, 0x85948b, 0x25312f],
    inset: [0x343a3a, 0x252b2d, 0x59605c, 0x171d1f],
    card: [0xc3beb0, 0xa9a594, 0xe5dfcb, 0x6f6d5f],
};

export interface SurfaceOptions {
    quiet?: boolean;
    pressed?: boolean;
    disabled?: boolean;
    accent?: number;
    radius?: number;
    flat?: boolean;
}

/** Cut corners and directional facets replace the polished, rounded button face. */
function stonePath(g: GameObjects.Graphics, box: UiBox, cut: number): GameObjects.Graphics {
    const { x, y, width: w, height: h } = box;
    return g
        .beginPath()
        .moveTo(x + cut, y)
        .lineTo(x + w - cut, y)
        .lineTo(x + w, y + cut)
        .lineTo(x + w, y + h - cut)
        .lineTo(x + w - cut, y + h)
        .lineTo(x + cut, y + h)
        .lineTo(x, y + h - cut)
        .lineTo(x, y + cut)
        .closePath();
}

function facet(
    g: GameObjects.Graphics,
    points: readonly number[],
    color: number,
    alpha: number,
): void {
    g.fillStyle(color, alpha).beginPath().moveTo(points[0], points[1]);
    for (let i = 2; i < points.length; i += 2) g.lineTo(points[i], points[i + 1]);
    g.closePath().fillPath();
}

export function drawSurface(
    g: GameObjects.Graphics,
    box: UiBox,
    material: Material = 'limestone',
    options: SurfaceOptions = {},
): void {
    const { x, y, width: w, height: h } = box;
    if (w < 2 || h < 2) return;
    const [top, base, light, foot] = MATERIALS[material];
    const cut = Math.min(options.radius ?? 6, 7, w * 0.18, h * 0.18);
    const alpha = options.disabled ? 0.8 : 1;
    const depth = options.flat || options.disabled ? 0 : options.pressed ? 1 : 2;
    const face = { ...box, height: h - depth };
    // The foot fits inside the measured control; only a one-pixel shadow escapes it.
    if (depth > 0) {
        g.fillStyle(0x101715, 0.3 * alpha);
        stonePath(g, { ...face, y: y + depth + 1 }, cut).fillPath();
        g.fillStyle(foot, alpha);
        stonePath(g, { ...face, y: y + depth }, cut).fillPath();
    }
    g.fillStyle(base, alpha);
    stonePath(g, face, cut).fillPath();

    // Shallow chiseled facets retain the material without dominating small controls.
    const bevel = Math.min(options.flat ? 1.5 : 2, h * 0.12, w * 0.1);
    const bottom = y + face.height;
    facet(
        g,
        [x + cut, y, x + w - cut, y, x + w - cut - bevel, y + bevel, x + cut + bevel, y + bevel],
        light,
        alpha * 0.8,
    );
    facet(
        g,
        [x, y + cut, x + bevel, y + cut + bevel, x + bevel, bottom - cut - bevel, x, bottom - cut],
        top,
        alpha,
    );
    facet(
        g,
        [
            x + cut,
            bottom,
            x + w - cut,
            bottom,
            x + w - cut - bevel,
            bottom - bevel,
            x + cut + bevel,
            bottom - bevel,
        ],
        foot,
        alpha * 0.7,
    );
    facet(
        g,
        [
            x + w,
            y + cut,
            x + w,
            bottom - cut,
            x + w - bevel,
            bottom - cut - bevel,
            x + w - bevel,
            y + cut + bevel,
        ],
        foot,
        alpha * 0.6,
    );

    if (!options.quiet) drawStoneGrain(g, face, cut, base, light, foot, alpha);
    g.lineStyle(options.accent !== undefined ? 2 : 1, options.accent ?? foot, alpha);
    stonePath(g, face, cut).strokePath();
    if (!options.quiet && w > 42 && h > 32) {
        // A recessed double incision reads as carving, with a pale lower lip.
        const inset = 6;
        const groove = {
            x: x + inset,
            y: y + inset,
            width: w - inset * 2,
            height: face.height - inset * 2,
        };
        g.lineStyle(1, foot, alpha * 0.5);
        stonePath(g, groove, Math.max(1, cut - 3)).strokePath();
        g.lineStyle(1, light, alpha * 0.25).lineBetween(
            x + inset + cut,
            bottom - inset + 1,
            x + w - inset - cut,
            bottom - inset + 1,
        );
    }
    if (options.pressed) {
        g.fillStyle(0x101715, 0.12);
        stonePath(g, face, cut).fillPath();
    }
}

/** Stable mineral grain and tool marks stay around the perimeter, away from labels. */
function drawStoneGrain(
    g: GameObjects.Graphics,
    box: UiBox,
    cut: number,
    base: number,
    light: number,
    dark: number,
    alpha: number,
): void {
    const { x, y, width: w, height: h } = box;
    if (w < 20 || h < 20) return;
    let seed = ((Math.round(w) * 73856093) ^ (Math.round(h) * 19349663) ^ base) >>> 0;
    const sample = () => {
        seed ^= seed << 13;
        seed ^= seed >>> 17;
        seed ^= seed << 5;
        return (seed >>> 0) / 4294967296;
    };
    const count = Math.min(48, Math.floor((w + h) / 5));
    const band = Math.min(10, h * 0.18);
    // Broad, barely visible mineral patches break uniform faces without speckling text.
    for (let i = 0; i < 6; i++) {
        const px = x + cut + sample() * Math.max(0, w - cut * 2 - 14);
        const py = i % 2 ? y + 3 : y + h - band;
        facet(
            g,
            [
                px,
                py + 2,
                px + 7,
                py,
                px + 14,
                py + 3,
                px + 10,
                py + band * 0.6,
                px + 2,
                py + band * 0.5,
            ],
            i % 2 ? light : dark,
            alpha * 0.07,
        );
    }
    for (let i = 0; i < count; i++) {
        const px = x + cut + sample() * (w - cut * 2);
        const py = i % 2 ? y + 2 + sample() * band : y + h - 2 - sample() * band;
        g.fillStyle(i % 3 ? dark : light, alpha * (i % 3 ? 0.11 : 0.18)).fillRect(
            px,
            py,
            0.7 + sample() * 1.6,
            0.6 + sample() * 0.6,
        );
    }
    // Shallow broken seams run along the outer border instead of through the label.
    if (w > 90 && h > 36) {
        const start = x + w * 0.14;
        g.lineStyle(1, dark, alpha * 0.17)
            .beginPath()
            .moveTo(start, y + h - 4)
            .lineTo(start + w * 0.12, y + h - 6)
            .lineTo(start + w * 0.23, y + h - 5)
            .strokePath();
        g.lineStyle(1, light, alpha * 0.16).lineBetween(
            start,
            y + h - 3,
            start + w * 0.12,
            y + h - 5,
        );
    }
    if (w > 160 && h > 42) {
        // A few short tooling cuts are confined to the shoulders of larger slabs.
        for (let i = 0; i < 3; i++) {
            const px = x + 13 + i * 4;
            g.lineStyle(1, dark, alpha * 0.32).lineBetween(px, y + 3, px - 2, y + 6);
            g.lineStyle(1, light, alpha * 0.3).lineBetween(px + 1, y + 3, px - 1, y + 6);
        }
    }
}

/** Achaemenid stepped rosette: ornament without introducing a new bitmap asset. */
export function drawRosette(
    graphics: GameObjects.Graphics,
    x: number,
    y: number,
    radius: number,
    color = UI_INK.gold,
): void {
    const points = Array.from({ length: 16 }, (_, i) => {
        const angle = (i * Math.PI) / 8;
        const r = i % 2 ? radius * 0.65 : radius;
        return { x: x + Math.cos(angle) * r, y: y + Math.sin(angle) * r };
    });
    graphics.fillStyle(color).beginPath().moveTo(points[0].x, points[0].y);
    for (const point of points.slice(1)) graphics.lineTo(point.x, point.y);
    graphics.closePath().fillPath();
    graphics.fillStyle(UI_INK.navy).fillCircle(x, y, radius * 0.35);
    graphics.fillStyle(color).fillCircle(x, y, radius * 0.15);
}

/** The supplied dice sheet has a baked checkerboard; clean dice are now Graphics. */
export function drawDie(graphics: GameObjects.Graphics, box: UiBox, value: number): void {
    drawSurface(graphics, box, 'ivory', { radius: 7 });
    const { x, y, width: w, height: h } = box;
    const dot = (px: number, py: number) =>
        graphics.fillStyle(0x3b3029).fillCircle(x + w * px, y + (h - 3) * py, w * 0.065);
    if (value % 2) dot(0.5, 0.5);
    if (value >= 2) {
        dot(0.28, 0.28);
        dot(0.72, 0.72);
    }
    if (value >= 4) {
        dot(0.72, 0.28);
        dot(0.28, 0.72);
    }
    if (value === 6) {
        dot(0.28, 0.5);
        dot(0.72, 0.5);
    }
}
