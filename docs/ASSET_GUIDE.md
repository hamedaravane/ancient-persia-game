# Asset guide

## Runtime organization

Put files loaded by the browser under `public/assets/`. Keep the directory tree shallow and group files by their role:

```text
public/assets/
  backgrounds/
  board/terrains/
  dice/
  fonts/
  pieces/
    city/
    road/
    settlement/
  resources/
```

Use lowercase kebab-case names with the extension matching the file format. Keep filenames concise, descriptive, and stable. Include the asset's role in the filename when that helps distinguish its use. Example: `backgrounds/main-menu.png`.

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
- `backgrounds/game.png`: user-supplied 853 × 1844 ocean image, renamed from `ocean-surface-bg.png`. Used only during matches, with proportional cover scaling to the 390 × 844 canvas and negligible horizontal cropping. The original pixels are retained. `src/game/rendering/boardCoast.ts` draws a shallow-water wash, narrow sand/stone rim, and broken surf along the actual board perimeter; no coastline is baked into this image. Board presentation measurements are shared in `src/game/ui/layout.ts`.
- `fonts/vazirmatn-regular.woff2`: unmodified Vazirmatn v33.003 Regular (400), 50,684 bytes, downloaded from the [official release](https://github.com/rastikerdar/vazirmatn/tree/v33.003/fonts/webfonts). This is the only weight currently used; no variable font, TTF, or extra weight files are shipped. Retains the upstream Persian and Latin glyph coverage.
- `fonts/vazirmatn-license.txt`: the unmodified SIL Open Font License 1.1 and copyright notice downloaded from the same [release](https://github.com/rastikerdar/vazirmatn/blob/v33.003/OFL.txt).
- `board/terrains/`: desert, forest, mesa, mountain, pasture, and wheat illustrations, loaded by `GameScene` with stable `terrain-` keys and displayed on their corresponding board hexes.
- `dice/dice.png`: dice artwork; frame layout has not been documented.
- `pieces/`: city, road, and settlement illustrations.
- `resources/resources.png`: five transparent resource illustrations. Runtime frame rectangles are declared in `src/game/scenes/GameScene.ts` and reused for the hand icons.

| Resource | Source rectangle (`x`, `y`, `width`, `height`) |
| --- | --- |
| Wood | `44, 164, 476, 404` |
| Brick | `544, 164, 440, 404` |
| Wheat | `984, 88, 428, 492` |
| Wool | `244, 608, 484, 392` |
| Stone | `768, 584, 496, 420` |

The MVP maps forest to wood, mesa to brick, wheat to wheat, pasture to wool, and mountain to stone. The six terrain sources are 1254 × 1254 RGBA PNGs with transparent backgrounds and point-up hex compositions. They load directly at their original resolution, scale proportionally to the full tile height, and remain centered on the board geometry. A geometry mask clips stray pixels outside each exact hex boundary; a colored backplate covers minor transparent edge gaps. Masks are destroyed with their tile images on each UI redraw. Number tokens and the desert label remain runtime overlays. Roads and player-colored pieces render above the terrain with Phaser Graphics; ownership colors remain runtime data.

No runtime background removal or intermediate downsampling is applied. Keep transparency and the shared hex alignment when replacing the artwork. The originals remain individual PNGs; no terrain atlas is required by the current loader.

The ocean and its coast are presentation only. Its persistent scene container sits below the board and UI and is hidden on the main menu. The coast is recreated for a new match rather than on each UI redraw. The canvas keeps a single proportional scale through Phaser `Scale.FIT`.

The art is retained from the existing project. Recheck the resource crop rectangles against the source atlas if that image changes. Review dice frame bounds and building-art ownership suitability before integrating those images into gameplay.
