interface TextRun {
    value: string;
    rect: DOMRect;
}

/** Font bounds match the browser line box instead of Phaser's Latin-only test string. */
export class SemanticTextMetrics {
    private context = document.createElement('canvas').getContext('2d')!;
    private cache = new Map<string, { ascent: number; descent: number; fontSize: number }>();

    get(style: CSSStyleDeclaration): { ascent: number; descent: number; fontSize: number } {
        const font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        const previous = this.cache.get(font);
        if (previous) return previous;
        this.context.font = font;
        const measured = this.context.measureText('آبادی ایران ۰۱۲۳۴۵۶۷۸۹');
        const size = parseFloat(style.fontSize);
        const ascent =
            measured.fontBoundingBoxAscent ||
            Math.max(measured.actualBoundingBoxAscent, size * 0.8);
        const descent =
            measured.fontBoundingBoxDescent ||
            Math.max(measured.actualBoundingBoxDescent, size * 0.2);
        const metrics = { ascent, descent, fontSize: ascent + descent };
        this.cache.set(font, metrics);
        return metrics;
    }
}

/** Browser line measurements preserve contextual Persian shaping and bidi text. */
export function measureTextRuns(node: Node): TextRun[] {
    const value = node.textContent ?? '';
    const range = document.createRange();
    const runs: Array<{ start: number; end: number; rect: DOMRect }> = [];
    for (const match of value.matchAll(/\S+/gu)) {
        const start = match.index;
        const end = start + match[0].length;
        range.setStart(node, start);
        range.setEnd(node, end);
        const rect = range.getBoundingClientRect();
        if (!rect.width || !rect.height) continue;
        const previous = runs[runs.length - 1];
        if (previous && Math.abs(previous.rect.top - rect.top) < 2) {
            previous.end = end;
            const left = Math.min(previous.rect.left, rect.left),
                top = Math.min(previous.rect.top, rect.top);
            previous.rect = new DOMRect(
                left,
                top,
                Math.max(previous.rect.right, rect.right) - left,
                Math.max(previous.rect.bottom, rect.bottom) - top,
            );
        } else runs.push({ start, end, rect });
    }
    return runs.map((run) => ({
        value: value.slice(run.start, run.end).replace(/\s+/gu, ' '),
        rect: run.rect,
    }));
}
