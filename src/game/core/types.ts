export const RESOURCE_TYPES = ['wood', 'brick', 'wheat', 'wool', 'stone'] as const;

export type ResourceType = (typeof RESOURCE_TYPES)[number];
export type TerrainType = 'forest' | 'mesa' | 'wheat' | 'pasture' | 'mountain' | 'desert';
export type BuildingType = 'settlement' | 'city';
export type GamePhase = 'roll' | 'robber' | 'actions' | 'finished';

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

export interface Board {
    tiles: HexTile[];
    vertices: Record<string, BoardVertex>;
    edges: Record<string, BoardEdge>;
}

export interface Player {
    id: string;
    name: string;
    color: number;
    resources: Record<ResourceType, number>;
}

export interface GameState {
    board: Board;
    players: Player[];
    activePlayerIndex: number;
    turn: number;
    phase: GamePhase;
    lastRoll: [number, number] | null;
    winnerId: string | null;
    victoryTarget: number;
}

export type RandomSource = () => number;

export type ActionResult =
    | { ok: true; state: GameState }
    | { ok: false; state: GameState; reason: RuleErrorCode };

export type RuleErrorCode =
    | 'wrong-phase'
    | 'invalid-player-count'
    | 'missing-target'
    | 'occupied'
    | 'too-close'
    | 'not-connected'
    | 'insufficient-resources'
    | 'same-resource-trade'
    | 'same-robber-tile'
    | 'game-finished';
