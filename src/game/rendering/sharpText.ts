import type { Scene, Types } from 'phaser';
import { textDensity } from './display';

type SharpTextStyle = Pick<
    Types.GameObjects.Text.TextStyle,
    'fontFamily' | 'color' | 'rtl' | 'stroke' | 'strokeThickness' | 'metrics' | 'padding'
> & { fontSize: number };

/**
 * Phaser 4.0.0's RTL path mixes backing width with scaled context coordinates
 * when Text.resolution > 1. Rasterize a larger font at resolution 1 instead,
 * then inverse-scale the object so its layout still uses CSS pixels.
 */
export function rasterTextStyle(
    style: SharpTextStyle,
    density: number,
): Types.GameObjects.Text.TextStyle {
    const metrics = style.metrics;
    return {
        ...style,
        fontSize: style.fontSize * density,
        strokeThickness: (style.strokeThickness ?? 0) * density,
        resolution: 1,
        metrics: metrics && {
            ascent: metrics.ascent * density,
            descent: metrics.descent * density,
            fontSize: metrics.fontSize * density,
        },
        padding: Object.fromEntries(
            Object.entries(style.padding ?? {}).map(([key, value]) => [key, value * density]),
        ),
    };
}

export function createSharpText(
    scene: Scene,
    x: number,
    y: number,
    value: string,
    style: SharpTextStyle,
    density = textDensity(scene),
) {
    return scene.add.text(x, y, value, rasterTextStyle(style, density)).setScale(1 / density);
}
