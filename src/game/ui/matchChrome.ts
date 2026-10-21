import type { GameObjects } from 'phaser';
import type { UiBox } from './graphicsTheme';

export const MATCH_INK = { base: 0x142b3b, raised: 0x203f50, edge: 0x496374, gold: 0xc6a06a };

/** Restrained lapis and limestone for frequent actions; ornament belongs to the world. */
export function matchFace(
    g: GameObjects.Graphics,
    b: UiBox,
    fill = MATCH_INK.base,
    rim?: number,
    radius = 9,
): void {
    g.fillStyle(fill).fillRoundedRect(b.x, b.y, b.width, b.height, radius);
    if (rim !== undefined)
        g.lineStyle(1, rim, 0.7).strokeRoundedRect(
            b.x + 0.5,
            b.y + 0.5,
            b.width - 1,
            b.height - 1,
            radius,
        );
}

export function dockControl(
    g: GameObjects.Graphics,
    b: UiBox,
    primary: boolean,
    pressed: boolean,
    selected: boolean,
    disabled: boolean,
): void {
    if (primary) {
        if (!disabled)
            g.fillStyle(0x081b29, 0.3).fillRoundedRect(b.x, b.y + 2, b.width, b.height - 1, 12);
        matchFace(
            g,
            b,
            disabled ? 0x394a52 : pressed ? 0xc9a36b : 0xe1c58e,
            disabled ? 0x71828b : 0xf1dcb1,
            12,
        );
        if (!disabled)
            g.lineStyle(1, 0xb08d57, 0.6).lineBetween(
                b.x + 13,
                b.y + b.height - 4,
                b.x + b.width - 13,
                b.y + b.height - 4,
            );
    } else if (pressed || selected)
        matchFace(
            g,
            b,
            pressed ? 0x305365 : MATCH_INK.raised,
            selected ? MATCH_INK.gold : MATCH_INK.edge,
        );
    // Disabled tools have no raised surface; their label and native state explain availability.
}
