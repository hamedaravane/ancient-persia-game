export interface UiFontMetrics {
    ascent: number;
    descent: number;
}

/** Position the canvas baseline at the browser run baseline, independently of padding. */
export function textRunPosition(
    rect: { left: number; right: number; top: number; height: number },
    width: number,
    metrics: UiFontMetrics,
    padding: { left?: number; right?: number; top?: number },
    origin: { x: number; y: number },
    rtl: boolean,
): { x: number; y: number } {
    const fontHeight = metrics.ascent + metrics.descent;
    const baseline = rect.top + (rect.height * metrics.ascent) / fontHeight;
    return {
        x:
            (rtl ? rect.right - width + (padding.right ?? 0) : rect.left - (padding.left ?? 0)) -
            origin.x,
        y: baseline - Math.round(metrics.ascent) - (padding.top ?? 0) - origin.y,
    };
}

/** Ellipsis replaces hidden overflow while preserving logical Persian reading order. */
export function fitText(value: string, width: number, measure: (text: string) => number): string {
    if (measure(value) <= width) return value;
    if (width < measure('…')) return '';
    const characters = Array.from(value);
    let low = 0,
        high = characters.length;
    while (low < high) {
        const middle = Math.ceil((low + high) / 2);
        if (measure(`${characters.slice(0, middle).join('').trimEnd()}…`) <= width) low = middle;
        else high = middle - 1;
    }
    return `${characters.slice(0, low).join('').trimEnd()}…`;
}
