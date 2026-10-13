import { AUTO, Game, Scale } from 'phaser';
import { GameScene } from './scenes/GameScene';
import { GameHud } from './ui/GameHud';
import { GameSession } from './ui/session';
import { GameFeedback } from './ui/GameFeedback';
import { Motion } from './ui/motion';
import { InterfaceScene } from './ui/InterfaceScene';
import { BackdropScene } from './scenes/BackdropScene';

export function StartGame(parent: HTMLElement): Game {
    const session = new GameSession();
    const motion = new Motion();
    const hud = new GameHud(parent, session);
    const stage = document.createElement('div');
    stage.className = 'phaser-stage';
    stage.setAttribute('aria-hidden', 'true');
    parent.prepend(stage);
    let feedback: GameFeedback | null = null;
    const ui = new InterfaceScene(parent, session, motion);
    const scene = new GameScene(session, motion, hud.boardViewport, (readyScene) => {
        hud.boardReady();
        feedback = new GameFeedback(parent, session, readyScene, ui, motion);
    });
    const game = new Game({
        type: AUTO,
        width: 390,
        height: 844,
        parent: stage,
        transparent: true,
        // ResizeObserver owns the grid measurements, including hidden-menu startup.
        scale: { mode: Scale.NONE, autoCenter: Scale.NO_CENTER, expandParent: false },
        scene: [new BackdropScene(session), scene, ui],
        input: { keyboard: false, mouse: false, touch: false },
        render: { antialias: true, roundPixels: true },
    });
    // Grid/safe-area changes can resize the board without a window resize.
    const observer = new ResizeObserver(() => {
        const width = Math.floor(parent.clientWidth),
            height = Math.floor(parent.clientHeight);
        if (width > 0 && height > 0 && (game.scale.width !== width || game.scale.height !== height))
            game.scale.resize(width, height);
        scene.resizeBoard();
        ui.invalidate();
    });
    observer.observe(parent);
    observer.observe(hud.boardViewport);
    game.events.once('destroy', () => {
        observer.disconnect();
        feedback?.destroy();
        hud.destroy();
        motion.destroy();
        stage.remove();
    });
    return game;
}
