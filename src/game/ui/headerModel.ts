import { getPlayerSummary } from '../core/queries';
import type { GameState } from '../core/types';
import { avatarForSeat } from './playerIdentity';
import type { UiBox } from './graphicsTheme';

/** Public standings only; exact opponent hands never enter the header projection. */
export function headerPlayers(state: GameState, humanId: string) {
    const humanSeat = state.players.findIndex((p) => p.id === humanId);
    const scores = state.players.map((p) => getPlayerSummary(state, p.id).score);
    const highest = Math.max(...scores);
    return state.players.map((p, seat) => ({
        id: p.id,
        name: p.name,
        color: p.color,
        score: scores[seat],
        rank: 1 + scores.filter((score) => score > scores[seat]).length,
        leading: highest > 0 && scores[seat] === highest,
        active: state.phase !== 'finished' && seat === state.activePlayerIndex,
        human: p.id === humanId,
        avatar: avatarForSeat(seat, humanSeat),
    }));
}

/** Controls stay below safe insets; the header material reaches the canvas edges. */
export function headerBackdrop(box: UiBox, canvasWidth: number): UiBox {
    return { x: 0, y: 0, width: canvasWidth, height: Math.max(0, box.y + box.height) };
}
