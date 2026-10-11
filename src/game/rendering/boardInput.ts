import type { Scene } from 'phaser';

interface Touch { x: number; y: number; startX: number; startY: number; moved: boolean }

/** One input surface chooses the nearest target; neighboring hit areas never overlap. */
export class BoardInput {
    private touches = new Map<number, Touch>();
    private distance = 0;
    private canvas: HTMLCanvasElement;

    constructor(private scene: Scene, private enabled: () => boolean, private tap: (x: number, y: number) => void, private constrain: () => void) {
        this.canvas = scene.game.canvas;
        this.canvas.addEventListener('pointerdown', this.down);
        this.canvas.addEventListener('pointermove', this.move);
        this.canvas.addEventListener('pointerup', this.up);
        this.canvas.addEventListener('pointercancel', this.cancel);
    }
    private point(event: PointerEvent): { x: number; y: number } {
        const rect = this.canvas.getBoundingClientRect();
        return { x: (event.clientX - rect.left) * this.scene.scale.width / rect.width, y: (event.clientY - rect.top) * this.scene.scale.height / rect.height };
    }
    private pinchDistance(): number {
        const [a, b] = [...this.touches.values()];
        return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
    }
    private down = (event: PointerEvent): void => {
        if (!this.enabled() || event.button > 0) return;
        const { x, y } = this.point(event);
        this.canvas.setPointerCapture(event.pointerId);
        this.touches.set(event.pointerId, { x, y, startX: x, startY: y, moved: false });
        if (this.touches.size > 1) {
            this.touches.forEach((touch) => { touch.moved = true; });
            this.distance = this.pinchDistance();
        }
    };
    private move = (event: PointerEvent): void => {
        const touch = this.touches.get(event.pointerId);
        if (!touch || !this.enabled()) return;
        const { x, y } = this.point(event);
        const dx = x - touch.x, dy = y - touch.y;
        touch.x = x; touch.y = y;
        if (Math.hypot(x - touch.startX, y - touch.startY) > 8) touch.moved = true;
        const camera = this.scene.cameras.main;
        if (this.touches.size > 1) {
            const nextDistance = this.pinchDistance();
            if (this.distance > 0) camera.setZoom(Math.max(1, Math.min(2.5, camera.zoom * nextDistance / this.distance)));
            this.distance = nextDistance;
        } else if (touch.moved && camera.zoom > 1) {
            camera.scrollX -= dx / camera.zoom;
            camera.scrollY -= dy / camera.zoom;
        }
        this.constrain();
    };
    private up = (event: PointerEvent): void => {
        const touch = this.touches.get(event.pointerId);
        this.touches.delete(event.pointerId);
        this.distance = 0;
        if (touch && !touch.moved && this.enabled()) {
            const point = this.point(event);
            const world = this.scene.cameras.main.getWorldPoint(point.x, point.y);
            this.tap(world.x, world.y);
        }
    };
    private cancel = (event: PointerEvent): void => { this.touches.delete(event.pointerId); this.distance = 0; };
    destroy(): void {
        this.canvas.removeEventListener('pointerdown', this.down);
        this.canvas.removeEventListener('pointermove', this.move);
        this.canvas.removeEventListener('pointerup', this.up);
        this.canvas.removeEventListener('pointercancel', this.cancel);
        this.touches.clear();
    }
}
