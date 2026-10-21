import type { GameObjects } from 'phaser';

export interface UiBox {
    x: number;
    y: number;
    width: number;
    height: number;
}
export type Material =
    | 'limestone'
    | 'honey'
    | 'lapis'
    | 'inset'
    | 'card'
    | 'ivory'
    | 'turquoise'
    | 'emerald'
    | 'amethyst'
    | 'coral';

/** Shared enamel, gold and parchment palette. Text colors live in semantic CSS. */
export const UI_INK = {
    ivory: 0xfff4dc,
    gold: 0xffcf75,
    muted: 0xd1d9f3,
    shadow: 0x111b3b,
    navy: 0x25345e,
};
const MATERIALS: Record<Material, readonly [number, number, number, number]> = {
    limestone: [0xfff1cd, 0xebd4a2, 0xfffbe9, 0xa87543],
    honey: [0xffdf86, 0xf4b94d, 0xfff1ba, 0xa76230],
    ivory: [0xffffff, 0xf4e9d0, 0xffffff, 0xa58c64],
    lapis: [0x416bb5, 0x2a4787, 0x9fcbff, 0x1d305c],
    inset: [0x334a78, 0x24345b, 0x7d9dcc, 0x14213e],
    card: [0xfff3d7, 0xf0ddb5, 0xfffcf0, 0xba9158],
    turquoise: [0x1d7885, 0x165968, 0xa1f2e5, 0x164556],
    emerald: [0x237e61, 0x195d49, 0xb3f1bd, 0x17493e],
    amethyst: [0x7d56b6, 0x563786, 0xe4baff, 0x392755],
    coral: [0xb74461, 0x8f304f, 0xffc3b1, 0x712d4b],
};
export interface SurfaceOptions {
    quiet?: boolean;
    pressed?: boolean;
    disabled?: boolean;
    accent?: number;
    radius?: number;
    flat?: boolean;
}

function mix(a: number, b: number, t: number): number {
    const channel = (shift: number) =>
        Math.round(((a >> shift) & 255) * (1 - t) + ((b >> shift) & 255) * t);
    return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}

/** Bounded strips give real canvas gradients without textures, masks or random grain. */
function enamel(
    g: GameObjects.Graphics,
    b: UiBox,
    radius: number,
    top: number,
    bottom: number,
): void {
    g.fillStyle(bottom).fillRoundedRect(b.x, b.y, b.width, b.height, radius);
    const insetAt = (y: number) => {
        const edge = Math.min(y, b.height - y);
        return edge < radius
            ? radius - Math.sqrt(Math.max(0, radius * radius - (radius - edge) ** 2))
            : 0;
    };
    // One-pixel shoulder strips keep the corners smooth even on tall panels;
    // the central field needs only 32 bands. No polygon triangulation per strip.
    const cuts = [0];
    for (let y = 1; y < radius; y++) cuts.push(y);
    cuts.push(radius);
    for (let i = 1; i <= 32; i++) cuts.push(radius + ((b.height - radius * 2) * i) / 32);
    for (let y = b.height - radius + 1; y < b.height; y++) cuts.push(y);
    cuts.push(b.height);
    for (let i = 0; i < cuts.length - 1; i++) {
        const y = cuts[i],
            end = cuts[i + 1];
        if (end <= y) continue;
        const inset = Math.max(insetAt(y), insetAt(end));
        g.fillStyle(mix(top, bottom, (y + end) / (b.height * 2))).fillRect(
            b.x + inset,
            b.y + y,
            b.width - inset * 2,
            end - y + 0.05,
        );
    }
}

/** Crafted enamel: a shaded foot, soft face, gold setting and fine upper highlight. */
export function drawSurface(
    g: GameObjects.Graphics,
    box: UiBox,
    material: Material = 'limestone',
    options: SurfaceOptions = {},
): void {
    if (box.width < 3 || box.height < 3) return;
    let [top, base, light, foot] = MATERIALS[material];
    if (options.disabled) {
        top = mix(top, 0x697184, 0.8);
        base = mix(base, 0x515c73, 0.85);
        light = 0x9caabd;
        foot = 0x303d55;
    }
    const depth = options.pressed ? 1 : options.flat ? 2 : 4;
    const face = {
        ...box,
        y: box.y + (options.pressed ? 2 : 0),
        height: Math.max(2, box.height - depth - (options.pressed ? 2 : 0)),
    };
    const radius = Math.min(options.radius ?? 13, face.height / 2, box.width / 2);
    g.fillStyle(UI_INK.shadow, 0.35).fillRoundedRect(
        box.x,
        box.y + 3,
        box.width,
        box.height - 1,
        radius,
    );
    g.fillStyle(foot).fillRoundedRect(box.x, box.y + depth, box.width, box.height - depth, radius);
    enamel(g, face, radius, options.pressed ? base : top, base);
    g.lineStyle(
        options.accent !== undefined ? 2 : 1.2,
        options.accent ?? foot,
        0.9,
    ).strokeRoundedRect(face.x + 0.6, face.y + 0.6, face.width - 1.2, face.height - 1.2, radius);
    // The reflected light stops before the lettering; small counters stay uncluttered.
    g.lineStyle(1.4, light, options.quiet ? 0.35 : 0.75).lineBetween(
        face.x + radius,
        face.y + 2,
        face.x + face.width - radius,
        face.y + 2,
    );
    if (!options.quiet && face.width > 90 && face.height > 44) {
        g.lineStyle(1, light, 0.22).strokeRoundedRect(
            face.x + 5,
            face.y + 5,
            face.width - 10,
            face.height - 10,
            Math.max(2, radius - 4),
        );
    }
}

/** Achaemenid eight-petal sun seal, shared by victory, cards and player medals. */
export function drawRosette(
    g: GameObjects.Graphics,
    x: number,
    y: number,
    radius: number,
    color = UI_INK.gold,
): void {
    const points = Array.from({ length: 16 }, (_, i) => {
        const angle = (i * Math.PI) / 8;
        const r = i % 2 ? radius * 0.67 : radius;
        return { x: x + Math.cos(angle) * r, y: y + Math.sin(angle) * r };
    });
    g.fillStyle(0x94602f)
        .beginPath()
        .moveTo(points[0].x, points[0].y + 1);
    for (const p of points.slice(1)) g.lineTo(p.x, p.y + 1);
    g.closePath().fillPath();
    g.fillStyle(color).beginPath().moveTo(points[0].x, points[0].y);
    for (const p of points.slice(1)) g.lineTo(p.x, p.y);
    g.closePath().fillPath();
    g.fillStyle(UI_INK.navy).fillCircle(x, y, radius * 0.35);
    g.fillStyle(0xffe8a8).fillCircle(x, y - radius * 0.04, radius * 0.18);
}

/** Directly tappable ivory objects; pips always reflect authoritative dice values. */
export function drawDie(g: GameObjects.Graphics, box: UiBox, value: number): void {
    drawSurface(g, box, 'ivory', { radius: box.width * 0.23 });
    const { x, y, width: w, height: h } = box;
    const dot = (px: number, py: number) => {
        g.fillStyle(0x28365c).fillCircle(x + w * px, y + (h - 3) * py, w * 0.068);
        g.fillStyle(0x0c1c3b, 0.5).fillCircle(x + w * px, y + (h - 3) * py - 0.7, w * 0.042);
    };
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
