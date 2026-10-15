import type { GameObjects } from 'phaser';
import type { AvatarId } from './playerIdentity';
import { UI_INK, type UiBox } from './graphicsTheme';

/** Small original stone seals, with distinct silhouettes rather than downloaded brand artwork. */
export function drawPlayerAvatar(
    g: GameObjects.Graphics,
    box: UiBox,
    avatar: AvatarId,
    owner: number,
): void {
    const size = Math.min(box.width, box.height);
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    const r = size / 2;
    g.fillStyle(0x171d1f).fillCircle(cx, cy + 1, r);
    g.fillStyle(0x343a3a).fillCircle(cx, cy, r - 1);
    g.lineStyle(1.5, owner).strokeCircle(cx, cy, r - 1.5);
    const x = cx - size * 0.28;
    const y = cy - size * 0.25;
    const w = size * 0.56;
    const h = size * 0.52;
    g.fillStyle(0xb9ac93);
    if (avatar === 'human') {
        // Human profile: shoulders, uncovered oval face, and a small engraved diadem.
        g.fillEllipse(cx, cy + size * 0.27, size * 0.57, size * 0.22);
        g.fillEllipse(cx, cy - size * 0.04, size * 0.36, size * 0.48);
        g.lineStyle(2, UI_INK.gold).lineBetween(x + w * 0.2, y + 2, x + w * 0.8, y + 2);
        g.fillStyle(0x343a3a).fillCircle(cx + size * 0.06, cy - size * 0.05, size * 0.025);
        return;
    }
    if (avatar === 'atlas') {
        g.fillCircle(cx, cy, size * 0.28);
        g.fillStyle(0x171d1f).fillCircle(cx, cy, size * 0.18);
        g.fillStyle(owner).fillCircle(cx, cy, size * 0.065);
        g.lineStyle(1, 0xb9ac93).lineBetween(
            cx - w * 0.3,
            cy + h * 0.35,
            cx + w * 0.3,
            cy + h * 0.35,
        );
    } else if (avatar === 'asimo') {
        g.fillRoundedRect(x, y, w, h, size * 0.12);
        g.fillStyle(0x171d1f).fillRoundedRect(
            x + w * 0.1,
            y + h * 0.2,
            w * 0.8,
            h * 0.4,
            size * 0.08,
        );
        g.lineStyle(1.5, owner).lineBetween(x + w * 0.25, y + h * 0.4, x + w * 0.75, y + h * 0.4);
    } else {
        g.fillEllipse(cx, cy, w * 0.8, h * 1.08);
        g.lineStyle(1, UI_INK.gold).strokeEllipse(cx, cy, w * 1.15, h * 1.2);
        g.fillStyle(0x171d1f).fillCircle(cx - w * 0.18, cy - h * 0.1, size * 0.035);
        g.fillCircle(cx + w * 0.18, cy - h * 0.1, size * 0.035);
        g.lineStyle(1.5, owner).lineBetween(
            cx - w * 0.12,
            cy + h * 0.22,
            cx + w * 0.12,
            cy + h * 0.22,
        );
    }
}
