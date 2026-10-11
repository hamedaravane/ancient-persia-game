import { GameObjects, Scene } from 'phaser';
import type { GameState, HexTile, TerrainType } from '../core/types';
import { BoardInput } from '../rendering/boardInput';
import { BoardEffects } from '../rendering/boardEffects';
import { createBoardCoast } from '../rendering/boardCoast';
import { boardToClient, boardToScreen, fitBoard, type BoardLayout } from '../ui/layout';
import { number } from '../ui/components';
import type { GameSession } from '../ui/session';
import { UI_FONT_FAMILY } from '../ui/typography';
import type { Motion } from '../ui/motion';
import type { MatchTransition } from '../ui/transitions';
import { ART, assetUrl } from '../assets';

const TERRAIN_COLORS: Record<TerrainType, number> = { forest: 0x3f6149, mesa: 0x94543a, wheat: 0xb58b3d, pasture: 0x617d5d, mountain: 0x59626c, desert: 0xb78f62 };

/** Phaser presents state and previews; all eligibility and commands belong to core/session. */
export class GameScene extends Scene {
    private boardObjects!: GameObjects.Container;
    private coast: GameObjects.Graphics | null = null;
    private layout: BoardLayout = fitBoard(390, 468);
    private renderedState: GameState | null = null;
    private renderedPlacement: unknown;
    private inputAdapter: BoardInput;
    private unsubscribe: () => void;
    private effects: BoardEffects;
    private pieces = new Map<string, GameObjects.Container>();
    private robberMarker: GameObjects.Container | null = null;
    private viewListeners = new Set<() => void>();

    constructor(private session: GameSession, private motion: Motion, private onReady: (scene: GameScene) => void) { super('GameScene'); }

    preload(): void {
        for (const terrain of Object.keys(TERRAIN_COLORS)) this.load.image(`terrain-${terrain}`, `${import.meta.env.BASE_URL}assets/board/terrains/${terrain}.png`);
        for (const name of ['robber', 'number', 'spark', 'dust'] as const) this.load.image(`art-${name}`, assetUrl(ART[name].file));
    }
    create(): void {
        for (const name of ['robber', 'number', 'spark', 'dust'] as const) {
            const key = `art-${name}`;
            if (!this.textures.exists(key)) continue;
            const texture = this.textures.get(key);
            const [x, y, width, height] = ART[name].frame;
            if (!texture.has('crop')) texture.add('crop', 0, x, y, width, height);
        }
        this.boardObjects = this.add.container();
        this.effects = new BoardEffects(this, this.motion);
        this.inputAdapter = new BoardInput(this, () => !!this.session.state && !this.session.sheet, (x, y) => this.selectAt(x, y), () => this.constrainView());
        this.unsubscribe = this.session.subscribe(() => this.render());
        this.scale.on('resize', this.resizeBoard, this);
        this.events.once('shutdown', () => {
            this.unsubscribe();
            this.inputAdapter.destroy();
            this.effects.destroy();
            this.viewListeners.clear();
            this.scale.off('resize', this.resizeBoard, this);
        });
        this.resizeBoard();
        this.onReady(this);
    }
    private resizeBoard(): void {
        this.layout = fitBoard(this.scale.width, this.scale.height);
        this.resetView();
        this.render(true);
    }
    zoomBy(factor: number): void {
        this.cameras.main.setZoom(Math.max(1, Math.min(2.5, this.cameras.main.zoom * factor)));
        this.constrainView();
    }
    resetView(): void { this.cameras.main.setZoom(1).setScroll(0, 0); this.viewChanged(); }
    private constrainView(): void {
        const camera = this.cameras.main;
        const maxX = this.scale.width * (1 - 1 / camera.zoom) / 2;
        const maxY = this.scale.height * (1 - 1 / camera.zoom) / 2;
        camera.setScroll(Math.max(-maxX, Math.min(maxX, camera.scrollX)), Math.max(-maxY, Math.min(maxY, camera.scrollY)));
        this.viewChanged();
    }
    private viewChanged(): void { this.effects?.clear(); this.viewListeners.forEach((listener) => listener()); }
    subscribeView(listener: () => void): () => void { this.viewListeners.add(listener); return () => this.viewListeners.delete(listener); }
    clearEffects(): void { this.effects.clear(); }

