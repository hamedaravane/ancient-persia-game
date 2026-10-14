import type { Scene } from 'phaser';
import { cameraProjection, type DisplayMetrics } from './displayGeometry';

export function canvasDisplay(scene: Scene): DisplayMetrics {
    const canvas = scene.game.canvas;
    const rect = canvas.getBoundingClientRect();
    return {
        width: Math.max(1, rect.width),
        height: Math.max(1, rect.height),
        pixelWidth: canvas.width,
        pixelHeight: canvas.height,
    };
}

export function textDensity(scene: Scene): number {
    const display = canvasDisplay(scene);
    return Math.max(display.pixelWidth / display.width, display.pixelHeight / display.height);
}

export function configureDisplayCamera(
    scene: Scene,
    viewport?: { x: number; y: number; width: number; height: number },
): DisplayMetrics {
    const display = canvasDisplay(scene);
    const projection = cameraProjection(display, viewport);
    scene.cameras.main
        .setViewport(projection.x, projection.y, projection.width, projection.height)
        .setOrigin(0.5)
        .setZoom(projection.zoomX, projection.zoomY)
        .setScroll(projection.scrollX, projection.scrollY);
    return display;
}

export function logicalCameraSize(scene: Scene): { width: number; height: number } {
    const camera = scene.cameras.main;
    return { width: camera.displayWidth, height: camera.displayHeight };
}
