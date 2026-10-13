export const GAME_WIDTH = 390;
export const GAME_HEIGHT = 844;

export interface BoardLayout {
    centerX: number;
    centerY: number;
    hexRadius: number;
}

// Port centers sit 20px offshore; their 19px water halo stays inside this margin.
export const BOARD_OCEAN_MARGIN = 40;

/** Fit the radius-two island (5√3 × 8 radii) without cropping or camera zoom. */
export function fitBoard(width: number, height: number): BoardLayout {
    const landWidth = Math.max(0, width - BOARD_OCEAN_MARGIN * 2);
    const landHeight = Math.max(0, height - BOARD_OCEAN_MARGIN * 2);
    return {
        centerX: width / 2,
        centerY: height / 2,
        hexRadius: Math.max(1, Math.min(landWidth / (5 * Math.sqrt(3)), landHeight / 8)),
    };
}

export function boardToScreen(
    point: { x: number; y: number },
    layout: BoardLayout,
): { x: number; y: number } {
    return {
        x: layout.centerX + point.x * layout.hexRadius,
        y: layout.centerY + point.y * layout.hexRadius,
    };
}

/** Fixed board projection, in client pixels, for cross-layer resource flights. */
export function boardToClient(
    point: { x: number; y: number },
    layout: BoardLayout,
    viewport: { width: number; height: number },
    bounds: { left: number; top: number; width: number; height: number },
): { x: number; y: number } | null {
    if (viewport.width <= 0 || viewport.height <= 0 || bounds.width <= 0 || bounds.height <= 0)
        return null;
    const { x, y } = boardToScreen(point, layout);
    if (x < 0 || y < 0 || x > viewport.width || y > viewport.height) return null;
    return {
        x: bounds.left + (x * bounds.width) / viewport.width,
        y: bounds.top + (y * bounds.height) / viewport.height,
    };
}

/** Inverse projection for a board camera inset inside the full-screen UI canvas. */
export function clientToBoard(
    point: { x: number; y: number },
    viewport: { width: number; height: number },
    bounds: { left: number; top: number; width: number; height: number },
): { x: number; y: number } {
    return {
        x: ((point.x - bounds.left) * viewport.width) / bounds.width,
        y: ((point.y - bounds.top) * viewport.height) / bounds.height,
    };
}
