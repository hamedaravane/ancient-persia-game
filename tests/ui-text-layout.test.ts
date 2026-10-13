import { expect, test } from 'vitest';
import { fitText, textRunPosition } from '../src/game/ui/textGeometry';

test.each([true, false])(
    'canvas labels share the browser baseline and reading edge (RTL %s)',
    (rtl) => {
        const rect = { left: 100, right: 180, top: 50, height: 24 };
        const metrics = { ascent: 18, descent: 6 };
        const padding = { left: 2, right: 3, top: 4 };
        const origin = { x: 10, y: 20 };
        const width = 85;
        const position = textRunPosition(rect, width, metrics, padding, origin, rtl);
        const paintedBaseline = position.y + padding.top + metrics.ascent + origin.y;
        expect(paintedBaseline).toBe(rect.top + metrics.ascent);
        if (rtl) expect(position.x + width - padding.right + origin.x).toBe(rect.right);
        else expect(position.x + padding.left + origin.x).toBe(rect.left);
    },
);

test('different inline font sizes align their own baselines without centering padded textures', () => {
    const origin = { x: 0, y: 0 };
    const large = textRunPosition(
        { left: 10, right: 60, top: 20, height: 24 },
        50,
        { ascent: 18, descent: 6 },
        { top: 3 },
        origin,
        true,
    );
    const small = textRunPosition(
        { left: 60, right: 90, top: 26, height: 16 },
        30,
        { ascent: 12, descent: 4 },
        { top: 7 },
        origin,
        true,
    );
    expect(large.y + 3 + 18).toBe(small.y + 7 + 12);
});

test('font-height rounding and extra DOM leading preserve the measured baseline', () => {
    const metrics = { ascent: 14.6, descent: 5.4 };
    const position = textRunPosition(
        { left: 0, right: 60, top: 10, height: 24 },
        60,
        metrics,
        { top: 3 },
        { x: 0, y: 0 },
        true,
    );
    expect(position.y + 3 + Math.round(metrics.ascent)).toBeCloseTo(10 + (24 * 14.6) / 20);
});

test('long Persian labels ellipsize in logical order instead of painting clipped fragments', () => {
    const label = 'بازیکن شماره چهار';
    const measure = (value: string) => Array.from(value).length * 6;
    const result = fitText(label, 54, measure);
    expect(measure(result)).toBeLessThanOrEqual(54);
    expect(result.endsWith('…')).toBe(true);
    expect(label.startsWith(result.slice(0, -1))).toBe(true);
    expect(fitText(label, 200, measure)).toBe(label);
    expect(fitText(label, 0, measure)).toBe('');
});
