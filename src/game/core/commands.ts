import { placeInitialPiece, rollForStart } from './setup';
import type { BuildType } from './building';
import type { GameState, RandomSource, ResourceType, TradeRatio } from './types';
import {
    buildRoad,
    buildSettlement,
    endTurn,
    moveRobber,
    rollDice,
    tradeWithBank,
    upgradeCity,
} from './game';

export type GameCommand =
    | { kind: 'roll' | 'end-turn' | 'setup-roll' }
    | { kind: 'setup'; type: 'settlement' | 'road'; targetId: string }
    | { kind: 'build'; type: BuildType; targetId: string }
    | { kind: 'robber'; targetId: string }
    | { kind: 'trade'; give: ResourceType; receive: ResourceType; ratio: TradeRatio };

/** The same validated rule commands are available to human and bot controllers. */
export function executeCommand(
    state: GameState,
    command: GameCommand,
    random: RandomSource = Math.random,
) {
    switch (command.kind) {
        case 'setup-roll':
            return rollForStart(state, random);
        case 'setup':
            return placeInitialPiece(state, command.type, command.targetId);
        case 'roll':
            return rollDice(state, random);
        case 'end-turn':
            return endTurn(state);
        case 'robber':
            return moveRobber(state, command.targetId);
        case 'trade':
            return tradeWithBank(state, command.give, command.receive, command.ratio);
        case 'build':
            return command.type === 'road'
                ? buildRoad(state, command.targetId)
                : command.type === 'settlement'
                  ? buildSettlement(state, command.targetId)
                  : upgradeCity(state, command.targetId);
    }
}
