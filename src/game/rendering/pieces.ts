import type { GameObjects, Scene } from 'phaser';

export type BuildingKind = 'settlement' | 'city';
export type PieceKind = BuildingKind | 'road';

/** Flags combine: a selected destination is still an uncommitted preview. */
export interface PieceState {
    legal?: boolean;
    preview?: boolean;
    selected?: boolean;
    disabled?: boolean;
}

interface CommonOptions {
    x: number;
    y: number;
    color: number;
    /** Radians. Geometry rotates; lighting remains in world axes. */
    angle?: number;
    state?: Readonly<PieceState>;
    /** Desaturates every layer, useful for checking silhouette and contrast. */
    grayscale?: boolean;
}

export interface BuildingOptions extends CommonOptions {
    kind: BuildingKind;
    /** Outer stone footprint width, excluding outline, shadow and state cue. */
    size?: number;
}

export interface RoadOptions extends CommonOptions {
    length?: number;
    thickness?: number;
}

type Point = readonly [number, number];
type Polygon = readonly Point[];
type ShapeOptions = BuildingOptions | (RoadOptions & { kind: 'road' });

const STONE = {
    body: 0xcdbb96,
    inset: 0x8c7e66,
    light: 0xffedc8,
    shade: 0x9b8664,
    outline: 0x253039,
    shadow: 0x101820,
    cue: 0xffe1a0,
} as const;

// Original floor plans, centered on the intersection; no image tracing or facades.
const SETTLEMENT: Polygon = [
    [-8, -10],
    [8, -10],
    [10.5, -7.5],
    [10.5, 7],
    [8, 9],
    [3.5, 9],
    [3.5, 11],
    [-3.5, 11],
    [-3.5, 9],
    [-8, 9],
    [-10.5, 7],
    [-10.5, -7.5],
];
const CITY: Polygon = [
    [-12.5, -12.5],
    [-5.5, -12.5],
    [-5.5, -9.5],
    [5.5, -9.5],
    [5.5, -12.5],
    [12.5, -12.5],
    [12.5, -5.5],
    [9.5, -5.5],
    [9.5, 5.5],
    [12.5, 5.5],
    [12.5, 12.5],
    [5.5, 12.5],
    [5.5, 9.5],
    [-5.5, 9.5],
    [-5.5, 12.5],
    [-12.5, 12.5],
    [-12.5, 5.5],
    [-9.5, 5.5],
    [-9.5, -5.5],
    [-12.5, -5.5],
];

function chamfered(width: number, height: number, cut: number, x = 0, y = 0): Polygon {
    const l = x - width / 2,
        r = x + width / 2,
        t = y - height / 2,
        b = y + height / 2;
    return [
        [l + cut, t],
        [r - cut, t],
        [r, t + cut],
        [r, b - cut],
        [r - cut, b],
        [l + cut, b],
        [l, b - cut],
        [l, t + cut],
    ];
}

function mix(color: number, target: number, amount: number): number {
    const channel = (shift: number) =>
        Math.round(((color >> shift) & 255) * (1 - amount) + ((target >> shift) & 255) * amount);
    return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}

function gray(color: number): number {
    const value = Math.round(
        ((color >> 16) & 255) * 0.2126 + ((color >> 8) & 255) * 0.7152 + (color & 255) * 0.0722,
    );
    return (value << 16) | (value << 8) | value;
}

function path(graphics: GameObjects.Graphics, points: Polygon): GameObjects.Graphics {
    graphics.beginPath().moveTo(points[0][0], points[0][1]);
    for (const [x, y] of points.slice(1)) graphics.lineTo(x, y);
    return graphics.closePath();
}

/** Owns a reusable container and five independently drawn material/state layers.
 * No input listeners, rule knowledge, textures, timers or ownership palette.
 */
export class PieceView {
    readonly container: GameObjects.Container;
    readonly layers: Readonly<{
        shadow: GameObjects.Graphics;
        stone: GameObjects.Graphics;
        ownership: GameObjects.Graphics;
        bevel: GameObjects.Graphics;
        feedback: GameObjects.Graphics;
    }>;
    private options: ShapeOptions;

    constructor(scene: Scene, options: ShapeOptions) {
        this.options = options;
        this.layers = {
            shadow: scene.add.graphics(),
            stone: scene.add.graphics(),
            ownership: scene.add.graphics(),
            bevel: scene.add.graphics(),
            feedback: scene.add.graphics(),
        };
        this.container = scene.add.container(options.x, options.y, Object.values(this.layers));
        this.draw();
    }

    setColor(color: number): this {
        this.options = { ...this.options, color };
        return this.draw();
    }
    setState(state: Readonly<PieceState>): this {
        this.options = { ...this.options, state: { ...state } };
        return this.draw();
    }
    setAngle(angle: number): this {
        this.options = { ...this.options, angle };
        return this.draw();
    }
    setPosition(x: number, y: number): this {
        this.container.setPosition(x, y);
        return this;
    }
    destroy(): void {
        this.container.destroy();
    }

