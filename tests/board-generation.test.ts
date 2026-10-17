import { expect, test } from 'vitest';
import { createBoard, NUMBER_SEQUENCE, numberSpiral } from '../src/game/core/board';

const sequence = [5, 2, 6, 3, 8, 10, 9, 12, 11, 4, 8, 10, 9, 4, 5, 6, 3, 11];
// Independent, screen-counterclockwise order from the island's upper-left corner.
const spiral = [
    [0, -2],
    [-1, -1],
    [-2, 0],
    [-2, 1],
    [-2, 2],
    [-1, 2],
    [0, 2],
    [1, 1],
    [2, 0],
    [2, -1],
    [2, -2],
    [1, -2],
    [0, -1],
    [-1, 0],
    [-1, 1],
    [0, 1],
    [1, 0],
    [1, -1],
    [0, 0],
];

// Force Fisher–Yates to move the last terrain (desert) to each requested slot.
function desertAt(slot: number) {
    let call = 0;
    return () => (call++ === 0 ? (slot + 0.25) / 19 : 0.999);
}

test.each(Array.from({ length: 19 }, (_, i) => i))(
    'official Variable Setup skips desert at terrain slot %i and separates every red token',
    (slot) => {
        const board = createBoard(desertAt(slot));
        expect(board.tiles[slot].terrain).toBe('desert');
        expect(board.tiles.filter((t) => t.robber)).toEqual([board.tiles[slot]]);
        expect(board.tiles[slot].number).toBeNull();
        const actual = spiral
            .map(([q, r]) => board.tiles.find((t) => t.q === q && t.r === r)!)
            .filter((t) => t.terrain !== 'desert')
            .map((t) => t.number);
        expect(actual).toEqual(sequence);
        expect(NUMBER_SEQUENCE).toEqual(sequence);
        expect(numberSpiral().map(({ q, r }) => [q, r])).toEqual(spiral);
        expect(
            Object.fromEntries(
                ['forest', 'pasture', 'wheat', 'mesa', 'mountain', 'desert'].map((terrain) => [
                    terrain,
                    board.tiles.filter((t) => t.terrain === terrain).length,
                ]),
            ),
        ).toEqual({ forest: 4, pasture: 4, wheat: 4, mesa: 3, mountain: 3, desert: 1 });
        const red = board.tiles.filter((t) => t.number === 6 || t.number === 8);
        for (const tile of red) {
            for (const other of red.filter((t) => t !== tile)) {
                expect(tile.edgeIds.some((id) => other.edgeIds.includes(id))).toBe(false);
            }
        }
    },
);

test('seeded generation is reproducible and terrain varies independently of the token sequence', () => {
    function source(seed: number) {
        return () => {
            seed = (1664525 * seed + 1013904223) >>> 0;
            return seed / 2 ** 32;
        };
    }
    expect(createBoard(source(17))).toEqual(createBoard(source(17)));
    expect(createBoard(source(17)).tiles.map((t) => t.terrain)).not.toEqual(
        createBoard(source(18)).tiles.map((t) => t.terrain),
    );
});
