import { StartGame } from './game/main';
import { loadUiFont } from './game/ui/typography';
import './styles/global.css';
import './styles/royal.css';

const parent = document.querySelector<HTMLElement>('#game-container');

if (!parent) {
    throw new Error('Game container #game-container was not found.');
}

void loadUiFont().then(async () => {
    if (new URLSearchParams(window.location.search).get('demo') === 'pieces') {
        const { startPiecesDemo } = await import('./game/demo/piecesDemo');
        startPiecesDemo(parent);
    } else StartGame(parent);
});
