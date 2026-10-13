import { OCEAN_WAVES } from './oceanModel';

const glsl = (value: number): string => value.toFixed(6);
const waves = OCEAN_WAVES.map((wave) => {
    const length = Math.hypot(...wave.direction);
    return `addWave(wavePoint, vec2(${glsl(wave.direction[0] / length)}, ${glsl(wave.direction[1] / length)}), ${glsl(wave.wavelength)}, ${glsl(wave.amplitude)}, ${glsl(wave.speed)}, ${glsl(wave.phase)}, slope);`;
}).join('\n');

/** One texture-free material pass: seven curved wave packets and soft normal lighting. */
export const OCEAN_FRAGMENT = `
#pragma phaserTemplate(shaderName)
#pragma phaserTemplate(extensions)
#pragma phaserTemplate(features)
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
#pragma phaserTemplate(fragmentDefine)
varying vec2 outTexCoord;
uniform vec2 uViewSize;
uniform float uOceanTime;
#pragma phaserTemplate(outVariables)
#pragma phaserTemplate(fragmentHeader)

float hash(vec2 p) {
    vec3 q = fract(vec3(p.xyx) * 0.1031);
    q += dot(q, q.yzx + 19.19);
    return fract((q.x + q.y) * q.z);
}

float noise(vec2 p) {
    vec2 cell = floor(p), f = fract(p);
    vec2 s = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(cell), hash(cell + vec2(1.0, 0.0)), s.x),
               mix(hash(cell + vec2(0.0, 1.0)), hash(cell + vec2(1.0)), s.x), s.y);
}

void addWave(vec2 p, vec2 direction, float wavelength, float amplitude, float speed,
             float phaseOffset, inout vec2 slope) {
    vec2 crossDirection = vec2(-direction.y, direction.x);
    float across = dot(p, crossDirection);
    float k = 6.28318530718 / wavelength;
    float bend = across * 0.019 + phaseOffset * 2.0;
    float packet = across * 0.041 + phaseOffset + uOceanTime * 0.02;
    float phase = k * dot(p, direction) + 0.55 * sin(bend) - uOceanTime * speed + phaseOffset;
    float envelope = 0.66 + 0.34 * sin(packet);
    vec2 phaseGradient = k * direction + crossDirection * (0.55 * 0.019 * cos(bend));
    vec2 envelopeGradient = crossDirection * (0.34 * 0.041 * cos(packet));
    slope += amplitude * (envelope * cos(phase) * phaseGradient + sin(phase) * envelopeGradient);
}

void main() {
    // Phaser's quad UV is bottom-up; material coordinates are top-down CSS pixels.
    vec2 uv = vec2(outTexCoord.x, 1.0 - outTexCoord.y);
    vec2 p = uv * uViewSize;
    float depth = 0.24 + 0.48 * noise(p / 190.0 + vec2(2.3, 5.7))
                      + 0.18 * noise(p / 73.0 + vec2(8.1, 1.4));
    float glow = exp(-dot((uv - vec2(0.34, 0.34)) * vec2(1.4, 1.0),
                         (uv - vec2(0.34, 0.34)) * vec2(1.4, 1.0)) * 2.4);
    vec3 water = mix(vec3(0.035, 0.205, 0.315), vec3(0.085, 0.405, 0.515), depth);
    water = mix(water, vec3(0.12, 0.475, 0.525), glow * 0.26);

    vec2 slope = vec2(0.0);
    // Static domain warping breaks straight repeated bands into organic little ripples.
    vec2 wavePoint = p + 5.0 * vec2(noise(p / 57.0 + vec2(2.7, 8.3)),
                                   noise(p / 63.0 + vec2(9.1, 3.5))) - 2.5;
    ${waves}
    vec3 normal = normalize(vec3(-slope * 1.25, 1.0));
    // Broad, tinted reflection lobes: no bright white foam or flickering sparkles.
    vec3 halfLight = normalize(vec3(-0.03, -0.07, 1.0));
    float reflection = pow(max(dot(normal, halfLight), 0.0), 220.0);
    reflection *= 0.42 + 0.58 * noise(p / 39.0 + vec2(3.1, 4.9));
    float relief = dot(slope, vec2(-0.6, -0.8));
    water *= 1.0 + relief * 1.4;
    water += vec3(0.43, 0.67, 0.68) * reflection * 0.18;
    water *= 1.0 - 0.16 * smoothstep(0.57, 1.0, uv.y);
    // Static sub-byte dithering prevents gradient bands without moving pixel noise.
    water += (hash(floor(p)) - 0.5) / 255.0;
    vec4 fragColor = vec4(water, 1.0);
    #pragma phaserTemplate(fragmentProcess)
    gl_FragColor = fragColor;
}
`;
