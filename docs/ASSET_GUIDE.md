# Asset guide

## Runtime organization

Put files loaded by the browser under `public/assets/`. Keep the directory tree shallow and group files by their role:

```text
public/assets/
  backgrounds/
  board/terrains/
  dice/
  pieces/
    city/
    road/
    settlement/
  resources/
```

Use lowercase kebab-case names with the extension matching the file format. Keep filenames descriptive and stable. Example: `backgrounds/achaemenid-palace-terrace-sunset.png`.

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

- `backgrounds/achaemenid-palace-terrace-sunset.png`: portrait palace background used by the initial scene.
- `board/terrains/`: desert, forest, mesa, mountain, pasture, and wheat illustrations.
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

The MVP maps forest to wood, mesa to brick, wheat to wheat, pasture to wool, and mountain to stone. It draws terrain hexes and runtime player-colored pieces with Phaser Graphics because the terrain files are scenic isometric landforms rather than flat hex tiles, and player ownership colors must not be baked into assets.

The art is retained from the existing project. Recheck the resource crop rectangles against the source atlas if that image changes. Review dice frame bounds and building-art ownership suitability before integrating those images into gameplay.
