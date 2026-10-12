# Asset guide

## Runtime organization

Put files loaded by the browser under `public/assets/`. Keep the directory tree shallow and group files by their role:

```text
public/assets/
  backgrounds/
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

Use lowercase kebab-case names with the extension matching the file format. Keep filenames concise, descriptive, and stable. Include the asset's role in the filename when that helps distinguish its use. Example: `backgrounds/main-menu.png`.

See [ASSET_PRODUCTION_BRIEF.md](ASSET_PRODUCTION_BRIEF.md) for the proposed next art batches, the inspected existing-art inventory, mobile display sizes, ownership layers, component states, and designer handoff requirements. Its future filenames and export sizes are proposals; the current runtime files and loading conventions remain documented below.

## Loading

Vite copies `public/` files unchanged to the build output. Load them from their public URL in Phaser, for example:

```ts
this.load.image('forest', `${import.meta.env.BASE_URL}assets/board/terrains/forest.png`);
```

Use a stable asset key in code and build the URL from `import.meta.env.BASE_URL` so deployments under a path prefix keep working. Keep the source path in the relevant scene or an asset registry. If the project later moves assets into imported modules or an atlas pipeline, update this guide and all paths together.

## Asset requirements

- Preserve transparency for cutout sprites and check alpha edges against both light and dark backgrounds.
- Confirm image dimensions, padding, and intended crop before defining frames for a sprite sheet.
- Do not infer atlas frame boundaries from filenames; document frame coordinates or add machine-readable atlas metadata.
- Keep Persian labels as runtime text rather than rasterized text.
- Keep player ownership tint as runtime data; do not create one copy per player color.
- Prefer optimized web-ready images. Preserve source masters outside the runtime tree when they are needed for future editing.
- Do not remove or replace existing project assets without a documented reason.

## Current files

- `backgrounds/main-menu.png`: portrait palace background used only by the main menu.
- `backgrounds/game.png`: user-supplied 853 × 1844 ocean image, renamed from `ocean-surface-bg.png`. Used only during matches as a CSS cover background on the responsive portrait shell. The original pixels are retained. `src/game/rendering/boardCoast.ts` draws a shallow-water wash, narrow sand/stone rim, and broken surf along the actual board perimeter; no coastline is baked into this image. Board presentation measurements are shared in `src/game/ui/layout.ts`.
- `fonts/vazirmatn-regular.woff2`: unmodified Vazirmatn v33.003 Regular (400), 50,684 bytes, downloaded from the [official release](https://github.com/rastikerdar/vazirmatn/tree/v33.003/fonts/webfonts). This is the only weight currently used; no variable font, TTF, or extra weight files are shipped. Retains the upstream Persian and Latin glyph coverage.
- `fonts/vazirmatn-license.txt`: the unmodified SIL Open Font License 1.1 and copyright notice downloaded from the same [release](https://github.com/rastikerdar/vazirmatn/blob/v33.003/OFL.txt).
- `board/terrains/`: desert, forest, mesa, mountain, pasture, and wheat illustrations, loaded by `GameScene` with stable `terrain-` keys and displayed on their corresponding board hexes.
- `dice/dice.png`: dice artwork; frame layout has not been documented.
- `dice/faces.png`: supplied six-face stone dice sheet, used for the two confirmed dice in the match bar. Its front faces are ordered 1–3 across the top and 4–6 across the bottom. The source is **RGB with a baked checkerboard**, not transparent. Explicit crops and an inset silhouette clip hide the background in DOM rendering; this also omits the baked shadow and slightly trims the silhouette. A real transparent re-export is the highest-priority art cleanup. The original pixels remain unchanged.
- Settlements, cities, and roads use reusable Phaser Graphics components rather than runtime images. Their original paintings are preserved under `art/reference/pieces/`, outside the runtime tree. See [PIECE_RENDERING.md](PIECE_RENDERING.md) for dimensions, material layers, visual states, API, and the `?demo=pieces` gallery.
- `pieces/robber/robber.png`: supplied traveler miniature, replacing the board's letter marker, including translucent destination previews and the existing movement effect. The crop removes generous source padding; a runtime contact shadow separates it from terrain. It displays about 38.4 pixels high at maximum fitted board size, a 20% enlargement. The miniature, shadow, and fallback scale together; its center sits 0.45 hex radii above tile center, using the same offset during movement.
- `board/tokens/number.png`: supplied stone medallion, used behind runtime Persian tile numbers at 28.6 pixels across with 15.4-pixel digits, both enlarged by 10%. The fallback circle is enlarged proportionally. The desert has no board label or number token; its name remains available in tile details. The illustrated frame is detailed at source size; its center is intentionally kept clear for digits.
- `ui/ornaments/ornaments.png`: supplied corner, divider, and rosette sheet. Explicit source frames supply menu corners/crest/divider and small sheet-heading ornaments; there are no baked labels or separate player-color images.
- `ui/emblems/victory.png`: supplied griffin/rosette medallion, shown at 112 pixels wide in the results sheet with runtime winner/score text below it.
- `ui/illustrations/bank.png`: supplied trade scale, used as a small bank-action illustration and a 64-pixel trade-sheet illustration. Compact layouts omit the latter illustration to prioritize the exchange controls. The illustrated props do not introduce currencies or alter resource rules.
- `effects/dust.png`: short construction puff behind the building marker within its container.
- `effects/spark.png`: restrained road-placement sparkle over the confirmed edge.
- `effects/glint.png`: short glint over the victory medallion in the dialog's top layer.
- `resources/resources.png`: five transparent resource illustrations. Source frame rectangles are documented below. `src/styles/global.css` scales each crop proportionally into a maximum 32-pixel icon; the hand, costs, bank selectors, and animated production flights reuse those CSS classes without extra image files.

| Resource | Source rectangle (`x`, `y`, `width`, `height`) |
| --- | --- |
| Wood | `44, 164, 476, 404` |
| Brick | `544, 164, 440, 404` |
| Wheat | `984, 88, 428, 492` |
| Wool | `244, 608, 484, 392` |
| Stone | `768, 584, 496, 420` |

The MVP maps forest to wood, mesa to brick, wheat to wheat, pasture to wool, and mountain to stone. The six terrain sources are 1254 × 1254 RGBA PNGs with transparent backgrounds and point-up hex compositions. They load directly at their original resolution, scale proportionally to the full tile height, and remain centered on the board geometry. A geometry mask clips stray pixels outside each exact hex boundary; a colored backplate covers minor transparent edge gaps. Masks are destroyed with their tile images on each board redraw. Number text remains a runtime overlay; the desert is unlabelled on the board. Roads and player-colored buildings render above the terrain with Phaser Graphics; ownership colors remain runtime data. The supplied robber and number-token back render as cropped images.

No runtime background removal or intermediate downsampling is applied. Keep transparency and the shared hex alignment when replacing the artwork. The originals remain individual PNGs; no terrain atlas is required by the current loader.

The ocean and its coast are presentation only. CSS switches between menu and match backgrounds; the transparent Phaser canvas shows only the board over the match ocean. Coast geometry is recreated when board state or viewport measurements change, and stays below the terrain. A ResizeObserver explicitly resizes the canvas with `Scale.NONE`; the island automatically fits the available width and height with a 32-pixel ocean margin for the coast and future port markers. There is no interactive zoom or panning, and DOM controls retain CSS-pixel touch dimensions.

The art is retained from the existing project. Recheck resource crop rectangles against the source atlas if that image changes. The older dice sheet remains available. The original settlement/city/road paintings are reference art under `art/reference/pieces/`; the user's chosen replacement is original procedural Graphics geometry, so bitmap ownership masks are not required.

## Supplied polish assets: frames and review

All nine new PNGs have been renamed/moved without re-encoding. Source rectangles and original dimensions are defined once in `src/game/assets.ts`; Phaser adds named texture frames, while DOM components generate proportional CSS background crops from the same registry. Asset URLs use `import.meta.env.BASE_URL`. These are presentation frames, not animation grids or rule data.

| Art key | Source rectangle (`x`, `y`, `width`, `height`) |
| --- | --- |
| Robber | `380, 60, 610, 1130` |
| Number token | `95, 75, 1065, 1075` |
| Corner ornament | `35, 390, 380, 400` |
| Divider ornament | `385, 575, 485, 110` |
| Rosette ornament | `930, 480, 310, 310` |
| Victory emblem | `40, 50, 1175, 1135` |
| Bank illustration | `15, 80, 1225, 1095` |
| Dust | `125, 210, 1010, 850` |
| Spark / glint | Full source images, respectively `1283 × 1226` / `1278 × 1230` |
| Dice 1 / 2 / 3 | `96, 80, 344, 346` / `590, 80, 344, 346` / `1084, 80, 344, 346` |
| Dice 4 / 5 / 6 | Same x coordinates, with `y = 542` |

The new illustrations share warm stone, gold, and navy materials. Some fine details disappear at mobile scale, especially the robber's face and the token's relief; their silhouettes and clear number center carry their function. Several PNGs contain faint alpha specks outside the main subject, so full-image alpha bounds are not a reliable intended crop. Frames avoid most excess padding while preserving the supplied work. Soft/uneven effect edges are used at low opacity in small finite effects.

Future optimization can produce smaller transparent runtime exports from preserved masters; this integration deliberately keeps original pixels and introduces no new per-color copies. The large new source images still increase download/decoded-texture cost. Actual-size visual review on the user's device remains necessary, particularly for the dice silhouette clipping and token-number readability.
