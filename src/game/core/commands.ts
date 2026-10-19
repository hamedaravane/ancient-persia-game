import {
    buyDevelopment,
    playDevelopment,
    declareVictory,
    type DevelopmentChoice,
} from './development';
import { discardResources, stealResource } from './robber';
import { tradeWithPlayer, type TradeTerms } from './domesticTrade';
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
    | { kind: 'buy-development' | 'declare-victory' }
    | { kind: 'play-development'; cardId: string; choice?: DevelopmentChoice }
    | { kind: 'discard'; playerId: string; resources: Record<ResourceType, number> }
    | { kind: 'steal'; victimId: string }
    | { kind: 'roll' | 'end-turn' | 'setup-roll' }
    | { kind: 'setup'; type: 'settlement' | 'road'; targetId: string }
    | { kind: 'build'; type: BuildType; targetId: string }
    | { kind: 'robber'; targetId: string }
    | { kind: 'domestic-trade'; terms: TradeTerms }
    | { kind: 'trade'; give: ResourceType; receive: ResourceType; ratio: TradeRatio };

/** The same validated rule commands are available to human and bot controllers. */
export function executeCommand(
    state: GameState,
    command: GameCommand,
    random: RandomSource = Math.random,
) {
    switch (command.kind) {
        case 'buy-development':
            return buyDevelopment(state);
        case 'play-development':
            return playDevelopment(state, command.cardId, command.choice);
        case 'declare-victory':
            return declareVictory(state);
        case 'discard':
            return discardResources(state, command.playerId, command.resources);
        case 'steal':
            return stealResource(state, command.victimId, random);
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
        case 'domestic-trade':
            return tradeWithPlayer(state, command.terms);
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
