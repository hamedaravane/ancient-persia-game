import type { GameCommand } from '../core/commands';
import type { ProductionGrant } from '../core/production';
import type { GameState } from '../core/types';

export type MatchAction = GameCommand;

/** One confirmed command, consumed once by presentation. Never an animation callback. */
export interface MatchTransition {
    id: number;
    action: MatchAction;
    before: GameState;
    after: GameState;
    production: ProductionGrant[];
}
