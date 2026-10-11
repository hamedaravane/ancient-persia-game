export const GAME_WIDTH = 390;
export const GAME_HEIGHT = 844;

export interface BoardLayout { centerX: number; centerY: number; hexRadius: number }

/** Coast clearance is in CSS pixels; only the board scales on small displays. */
export function fitBoard(width: number, height: number): BoardLayout {
    return { centerX: width / 2, centerY: height / 2, hexRadius: Math.max(1, Math.min(38, (width - 40) / (5 * Math.sqrt(3)), (height - 40) / 8)) };
}

export function boardToScreen(point: { x: number; y: number }, layout: BoardLayout): { x: number; y: number } {
    return {
        x: layout.centerX + point.x * layout.hexRadius,
        y: layout.centerY + point.y * layout.hexRadius,
    };
}

/** Default centered camera projection, in client pixels, for cross-layer resource flights. */
export function boardToClient(point: { x: number; y: number }, layout: BoardLayout,
    camera: { width: number; height: number; zoom: number; scrollX: number; scrollY: number },
    bounds: { left: number; top: number; width: number; height: number }): { x: number; y: number } | null {
    if (camera.width <= 0 || camera.height <= 0 || bounds.width <= 0 || bounds.height <= 0) return null;
    const position = boardToScreen(point, layout);
    const x = (position.x - camera.scrollX - camera.width / 2) * camera.zoom + camera.width / 2;
    const y = (position.y - camera.scrollY - camera.height / 2) * camera.zoom + camera.height / 2;
    if (x < 0 || y < 0 || x > camera.width || y > camera.height) return null;
    return { x: bounds.left + x * bounds.width / camera.width, y: bounds.top + y * bounds.height / camera.height };
}
