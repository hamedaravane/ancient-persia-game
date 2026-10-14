import { GameObjects, WEBGL, type Scene, type Textures } from 'phaser';
import {
    advanceOceanTime,
    oceanNoise,
    oceanTextureSize,
    OCEAN_FRAME_MS,
    sampleOceanWaves,
} from './oceanModel';
import { OCEAN_FRAGMENT } from './oceanShader';
import { canvasDisplay } from './display';

/** Decorative, cached water material. No downloaded texture, input, or game randomness. */
export class ProceduralOcean {
    private surface: GameObjects.Image;
    private target: GameObjects.RenderTexture | null = null;
    private shader: GameObjects.Shader | null = null;
    private canvas: Textures.CanvasTexture | null = null;
    private ripples: GameObjects.Graphics | null = null;
    private wavelets: Array<{ x: number; y: number; length: number; phase: number }> = [];
    private width = 1;
    private height = 1;
    private seconds = 0;
    private sinceDraw = 0;
    private dirty = true;
    private active = false;
    private disposed = false;

    constructor(scene: Scene) {
        const display = canvasDisplay(scene);
        const size = oceanTextureSize(display.width, display.height);
        if (scene.renderer.type === WEBGL) {
            try {
                this.shader = new GameObjects.Shader(
                    scene,
                    {
                        name: 'persian-calm-ocean',
                        fragmentSource: OCEAN_FRAGMENT,
                        setupUniforms: (setUniform: (name: string, value: unknown) => void) => {
                            setUniform('uViewSize', [this.width, this.height]);
                            setUniform('uOceanTime', this.seconds);
                        },
                    },
                    0,
                    0,
                    size.width,
                    size.height,
                ).setOrigin(0);
                // Warm compilation; a null suite can mean asynchronous GPU compilation.
                this.shader.renderNode.programManager.getCurrentProgramSuite();
                this.target = scene.add
                    .existing(
                        new GameObjects.RenderTexture(scene, 0, 0, size.width, size.height, false),
                    )
                    .setOrigin(0)
                    .setRenderMode('all');
                this.target.fill(0x145a70);
                this.surface = this.target;
            } catch (error) {
                this.shader?.destroy();
                this.shader = null;
                console.warn('Using the Canvas ocean material.', error);
            }
        }
        if (!this.target) {
            this.canvas = scene.textures.createCanvas(
                'procedural-ocean-fallback',
                Math.max(1, Math.round(size.width / 2)),
                Math.max(1, Math.round(size.height / 2)),
            )!;
            this.surface = scene.add.image(0, 0, this.canvas).setOrigin(0);
            this.ripples = scene.add.graphics();
        }
        this.resize(display.width, display.height);
        this.setActive(false);
    }

    setActive(active: boolean): void {
        if (this.active === active && this.surface.visible === active) return;
        this.active = active;
        this.surface.setVisible(active);
        this.ripples?.setVisible(active);
        this.dirty = true;
        this.sinceDraw = 0;
    }

    resize(width: number, height: number): void {
        if (this.width === width && this.height === height) return;
        this.width = Math.max(1, width);
        this.height = Math.max(1, height);
        this.surface.setDisplaySize(this.width, this.height);
        if (this.canvas) {
            this.paintCanvasDepth();
            this.wavelets = [];
            const columns = Math.ceil(this.width / 52);
            const rows = Math.ceil(
                Math.min(160, Math.ceil((this.width * this.height) / (52 * 48))) / columns,
            );
            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < columns && this.wavelets.length < 160; col++) {
                    const jitter = oceanNoise(col * 3.7 + 4.2, row * 2.9 + 8.1);
                    this.wavelets.push({
                        x: ((col + jitter * 0.5) * this.width) / columns,
                        y: ((row + 0.2 + jitter * 0.5) * this.height) / rows,
                        length: 13 + jitter * 12,
                        phase: jitter * Math.PI * 2,
                    });
                }
            }
        }
        this.dirty = true;
    }

    /** Time is local, bounded and frozen in menus, modal panels and reduced-motion mode. */
    update(deltaMs: number, moving: boolean): void {
        if (!this.active || this.disposed) return;
        this.seconds = advanceOceanTime(this.seconds, deltaMs, moving);
        if (moving) this.sinceDraw += Math.min(Math.max(0, deltaMs), 50);
        if (!this.dirty && (!moving || this.sinceDraw < OCEAN_FRAME_MS)) return;
        this.dirty = false;
        this.sinceDraw %= OCEAN_FRAME_MS;
        // DynamicTexture executes this draw when the cached surface is next rendered.
        // No new commands are queued when stationary, so it becomes one ordinary image.
        if (this.target && this.shader) this.target.draw(this.shader);
        else this.paintCanvasRipples();
    }

    private paintCanvasDepth(): void {
        const canvas = this.canvas!;
        const context = canvas.getContext();
        const data = context.createImageData(canvas.width, canvas.height);
        const channels = [
            [0.035, 0.085, 0.12],
            [0.205, 0.405, 0.475],
            [0.315, 0.515, 0.525],
        ];
        for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
                const px = ((x + 0.5) * this.width) / canvas.width;
                const py = ((y + 0.5) * this.height) / canvas.height;
                const depth =
                    0.24 +
                    0.48 * oceanNoise(px / 190 + 2.3, py / 190 + 5.7) +
                    0.18 * oceanNoise(px / 73 + 8.1, py / 73 + 1.4);
                const glow =
                    Math.exp(
                        -2.4 *
                            (((x / canvas.width - 0.34) * 1.4) ** 2 +
                                (y / canvas.height - 0.34) ** 2),
                    ) * 0.26;
                const shade = 1 - 0.16 * Math.max(0, (y / canvas.height - 0.57) / 0.43);
                const index = (y * canvas.width + x) * 4;
                for (const [channel, [deep, mid, lit]] of channels.entries()) {
                    data.data[index + channel] =
                        ((deep + (mid - deep) * depth) * (1 - glow) + lit * glow) * shade * 255;
                }
                data.data[index + 3] = 255;
            }
        }
        context.putImageData(data, 0, 0);
        canvas.refresh();
    }

    private paintCanvasRipples(): void {
        const graphics = this.ripples!;
        graphics.clear();
        for (const wave of this.wavelets) {
            const envelope = 0.5 + 0.5 * Math.sin(wave.phase + this.seconds * 0.02);
            const height = sampleOceanWaves(wave.x, wave.y, this.seconds).height;
            for (const [offset, color, alpha, thickness] of [
                [1.4, 0x123f55, 0.12, 2],
                [0, 0x86b7bb, 0.08, 1],
            ]) {
                graphics.lineStyle(thickness, color, alpha * envelope).beginPath();
                for (let point = 0; point <= 8; point++) {
                    const u = point / 8;
                    const x = wave.x + (u - 0.5) * wave.length;
                    const y =
                        wave.y +
                        offset +
                        height * 1.5 +
                        Math.sin(u * Math.PI + wave.phase) * 1.2 -
                        (u - 0.5) * 3;
                    if (point === 0) graphics.moveTo(x, y);
                    else graphics.lineTo(x, y);
                }
                graphics.strokePath();
            }
        }
    }

    destroy(): void {
        if (this.disposed) return;
        this.disposed = true;
        this.shader?.destroy();
        this.surface.destroy();
        this.ripples?.destroy();
        this.canvas?.destroy();
        this.wavelets = [];
    }
}
