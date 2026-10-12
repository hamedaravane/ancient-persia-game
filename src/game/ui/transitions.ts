import type { BuildType } from '../core/building';
import type { ProductionGrant } from '../core/production';
import type { GameState, ResourceType, TradeRatio } from '../core/types';

export type MatchAction =
    | { kind: 'roll' | 'end-turn' }
    | { kind: 'build'; type: BuildType; targetId: string }
    | { kind: 'robber'; targetId: string }
    | { kind: 'trade'; give: ResourceType; receive: ResourceType; ratio: TradeRatio };

/** One confirmed command, consumed once by presentation. Never an animation callback. */
export interface MatchTransition {
    id: number;
    action: MatchAction;
    before: GameState;
    after: GameState;
    production: ProductionGrant[];
}
