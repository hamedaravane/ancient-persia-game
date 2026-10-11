import { Geom, GameObjects, Scene } from 'phaser';
import {
    buildRoad,
    buildSettlement,
    createGame,
    endTurn,
    getVictoryPoints,
    moveRobber,
    rollDice,
    tradeWithBank,
    upgradeCity,
} from '../core/game';
import { FA } from '../ui/messages.fa';
import {
    RESOURCE_TYPES,
    type BoardEdge,
    type BoardVertex,
    type GameState,
    type ResourceType,
    type TerrainType,
} from '../core/types';

const WIDTH = 390;
const HEIGHT = 844;
const BOARD_CENTER_X = 195;
const BOARD_CENTER_Y = 322;
const HEX_SIZE = 40;
const BACKGROUND_KEY = 'achaemenid-palace';
const RESOURCE_SHEET_KEY = 'resource-icons';
const BACKGROUND_PATH = `${import.meta.env.BASE_URL}assets/backgrounds/achaemenid-palace-terrace-sunset.png`;
const RESOURCE_SHEET_PATH = `${import.meta.env.BASE_URL}assets/resources/resources.png`;

const RESOURCE_FRAMES: Record<ResourceType, { x: number; y: number; width: number; height: number }> = {
    wood: { x: 44, y: 164, width: 476, height: 404 },
    brick: { x: 544, y: 164, width: 440, height: 404 },
    wheat: { x: 984, y: 88, width: 428, height: 492 },
    wool: { x: 244, y: 608, width: 484, height: 392 },
    stone: { x: 768, y: 584, width: 496, height: 420 },
};

const TERRAIN_COLORS: Record<TerrainType, number> = {
    forest: 0x3f6149,
    mesa: 0x94543a,
    wheat: 0xb58b3d,
    pasture: 0x617d5d,
    mountain: 0x59626c,
    desert: 0xb78f62,
};

type InteractionMode = 'none' | 'road' | 'settlement' | 'city' | 'trade-give' | 'trade-receive';

export class GameScene extends Scene {
    private background!: GameObjects.Image;
    private ui!: GameObjects.Container;
    private gameState: GameState | null = null;
    private mode: InteractionMode = 'none';
    private tradeGive: ResourceType | null = null;
    private notice = '';

    constructor() {
        super('GameScene');
    }

    preload(): void {
        this.load.image(BACKGROUND_KEY, BACKGROUND_PATH);
        this.load.image(RESOURCE_SHEET_KEY, RESOURCE_SHEET_PATH);
    }

    create(): void {
        this.background = this.add.image(WIDTH / 2, HEIGHT / 2, BACKGROUND_KEY).setAlpha(0.3);
        this.ui = this.add.container(0, 0);
        this.fitBackground();

        const resourceTexture = this.textures.get(RESOURCE_SHEET_KEY);

        for (const [resource, frame] of Object.entries(RESOURCE_FRAMES)) {
            resourceTexture.add(resource, 0, frame.x, frame.y, frame.width, frame.height);
        }

        this.scale.on('resize', this.fitBackground, this);
        this.render();
    }

    private fitBackground(): void {
        const scale = Math.max(WIDTH / this.background.width, HEIGHT / this.background.height);
        this.background.setScale(scale).setPosition(WIDTH / 2, HEIGHT / 2);
    }

    private render(): void {
        this.ui.removeAll(true);

        if (this.gameState === null) {
            this.renderSetup();
            return;
        }

        this.renderHeader();
        this.renderBoard();
        this.renderResources();
        this.renderActions();

        if (this.gameState.phase === 'finished') {
            this.renderWinner();
        }
    }

    private renderSetup(): void {
        this.addPanel(16, 247, 358, 350, 0.94);
        this.addText(WIDTH / 2, 301, FA.title, 28, '#f5e8c7');
        this.addText(WIDTH / 2, 346, FA.subtitle, 16, '#c9c4b4');
        this.addText(WIDTH / 2, 407, FA.choosePlayers, 17, '#f5e8c7');

        this.addButton(FA.threePlayers, 36, 448, 148, 58, () => this.startGame(3), 0x466b58);
        this.addButton(FA.fourPlayers, 206, 448, 148, 58, () => this.startGame(4), 0x78553d);
        this.addText(WIDTH / 2, 543, FA.handover, 12, '#c9c4b4');
        this.addText(WIDTH / 2, 624, FA.title, 14, '#e3d2a8');
    }

