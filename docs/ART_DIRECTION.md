# Art direction

## Historical language

- Lead with Achaemenid Persian forms and references.
- Parthian and Sasanian influence may support the main direction.
- Avoid Arabian Nights imagery and medieval Islamic Persian visual language.
- Prefer historically grounded architecture, materials, landscape, ornament, and objects over generic fantasy shorthand.

## Rendering and composition

- Keep silhouettes, lighting, shading, detail, and material rendering consistent across the game.
- Use light from the upper left as the default unless a scene has a clear reason to differ.
- Design board art for quick recognition at mobile portrait size.
- Keep the board as the primary visual focus when interface elements are added.
- Keep ownership colors and Persian text in runtime UI or rendering data, not duplicated or text-baked artwork.

## Existing art

The repository includes a palace terrace background and illustrated terrain, dice, resources, and building assets. Retain this work while organizing the project. Review each asset for historical fit, readability, transparency, atlas boundaries, and consistency before putting it into gameplay. The current files do not yet establish a complete palette, typography system, or final camera composition. The MVP terrain-to-resource mapping is listed in `docs/GAME_RULES.md`.

## MVP presentation

The main menu uses the palace art as its background. During a match, the existing terrain paintings form a fictional coastal island over the user-supplied ocean background. A subtle runtime shallow-water wash, narrow warm coastal rim, and broken surf follow the board's actual stepped outer boundary. Keep the full island visible without zoom or panning, with 40 CSS pixels of ocean clearance for the coastal shelf and compact trade-port islets. Keep the sea secondary to the land and darken it gradually behind the interface. The ocean remains a visual setting; port rules are defined separately in `GAME_RULES.md`. Ports use original top-down carved-stone octagonal islets with warm bevels, navy insets, restrained shadows, two narrow dock links, runtime resource emblems and rates, and an ownership-colored rim. These markers are trading locations, not additional playable terrain.

Display the terrain paintings across the full faces of point-up runtime hexes. Keep the paintings centered, preserve their aspect ratio, and clip export fringes at the hex boundary. Number tokens sit near the lower part of each tile to leave the landscape visible; roads and player pieces render above the artwork. The existing resource sheet supplies the hand icons. Vazirmatn Regular supplies runtime Persian text. The current interface extends this world with procedural carved limestone controls, dark basalt panels, honey-stone primary actions, chiseled bevels, recessed engraving, restrained mineral grain, ivory dice, and colored player seals. Keep texture near the edges and label fields quiet. Stone is the approved sole interface treatment; see [PHASER_UI_DESIGN.md](PHASER_UI_DESIGN.md).

Settlements, cities, and roads now use original top-down orthographic Phaser Graphics geometry: a compact dwelling plan, a wider stepped compound, and a narrow chamfered stone road. Keep silhouettes readable at 21/25/28 × 8 board pixels, with broad bevels and restrained contact shadows. Ownership insets accept arbitrary runtime colors independently of the neutral stone. Do not reintroduce oblique bitmap facades or texture noise into these three pieces. Original paintings remain under `art/reference/pieces/` as preserved references; see [PIECE_RENDERING.md](PIECE_RENDERING.md).
