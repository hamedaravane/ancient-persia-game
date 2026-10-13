/** Presentation-only wave field in CSS pixels, independent of match randomness. */
export const OCEAN_WAVES = [
    { direction: [0.88, 0.47], wavelength: 148, amplitude: 0.35, speed: 0.03, phase: 0.3 },
    { direction: [-0.48, 0.88], wavelength: 82, amplitude: 0.18, speed: -0.04, phase: 2.1 },
    { direction: [0.96, 0.28], wavelength: 32, amplitude: 0.13, speed: 0.09, phase: 1.7 },
    { direction: [0.82, -0.57], wavelength: 21, amplitude: 0.09, speed: 0.11, phase: 0.4 },
    { direction: [0.3, 0.954], wavelength: 16, amplitude: 0.065, speed: 0.13, phase: 4.2 },
    { direction: [-0.6, 0.8], wavelength: 12, amplitude: 0.045, speed: -0.08, phase: 2.8 },
    { direction: [0.98, 0.2], wavelength: 43, amplitude: 0.09, speed: 0.06, phase: 5.4 },
] as const;

// Every temporal frequency is a multiple of 0.01; wrapping is visually seamless.
export const OCEAN_LOOP_SECONDS = Math.PI * 200;
export const OCEAN_FRAME_MS = 1000 / 30;
export const OCEAN_TEXTURE_LIMIT = { width: 320, height: 640 } as const;

export function advanceOceanTime(seconds: number, deltaMs: number, moving: boolean): number {
    if (!moving || !Number.isFinite(deltaMs) || deltaMs <= 0) return seconds;
    return (seconds + Math.min(deltaMs, 50) / 1000) % OCEAN_LOOP_SECONDS;
}

export function oceanTextureSize(width: number, height: number): { width: number; height: number } {
    const scale = Math.min(
        1,
        OCEAN_TEXTURE_LIMIT.width / width,
        OCEAN_TEXTURE_LIMIT.height / height,
    );
    return {
        width: Math.max(1, Math.round(width * scale)),
        height: Math.max(1, Math.round(height * scale)),
    };
}

/** Analytical surface height/normal; also used to shape the Canvas ripple fallback. */
export function sampleOceanWaves(
    x: number,
    y: number,
    seconds: number,
): { height: number; dx: number; dy: number } {
    let height = 0,
        dx = 0,
        dy = 0;
    for (const wave of OCEAN_WAVES) {
        const length = Math.hypot(...wave.direction);
        const ux = wave.direction[0] / length,
            uy = wave.direction[1] / length;
        const across = -uy * x + ux * y;
        const k = (2 * Math.PI) / wave.wavelength;
        const bend = across * 0.019 + wave.phase * 2;
        const packet = across * 0.041 + wave.phase + seconds * 0.02;
        const phase =
            k * (ux * x + uy * y) + 0.55 * Math.sin(bend) - seconds * wave.speed + wave.phase;
        const envelope = 0.66 + 0.34 * Math.sin(packet);
        const crossSlope = 0.55 * 0.019 * Math.cos(bend);
        const envelopeSlope = 0.34 * 0.041 * Math.cos(packet);
        const along = wave.amplitude * envelope * Math.cos(phase);
        const transverse = wave.amplitude * Math.sin(phase) * envelopeSlope;
        height += wave.amplitude * envelope * Math.sin(phase);
        dx += along * (k * ux - crossSlope * uy) - transverse * uy;
        dy += along * (k * uy + crossSlope * ux) + transverse * ux;
    }
    return { height, dx, dy };
}

/** Stable value noise for the low-resolution Canvas depth field, not animated grain. */
export function oceanNoise(x: number, y: number): number {
    const hash = (ix: number, iy: number) => {
        let value = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ 0x5f3759df;
        value = Math.imul(value ^ (value >>> 13), 1274126177);
        return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
    };
    const ix = Math.floor(x),
        iy = Math.floor(y);
    const fx = x - ix,
        fy = y - iy;
    const sx = fx * fx * (3 - 2 * fx),
        sy = fy * fy * (3 - 2 * fy);
    const top = hash(ix, iy) * (1 - sx) + hash(ix + 1, iy) * sx;
    const bottom = hash(ix, iy + 1) * (1 - sx) + hash(ix + 1, iy + 1) * sx;
    return top * (1 - sy) + bottom * sy;
}
