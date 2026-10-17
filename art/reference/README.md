# Preserved art references

`pieces/settlement.png`, `pieces/city.png`, and `pieces/road.png` are the project's original, unmodified bitmap illustrations. They previously lived at `public/assets/pieces/<kind>/<kind>.png` but were not loaded by the gameplay scene.

The board now uses original orthographic Phaser Graphics pieces in `src/game/rendering/pieces.ts`. The references are retained here, outside the runtime asset tree, so Vite no longer ships unused paintings. Their oblique perspective, intricate compound silhouettes, and baked magenta ownership areas do not suit the new small, fully recolorable board components. Do not trace these files or use them as runtime textures for the three pieces.

See `docs/PIECE_RENDERING.md` for the renderer API and visual demo.

## Ocean background

`backgrounds/ocean-surface.png` is the original unmodified 853 × 1844 RGB ocean supplied by the user, formerly `public/assets/backgrounds/game.png`. It is 2,027,549 bytes, with SHA-256 `0a14aca6723a66186216c8adce8b1e07ff3e02b7eb8a1cb45b168d16c038e8cb`.

The user requested a lighter code-driven ocean with calm animated waves. `src/game/rendering/ProceduralOcean.ts` now supplies the match sea without an ocean image request. The painting is retained here so its pixels remain available as project work while Vite no longer copies it into deployment output. No re-encoding or repainting was performed. See [GAME_BACKGROUND_PLAN.md](../../docs/GAME_BACKGROUND_PLAN.md).


## Anahita character masters

`characters/anahita/{calm,explaining,joyful,playful,warning,worried}.png` are the complete supplied, unmodified RGBA portraits. Calm and playful are 1086 × 1448; the others are 1024 × 1536. They previously lived in `public/assets/characters/anahita/`.

They are preserved here because shipping six large source PNGs cost 12,199,151 bytes. The game now loads quality-95 transparent WebP exports from `public/assets/characters/anahita/`. The exports retain the full figure at its original resolution; alpha is exact, and RGB compression is high quality and lossy. The complete figure supports the user's request to show more of Anahita's legs above the dialogue panel.

Regenerate with `npm run assets:anahita`; verify with `npm run assets:anahita:check` (Python 3 and Pillow >= 10.2 with WebP support). Source file hashes were checked before and after moving; no source pixels or bytes were rewritten. See [ASSET_GUIDE.md](../../docs/ASSET_GUIDE.md).

| Master | SHA-256 |
| --- | --- |
| calm.png | `e8e1e8eac8fc8b48c2bd887da3f8b36f4b011484fde32cfd578233a993f85b94` |
| explaining.png | `d8bf95e6d65c2229e2c464f861f8376b7d58442bc2876073a768c3426aff92bc` |
| joyful.png | `5c2ce3a460b73b670386b8f34d81fee5b0bd0b5ae5d6a0385b2313d0efdf32e5` |
| playful.png | `fdb641b4ad471c3f7f0fb3b4abc8bb09931eb6fa69f3fa7f6b409c46551d7a72` |
| warning.png | `5eb2e3896e8c84bdc544bac5bcc86e76215b9001f72722b2f001af251e7fc4a2` |
| worried.png | `e5fba3bb9800ba2939ce545e1d04c4436e2d648f4b63aa853f60fae2ebd71c91` |


## Runtime image masters

The remaining 18 PNG images formerly under `public/assets/` are now preserved byte-for-byte at the corresponding paths here: `backgrounds/main-menu.png`, `board/terrains/*.png`, `board/tokens/number.png`, `dice/{dice,faces}.png`, `effects/{dust,glint,spark}.png`, `pieces/robber/robber.png`, `resources/resources.png`, and the `ui/` illustration/emblem/ornament sheets.

The issue addressed is the large PNG download/deployment footprint. The game now ships full-resolution WebP derivatives with unchanged alpha, dimensions, and atlas coordinates. The 24-image conversion, including Anahita, is recorded with original checksums/crops in `scripts/image-exports.json`: 16 active `assets` and eight retired `references`. That manifest is the authoritative checksum inventory. Existing ocean and procedural-piece references stay unchanged and are not runtime exports.

Run `npm run assets:optimize` to regenerate, or `npm run assets:check` to verify without writing. Python 3 and Pillow >= 10.2 with WebP support are needed only for these maintenance commands. See [ASSET_GUIDE.md](../../docs/ASSET_GUIDE.md) for adaptive quality settings and packaging checks.

## Procedural terrain, Ahriman and trade scales

The six terrain PNGs under `board/terrains/`, the traveler at `pieces/robber/robber.png`, and the trade scale at `ui/illustrations/bank.png` remain unchanged. Their 4,573,352 bytes of WebP derivatives were retired from `public/assets/` after the user identified cluttered board composition and requested a consistent procedural style. `scripts/image-exports.json` retains their original checksums/dimensions/crops in `references`; full asset checks verify them, but exports never regenerate retired files into runtime packaging. No source artwork was deleted or repainted. See [PROCEDURAL_BOARD_ART.md](../../docs/PROCEDURAL_BOARD_ART.md).
