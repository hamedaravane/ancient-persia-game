import type { Scene } from 'phaser';
import { clientToBoard } from '../ui/layout';

interface Touch {
    startX: number;
    startY: number;
    moved: boolean;
}

/** One input surface chooses the nearest target; neighboring hit areas never overlap. */
export class BoardInput {
    private touches = new Map<number, Touch>();
    private canvas: HTMLElement;

    constructor(
        private scene: Scene,
        surface: HTMLElement,
        private enabled: () => boolean,
        private tap: (x: number, y: number) => void,
    ) {
        this.canvas = surface;
        this.canvas.addEventListener('pointerdown', this.down);
        this.canvas.addEventListener('pointermove', this.move);
        this.canvas.addEventListener('pointerup', this.up);
        this.canvas.addEventListener('pointercancel', this.cancel);
        this.canvas.addEventListener('lostpointercapture', this.cancel);
    }
    private point(event: PointerEvent): { x: number; y: number } {
        const rect = this.canvas.getBoundingClientRect();
        return clientToBoard({ x: event.clientX, y: event.clientY }, this.scene.cameras.main, rect);
    }
    private down = (event: PointerEvent): void => {
        if (!this.enabled() || event.button > 0) return;
        const { x, y } = this.point(event);
        this.canvas.setPointerCapture(event.pointerId);
        this.touches.set(event.pointerId, { startX: x, startY: y, moved: false });
        if (this.touches.size > 1) {
            this.touches.forEach((touch) => {
                touch.moved = true;
            });
        }
    };
    private move = (event: PointerEvent): void => {
        const touch = this.touches.get(event.pointerId);
        if (!touch || !this.enabled()) return;
        const { x, y } = this.point(event);
        if (Math.hypot(x - touch.startX, y - touch.startY) > 8) touch.moved = true;
    };
    private up = (event: PointerEvent): void => {
        const touch = this.touches.get(event.pointerId);
        this.touches.delete(event.pointerId);
        if (touch && !touch.moved && this.enabled()) {
            const point = this.point(event);
            if (Math.hypot(point.x - touch.startX, point.y - touch.startY) <= 8)
                this.tap(point.x, point.y);
        }
    };
    private cancel = (event: PointerEvent): void => {
        this.touches.delete(event.pointerId);
    };
    destroy(): void {
        this.canvas.removeEventListener('pointerdown', this.down);
        this.canvas.removeEventListener('pointermove', this.move);
        this.canvas.removeEventListener('pointerup', this.up);
        this.canvas.removeEventListener('pointercancel', this.cancel);
        this.canvas.removeEventListener('lostpointercapture', this.cancel);
        this.touches.clear();
    }
}
