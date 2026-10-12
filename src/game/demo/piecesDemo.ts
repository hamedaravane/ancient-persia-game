import { AUTO, Game, Scale, Scene } from 'phaser';
import { PLAYER_COLORS } from '../core/game';
import { createBuildingPiece, createRoadPiece, type PieceState } from '../rendering/pieces';
import { UI_FONT_FAMILY } from '../ui/typography';
import { number } from '../ui/components';
import '../../styles/pieces-demo.css';

const HEIGHT = 1100;

/** Isolated visual fixture using the production renderers, at 1 canvas px/CSS px. */
class PiecesDemoScene extends Scene {
    private color: number = PLAYER_COLORS[3];
    constructor() {
        super('PiecesDemo');
    }
    create(): void {
        this.scale.on('resize', this.draw, this);
        this.events.once('shutdown', () => this.scale.off('resize', this.draw, this));
        this.draw();
    }
    setColor(color: number): void {
        this.color = color;
        if (this.sys.isActive()) this.draw();
    }

    private text(
        x: number,
        y: number,
        value: string,
        size = 13,
        centered = true,
        rtl = true,
    ): void {
        this.add
            .text(x, y, value, {
                fontFamily: UI_FONT_FAMILY,
                fontSize: `${size}px`,
                color: '#f5ead0',
                rtl,
            })
            .setOrigin(centered ? 0.5 : 0, 0.5);
    }
    private panel(y: number, height: number, title: string): void {
        const width = this.scale.width;
        this.add
            .graphics()
            .fillStyle(0x203342)
            .lineStyle(1, 0x536269)
            .fillRoundedRect(12, y, width - 24, height, 12)
            .strokeRoundedRect(12, y, width - 24, height, 12);
        this.text(width / 2, y + 23, title, 15);
    }
    private columns(y: number): number[] {
        const columns = [0, 1, 2].map(
            (index) => 76 + ((this.scale.width - 94) * (index + 0.5)) / 3,
        );
        ['آبادی • ۲۱', 'شهر • ۲۵', 'راه • ۲۸×۸'].forEach((name, i) =>
            this.text(columns[i], y, name, 11),
        );
        return columns;
    }
    private samples(
        columns: number[],
        y: number,
        color: number,
        state: PieceState = {},
        grayscale = false,
    ): void {
        createBuildingPiece(this, {
            x: columns[0],
            y,
            kind: 'settlement',
            size: 21,
            color,
            state,
            grayscale,
        });
        createBuildingPiece(this, {
            x: columns[1],
            y,
            kind: 'city',
            size: 25,
            color,
            state,
            grayscale,
        });
        createRoadPiece(this, {
            x: columns[2],
            y,
            length: 28,
            thickness: 8,
            color,
            state,
            grayscale,
        });
    }
    private draw(): void {
        this.children.removeAll(true);
        const width = this.scale.width;
        this.panel(16, 270, 'رنگ‌های دلخواه • اندازه واقعی بازی');
        const columns = this.columns(70);
        [...PLAYER_COLORS.slice(0, 3), this.color].forEach((color, i) => {
            const y = 110 + i * 46;
            this.text(22, y, `#${color.toString(16).padStart(6, '0')}`, 10, false, false);
            this.samples(columns, y, color);
        });

        this.panel(306, 144, 'خاکستری کامل • تشخیص شکل بدون رنگ');
        this.text(24, 368, 'تیره', 11, false);
        this.text(24, 415, 'روشن', 11, false);
        this.samples(columns, 368, 0x080808, {}, true);
        this.samples(columns, 415, 0xf8f8f8, {}, true);

        this.panel(470, 124, 'راه در سه جهت صفحه');
        [30, 90, 150].forEach((degrees, index) => {
            const x = (width * (index + 1)) / 4;
            createRoadPiece(this, {
                x,
                y: 535,
                color: this.color,
                length: 28,
                thickness: 8,
                angle: (degrees * Math.PI) / 180,
            });
            this.text(x, 573, `${number(degrees)}°`, 12);
        });

        this.panel(614, 318, 'حالت‌های نمایشی • بدون تغییر قوانین');
        this.columns(665);
        const states: Array<[string, PieceState]> = [
            ['عادی', {}],
            ['مجاز', { legal: true }],
            ['پیش‌نمایش', { preview: true }],
            ['انتخاب', { selected: true }],
            ['غیرفعال', { disabled: true }],
            ['تأیید محل', { preview: true, legal: true, selected: true }],
        ];
        states.forEach(([name, state], i) => {
            const y = 698 + i * 41;
            this.text(22, y, name, 10, false);
            this.samples(columns, y, this.color, state);
        });

        this.panel(952, 132, 'جزئیات سه‌برابر • ردیف‌های بالا اندازه واقعی‌اند');
        createBuildingPiece(this, {
            x: width / 4,
            y: 1033,
            kind: 'settlement',
            color: this.color,
        }).container.setScale(3);
        createBuildingPiece(this, {
            x: width / 2,
            y: 1033,
            kind: 'city',
            color: this.color,
        }).container.setScale(3);
        createRoadPiece(this, {
            x: (width * 3) / 4,
            y: 1033,
            color: this.color,
            angle: Math.PI / 6,
        }).container.setScale(3);
    }
}

export function startPiecesDemo(parent: HTMLElement): Game {
    parent.className = 'piece-demo';
    parent.innerHTML = `<div class="piece-demo-content"><header><h1>نمونه قطعات سنگی</h1><p>همان رندر بازی، با اندازه واقعی و بدون تصویر خارجی.</p><label>رنگ دلخواه <input type="color" value="#${PLAYER_COLORS[3].toString(16).padStart(6, '0')}" aria-label="رنگ دلخواه قطعات" /></label><a href="${import.meta.env.BASE_URL}">بازگشت به بازی</a></header><div class="piece-demo-canvas" role="img" aria-label="نمونه آبادی، شهر و راه؛ رنگ‌های متفاوت، خاکستری، سه زاویه راه و حالت‌های مجاز، پیش‌نمایش، انتخاب و غیرفعال"></div></div>`;
    const viewport = parent.querySelector<HTMLElement>('.piece-demo-canvas')!;
    const input = parent.querySelector<HTMLInputElement>('input')!;
    const scene = new PiecesDemoScene();
    const game = new Game({
        type: AUTO,
        parent: viewport,
        width: viewport.clientWidth || 390,
        height: HEIGHT,
        backgroundColor: '#142330',
        scale: { mode: Scale.NONE, autoCenter: Scale.NO_CENTER, expandParent: false },
        render: { antialias: true, roundPixels: false },
        scene: [scene],
    });
    const changeColor = () => scene.setColor(Number.parseInt(input.value.slice(1), 16));
    input.addEventListener('input', changeColor);
    const observer = new ResizeObserver(([entry]) => {
        const width = Math.floor(entry.contentRect.width);
        if (width > 0 && width !== game.scale.width) game.scale.resize(width, HEIGHT);
    });
    observer.observe(viewport);
    game.events.once('destroy', () => {
        observer.disconnect();
        input.removeEventListener('input', changeColor);
    });
    return game;
}
