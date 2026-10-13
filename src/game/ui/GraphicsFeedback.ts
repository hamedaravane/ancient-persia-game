import type { Scene, GameObjects } from 'phaser';
import { MOTION, type Motion } from './motion';
import { UI_FONT_FAMILY } from './typography';
import { drawSurface, drawRosette, UI_INK, type UiBox } from './graphicsTheme';

export class GraphicsFeedback {
    private effects: GameObjects.Container;
    constructor(
        private scene: Scene,
        private parent: HTMLElement,
        private motion: Motion,
    ) {
        this.effects = scene.add.container();
    }
    private get origin() {
        const box = this.parent.getBoundingClientRect();
        return { x: box.left, y: box.top };
    }
    private box(element: Element): UiBox {
        const rect = element.getBoundingClientRect();
        return {
            x: rect.left - this.origin.x,
            y: rect.top - this.origin.y,
            width: rect.width,
            height: rect.height,
        };
    }
    /** All transient feedback is Phaser-owned; none of it submits a game action. */
    clear(): void {
        if (!this.effects) return;
        for (const child of this.effects.list) this.scene.tweens.killTweensOf(child);
        this.effects.removeAll(true);
    }
    pulse(element: HTMLElement | null, color = UI_INK.gold): void {
        if (!element || !this.effects || !this.motion.visible) return;
        const box = this.box(element);
        const ring = this.scene.add
            .graphics()
            .lineStyle(2, color, 0.9)
            .strokeRoundedRect(box.x, box.y, box.width, box.height, 13);
        this.effects.add(ring);
        this.scene.tweens.add({
            targets: ring,
            alpha: 0,
            duration: MOTION.board,
            onComplete: () => ring.destroy(),
        });
    }
    delta(element: HTMLElement | null, value: string, spent: boolean): void {
        if (!element || !this.effects || !this.motion.visible) return;
        const box = this.box(element);
        const text = this.scene.add
            .text(box.x + box.width / 2, box.y + 6, value, {
                fontFamily: UI_FONT_FAMILY,
                fontSize: 17,
                color: spent ? '#ffc3a1' : '#ffe6a1',
                stroke: '#0b2035',
                strokeThickness: 5,
                resolution: 2,
            })
            .setOrigin(0.5);
        this.effects.add(text);
        this.scene.tweens.add({
            targets: text,
            y: this.motion.reduced ? text.y : text.y - 22,
            alpha: 0,
            delay: 600,
            duration: 500,
            onComplete: () => text.destroy(),
        });
    }
    fly(
        source: { x: number; y: number },
        destination: HTMLElement,
        resource: string,
        amount: string,
        owner: number,
        delay: number,
    ): void {
        if (!this.effects || this.motion.reduced || !this.motion.visible) return;
        const end = this.box(destination);
        const flight = this.scene.add.container(source.x - this.origin.x, source.y - this.origin.y);
        const g = this.scene.add.graphics();
        drawSurface(g, { x: -19, y: -19, width: 38, height: 38 }, 'inset', {
            accent: owner,
            radius: 12,
        });
        const icon = this.scene.add.image(0, -1, 'art-resources', resource);
        icon.setScale(28 / Math.max(icon.width, icon.height));
        const text = this.scene.add
            .text(12, 10, amount, {
                fontFamily: UI_FONT_FAMILY,
                fontSize: 12,
                color: '#fff3d6',
                stroke: '#10243c',
                strokeThickness: 3,
            })
            .setOrigin(0.5);
        flight.add([g, icon, text]);
        this.effects.add(flight);
        flight.setAlpha(0).setScale(0.7);
        this.scene.tweens.add({
            targets: flight,
            x: end.x + end.width / 2,
            y: end.y + end.height / 2,
            alpha: { from: 1, to: 0 },
            scale: 0.5,
            delay,
            duration: MOTION.flight,
            ease: 'Cubic.easeInOut',
            onComplete: () => flight.destroy(),
        });
    }
    victory(): void {
        const emblem = this.parent.querySelector<HTMLElement>('[data-art="victory"]');
        if (!emblem || this.motion.reduced || !this.motion.visible || !this.effects) return;
        const box = this.box(emblem);
        const sparkle = this.scene.add.graphics();
        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI) / 4;
            drawRosette(
                sparkle,
                box.x + box.width / 2 + Math.cos(angle) * 65,
                box.y + box.height / 2 + Math.sin(angle) * 58,
                i % 2 ? 3 : 5,
            );
        }
        this.effects.add(sparkle);
        this.scene.tweens.add({
            targets: sparkle,
            alpha: 0,
            delay: 180,
            duration: 650,
            onComplete: () => sparkle.destroy(),
        });
        const glint = this.scene.add
            .image(box.x + box.width * 0.65, box.y + 12, 'ui-glint', 'crop')
            .setDisplaySize(64, 64)
            .setAlpha(0.65);
        this.effects.add(glint);
        this.scene.tweens.add({
            targets: glint,
            alpha: 0,
            angle: 12,
            duration: 650,
            onComplete: () => glint.destroy(),
        });
    }
}
