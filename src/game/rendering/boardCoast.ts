import type { GameObjects, Scene } from 'phaser';
import type { Board } from '../core/types';
import { boardToScreen, type BoardLayout } from '../ui/layout';

type Point = { x: number; y: number };

function strokeOutline(graphics: GameObjects.Graphics, points: Point[]): void {
    graphics.beginPath();
    graphics.moveTo(points[0].x, points[0].y);
    for (const point of points.slice(1)) graphics.lineTo(point.x, point.y);
    graphics.closePath();
    graphics.strokePath();
}

function traceCoast(board: Board, layout: BoardLayout): Point[] {
    const boundary = Object.values(board.edges).filter((edge) => edge.tileIds.length === 1);
    const neighbors = new Map<string, string[]>();

    for (const {
        vertexIds: [first, second],
    } of boundary) {
        neighbors.set(first, [...(neighbors.get(first) ?? []), second]);
        neighbors.set(second, [...(neighbors.get(second) ?? []), first]);
    }

    if (boundary.length === 0) return [];

    const start = boundary[0].vertexIds[0];
    const points: Point[] = [];
    let current = start;
    let previous: string | undefined;

    for (let index = 0; index < boundary.length; index += 1) {
        points.push(boardToScreen(board.vertices[current], layout));
        const next = neighbors.get(current)?.find((id) => id !== previous);

        if (next === undefined) throw new Error('The board coast must form a closed loop.');

        previous = current;
        current = next;
        if (current === start) return points;
    }

    throw new Error('The board coast must form a closed loop.');
}

/** Decorative geometry only; it never receives input or changes board state. */
export function createBoardCoast(
    scene: Scene,
    board: Board,
    layout: BoardLayout,
): GameObjects.Graphics {
    const coast = scene.add.graphics();
    const points = traceCoast(board, layout);
    if (points.length < 3) return coast;

    // Strokes straddle the perimeter. Opaque terrain backplates hide the inner
    // half, leaving a shallow shelf that fades up to 16 pixels into the sea.
    for (const [width, alpha] of [
        [32, 0.06],
        [26, 0.08],
        [20, 0.12],
        [14, 0.16],
        [9, 0.22],
    ]) {
        coast.lineStyle(width, 0x8bc4be, alpha);
        strokeOutline(coast, points);
    }

    coast.lineStyle(6, 0xc5b18d, 1);
    strokeOutline(coast, points);

    const signedArea = points.reduce((area, point, index) => {
        const next = points[(index + 1) % points.length];
        return area + point.x * next.y - next.x * point.y;
    }, 0);
    const winding = Math.sign(signedArea);

    // Broken surf sits just beyond the rim instead of outlining every edge in
    // bright white. Its variation is stable across UI redraws and dice rolls.
    points.forEach((point, index) => {
        if (index % 4 === 3) return;
        const next = points[(index + 1) % points.length];
        const dx = next.x - point.x;
        const dy = next.y - point.y;
        const length = Math.hypot(dx, dy);
        const offsetX = (dy / length) * winding * 4;
        const offsetY = (-dx / length) * winding * 4;

        coast.lineStyle(1, 0xe3ecdb, 0.25 + (index % 3) * 0.06);
        coast.beginPath();
        coast.moveTo(point.x + dx * 0.18 + offsetX, point.y + dy * 0.18 + offsetY);
        coast.lineTo(point.x + dx * 0.72 + offsetX, point.y + dy * 0.72 + offsetY);
        coast.strokePath();
    });

    return coast;
}
