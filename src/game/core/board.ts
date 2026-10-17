import type { Board, BoardEdge, BoardVertex, HexTile, RandomSource, TerrainType } from './types';
import { createPorts } from './ports';

const BOARD_RADIUS = 2;
const TERRAIN_BAG: TerrainType[] = [
    'forest',
    'forest',
    'forest',
    'forest',
    'mesa',
    'mesa',
    'mesa',
    'wheat',
    'wheat',
    'wheat',
    'wheat',
    'pasture',
    'pasture',
    'pasture',
    'pasture',
    'mountain',
    'mountain',
    'mountain',
    'desert',
];
// CATAN Variable Setup A–R order; terrain is shuffled, tokens are not.
export const NUMBER_SEQUENCE = [5, 2, 6, 3, 8, 10, 9, 12, 11, 4, 8, 10, 9, 4, 5, 6, 3, 11];

/** Counterclockwise on the displayed island, from the upper-left corner inward. */
export function numberSpiral(): Array<{ q: number; r: number }> {
    const coordinates: Array<{ q: number; r: number }> = [];
    const directions = [
        [-1, 1],
        [0, 1],
        [1, 0],
        [1, -1],
        [0, -1],
        [-1, 0],
    ];
    for (let radius = BOARD_RADIUS; radius > 0; radius--) {
        let q = 0;
        let r = -radius;
        for (const [dq, dr] of directions) {
            for (let step = 0; step < radius; step++) {
                coordinates.push({ q, r });
                q += dq;
                r += dr;
            }
        }
    }
    return [...coordinates, { q: 0, r: 0 }];
}

function shuffle<T>(items: T[], random: RandomSource): T[] {
    const result = [...items];

    for (let index = result.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(random() * (index + 1));
        [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }

    return result;
}

function vertexId(x: number, y: number): string {
    return `${Math.round(x * 1000)}:${Math.round(y * 1000)}`;
}

function edgeId(firstId: string, secondId: string): string {
    return [firstId, secondId].sort().join('|');
}

export function createBoard(random: RandomSource = Math.random): Board {
    const coordinates: Array<{ q: number; r: number }> = [];

    for (let q = -BOARD_RADIUS; q <= BOARD_RADIUS; q += 1) {
        for (let r = -BOARD_RADIUS; r <= BOARD_RADIUS; r += 1) {
            if (Math.abs(q + r) <= BOARD_RADIUS) {
                coordinates.push({ q, r });
            }
        }
    }

    const terrains = shuffle(TERRAIN_BAG, random);
    const tiles: HexTile[] = coordinates.map(({ q, r }, index) => {
        const terrain = terrains[index];
        const terrainResources = {
            forest: 'wood',
            mesa: 'brick',
            wheat: 'wheat',
            pasture: 'wool',
            mountain: 'stone',
        } as const;
        const resource = terrain === 'desert' ? null : terrainResources[terrain];
        const tile: HexTile = {
            id: `hex:${q}:${r}`,
            q,
            r,
            x: Math.sqrt(3) * (q + r / 2),
            y: 1.5 * r,
            terrain,
            resource,
            number: null,
            robber: false,
            vertexIds: [],
            edgeIds: [],
        };

        if (resource === null) {
            tile.robber = true;
        }

        return tile;
    });

    let numberIndex = 0;
    for (const { q, r } of numberSpiral()) {
        const tile = tiles.find((tile) => tile.q === q && tile.r === r)!;
        if (tile.resource !== null) tile.number = NUMBER_SEQUENCE[numberIndex++];
    }

    const vertices: Record<string, BoardVertex> = {};
    const edges: Record<string, BoardEdge> = {};

    for (const tile of tiles) {
        const corners = Array.from({ length: 6 }, (_, index) => {
            const angle = ((-90 + index * 60) * Math.PI) / 180;
            return {
                x: tile.x + Math.cos(angle),
                y: tile.y + Math.sin(angle),
            };
        });

        tile.vertexIds = corners.map(({ x, y }) => {
            const id = vertexId(x, y);
            const vertex = (vertices[id] ??= {
                id,
                x,
                y,
                tileIds: [],
                edgeIds: [],
                neighborIds: [],
                building: null,
            });

            vertex.tileIds.push(tile.id);
            return id;
        });

        for (let index = 0; index < 6; index += 1) {
            const firstId = tile.vertexIds[index];
            const secondId = tile.vertexIds[(index + 1) % 6];
            const id = edgeId(firstId, secondId);
            const edge = (edges[id] ??= {
                id,
                vertexIds: [firstId, secondId],
                tileIds: [],
                road: null,
            });

            edge.tileIds.push(tile.id);
            tile.edgeIds.push(id);
        }
    }

    for (const edge of Object.values(edges)) {
        const [firstId, secondId] = edge.vertexIds;
        vertices[firstId].edgeIds.push(edge.id);
        vertices[secondId].edgeIds.push(edge.id);
        vertices[firstId].neighborIds.push(secondId);
        vertices[secondId].neighborIds.push(firstId);
    }

    const board: Board = { tiles, vertices, edges, ports: [] };
    return { ...board, ports: createPorts(board, random) };
}

export function getRobberTile(board: Board): HexTile {
    return board.tiles.find(({ robber }) => robber)!;
}

export function getTileById(board: Board, tileId: string): HexTile | undefined {
    return board.tiles.find(({ id }) => id === tileId);
}

export function getCurrentRobberId(board: Board): string {
    return getRobberTile(board).id;
}

export type { BoardEdge, BoardVertex };