    private startGame(playerCount: number): void {
        const names = Array.from({ length: playerCount }, (_, index) => `${FA.player} ${this.toPersianNumber(index + 1)}`);
        this.gameState = createGame(names);
        this.mode = 'none';
        this.tradeGive = null;
        this.notice = FA.startNote;
        this.render();
    }

    private renderHeader(): void {
        const state = this.gameState!;
        const player = state.players[state.activePlayerIndex];
        const points = getVictoryPoints(state, player.id);
        const lastRoll = state.lastRoll ? `${this.toPersianNumber(state.lastRoll[0])} + ${this.toPersianNumber(state.lastRoll[1])}` : '—';

        this.addPanel(16, 12, 358, 108, 0.94);
        this.addButton(
            state.phase === 'roll' ? FA.roll : `${FA.rollTitle} ${lastRoll}`,
            28,
            32,
            106,
            54,
            () => this.onRoll(),
            0x9a7138,
            state.phase === 'roll',
            13,
        );

        this.addCircle(349, 41, 8, player.color);
        this.addText(331, 38, player.name, 18, '#fff4dc', 1, 0.5, true);
        this.addText(350, 65, `${FA.score} ${this.toPersianNumber(points)} از ${this.toPersianNumber(state.victoryTarget)}`, 12, '#d9d2c0', 1, 0.5, true);

        const gap = 348 / state.players.length;

        state.players.forEach((scorePlayer, index) => {
            const x = 22 + gap * index + gap / 2;
            const score = getVictoryPoints(state, scorePlayer.id);
            this.addCircle(x - 22, 98, 5, scorePlayer.color);
            this.addText(x - 12, 98, `${scorePlayer.name.replace(`${FA.player} `, '')}  ${this.toPersianNumber(score)}`, 11, '#f1e6cb', 0, 0.5);
        });

        this.addText(350, 13, `${FA.turn} ${this.toPersianNumber(state.turn)}`, 11, '#c9c4b4', 1, 0);
    }

    private renderBoard(): void {
        const state = this.gameState!;

        for (const tile of state.board.tiles) {
            this.renderTile(tile);
        }

        const edgeGraphics = this.add.graphics();

        for (const edge of Object.values(state.board.edges)) {
            const first = this.toScreen(state.board.vertices[edge.vertexIds[0]]);
            const second = this.toScreen(state.board.vertices[edge.vertexIds[1]]);
            const owner = edge.road ? state.players.find(({ id }) => id === edge.road!.ownerId) : undefined;

            const emptyEdgeColor = this.mode === 'road' ? 0xd6bb7f : 0x231f1b;
            const emptyEdgeWidth = this.mode === 'road' ? 3 : 2;
            const emptyEdgeAlpha = this.mode === 'road' ? 0.8 : 0.52;
            edgeGraphics.lineStyle(
                edge.road ? 7 : emptyEdgeWidth,
                owner?.color ?? emptyEdgeColor,
                edge.road ? 1 : emptyEdgeAlpha,
            );
            edgeGraphics.beginPath();
            edgeGraphics.moveTo(first.x, first.y);
            edgeGraphics.lineTo(second.x, second.y);
            edgeGraphics.strokePath();

            if (state.phase === 'actions' && this.mode === 'road' && edge.road === null) {
                const hitArea = this.segmentHitArea(first.x, first.y, second.x, second.y, 12);
                const hit = this.add.graphics().setInteractive(hitArea, Geom.Polygon.Contains);
                hit.on('pointerdown', () => this.onEdge(edge));
                this.ui.add(hit);
            }
        }

        this.ui.add(edgeGraphics);

        for (const vertex of Object.values(state.board.vertices)) {
            this.renderVertex(vertex);
        }
    }

