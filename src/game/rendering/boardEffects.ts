import type { GameObjects, Scene, Tweens } from 'phaser';
import { MOTION, type Motion } from '../ui/motion';

type Point = { x: number; y: number };

/** Finite board decoration. Cleanup always restores the committed piece pose. */
export class BoardEffects {
    private tasks = new Map<Tweens.Tween, () => void>();
    private unsubscribe: () => void;
    constructor(
        private scene: Scene,
        private motion: Motion,
    ) {
        this.unsubscribe = motion.subscribe(() => this.clear());
    }
    private get enabled(): boolean {
        return !this.motion.reduced && this.motion.visible;
    }
    private track(tween: Tweens.Tween, cleanup: () => void): void {
        const finish = () => {
            if (this.tasks.delete(tween)) cleanup();
        };
        this.tasks.set(tween, finish);
        tween.once('complete', finish);
    }
    pulse(point: Point, radius: number, color: number, delay = 0): void {
        if (!this.enabled) return;
        const ring = this.scene.add
            .circle(point.x, point.y, radius, color, 0)
            .setStrokeStyle(3, color)
            .setDepth(10);
        this.track(
            this.scene.tweens.add({
                targets: ring,
                scale: 1.35,
                alpha: 0,
                duration: MOTION.board + 120,
                delay,
                ease: 'Cubic.Out',
            }),
            () => ring.destroy(),
        );
    }
    piece(marker: GameObjects.Container): void {
        if (!this.enabled) return;
        this.burst({ x: 0, y: 6 }, 'art-dust', 32, marker);
        marker.setScale(0.65).setAlpha(0.75);
        this.track(
            this.scene.tweens.add({
                targets: marker,
                scale: 1,
                alpha: 1,
                duration: MOTION.board,
                ease: 'Back.Out',
            }),
            () => {
                if (marker.scene) marker.setScale(1).setAlpha(1);
            },
        );
    }
    road(a: Point, b: Point, color: number): void {
        if (!this.enabled) return;
        this.burst({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, 'art-spark', 22);
        const shine = this.scene.add.graphics().setDepth(10);
        const tween = this.scene.tweens.addCounter({
            from: 0,
            to: 1,
            duration: MOTION.board,
            ease: 'Cubic.Out',
            onUpdate: (tween) => {
                const progress = tween.getValue() ?? 1;
                shine
                    .clear()
                    .lineStyle(9, color, 1 - progress * 0.7)
                    .beginPath()
                    .moveTo(a.x, a.y)
                    .lineTo(a.x + (b.x - a.x) * progress, a.y + (b.y - a.y) * progress)
                    .strokePath();
            },
        });
        this.track(tween, () => shine.destroy());
    }
    robber(marker: GameObjects.Container, from: Point, to: Point): void {
        if (!this.enabled) return;
        marker.setPosition(from.x, from.y);
        this.track(
            this.scene.tweens.add({
                targets: marker,
                x: to.x,
                y: to.y,
                duration: MOTION.board,
                ease: 'Cubic.InOut',
            }),
            () => {
                if (marker.scene) marker.setPosition(to.x, to.y);
            },
        );
    }
    private burst(point: Point, key: string, width: number, parent?: GameObjects.Container): void {
        if (!this.scene.textures.exists(key)) return;
        const image = this.scene.add.image(point.x, point.y, key, 'crop');
        image
            .setScale(width / image.width)
            .setAlpha(parent ? 0.45 : 0.7)
            .setDepth(10);
        if (parent) parent.addAt(image, 0);
        this.track(
            this.scene.tweens.add({
                targets: image,
                scaleX: image.scaleX * 1.45,
                scaleY: image.scaleY * 1.45,
                alpha: 0,
                duration: MOTION.board,
                ease: 'Cubic.Out',
            }),
            () => image.destroy(),
        );
    }
    clear(): void {
        for (const [tween, finish] of this.tasks) {
            tween.stop();
            finish();
        }
    }
    destroy(): void {
        this.clear();
        this.unsubscribe();
    }
}
