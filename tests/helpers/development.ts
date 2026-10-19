import type { DevelopmentKind, GameState } from '../../src/game/core/types';
import { createReadyGame } from './setup';
export function ready(): GameState {
    const state = createReadyGame(['Human', 'Bot A', 'Bot B'], () => 0.42);
    state.phase = 'actions';
    state.turn = 2;
    state.lastRoll = [2, 3];
    state.players.forEach((p) => {
        p.resources = { wood: 10, brick: 10, wheat: 10, wool: 10, stone: 10 };
    });
    return state;
}
/** Move a real, unique card from the finite deck, retaining full inventory conservation. */
export function giveCard(
    state: GameState,
    kind: DevelopmentKind,
    playerId = state.players[0].id,
    boughtOnRound = 1,
): string {
    const dev = state.development!;
    const index = dev.deck.findIndex((c) => c.kind === kind);
    if (index < 0) throw new Error('No remaining fixture card');
    const [card] = dev.deck.splice(index, 1);
    dev.hands[playerId].push({ ...card, boughtOnRound });
    return card.id;
}