    private renderTile(tile: GameState['board']['tiles'][number]): void {
        const centerX = BOARD_CENTER_X + tile.x * HEX_SIZE;
        const centerY = BOARD_CENTER_Y + tile.y * HEX_SIZE;
        const points = Array.from({ length: 6 }, (_, index) => {
            const angle = ((-90 + index * 60) * Math.PI) / 180;
            return {
                x: Math.cos(angle) * HEX_SIZE,
                y: Math.sin(angle) * HEX_SIZE,
            };
        });
        const tileGraphics = this.add.graphics({ x: centerX, y: centerY });

        tileGraphics.fillStyle(TERRAIN_COLORS[tile.terrain], 0.98);
        tileGraphics.lineStyle(2, 0xe4d4ae, 0.95);
        tileGraphics.beginPath();
        tileGraphics.moveTo(points[0].x, points[0].y);
        for (const point of points.slice(1)) {
            tileGraphics.lineTo(point.x, point.y);
        }
        tileGraphics.closePath();
        tileGraphics.fillPath();
        tileGraphics.strokePath();
        this.ui.add(tileGraphics);

        if (tile.number !== null) {
            this.addCircle(centerX, centerY - 5, 17, 0xf0dfb7, 1, 0x392f25);
            this.addText(centerX, centerY - 5, this.toPersianNumber(tile.number), 14, tile.number === 6 || tile.number === 8 ? '#a33d2e' : '#332a22');
        } else {
            this.addText(centerX, centerY - 5, FA.desert, 12, '#2f261d');
        }

        if (tile.resource !== null) {
            this.addText(centerX, centerY + 19, this.resourceShortLabel(tile.resource), 10, '#fff0d5');
        }

        if (tile.robber) {
            this.addCircle(centerX, centerY - 30, 9, 0x2a1d1c, 1, 0xf0d9ac);
            this.addText(centerX, centerY - 30, 'ر', 10, '#f0d9ac');
        }

        if (this.gameState?.phase === 'robber') {
            const interactiveTile = this.add.graphics({ x: centerX, y: centerY });
            interactiveTile.setInteractive(new Geom.Polygon(points), Geom.Polygon.Contains);
            interactiveTile.on('pointerdown', () => this.onRobberTile(tile.id));
            this.ui.add(interactiveTile);
        }
    }

    private renderVertex(vertex: BoardVertex): void {
        const point = this.toScreen(vertex);

        if (vertex.building) {
            const owner = this.gameState!.players.find(({ id }) => id === vertex.building!.ownerId)!;
            const marker = this.add.graphics();
            marker.fillStyle(owner.color, 1);
            marker.lineStyle(2, 0x271f18, 1);

            if (vertex.building.type === 'city') {
                marker.fillRoundedRect(point.x - 11, point.y - 11, 22, 22, 5);
                marker.strokeRoundedRect(point.x - 11, point.y - 11, 22, 22, 5);
                marker.fillStyle(0xf3e2bf, 1);
                marker.fillRect(point.x - 3, point.y - 4, 6, 11);
            } else {
                marker.fillCircle(point.x, point.y, 10);
                marker.strokeCircle(point.x, point.y, 10);
            }

            this.ui.add(marker);
        }

        const canChoose = this.gameState?.phase === 'actions'
            && (this.mode === 'settlement' || (this.mode === 'city' && vertex.building?.ownerId === this.gameState.players[this.gameState.activePlayerIndex].id));

        if (canChoose) {
            const marker = this.add.circle(point.x, point.y, 19, vertex.building ? 0xe7c26c : 0xeadfbf, 0.4)
                .setStrokeStyle(2, 0x221d17, 0.9)
                .setInteractive(new Geom.Circle(0, 0, 22), Geom.Circle.Contains);
            marker.on('pointerdown', () => this.onVertex(vertex));
            this.ui.add(marker);
        }
    }

    private renderResources(): void {
        const player = this.gameState!.players[this.gameState!.activePlayerIndex];
        this.addPanel(13, 500, 364, 88, 0.96);

        RESOURCE_TYPES.forEach((resource, index) => {
            const centerX = 49 + index * 73;
            const icon = this.add.image(centerX, 530, RESOURCE_SHEET_KEY, resource).setDisplaySize(27, 27);
            this.ui.add(icon);
            this.addText(centerX, 558, this.toPersianNumber(player.resources[resource]), 14, '#fff1d7');
            this.addText(centerX, 576, FA.resources[resource], 10, '#d7c9ab');

            if (this.mode === 'trade-give' || this.mode === 'trade-receive') {
                const hit = this.add.rectangle(centerX, 542, 65, 80, 0xffffff, 0.001)
                    .setInteractive();
                hit.on('pointerdown', () => this.onTradeResource(resource));
                this.ui.add(hit);
            }
        });
    }

