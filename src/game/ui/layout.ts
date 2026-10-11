export const GAME_WIDTH = 390;
export const GAME_HEIGHT = 844;

export const BOARD_LAYOUT = {
    centerX: GAME_WIDTH / 2,
    centerY: 312,
    hexRadius: 38,
} as const;

export function boardToScreen(point: { x: number; y: number }): { x: number; y: number } {
    return {
        x: BOARD_LAYOUT.centerX + point.x * BOARD_LAYOUT.hexRadius,
        y: BOARD_LAYOUT.centerY + point.y * BOARD_LAYOUT.hexRadius,
    };
}
