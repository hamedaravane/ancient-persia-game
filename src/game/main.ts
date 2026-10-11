import { AUTO, Game, Scale } from 'phaser';
import { GameScene } from './scenes/GameScene';
import { GAME_WIDTH, GAME_HEIGHT } from './ui/layout';

export function StartGame(parent: HTMLElement): Game {
    return new Game({
        type: AUTO,
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        parent,
        backgroundColor: '#151923',
        scale: {
            mode: Scale.FIT,
            autoCenter: Scale.CENTER_BOTH,
        },
        scene: [GameScene],
        render: {
            antialias: true,
            roundPixels: true,
        },
    });
}