    private renderActions(): void {
        const state = this.gameState!;
        const active = state.phase === 'actions';
        const modeHint = this.getModeHint();

        this.addText(WIDTH / 2, 608, this.notice || modeHint, 12, this.notice ? '#f2d89b' : '#e9dfc9');
        this.addButton(FA.buildRoad, 16, 624, 174, 56, () => this.selectMode('road'), 0x364e45, active, 14);
        this.addButton(FA.buildSettlement, 200, 624, 174, 56, () => this.selectMode('settlement'), 0x65523b, active, 14);
        this.addButton(FA.upgradeCity, 16, 686, 174, 56, () => this.selectMode('city'), 0x63513e, active, 14);
        this.addButton(FA.bankTrade, 200, 686, 174, 56, () => this.selectMode('trade-give'), 0x3f5265, active, 13);
        this.addButton(FA.endTurn, 16, 747, 358, 58, () => this.onEndTurn(), 0x8b5839, active, 16);
    }

    private getModeHint(): string {
        if (this.gameState?.phase === 'roll') {
            return FA.normalRoll;
        }
        if (this.gameState?.phase === 'robber') {
            return FA.chooseRobberTile;
        }
        if (this.mode === 'road') {
            return FA.chooseRoadEdge;
        }
        if (this.mode === 'settlement') {
            return FA.chooseSettlementVertex;
        }
        if (this.mode === 'city') {
            return FA.chooseCity;
        }
        if (this.mode === 'trade-give') {
            return FA.chooseTradeGive;
        }
        if (this.mode === 'trade-receive') {
            return `${FA.chooseTradeReceive} ${this.tradeGive ? FA.resources[this.tradeGive] : ''}`;
        }

        return FA.buildHint;
    }

    private selectMode(mode: InteractionMode): void {
        this.mode = mode;
        this.tradeGive = null;
        this.notice = '';
        this.render();
    }

    private onRoll(): void {
        if (!this.gameState) {
            return;
        }

        const result = rollDice(this.gameState);
        this.applyResult(result, result.ok && result.state.phase === 'robber'
            ? FA.seven
            : `${FA.rolled}: ${result.ok ? this.toPersianNumber(result.state.lastRoll![0] + result.state.lastRoll![1]) : ''}`);
    }

    private onRobberTile(tileId: string): void {
        if (this.gameState) {
            this.applyResult(moveRobber(this.gameState, tileId), FA.robberMoved);
        }
    }

    private onEdge(edge: BoardEdge): void {
        if (this.gameState) {
            this.applyResult(buildRoad(this.gameState, edge.id), FA.roadBuilt);
        }
    }

    private onVertex(vertex: BoardVertex): void {
        if (!this.gameState) {
            return;
        }

        if (this.mode === 'settlement') {
            this.applyResult(buildSettlement(this.gameState, vertex.id), FA.settlementBuilt);
        } else if (this.mode === 'city') {
            this.applyResult(upgradeCity(this.gameState, vertex.id), FA.cityBuilt);
        }
    }

    private onTradeResource(resource: ResourceType): void {
        if (!this.gameState) {
            return;
        }

        if (this.mode === 'trade-give') {
            this.tradeGive = resource;
            this.mode = 'trade-receive';
            this.notice = '';
            this.render();
            return;
        }

        if (this.mode === 'trade-receive' && this.tradeGive) {
            this.applyResult(tradeWithBank(this.gameState, this.tradeGive, resource), FA.tradeCompleted);
        }
    }

    private onEndTurn(): void {
        if (this.gameState) {
            this.mode = 'none';
            this.tradeGive = null;
            this.applyResult(endTurn(this.gameState), FA.nextTurn);
        }
    }

    private applyResult(result: ReturnType<typeof rollDice>, successNotice: string): void {
        if (!result.ok) {
            this.notice = FA.errors[result.reason];
        } else {
            this.gameState = result.state;
            this.notice = successNotice;
            this.mode = 'none';
            this.tradeGive = null;
        }

        this.render();

    }

