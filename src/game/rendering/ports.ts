import type { GameObjects, Scene } from 'phaser';
import type { Board, Port, TradeRatio } from '../core/types';
import { boardToScreen, type BoardLayout } from '../ui/layout';
import { UI_FONT_FAMILY } from '../ui/typography';

// CSS-sized markers stay readable as the island fits short/narrow viewports.
export const PORT_OFFSET = 20;
export const PORT_RADIUS = 16;
export const PORT_TOUCH_RADIUS = 22;

export interface PortLayout {
    x: number;
    y: number;
    access: readonly [{ x: number; y: number }, { x: number; y: number }];
}

/** The coastal edge's sole land tile supplies its exact outward-facing normal. */
export function getPortLayout(board: Board, port: Port, layout: BoardLayout): PortLayout {
    const edge = board.edges[port.edgeId];
    const [a, b] = edge.vertexIds.map((id) => boardToScreen(board.vertices[id], layout));
    const tile = boardToScreen(
        board.tiles.find(({ id }) => id === edge.tileIds[0])!,
        layout,
    );
    const x = (a.x + b.x) / 2,
        y = (a.y + b.y) / 2;
    const dx = x - tile.x,
        dy = y - tile.y,
        length = Math.hypot(dx, dy);
    return {
        x: x + (dx / length) * PORT_OFFSET,
        y: y + (dy / length) * PORT_OFFSET,
        access: [a, b],
    };
}

/** Original stone trading islet. Colors and type labels are entirely runtime data. */
export function createPortMarker(
    scene: Scene,
    port: Port,
    position: PortLayout,
    ratio: TradeRatio,
    ownerColor?: number,
): GameObjects.Container {
    const root = scene.add.container(position.x, position.y);
    const docks = scene.add.graphics();
    for (const point of position.access) {
        const dx = point.x - position.x,
            dy = point.y - position.y,
            length = Math.hypot(dx, dy);
        // Stop short of the coastal intersection so a building stays unobstructed.
        const endX = (dx * Math.max(0, length - 10)) / length;
        const endY = (dy * Math.max(0, length - 10)) / length;
        docks.lineStyle(4, 0x1d3441, 0.8).lineBetween(0, 0, endX, endY);
        docks.lineStyle(2, 0xc9b38b, 0.9).lineBetween(0, 0, endX, endY);
    }
    const water = scene.add.ellipse(0, 1, 38, 38, 0x83c6c2, 0.15);
    const shadow = scene.add.ellipse(1, 3, 33, 32, 0x0d2733, 0.4);
    const stone = scene.add.graphics();
    const points = [
        [-10, -16],
        [8, -16],
        [15, -9],
        [16, 7],
        [9, 16],
        [-9, 15],
        [-16, 7],
        [-15, -8],
    ];
    stone
        .fillStyle(0xc4ac7d)
        .lineStyle(1.2, 0x293d43)
        .beginPath()
        .moveTo(...(points[0] as [number, number]));
    for (const [x, y] of points.slice(1)) stone.lineTo(x, y);
    stone.closePath().fillPath().strokePath();
    stone.lineStyle(1.3, 0xffe5ac).lineBetween(-10, -15, 8, -15).lineBetween(-14, -8, -15, 6);
    stone
        .fillStyle(0x182e3d)
        .lineStyle(ownerColor === undefined ? 1 : 2, ownerColor ?? 0x8f784e)
        .fillRoundedRect(-12, -13, 24, 27, 4)
        .strokeRoundedRect(-12, -13, 24, 27, 4);
    root.add([water, shadow, docks, stone]);
    if (port.resource !== null && scene.textures.exists('art-resources')) {
        const icon = scene.add.image(0, -6, 'art-resources', port.resource);
        icon.setScale(14 / Math.max(icon.width, icon.height));
        root.add(icon);
    } else {
        // Two broad exchange arrows, avoiding a font-dependent pictogram.
        const arrows = scene.add.graphics().lineStyle(1.5, 0xf0d392);
        arrows.lineBetween(-7, -9, 7, -9).lineBetween(7, -9, 3, -12).lineBetween(7, -9, 3, -6);
        arrows.lineBetween(7, -3, -7, -3).lineBetween(-7, -3, -3, -6).lineBetween(-7, -3, -3, 0);
        root.add(arrows);
    }
    root.add(
        scene.add
            .text(0, 7, `${ratio.toLocaleString('fa-IR')}:۱`, {
                fontFamily: UI_FONT_FAMILY,
                fontSize: '10px',
                color: '#fff0cc',
                rtl: false,
            })
            .setOrigin(0.5),
    );
    return root;
}
