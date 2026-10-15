# Asset guide

## Runtime organization

Put files loaded by the browser under `public/assets/`. Keep the directory tree shallow and group files by their role:

```text
public/assets/
  backgrounds/
  characters/anahita/
  board/terrains/
  board/tokens/
  dice/
  effects/
  fonts/
  pieces/
    robber/
  resources/
  ui/emblems/
  ui/illustrations/
  ui/ornaments/
```

Use lowercase kebab-case names with the extension matching the file format. Keep filenames concise, descriptive, and stable. Include the asset's role in the filename when that helps distinguish its use. Example: `backgrounds/main-menu.webp`.

See [ASSET_PRODUCTION_BRIEF.md](ASSET_PRODUCTION_BRIEF.md) for the proposed next art batches, the inspected existing-art inventory, mobile display sizes, ownership layers, component states, and designer handoff requirements. Its future filenames and export sizes are proposals; the current runtime files and loading conventions remain documented below.

## Loading

Vite copies `public/` files unchanged to the build output. Load them from their public URL in Phaser, for example:

```ts
this.load.image('forest', `${import.meta.env.BASE_URL}assets/board/terrains/forest.webp`);
```

Full-image paths live in `TEXTURE_FILES` and cropped illustrations in `ART` within `src/game/assets.ts`. Use a stable asset key in code and build the URL from `import.meta.env.BASE_URL` so deployments under a path prefix keep working. Keep the source path in the relevant scene or an asset registry. If the project later moves assets into imported modules or an atlas pipeline, update this guide and all paths together.

## Asset requirements

- Preserve transparency for cutout sprites and check alpha edges against both light and dark backgrounds.
- Confirm image dimensions, padding, and intended crop before defining frames for a sprite sheet.
- Do not infer atlas frame boundaries from filenames; document frame coordinates or add machine-readable atlas metadata.
- Keep Persian labels as runtime text rather than rasterized text.
- Keep player ownership tint as runtime data; do not create one copy per player color.
- Prefer optimized web-ready images. Preserve source masters outside the runtime tree when they are needed for future editing.
- Do not remove or replace existing project assets without a documented reason.

## Image export workflow

All 24 runtime bitmap images now use WebP: terrain paintings, palace, number token, resource and ornament sheets, dice artwork, robber, effects, victory/bank illustrations, and Anahita. Complete original PNGs live at matching paths under `art/reference/`, outside the runtime tree. This addresses download and deployment size while keeping the original artwork available for editing. No image is resized, repainted, trimmed, or recolored; decoded texture dimensions and atlas coordinates stay unchanged.

The complete PNG masters total 45,997,087 bytes; the 24 exports total 14,200,904 bytes (69.1% smaller). At the start of this full-library pass, Anahita was already optimized and the runtime tree was 35,992,806 bytes; this pass reduces that current image footprint by 60.5%. These are image-file totals, not the JavaScript bundle or a claim that every image loads on each screen.

| Group       | Images | PNG masters (bytes) | WebP exports (bytes) |
| ----------- | -----: | ------------------: | -------------------: |
| anahita     |      6 |          12,199,151 |            2,194,870 |
| backgrounds |      1 |           2,395,981 |            1,846,836 |
| dice        |      2 |           5,246,212 |            2,638,326 |
| effects     |      3 |           3,195,450 |              974,064 |
| pieces      |      1 |             850,812 |              184,080 |
| resources   |      1 |           1,717,364 |            1,155,350 |
| terrains    |      6 |          14,798,466 |            3,975,828 |
| tokens      |      1 |           1,656,043 |              270,334 |
| ui          |      3 |           3,937,608 |              961,216 |

The palace background, legacy dice sheet, and resource atlas use lossless WebP to satisfy the quality checks; pasture uses quality 100, and the other images use quality 95. Lossless mode is distinguished from the quality-100 lossy profile.

`scripts/image-exports.json` records every runtime image, original dimensions, source SHA-256, and the documented atlas/illustration crops. `scripts/optimize-images.py` regenerates exports from those masters using the local WebP encoder through Pillow. It requires Python 3 and Pillow >= 10.2 with WebP support; normal game development, builds, and deployment use the checked-in exports and do not need Python.

```sh
npm run assets:optimize
npm run assets:check
npm run assets:optimize -- --group terrains
npm run assets:anahita
npm run assets:anahita:check
```

Exporting replaces each destination atomically after verification. `assets:check` is read-only and verifies every export plus the runtime image inventory. The Anahita commands remain compatible aliases for that group. New assets must be registered in the manifest; intentionally updated source art requires updating its reviewed checksum and geometry there.

