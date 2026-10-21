import type { GameObjects } from 'phaser';
import { drawRosette, drawSurface, UI_INK, type Material, type UiBox } from './graphicsTheme';

export const RESOURCE_MATERIAL: Record<string, Material> = {
    wood: 'emerald',
    brick: 'coral',
    wheat: 'honey',
    wool: 'turquoise',
    stone: 'lapis',
};
export const CARD_MATERIAL: Record<string, Material> = {
    knight: 'coral',
    'victory-point': 'amethyst',
    'road-building': 'turquoise',
    monopoly: 'lapis',
    'year-of-plenty': 'emerald',
};

/** Wing-like stepped inlays borrow palace geometry, never religious/Islamic ornament. */
export function drawWing(
    g: GameObjects.Graphics,
    x: number,
    y: number,
    size: number,
    direction: number,
    color = UI_INK.gold,
): void {
    for (let i = 0; i < 3; i++) {
        g.lineStyle(1.4, color, 0.7 - i * 0.13)
            .beginPath()
            .moveTo(x, y + i * 4)
            .lineTo(x + direction * (size - i * 5), y + i * 4)
            .lineTo(x + direction * (size - i * 5 + 5), y + i * 4 - 5)
            .strokePath();
    }
}

export function drawResourceCell(g: GameObjects.Graphics, b: UiBox, resource: string): void {
    drawSurface(g, b, RESOURCE_MATERIAL[resource] ?? 'lapis', {
        radius: 12,
        quiet: true,
        flat: true,
    });
    // A small polished pedestal grounds the inventory illustration, rather than framing it.
    g.fillStyle(0xfff7d5, 0.13).fillEllipse(
        b.x + b.width * 0.68,
        b.y + b.height * 0.46,
        b.width * 0.46,
        12,
    );
}

export function drawCardFrame(
    g: GameObjects.Graphics,
    b: UiBox,
    kind: string,
    selected: boolean,
    pressed: boolean,
): void {
    drawSurface(g, b, CARD_MATERIAL[kind] ?? 'amethyst', {
        radius: 17,
        pressed,
        accent: selected ? 0xffe7a3 : 0xd4b17b,
    });
    const cx = b.x + b.width / 2;
    // The illustrated emblem has its own coin setting; title and availability stay clear.
    g.fillStyle(0x172443, 0.35).fillCircle(cx, b.y + 42, 30);
    g.lineStyle(1, 0xffe7a3, 0.6).strokeCircle(cx, b.y + 42, 28);
    drawWing(g, b.x + 12, b.y + b.height - 12, 19, 1);
    drawWing(g, b.x + b.width - 12, b.y + b.height - 12, 19, -1);
    if (selected) drawRosette(g, b.x + b.width - 13, b.y + 14, 7);
}

export function drawMenuCrown(g: GameObjects.Graphics, b: UiBox): void {
    const cx = b.x + b.width / 2,
        cy = b.y + b.height / 2;
    const r = Math.min(48, b.height / 2 - 2);
    g.fillStyle(0x132346, 0.5).fillCircle(cx, cy + 4, r);
    g.fillStyle(0x247e87).fillCircle(cx, cy, r);
    g.lineStyle(3, 0xffcf75).strokeCircle(cx, cy, r - 2);
    g.lineStyle(1, 0x9cf1db, 0.7).strokeCircle(cx, cy, r - 8);
    drawWing(g, cx - r - 7, cy, Math.max(10, (b.width - r * 2) / 2 - 15), -1);
    drawWing(g, cx + r + 7, cy, Math.max(10, (b.width - r * 2) / 2 - 15), 1);
}

export function drawGear(g: GameObjects.Graphics, b: UiBox): void {
    const x = b.x + b.width / 2,
        y = b.y + b.height / 2;
    for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        g.lineStyle(4, 0xfff0ce).lineBetween(
            x + Math.cos(a) * 6,
            y + Math.sin(a) * 6,
            x + Math.cos(a) * 9,
            y + Math.sin(a) * 9,
        );
    }
    g.lineStyle(4, 0xfff0ce).strokeCircle(x, y, 6);
    g.fillStyle(0x35588f).fillCircle(x, y, 3);
}
