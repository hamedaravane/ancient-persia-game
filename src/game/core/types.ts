export const RESOURCE_TYPES = ['wood', 'brick', 'wheat', 'wool', 'stone'] as const;

export type ResourceType = (typeof RESOURCE_TYPES)[number];
export type TerrainType = 'forest' | 'mesa' | 'wheat' | 'pasture' | 'mountain' | 'desert';
export type BuildingType = 'settlement' | 'city';
export type GamePhase =
    | 'setup-roll'
    | 'setup-settlement'
    | 'setup-road'
    | 'roll'
    | 'discard'
    | 'robber'
    | 'steal'
    | 'road-building'
    | 'actions'
    | 'finished';

export interface StarterRoll {
    playerId: string;
    dice: [number, number];
}
export type SetupState =
    | {
          kind: 'starter';
          contenders: number[];
          rolls: Record<string, [number, number]>;
          lastRoll: StarterRoll | null;
      }
    | {
          kind: 'placement';
          settlements: string[];
          settlementId: string | null;
          lastRoll: StarterRoll;
      };

export interface Building {
    type: BuildingType;
    ownerId: string;
}

export interface Road {
    ownerId: string;
}

export interface HexTile {
    id: string;
    q: number;
    r: number;
    x: number;
    y: number;
    terrain: TerrainType;
    resource: ResourceType | null;
    number: number | null;
    robber: boolean;
    vertexIds: string[];
    edgeIds: string[];
}

export interface BoardVertex {
    id: string;
    x: number;
    y: number;
    tileIds: string[];
    edgeIds: string[];
    neighborIds: string[];
    building: Building | null;
}

export interface BoardEdge {
    id: string;
    vertexIds: [string, string];
    tileIds: string[];
    road: Road | null;
}

export interface Port {
    id: string;
    /** A coastal edge; its two endpoints are the only access intersections. */
    edgeId: string;
    /** null is a general 3:1 port; a resource denotes its specialist 2:1 port. */
    resource: ResourceType | null;
}

export type TradeRatio = 2 | 3 | 4;

export interface Board {
    tiles: HexTile[];
    vertices: Record<string, BoardVertex>;
    edges: Record<string, BoardEdge>;
    ports: Port[];
}

export interface Player {
    id: string;
    name: string;
    color: number;
    resources: Record<ResourceType, number>;
}

export type DevelopmentKind =
    'knight' | 'victory-point' | 'road-building' | 'monopoly' | 'year-of-plenty';
export interface DevelopmentCard {
    id: string;
    kind: DevelopmentKind;
    boughtOnRound: number;
    playedBy?: string;
}
export interface DevelopmentState {
    deck: DevelopmentCard[];
    discard: DevelopmentCard[];
    hands: Record<string, DevelopmentCard[]>;
    knights: Record<string, number>;
    playedThisTurn: boolean;
}
export interface RobberResolution {
    source: 'seven' | 'knight';
    returnPhase: 'roll' | 'actions';
    discards: Record<string, number>;
    victims: string[];
}
export interface GameState {
    development?: DevelopmentState;
    awards?: { longestRoad: string | null; largestArmy: string | null };
    robberResolution?: RobberResolution | null;
    roadBuilding?: { remaining: number; returnPhase: 'roll' | 'actions' } | null;
    board: Board;
    players: Player[];
    activePlayerIndex: number;
    turn: number;
    phase: GamePhase;
    lastRoll: [number, number] | null;
    winnerId: string | null;
    victoryTarget: number;
    /** Absent in legacy completed openings, which began at seat zero. */
    startingPlayerIndex?: number;
    setup?: SetupState | null;
}

export type RandomSource = () => number;

export type ActionResult =
    { ok: true; state: GameState } | { ok: false; state: GameState; reason: RuleErrorCode };

export type RuleErrorCode =
    | 'deck-empty'
    | 'invalid-card'
    | 'card-too-new'
    | 'card-already-played'
    | 'invalid-card-choice'
    | 'invalid-discard'
    | 'invalid-victim'
    | 'not-enough-points'
    | 'road-supply'
    | 'wrong-phase'
    | 'invalid-player-count'
    | 'missing-target'
    | 'occupied'
    | 'too-close'
    | 'not-connected'
    | 'insufficient-resources'
    | 'same-resource-trade'
    | 'invalid-trade-ratio'
    | 'invalid-trade-partner'
    | 'invalid-trade-bundle'
    | 'stale-trade'
    | 'same-robber-tile'
    | 'game-finished';