    private renderWinner(): void {
        const winner = this.gameState!.players.find(({ id }) => id === this.gameState!.winnerId)!;
        const overlay = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x11161e, 0.78);
        this.ui.add(overlay);
        this.addPanel(32, 312, 326, 220, 1);
        this.addText(WIDTH / 2, 357, FA.winnerTitle, 22, '#f5e8c7');
        this.addCircle(WIDTH / 2, 405, 9, winner.color);
        this.addText(WIDTH / 2, 440, `${winner.name} ${FA.winnerSuffix}`, 19, '#fff4dc');
        this.addText(WIDTH / 2, 476, `${FA.score} ${this.toPersianNumber(getVictoryPoints(this.gameState!, winner.id))}`, 15, '#d9d2c0');
        this.addButton(FA.newGame, 96, 564, 198, 54, () => {
            this.gameState = null;
            this.notice = '';
            this.render();
        }, 0x8b5839, true, 16);
    }

    private addPanel(x: number, y: number, width: number, height: number, alpha = 0.9): GameObjects.Graphics {
        const panel = this.add.graphics();
        panel.fillStyle(0x141a23, alpha);
        panel.fillRoundedRect(x, y, width, height, 18);
        panel.lineStyle(1, 0xe1c99b, 0.24);
        panel.strokeRoundedRect(x, y, width, height, 18);
        this.ui.add(panel);
        return panel;
    }

    private addText(
        x: number,
        y: number,
        value: string,
        fontSize: number,
        color: string,
        originX = 0.5,
        originY = 0.5,
        rightToLeft = true,
    ): GameObjects.Text {
        const text = this.add.text(x, y, value, {
            fontFamily: 'Tahoma, Arial, sans-serif',
            fontSize: `${fontSize}px`,
            color,
            align: rightToLeft ? 'right' : 'center',
            rtl: rightToLeft,
        }).setOrigin(originX, originY);
        this.ui.add(text);
        return text;
    }

    private addButton(
        label: string,
        x: number,
        y: number,
        width: number,
        height: number,
        onClick: () => void,
        color: number,
        enabled = true,
        fontSize = 15,
    ): void {
        const button = this.add.graphics();
        button.fillStyle(enabled ? color : 0x41434a, enabled ? 0.98 : 0.78);
        button.fillRoundedRect(x, y, width, height, 15);
        button.lineStyle(1, 0xf4dfb2, enabled ? 0.38 : 0.16);
        button.strokeRoundedRect(x, y, width, height, 15);
        this.ui.add(button);

        this.addText(x + width / 2, y + height / 2, label, fontSize, enabled ? '#fff4df' : '#aaa89f');

        if (enabled) {
            button.setInteractive(new Geom.Rectangle(x, y, width, height), Geom.Rectangle.Contains);
            button.on('pointerdown', onClick);
        }
    }

    private addCircle(x: number, y: number, radius: number, color: number, alpha = 1, strokeColor?: number): void {
        const circle = this.add.graphics();
        circle.fillStyle(color, alpha);
        circle.fillCircle(x, y, radius);
        if (strokeColor !== undefined) {
            circle.lineStyle(1, strokeColor, 1);
            circle.strokeCircle(x, y, radius);
        }
        this.ui.add(circle);
    }

    private toScreen(vertex: Pick<BoardVertex, 'x' | 'y'>): { x: number; y: number } {
        return {
            x: BOARD_CENTER_X + vertex.x * HEX_SIZE,
            y: BOARD_CENTER_Y + vertex.y * HEX_SIZE,
        };
    }

    private segmentHitArea(x1: number, y1: number, x2: number, y2: number, halfWidth: number): Geom.Polygon {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.hypot(dx, dy) || 1;
        const offsetX = (dy / length) * halfWidth;
        const offsetY = (-dx / length) * halfWidth;
        return new Geom.Polygon([
            { x: x1 + offsetX, y: y1 + offsetY },
            { x: x2 + offsetX, y: y2 + offsetY },
            { x: x2 - offsetX, y: y2 - offsetY },
            { x: x1 - offsetX, y: y1 - offsetY },
        ]);
    }

    private resourceShortLabel(resource: ResourceType): string {
        return FA.resources[resource];
    }

    private toPersianNumber(value: number): string {
        return String(value).replace(/[0-9]/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
    }
}
