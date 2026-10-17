import ts from 'typescript';
import { readFile, writeFile } from 'node:fs/promises';

// Transpile renderer-independent plans for an inspectable SVG without starting Phaser or a browser.
const modules = new Map();
async function artModule(url) {
    if (modules.has(url.href)) return modules.get(url.href);
    let source = ts.transpileModule(await readFile(url, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    for (const [, path] of source.matchAll(/from ['"]([^'"]+)['"]/g)) {
        const dependency = await artModule(new URL(`${path}.ts`, url));
        source = source
            .replaceAll(`'${path}'`, `'${dependency}'`)
            .replaceAll(`"${path}"`, `"${dependency}"`);
    }
    const result = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
    modules.set(url.href, result);
    return result;
}
const load = async (name) =>
    import(await artModule(new URL(`../src/game/rendering/${name}.ts`, import.meta.url)));
const { terrainArt, TERRAIN_TYPES } = await load('terrainArt');
const { resourceArt } = await load('resourceArt');
const { harborArt } = await load('harborArt');
const { NUMBER_TOKEN_ART } = await load('boardEmblems');
const samples = [];
for (let row = 0; row < 6; row++)
    for (let v = 0; v < 4; v++) {
        samples.push({
            x: 70 + v * 135,
            y: 84 + row * 118,
            scale: 51,
            marks: terrainArt(TERRAIN_TYPES[row], v),
        });
        if (TERRAIN_TYPES[row] !== 'desert')
            samples.push({
                x: 70 + v * 135,
                y: 84 + row * 118 + 51 * 0.48,
                scale: 14.3,
                marks: NUMBER_TOKEN_ART,
            });
    }
['wood', 'brick', 'wheat', 'wool', 'stone'].forEach((r, i) => {
    samples.push({ x: 60 + i * 105, y: 810, scale: 42, marks: resourceArt(r) });
    samples.push({ x: 60 + i * 105, y: 888, scale: 14, marks: resourceArt(r) });
});
[undefined, 0x438bff, 0xff526e].forEach((c, i) => {
    samples.push({ x: 650, y: 120 + i * 100, scale: 32, marks: harborArt(c) });
    samples.push({
        x: 650,
        y: 108 + i * 100,
        scale: 16,
        marks: resourceArt(['wood', 'wheat', 'stone'][i]),
    });
});
const n = (v) => Number(v.toFixed(4));
const color = (c) => `#${c.toString(16).padStart(6, '0')}`;
function svgMark(m) {
    const style = `fill="${m.kind === 'line' ? 'none' : color(m.color)}" opacity="${m.alpha ?? 1}"`;
    if (m.kind === 'ellipse')
        return `<ellipse cx="${n(m.x)}" cy="${n(m.y)}" rx="${n(m.width / 2)}" ry="${n(m.height / 2)}" ${style}/>`;
    return `<${m.kind === 'line' ? 'polyline' : 'polygon'} points="${m.points.map((p) => p.map(n).join(',')).join(' ')}" ${style}${m.kind === 'line' ? ` stroke="${color(m.color)}" stroke-width="${m.width}"` : ''}/>`;
}
const tokenLabels = Array.from({ length: 20 }, (_, i) => {
    const v = i % 4,
        row = Math.floor(i / 4);
    return `<text x="${70 + v * 135}" y="${84 + row * 118 + 51 * 0.48}" text-anchor="middle" dominant-baseline="central" font-family="Vazirmatn, sans-serif" font-size="15.4" fill="${v === 2 ? '#a33d2e' : '#332a22'}">${['۵', '۹', '۶', '۱۰'][v]}</text>`;
}).join('');
const rateLabels = Array.from(
    { length: 3 },
    (_, i) =>
        `<text x="650" y="${136 + i * 100}" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="18" fill="#fff0cc">۲:۱</text>`,
).join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="940" viewBox="0 0 720 940"><rect width="720" height="940" fill="#203b40"/><g font-family="sans-serif" fill="#efdfba" font-size="12"><text x="20" y="22">Sunmark · landscape variations / material emblems</text><text x="20" y="750">Resource studies · enlarged and 28px</text><text x="598" y="52">Quay studies</text></g>${samples.map((s) => `<g transform="translate(${s.x} ${s.y}) scale(${s.scale})">${s.marks.map(svgMark).join('\n')}</g>`).join('\n')}${tokenLabels}${rateLabels}</svg>`;
await writeFile(new URL('../docs/design/board-art-study.svg', import.meta.url), svg);
if (process.argv.includes('--plans'))
    await writeFile('/tmp/sunmark-art-study.json', JSON.stringify(samples));
