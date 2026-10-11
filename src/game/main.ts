import { AUTO, Game, Scale } from 'phaser';
import { GameScene } from './scenes/GameScene';
import { GameHud } from './ui/GameHud';
import { GameSession } from './ui/session';
import { GameFeedback } from './ui/GameFeedback';
import { Motion } from './ui/motion';

export function StartGame(parent: HTMLElement): Game {
    const session = new GameSession();
    const motion = new Motion();
    const hud = new GameHud(parent, session, motion);
    let feedback: GameFeedback | null = null;
    const scene = new GameScene(session, motion, (readyScene) => {
        hud.connectBoard(readyScene);
        feedback = new GameFeedback(parent, session, readyScene, motion);
    });
    const game = new Game({
        type: AUTO,
        width: 390,
        height: 468,
        parent: hud.boardViewport,
        transparent: true,
        // ResizeObserver owns the grid measurements, including hidden-menu startup.
        scale: { mode: Scale.NONE, autoCenter: Scale.NO_CENTER, expandParent: false },
        scene: [scene],
        render: { antialias: true, roundPixels: true },
    });
    // Grid/safe-area changes can resize the board without a window resize.
    const observer = new ResizeObserver(([entry]) => {
        const width = Math.floor(entry.contentRect.width), height = Math.floor(entry.contentRect.height);
        if (width > 0 && height > 0 && (game.scale.width !== width || game.scale.height !== height)) game.scale.resize(width, height);
    });
    observer.observe(hud.boardViewport);
    game.events.once('destroy', () => { observer.disconnect(); feedback?.destroy(); hud.destroy(); motion.destroy(); });
    return game;
}