    private draw(): this {
        const options = this.options;
        const state = options.state ?? {};
        const road = options.kind === 'road';
        const scale = road
            ? 1
            : Math.max(1, options.size ?? (options.kind === 'city' ? 25 : 21)) /
              (options.kind === 'city' ? 25 : 21);
        const length = road ? Math.max(4, options.length ?? 28) : 0;
        const thickness = road ? Math.max(2, options.thickness ?? 8) : 0;
        const outline = road
            ? chamfered(length, thickness, Math.min(thickness / 3, length / 8))
            : options.kind === 'city'
              ? CITY
              : SETTLEMENT;
        const angle = options.angle ?? 0,
            cos = Math.cos(angle),
            sin = Math.sin(angle);
        const transform = (points: Polygon, dx = 0, dy = 0): Polygon =>
            points.map(
                ([x, y]) =>
                    [(x * cos - y * sin) * scale + dx, (x * sin + y * cos) * scale + dy] as const,
            );
        const paint = (value: number) => (options.grayscale ? gray(value) : value);
        const ink = paint(STONE.outline);
        const color = options.color & 0xffffff;
        const owner = paint(state.disabled ? mix(color, gray(color), 0.8) : color);
        const { shadow, stone, ownership, bevel, feedback } = this.layers;
        for (const layer of Object.values(this.layers)) layer.clear().setAlpha(1);

        // Small contact shadow, not a projected side wall. Offset stays in world axes.
        path(shadow.fillStyle(paint(STONE.shadow), 0.32), transform(outline, 0.6, 1.3)).fillPath();
        path(stone.fillStyle(paint(STONE.body)).lineStyle(1.3, ink), transform(outline))
            .fillPath()
            .strokePath();

        const surface = road
            ? chamfered(Math.max(2, length - thickness * 0.8), Math.max(1, thickness - 3.5), 0.7)
            : options.kind === 'city'
              ? chamfered(14, 14, 1.5)
              : chamfered(14, 13, 1.8, 0, -0.5);
        path(stone.fillStyle(paint(STONE.inset)), transform(surface)).fillPath();
        const face = surface.map(([x, y]) => [x * 0.86, y * 0.86] as const);
        path(ownership.fillStyle(owner), transform(face)).fillPath();
        // Broad color-dependent bevels preserve saturated, near-white and black colors.
        this.bevel(
            ownership,
            transform(face),
            paint(mix(owner, 0xffffff, 0.3)),
            paint(mix(owner, 0x000000, 0.25)),
            road ? 0.65 : 1,
        );
        this.bevel(bevel, transform(outline), paint(STONE.light), paint(STONE.shade), 1.15);

        if (!road && options.kind === 'city') {
            // Four large stone corner pads establish a stepped compound at 25 px.
            for (const x of [-9, 9])
                for (const y of [-9, 9]) {
                    const pad = transform(chamfered(4.5, 4.5, 0.7, x, y));
                    path(stone.fillStyle(paint(STONE.shade)), pad).fillPath();
                    this.bevel(bevel, pad, paint(STONE.light), paint(STONE.inset), 0.85);
                }
        } else if (!road) {
            // One broad threshold on the small dwelling; no facade or pitched roof.
            const threshold = transform([
                [-2.5, 8.5],
                [2.5, 8.5],
            ]);
            bevel.lineStyle(1.5, paint(STONE.light)).lineBetween(...threshold[0], ...threshold[1]);
        } else {
            // Stone end caps and two joints keep a road legible in every orientation.
            const gap = Math.min(thickness * 0.38, length / 5);
            for (const x of [-length / 2 + gap, length / 2 - gap]) {
                const joint = transform([
                    [x, -thickness / 2 + 1],
                    [x, thickness / 2 - 1],
                ]);
                bevel.lineStyle(0.8, paint(STONE.inset)).lineBetween(...joint[0], ...joint[1]);
            }
        }

        if (state.preview) {
            stone.setAlpha(0.7);
            ownership.setAlpha(0.55);
            bevel.setAlpha(0.65);
            shadow.setAlpha(0.5);
        }
        if (state.disabled) {
            stone.setAlpha(0.65);
            ownership.setAlpha(0.45);
            bevel.setAlpha(0.5);
            shadow.setAlpha(0.4);
        }
        if (state.legal || state.selected) {
            const border = transform(outline);
            // Dark separator keeps the pale cue distinct over wheat and desert.
            path(feedback.lineStyle(state.selected ? 5 : 3.5, ink, 0.8), border).strokePath();
            path(
                feedback.lineStyle(state.selected ? 3 : 1.8, paint(STONE.cue), 1),
                border,
            ).strokePath();
            // Restore an inner keyline; the cue sits outside the piece's footprint.
            path(feedback.lineStyle(1, ink), border).strokePath();
        }

        this.container.setSize(
            road ? length : (options.size ?? (options.kind === 'city' ? 25 : 21)),
            road ? thickness : (options.size ?? (options.kind === 'city' ? 25 : 21)),
        );
        return this;
    }

    /** Edge normals are evaluated AFTER rotation, keeping the light upper-left. */
    private bevel(
        graphics: GameObjects.Graphics,
        points: Polygon,
        light: number,
        shade: number,
        width: number,
    ): void {
        for (let index = 0; index < points.length; index++) {
            const a = points[index],
                b = points[(index + 1) % points.length];
            const dx = b[0] - a[0],
                dy = b[1] - a[1];
            const lit = dx - dy > 0;
            graphics.lineStyle(width, lit ? light : shade, 0.9).lineBetween(...a, ...b);
        }
    }
}

export function createBuildingPiece(scene: Scene, options: BuildingOptions): PieceView {
    return new PieceView(scene, options);
}

export function createRoadPiece(scene: Scene, options: RoadOptions): PieceView {
    return new PieceView(scene, { ...options, kind: 'road' });
}
