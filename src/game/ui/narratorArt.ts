import type { GameObjects } from 'phaser';
import { drawRosette, drawSurface, type UiBox } from './graphicsTheme';

/** Quiet amber light separates the original transparent silhouette from the board. */
export function drawNarratorLight(g: GameObjects.Graphics, stage: UiBox): void {
    const cx = stage.x + stage.width / 2;
    const cy = stage.y + stage.height * 0.55;
    for (let i = 20; i >= 1; i--) {
        const scale = i / 20;
        g.fillStyle(0xd5a453, 0.012).fillEllipse(
            cx,
            cy,
            stage.width * 0.95 * scale,
            stage.height * 1.16 * scale,
        );
    }
    // A soft grounded shadow meets the panel, rather than framing her in a portrait badge.
    for (let i = 8; i >= 1; i--)
        g.fillStyle(0x101715, 0.035).fillEllipse(
            cx,
            stage.y + stage.height,
            stage.width * 0.72 * (i / 8),
            22 * (i / 8),
        );
}

/** The front stone lip occludes the portrait's crop, attaching her silhouette to the dialogue. */
export function drawNarratorPanel(g: GameObjects.Graphics, box: UiBox): void {
    drawSurface(g, box, 'inset', { radius: 24, accent: 0xffcf75, flat: true });
    drawSurface(g, { x: box.x + 12, y: box.y - 4, width: box.width - 24, height: 8 }, 'honey', {
        radius: 3,
        flat: true,
    });
    const center = box.x + box.width / 2;
    drawRosette(g, center, box.y + 3, 8, 0xffcf75);
    g.fillStyle(0x56dbcc).fillCircle(center, box.y + 3, 3);
    // Small stepped corner engravings echo the palace, leaving the reading field quiet.
    for (const direction of [-1, 1]) {
        const x = direction < 0 ? box.x + 9 : box.x + box.width - 9;
        g.lineStyle(1, 0xffcf75, 0.55)
            .beginPath()
            .moveTo(x, box.y + 38)
            .lineTo(x, box.y + 12)
            .lineTo(x - direction * 22, box.y + 12)
            .strokePath();
    }
}
