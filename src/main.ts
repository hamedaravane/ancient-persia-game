import { StartGame } from './game/main';
import { loadUiFont } from './game/ui/typography';
import './styles/global.css';

const parent = document.querySelector<HTMLElement>('#game-container');

if (!parent) {
    throw new Error('Game container #game-container was not found.');
}

void loadUiFont().then(() => StartGame(parent));