    /** Client coordinates bridge the camera-transformed board and the DOM hand. */
    tileAnchor(tileId: string): { x: number; y: number } | null {
        const tile = this.session.state?.board.tiles.find(({ id }) => id === tileId);
        if (!tile) return null;
        return boardToClient(tile, this.layout, this.cameras.main, this.game.canvas.getBoundingClientRect());
    }

    playTransition(transition: MatchTransition): void {
        const { action, before, after } = transition;
        if (action.kind === 'roll') {
            const roll = after.lastRoll!;
            const total = roll[0] + roll[1];
            for (const tile of after.board.tiles) if (tile.number === total) this.effects.pulse(this.toScreen(tile), this.layout.hexRadius * 0.8, tile.robber ? 0xce977b : 0xffdda0, 200);
        } else if (action.kind === 'build') {
            if (action.type === 'road') {
                const edge = after.board.edges[action.targetId];
                this.effects.road(this.toScreen(after.board.vertices[edge.vertexIds[0]]), this.toScreen(after.board.vertices[edge.vertexIds[1]]), 0xffdda0);
            } else {
                const piece = this.pieces.get(action.targetId);
                if (piece) this.effects.piece(piece);
                this.effects.pulse(this.toScreen(after.board.vertices[action.targetId]), 15, 0xffdda0);
            }
        } else if (action.kind === 'robber' && this.robberMarker) {
            const from = before.board.tiles.find(({ robber }) => robber)!;
            const to = after.board.tiles.find(({ robber }) => robber)!;
            const start = this.toScreen(from), end = this.toScreen(to);
            const offset = this.layout.hexRadius * 0.53;
            this.effects.robber(this.robberMarker, { x: start.x, y: start.y - offset }, { x: end.x, y: end.y - offset });
            this.effects.pulse(end, this.layout.hexRadius * 0.75, 0xce977b, 250);
        }
    }
    private toScreen(point: { x: number; y: number }) { return boardToScreen(point, this.layout); }

