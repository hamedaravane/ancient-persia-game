import { Scene, type GameObjects } from 'phaser';
import { assetUrl } from '../assets';
import type { GameSession } from '../ui/session';

/** Background and board use separate cameras in the same Phaser game/context. */
export class BackdropScene extends Scene {
    private image: GameObjects.Image;
    private shade: GameObjects.Graphics;
    constructor(private session: GameSession) {
        super('BackdropScene');
    }
    preload(): void {
        this.load.image('ui-ocean', assetUrl('backgrounds/game.png'));
        this.load.image('ui-palace', assetUrl('backgrounds/main-menu.png'));
    }
    create(): void {
        this.image = this.add.image(0, 0, 'ui-palace').setOrigin(0.5);
        this.shade = this.add.graphics();
        const unsubscribe = this.session.subscribe(() => this.renderBackground());
        this.scale.on('resize', this.renderBackground, this);
        const dispose = () => {
            unsubscribe();
            this.scale.off('resize', this.renderBackground, this);
        };
        this.events.once('shutdown', dispose);
        this.events.once('destroy', dispose);
        this.renderBackground();
    }
    private renderBackground(): void {
        const { width, height } = this.scale;
        this.image
            .setTexture(this.session.state ? 'ui-ocean' : 'ui-palace')
            .setPosition(width / 2, height / 2);
        this.image.setScale(Math.max(width / this.image.width, height / this.image.height));
        this.shade
            .clear()
            .fillStyle(0x08192d, this.session.state ? 0.15 : 0.32)
            .fillRect(0, 0, width, height);
        if (this.session.state) {
            this.shade
                .fillGradientStyle(0x08192d, 0x08192d, 0x08192d, 0x08192d, 0, 0, 0.6, 0.6)
                .fillRect(0, height * 0.55, width, height * 0.45);
        }
    }
}
