# Gameplay background production plan

Status: implemented using the user-supplied ocean asset, retained unchanged as `backgrounds/game.png` (853 × 1844). The board now uses center (195, 312) and hex radius 38. A persistent decorative coast follows its outer edges, while the ocean fits the logical canvas proportionally. The existing `backgrounds/main-menu.png` remains exclusive to the main menu. The production brief below records the design and original target dimensions; the delivered image's aspect ratio is already almost identical to the canvas, so no preprocessing was needed.

## Visual decision

Present the playable land as a fictional Persian coastal island surrounded by a calm, blue-green sea. This supports the resource production, settlement building, and territorial expansion visible on the board. It is a visual setting, not a real geographic map or a new gameplay rule.

[CATAN also presents its resource landscape as an island surrounded by sea](https://www.catan.com/catan). Use that clear separation between playable land and surrounding water while retaining this project's existing terrain paintings and Achaemenid art direction.

The final composition consists of three parts:

1. An AI-painted continuous sea, filling the portrait game canvas.
2. A narrow shoreline drawn by the renderer around the actual outer board boundary.
3. The existing 19 terrain tiles, forming the island and covering the sea beneath them.

The generated image contains only the sea. This makes exact alignment a responsibility of the renderer rather than the image generator. No prepainted island, hex grid, coastline, harbors, or terrain belongs in that image.

## Geometry and available space

The board is a radius-two arrangement of 19 point-up regular hexes. Its silhouette has stepped hex edges; it is not one oversized regular hexagon. The terrain assignment shuffles each match. The surrounding sea and coast must work next to every terrain type, including desert and mountain.

All layout measurements below are logical pixels in the fixed 390 × 844 Phaser canvas, before display scaling. Hex radius is the center-to-corner distance, half the full tile height.

| Measurement | Existing | Proposed |
| --- | --- | --- |
| Canvas | 390 × 844 | 390 × 844 |
| Board center | (195, 322) | (195, 312) |
| Hex radius | 40 | 38 |
| Individual tile bounds | 69.28 × 80 | 65.82 × 76 |
| Whole land bounds | 346.41 × 320 | 329.09 × 304 |
| Land horizontal extent | 21.79–368.21 | 30.46–359.54 |
| Land vertical extent | 162–482 | 160–464 |
| Minimum side water before coast | 21.79 | 30.46 |
| Gap below land to resources panel | 18 | 36 |

The width is `5 * sqrt(3) * radius`; the height is `8 * radius`. Tile centers and edge/vertex positions continue to use the board's existing normalized coordinates.

The proposed change reduces land size by 5% and moves its center up by 10 pixels. Land still spans about 84% of the canvas width. It gives the coastal band room and keeps the outermost building selection circles, currently radius 22, inside the canvas. At the existing radius, those circles can extend slightly outside the left and right edges and below the resource panel's top edge.

Keep the current header at y=12–120 and resource panel at y=500–588. Reserve y=128–496 as the clear board environment; this is a layout guide, not a visible rectangle or image crop. With the proposed center, land has 32 pixels of water above and below within that environment. The existing action controls remain below the resource panel.

See [the layout guide](design/game-background-layout.svg). Its plain colored hexes and coast are schematic, not final artwork. The full hex silhouette is calculated from the same axial geometry as the game.

## Asset contract

- Runtime filename: `public/assets/backgrounds/game.png`; texture key: `game-background`.
- Preferred delivered size: **1560 × 3376 pixels**, exactly four times the logical canvas. Minimum preferred delivery: 780 × 1688. Opaque RGB PNG, sRGB, no transparent hole or center.
- Aspect ratio: **195:422**, matching 390:844. A generator may not support this exact ratio. In that case, generate the closest portrait ratio with continuous water and crop to the target ratio before integration. Never stretch one axis to force a fit.
- Use the full image as a single portrait background, not a repeated tile. Keep water readable after downscaling to 390 × 844.
- At the preferred resolution the board center is (780, 1248); its land bounds are approximately x=122–1438, y=640–1856. These are overlay coordinates, not shapes the AI should paint.
- The island will cover approximately the central 84% of image width between 19% and 55% of image height. Keep this broad region and its surrounding water especially quiet. Fill it with the same continuous water as the rest of the image.
- Header and lower controls need calm dark water behind them. Important decorative features should not be hidden there; the image has no essential objects.

## Generated image appearance

Use a high aerial, nearly overhead orthographic view of sheltered open sea. There is no horizon, sky, perspective vanishing point, or scenic foreground. This is the water surface of a landscape map, compatible with the terrain tiles' illustrated materials and elevated viewpoint.

The mood is inviting, calm, and suitable for building and trading. Match the warm upper-left light and painterly finish of the existing terrain illustrations. The sea is less detailed and less contrasty than the land; its texture must remain secondary to ownership colors, roads, number tokens, and buildings.

Favor muted lapis blue and blue-green rather than brilliant tropical cyan. Suggested color targets are deep blue `#21475c`, middle blue-green `#32667c`, and restrained reflective accents around `#669b9c`. These are art targets rather than required exact pixel colors. Let upper-middle water feel slightly more luminous, with a broad subtle transition into deeper water near the top and lower portion. Keep all edges filled with coherent water.

Paint soft, small ripples and occasional low-contrast broken highlights. Avoid long bright reflection paths, glitter, large foam crests, spiral currents, or strong directional waves. Do not draw a central hole, island-shaped halo, ring, ellipse, hexagon, beach, or shallow-water shelf into the sea image. The renderer supplies the local shoreline.

Keep Persian identity in the existing terrain, buildings, menu, and runtime interface. The sea does not need decorative architecture, ornamental borders, or historical symbols to establish the setting. Do not imply additional playable features through ships, ports, bridges, or outlying islands.

## Runtime shoreline and compositing

Render from back to front:

1. Full-canvas sea image.
2. Optional subtle darkening behind header and lower controls, strongest outside the board environment.
3. Board-derived shallow water and a thin warm coastal rim, beneath terrain tiles.
4. Existing terrain backplates and clipped terrain paintings.
5. Tile numbers, robber, road and building graphics, and selection feedback.
6. Runtime interface panels, messages, and controls; victory overlay above everything.

Trace boundary edges from `state.board.edges` where `tileIds.length === 1`. Order them into a closed path using their shared vertices, transform them with the same board center and radius as the tiles, and build outward coastal bands from that path. Do not use a circular mask, a large regular hexagon, or the rectangular board bounds.

Starting appearance at reference scale:

- A warm stone/sand rim extends 2–3 pixels outside the exact land boundary. Keep it muted and generic enough to meet all shuffled terrains.
- A broken, soft surf highlight is at most about 1 pixel thick; avoid a continuous bright outline.
- A blue-green shallow-water wash fades outward, reaching at most 12–16 pixels from the land edge including the rim. The farthest horizontal edge then still has about 14 pixels of open sea before the canvas boundary.
- Vary visual opacity gently along the perimeter rather than moving the actual land boundary. Avoid thick cliffs, black extrusion, or a floating-platform appearance.
- Use outside-only bands or draw them beneath the opaque tile backplates so no shelf appears through internal tile seams. Coastal rendering must leave the outer roads and buildings legible.

The geometric outline follows the stepped tile silhouette. Soft, broken surf can reduce its mechanical appearance, but do not pretend it is a smooth circular island or cover parts of playable tiles. Start with these widths, then assess them alongside the actual generated sea at mobile size.

## Implementation steps after asset delivery

1. Review the image's dimensions, color, viewpoint, ripple scale, and edge continuity. Crop proportionally if needed; keep a source master outside the runtime tree if adding an optimized derivative, and record its location.
2. Load `/assets/backgrounds/game.png` using `import.meta.env.BASE_URL`, following the existing asset convention.
3. Create a persistent game-background image below the UI container. Toggle it opposite the main-menu image when `gameState` changes between null and an active match. Retain it behind the victory overlay.
4. Centralize the board presentation measurements so tiles, masks, roads, buildings, hit areas, and shoreline use the same center (195, 312) and radius 38. Keep rendering calculations separate from the core rules.
5. Implement the coastline as a small presentation helper. Reuse the outline while board geometry is unchanged; do not accumulate coastline objects or masks during UI redraws. Coast and sea are decorative and receive no pointer input.
6. Fit the sea to the fixed logical canvas with proportional scaling. Phaser's existing `Scale.FIT` scales the entire scene to the device; the background must not independently shift relative to the board when the browser resizes.
7. Check three- and four-player matches, randomized perimeter terrains, coast selections, robber interactions, victory, and return to menu. Inspect the 390 × 844 reference and narrower displays for clipping and readable controls. Run the repository's typecheck and production build after implementation.
8. Update the asset guide and art direction to describe the implemented rendering and delivered asset. The geography is presentational; no new water, harbor, or naval rules are introduced.

## Copyable generation prompt

Create an opaque portrait background of continuous calm sea for a mobile Persian strategy board game. Preferred canvas 1560 × 3376 pixels, aspect ratio 195:422. Show only the water surface from a high aerial, nearly overhead orthographic viewpoint, with water extending naturally to every edge. No horizon or sky.

Use a polished hand-painted illustrated game-art finish, softly dimensional and compatible with warm, sunlit terrain paintings. Muted lapis blue and blue-green water, restrained turquoise reflections, diffuse warm sunlight from the upper left. Suggested tones: deep blue #21475c, middle blue-green #32667c, soft reflected accents #669b9c. Convey a sheltered, welcoming sea around a fictional Persian coastal island.

Paint gentle small ripples, broad soft color variation, and sparse low-contrast broken highlights. Keep the upper-middle region softly luminous and the top and lower portion slightly deeper blue. All transitions must be subtle and continuous. The image will sit behind separately rendered land tiles and interface panels. Land will cover roughly the central 84% of width between 19% and 55% of image height; continue ordinary uninterrupted water through this area and keep its surroundings particularly calm. Maintain low contrast throughout so colorful land, roads, and buildings remain the focal point at phone size.

Water only: no island, land, coast, sand, rocks, shallow-water ring, island-shaped glow, empty center, transparent cutout, hexagons, grid, board frame, tiles, mountains, trees, ships, harbors, buildings, people, labels, text, logos, symbols, or interface. No large waves, storm, tropical coral, dramatic glitter, bright sun-reflection streak, whirlpool, strong vignette, or cinematic perspective. The game engine will add the exact shoreline and playable island on top.