    private render(force = false): void {
        const state = this.session.state;
        if (!force && state === this.renderedState && this.session.placement === this.renderedPlacement) return;
        this.effects.clear();
        this.pieces.clear();
        this.robberMarker = null;
        const previousBoard = this.renderedState?.board;
        this.renderedState = state;
        this.renderedPlacement = this.session.placement;
        this.boardObjects.removeAll(true);
        if (!state) { this.coast?.destroy(); this.coast = null; return; }
        if (force || state.board !== previousBoard || !this.coast) {
            this.coast?.destroy();
            this.coast = createBoardCoast(this, state.board, this.layout).setDepth(-1);
        }
        for (const tile of state.board.tiles) this.renderTile(tile);
        const lines = this.add.graphics();
        const roadLabels: { x: number; y: number; text: string }[] = [];
        const targets = new Set(this.session.targets);
        const placement = this.session.placement;
        for (const edge of Object.values(state.board.edges)) {
            const a = this.toScreen(state.board.vertices[edge.vertexIds[0]]), b = this.toScreen(state.board.vertices[edge.vertexIds[1]]);
            const owner = state.players.find(({ id }) => id === edge.road?.ownerId);
            const eligible = placement?.kind === 'road' && targets.has(edge.id);
            const selected = eligible && placement.targetId === edge.id;
            if (selected) this.line(lines, a, b, 13, 0xffefb0, 0.8);
            this.line(lines, a, b, owner || selected ? 7 : eligible ? 5 : 2,
                owner?.color ?? (selected ? state.players[state.activePlayerIndex].color : eligible ? 0xf5d283 : 0x231f1b),
                owner ? 1 : selected ? 0.7 : eligible ? 1 : 0.5);
            if (owner) {
                // Paired with player number to keep ownership readable beyond color.
                roadLabels.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, text: number(state.players.indexOf(owner) + 1) });
            }
        }
        this.boardObjects.add(lines);
        for (const label of roadLabels) this.text(label.x, label.y, label.text, 10, '#16202a');
        for (const vertex of Object.values(state.board.vertices)) {
            const p = this.toScreen(vertex);
            const eligible = (placement?.kind === 'settlement' || placement?.kind === 'city') && targets.has(vertex.id);
            const selected = eligible && placement?.targetId === vertex.id;
            const owner = state.players.find(({ id }) => id === vertex.building?.ownerId);
            if (eligible) this.circle(p.x, p.y, selected ? 16 : 12, 0xf5d283, selected ? 0.8 : 0.5, 0xffefc3);
            if (owner || selected) {
                const marker = this.add.graphics();
                marker.fillStyle(owner?.color ?? state.players[state.activePlayerIndex].color, selected ? 0.65 : 1).lineStyle(2, 0x18232c);
                const city = vertex.building?.type === 'city' || (selected && placement?.kind === 'city');
                if (city) { marker.fillRoundedRect(-10, -10, 20, 20, 3); marker.strokeRoundedRect(-10, -10, 20, 20, 3); }
                else { marker.fillTriangle(0, -11, -10, 8, 10, 8); marker.strokeTriangle(0, -11, -10, 8, 10, 8); }
                const piece = this.add.container(p.x, p.y, [marker]);
                this.boardObjects.add(piece);
                this.pieces.set(vertex.id, piece);
                if (owner) piece.add(this.text(0, city ? 0 : 2, number(state.players.indexOf(owner) + 1), 10, '#16202a'));
            }
        }
    }
    private line(graphics: GameObjects.Graphics, a: { x: number; y: number }, b: { x: number; y: number }, width: number, color: number, alpha = 1): void {
        graphics.lineStyle(width, color, alpha).beginPath().moveTo(a.x, a.y).lineTo(b.x, b.y).strokePath();
    }
    private renderTile(tile: HexTile): void {
        const { x, y } = this.toScreen(tile);
        const radius = this.layout.hexRadius;
        const points = Array.from({ length: 6 }, (_, i) => { const angle = (-90 + i * 60) * Math.PI / 180; return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius }; });
        const polygon = (graphics: GameObjects.Graphics) => {
            graphics.beginPath().moveTo(points[0].x, points[0].y);
            for (const p of points.slice(1)) graphics.lineTo(p.x, p.y);
            return graphics.closePath();
        };
        const backplate = this.add.graphics({ x, y }).fillStyle(TERRAIN_COLORS[tile.terrain]).lineStyle(2, 0xe4d4ae);
        polygon(backplate).fillPath().strokePath();
        this.boardObjects.add(backplate);
        const terrain = this.add.image(x, y, `terrain-${tile.terrain}`);
        terrain.setScale(radius * 2 / terrain.height);
        const maskShape = this.add.graphics({ x, y }).fillStyle(0xffffff);
        polygon(maskShape).fillPath();
        maskShape.setVisible(false);
        const mask = maskShape.createGeometryMask();
        terrain.setMask(mask).once('destroy', () => mask.destroy());
        this.boardObjects.add([terrain, maskShape]);
        const roll = this.session.state!.lastRoll;
        if (roll && roll[0] + roll[1] === tile.number && !tile.robber) {
            const highlight = this.add.graphics({ x, y }).lineStyle(3, 0xffebaf, 0.85);
            polygon(highlight).strokePath();
            this.boardObjects.add(highlight);
        }
        if (tile.number !== null) {
            if (this.textures.exists('art-number')) {
                const token = this.add.image(x, y + radius * 0.48, 'art-number', 'crop');
                token.setScale(26 / token.width);
                this.boardObjects.add(token);
            } else this.circle(x, y + radius * 0.48, 12, 0xf0dfb7, 1, 0x392f25);
            this.text(x, y + radius * 0.48, number(tile.number), 14, tile.number === 6 || tile.number === 8 ? '#a33d2e' : '#332a22');
        } else this.text(x, y + radius * 0.48, 'بیابان', 11, '#2f261d').setBackgroundColor('#f0dfb7').setPadding(3, 1);
        const preview = this.session.placement?.kind === 'robber' && this.session.placement.targetId === tile.id;
        if (this.session.placement?.kind === 'robber' && !tile.robber) {
            const rim = this.add.graphics({ x, y }).lineStyle(preview ? 4 : 2, 0xffd77b, preview ? 1 : 0.65);
            polygon(rim).strokePath();
            this.boardObjects.add(rim);
        }
        if (tile.robber || preview) {
            const marker = this.add.container(x, y - radius * 0.53).setAlpha(preview ? 0.55 : 1);
            this.boardObjects.add(marker);
            if (this.textures.exists('art-robber')) {
                const shadow = this.add.ellipse(0, 15, 15, 5, 0x151b20, 0.5);
                const robber = this.add.image(0, 0, 'art-robber', 'crop');
                robber.setScale(Math.min(32, radius * 0.85) / robber.height);
                marker.add([shadow, robber]);
            } else {
                marker.add(this.add.circle(0, 0, 10, 0x2a1d1c).setStrokeStyle(2, 0xf0d9ac));
                marker.add(this.text(0, 0, 'ر', 12, '#f0d9ac'));
            }
            if (tile.robber) this.robberMarker = marker;
        }
    }
    private text(x: number, y: number, value: string, size: number, color: string): GameObjects.Text {
        const text = this.add.text(x, y, value, { fontFamily: UI_FONT_FAMILY, fontSize: `${size}px`, color, rtl: true }).setOrigin(0.5);
        this.boardObjects.add(text);
        return text;
    }
    private circle(x: number, y: number, radius: number, color: number, alpha = 1, stroke = 0x271f18): void {
        this.boardObjects.add(this.add.circle(x, y, radius, color, alpha).setStrokeStyle(2, stroke));
    }
    private selectAt(x: number, y: number): void {
        const state = this.session.state;
        if (!state || this.session.sheet) return;
        const placement = this.session.placement;
        if (placement?.kind === 'road') {
            let nearest: string | null = null, best = Infinity;
            for (const id of this.session.targets) {
                const edge = state.board.edges[id];
                const a = this.toScreen(state.board.vertices[edge.vertexIds[0]]), b = this.toScreen(state.board.vertices[edge.vertexIds[1]]);
                const dx = b.x - a.x, dy = b.y - a.y;
                const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy)));
                const distance = Math.hypot(x - a.x - t * dx, y - a.y - t * dy);
                if (distance < best) { nearest = id; best = distance; }
            }
            if (nearest && best * this.cameras.main.zoom <= 28) this.session.preview(nearest);
        } else if (placement?.kind === 'settlement' || placement?.kind === 'city') {
            const nearest = this.session.targets.map((id) => { const p = this.toScreen(state.board.vertices[id]); return { id, distance: Math.hypot(x - p.x, y - p.y) }; }).sort((a, b) => a.distance - b.distance)[0];
            if (nearest && nearest.distance * this.cameras.main.zoom <= 28) this.session.preview(nearest.id);
        } else {
            const tile = state.board.tiles.find((tile) => {
                const p = this.toScreen(tile), dx = Math.abs(x - p.x) / this.layout.hexRadius, dy = Math.abs(y - p.y) / this.layout.hexRadius;
                return dx <= Math.sqrt(3) / 2 && dy <= 1 && dy + dx / Math.sqrt(3) <= 1;
            });
            if (tile) {
                if (placement?.kind === 'robber') this.session.preview(tile.id);
                else this.session.openSheet({ kind: 'tile', id: tile.id });
            }
        }
    }
}