The quality profile starts at WebP quality 95, method 6, and tries 98, 100, then lossless if needed. Every candidate must retain exact alpha, image dimensions, and color-profile metadata. Visible RGB PSNR must reach 38 dB over both dark and light stone backgrounds for the complete image **and each registered crop**, so transparent atlas padding cannot hide a poor resource/ornament frame. Every output must be smaller than its PNG master. Color compression is high-quality lossy unless the asset requires lossless encoding; quality 100 alone is not lossless. PSNR is a regression floor, not proof of indistinguishability.

[Google's WebP documentation](https://developers.google.com/speed/webp/docs/cwebp) describes the encoding modes; [Pillow's WebP documentation](https://pillow.readthedocs.io/en/stable/handbook/image-file-formats.html#webp) describes the local encoder options. No hosted API, key, or runtime conversion is used.

`tests/asset-exports.test.ts` checks packaging, source checksums, texture paths/dimensions, and agreement between renderer crops and the export manifest. The Python check decodes images for alpha and quality comparisons. The user retains interactive/device review; static source/export comparisons should include small icons, fine terrain detail, soft effects, and the menu background. Historical artwork outside the runtime inventory (procedural-piece and ocean references) remains unmodified PNG source art.

## Procedural interface materials

The current stone UI is drawn with Phaser Graphics, with cut corners, broad chisel facets, recessed keylines, deterministic mineral flecks/patina, and shallow border seams. These are presentation geometry, not new PNG textures. Grain stays at the perimeter so text remains legible, and its local generator never uses `Math.random()` or the core random source. No runtime/source art is replaced or duplicated for this treatment. Stone is now the sole approved interface, using the same original Image frames. Semantic icon dimensions use a shared CSS `--icon-size`, preserving the frame aspect ratio at each placement size without transform or negative-margin offsets.

## Current files

- `characters/anahita/{calm,explaining,warning,worried,joyful,playful}.webp`: six high-quality full-resolution transparent narrator exports. Calm and playful are 1086 × 1448; the other four are 1024 × 1536. The registry now uses each complete illustration, showing more of the figure and legs above the dialogue panel. The original full PNGs are preserved byte-for-byte under `art/reference/characters/anahita/`, outside the runtime tree. Exports use WebP quality 95, method 6, with pixel-identical alpha; RGB compression is lossy, not mathematically lossless. No resizing, background removal, repainting, or AI generation is applied. Visible expressions load first; after that texture is ready, the renderer prefetches only the next queued expression while the player reads. Unguided menus do not load the portrait set. Original names map as follows: `Regal Turquoise Goddess Character Sprite` → calm; `Turquoise Goddess in White Drapery` → explaining; `Regal Turquoise-Gold Warning` → warning; `Worried Mediterranean Goddess in White Robes` → worried; `Joyful Laughing Greco-Roman Muse` → joyful; `Goddess Enjoying Grapes` → playful. See [TUTORIAL_DESIGN.md](TUTORIAL_DESIGN.md).

- `backgrounds/main-menu.webp`: portrait palace background used only by the main menu.
- The former `backgrounds/game.png` (853 × 1844 RGB; 2,027,549 bytes) is now preserved unchanged as `art/reference/backgrounds/ocean-surface.png`, outside the runtime tree. Its download/upload cost and static appearance motivated replacement with `rendering/ProceduralOcean.ts`, a small procedural shader with a generated Canvas fallback. No ocean PNG is loaded or shipped. See [GAME_BACKGROUND_PLAN.md](GAME_BACKGROUND_PLAN.md). `src/game/rendering/boardCoast.ts` draws a shallow-water wash, narrow sand/stone rim, and broken surf along the actual board perimeter; no coastline is baked into this image. Board presentation measurements are shared in `src/game/ui/layout.ts`.
- `fonts/vazirmatn-regular.woff2`: unmodified Vazirmatn v33.003 Regular (400), 50,684 bytes, downloaded from the [official release](https://github.com/rastikerdar/vazirmatn/tree/v33.003/fonts/webfonts). This is the only weight currently used; no variable font, TTF, or extra weight files are shipped. Retains the upstream Persian and Latin glyph coverage.
- `fonts/vazirmatn-license.txt`: the unmodified SIL Open Font License 1.1 and copyright notice downloaded from the same [release](https://github.com/rastikerdar/vazirmatn/blob/v33.003/OFL.txt).
- `board/terrains/`: desert, forest, mesa, mountain, pasture, and wheat illustrations, loaded by `GameScene` with stable `terrain-` keys and displayed on their corresponding board hexes.
- `dice/dice.webp`: dice artwork; frame layout has not been documented.
- `dice/faces.webp`: preserved supplied six-face stone dice sheet. The match bar now draws its two confirmed dice with Phaser Graphics. Its front faces are ordered 1–3 across the top and 4–6 across the bottom. The source is **RGB with a baked checkerboard**, not transparent. The previous DOM implementation used inset silhouette clipping, trimming the painted edges and shadow. This documented art issue motivates clean procedural ivory dice in the new Graphics UI. A future transparent re-export could restore the painted version; the inspected original crops remain in the registry. The PNG source master remains unchanged under `art/reference/dice/`.
- Settlements, cities, and roads use reusable Phaser Graphics components rather than runtime images. Their original paintings are preserved under `art/reference/pieces/`, outside the runtime tree. See [PIECE_RENDERING.md](PIECE_RENDERING.md) for dimensions, material layers, visual states, API, and the `?demo=pieces` gallery.
- `pieces/robber/robber.webp`: supplied traveler miniature, replacing the board's letter marker, including translucent destination previews and the existing movement effect. The crop removes generous source padding; a runtime contact shadow separates it from terrain. It displays about 38.4 pixels high at maximum fitted board size, a 20% enlargement. The miniature, shadow, and fallback scale together; its center sits 0.45 hex radii above tile center, using the same offset during movement.
- `board/tokens/number.webp`: supplied stone medallion, used behind runtime Persian tile numbers at 28.6 pixels across with 15.4-pixel digits, both enlarged by 10%. The fallback circle is enlarged proportionally. The desert has no board label or number token; its name remains available in tile details. The illustrated frame is detailed at source size; its center is intentionally kept clear for digits.
- `ui/ornaments/ornaments.webp`: supplied corner, divider, and rosette sheet. Explicit source frames supply menu corners/crest/divider and small sheet-heading ornaments; there are no baked labels or separate player-color images.
- `ui/emblems/victory.webp`: supplied griffin/rosette medallion, shown at 112 pixels wide in the results sheet with runtime winner/score text below it.
- `ui/illustrations/bank.webp`: supplied trade scale, used as a small bank-action illustration and a 64-pixel trade-sheet illustration. Compact layouts omit the latter illustration to prioritize the exchange controls. The illustrated props do not introduce currencies or alter resource rules.
- `effects/dust.webp`: short construction puff behind the building marker within its container.
- `effects/spark.webp`: restrained road-placement sparkle over the confirmed edge.
- `effects/glint.webp`: short glint over the victory medallion in the dialog's top layer.
- `resources/resources.webp`: five transparent resource illustrations. Source frame rectangles are documented below. Phaser loads the sheet once and adds the shared `RESOURCE_FRAMES` crops from `assets.ts`. The Graphics interface hand, costs, selectors, production flights, and board ports reuse those Image frames without duplicate files. CSS sizes transparent semantic icon placeholders to the same proportions, at a maximum 32 pixels.

| Resource | Source rectangle (`x`, `y`, `width`, `height`) |
| -------- | ---------------------------------------------- |
| Wood     | `44, 164, 476, 404`                            |
| Brick    | `544, 164, 440, 404`                           |
| Wheat    | `984, 88, 428, 492`                            |
| Wool     | `244, 608, 484, 392`                           |
| Stone    | `768, 584, 496, 420`                           |

The MVP maps forest to wood, mesa to brick, wheat to wheat, pasture to wool, and mountain to stone. The six terrain masters are 1254 × 1254 RGBA PNGs with transparent backgrounds and point-up hex compositions; their runtime WebP exports keep the same dimensions and exact alpha. They load directly at their original resolution, scale proportionally to the full tile height, and remain centered on the board geometry. A geometry mask clips stray pixels outside each exact hex boundary; a colored backplate covers minor transparent edge gaps. Masks are destroyed with their tile images on each board redraw. Number text remains a runtime overlay; the desert is unlabelled on the board. Roads and player-colored buildings render above the terrain with Phaser Graphics; ownership colors remain runtime data. The supplied robber and number-token back render as cropped images.

No runtime background removal or intermediate downsampling is applied. Keep transparency and the shared hex alignment when replacing the artwork. The PNG masters remain under `art/reference/board/terrains/`; the loader uses individual WebP exports, with no terrain atlas.

The ocean and its coast are presentation only. `BackdropScene` switches between the menu Image and the match procedural ocean inside the full-shell Phaser canvas. The water caches an opaque shader pass in a capped 320 × 640 render target, updating at 30 Hz while active; stationary views reuse the cached surface. The fallback generates its small color field in code and uses Graphics wavelets. An inset board camera and full-shell interface scene share this canvas. Coast geometry is recreated when board state or viewport measurements change, and stays below the terrain. A ResizeObserver explicitly resizes the canvas with `Scale.NONE`; the island automatically fits the available width and height with a 40-pixel ocean margin for the coast and port markers. There is no interactive zoom or panning. Transparent semantic controls retain CSS-pixel touch dimensions; Graphics surfaces and runtime labels match their measured geometry.

The art is retained from the existing project. Recheck resource crop rectangles against the source atlas if that image changes. The older dice sheet remains available. The original settlement/city/road paintings are reference art under `art/reference/pieces/`; the user's chosen replacement is original procedural Graphics geometry, so bitmap ownership masks are not required.

## Supplied polish assets: frames and review

The nine supplied polish PNGs are preserved as masters under `art/reference/`. Their runtime WebP exports preserve full dimensions and all existing crops. Renderer rectangles in `src/game/assets.ts` are checked against `scripts/image-exports.json`; Phaser adds named texture frames for board and interface Images. Semantic components attach art names and proportional placeholder measurements from the same registry. Asset URLs use `import.meta.env.BASE_URL`. These are presentation frames, not animation grids or rule data.

| Art key           | Source rectangle (`x`, `y`, `width`, `height`)                  |
| ----------------- | --------------------------------------------------------------- |
| Robber            | `380, 60, 610, 1130`                                            |
| Number token      | `95, 75, 1065, 1075`                                            |
| Corner ornament   | `35, 390, 380, 400`                                             |
| Divider ornament  | `385, 575, 485, 110`                                            |
| Rosette ornament  | `930, 480, 310, 310`                                            |
| Victory emblem    | `40, 50, 1175, 1135`                                            |
| Bank illustration | `15, 80, 1225, 1095`                                            |
| Dust              | `125, 210, 1010, 850`                                           |
| Spark / glint     | Full source images, respectively `1283 × 1226` / `1278 × 1230`  |
| Dice 1 / 2 / 3    | `96, 80, 344, 346` / `590, 80, 344, 346` / `1084, 80, 344, 346` |
| Dice 4 / 5 / 6    | Same x coordinates, with `y = 542`                              |

The new illustrations share warm stone, gold, and navy materials. Some fine details disappear at mobile scale, especially the robber's face and the token's relief; their silhouettes and clear number center carry their function. Several PNGs contain faint alpha specks outside the main subject, so full-image alpha bounds are not a reliable intended crop. Frames avoid most excess padding while preserving the supplied work. Soft/uneven effect edges are used at low opacity in small finite effects.

Runtime WebP exports now reduce download size for all image groups, with original PNG masters retained separately. Full source dimensions remain deliberately unchanged, so decoded-texture memory is unchanged. No per-color copies are introduced. Actual-size visual review on the user's device remains necessary, particularly for the procedural dice and token-number readability.

## Ports

`src/game/rendering/ports.ts` draws nine small stone trading islets with Phaser Graphics, runtime ratio text, and resource emblems cropped from the existing resource atlas. No port PNGs or per-player asset copies are needed. Marker bodies are 32 pixels across, with a 38-pixel water halo and two links to the associated coastal edge endpoints. An arbitrary runtime ownership color accents the inset border. See [PORTS.md](PORTS.md) for geometry, access rules, and interaction.

## Platform icons

Sunmark retains the existing gold sun-rosette/griffin victory emblem as its app mark; the naming change does not replace or repaint source art. Installable-app icons live in `public/icons/` as PNG platform exports, separate from the optimized in-game image inventory under `public/assets/`. `scripts/export-pwa-icons.py` derives them from the preserved victory emblem and its reviewed crop, without new artwork or baked text. App icons are 192/512 pixels, the maskable icon is 512 with safe padding, and the Apple touch icon is 180. These packaged sizes intentionally differ from full-resolution WebP runtime illustrations. Run `npm run pwa:icons` to regenerate; see [PWA_RELEASE.md](PWA_RELEASE.md).

## Player avatars

`ui/playerAvatarArt.ts` draws four original stone seals (human, Atlas, ASIMO, Sophia) as Phaser Graphics. `ui/playerIdentity.ts` derives their stable identity from seat/human ownership; colors remain runtime data. No avatar bitmaps, manufacturer logos, network images, or per-color copies are shipped. The name entry and header labels remain runtime text.
