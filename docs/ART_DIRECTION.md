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

The user-supplied Anahita narrator portraits retain their original design, including their Mediterranean drapery; full PNG masters are preserved separately from the optimized runtime WebP exports. This is a specific character-art exception, not an extension of the architectural/historical direction. Use her six expressions consistently with the intent of contextual dialogue; keep her name and all words in runtime Persian text. Present her as a large transparent character above the dialogue panel, with her lower silhouette behind its front stone edge. Use the complete supplied figure to show more of her legs while preserving her face, gestures, and drapery; use restrained amber light and gold/turquoise interface details to tie the art to the scene. See [TUTORIAL_DESIGN.md](TUTORIAL_DESIGN.md).

The main menu uses the palace art as its background. During a match, the existing terrain paintings form a fictional coastal island over a calm procedural ocean. The water uses deep blue/blue-green depth variation and several small, slowly evolving ripple patterns with soft surface reflection. Keep highlights low contrast and blue-green, without foam crests, glitter, a horizon, or a fixed island silhouette. The original user-supplied ocean PNG is preserved outside runtime assets; see [GAME_BACKGROUND_PLAN.md](GAME_BACKGROUND_PLAN.md). A subtle runtime shallow-water wash, narrow warm coastal rim, and broken surf follow the board's actual stepped outer boundary. Keep the full island visible without zoom or panning, with 40 CSS pixels of ocean clearance for the coastal shelf and compact trade-port islets. Keep the sea secondary to the land and darken it gradually behind the interface. The ocean remains a visual setting; port rules are defined separately in `GAME_RULES.md`. Ports use original top-down carved-stone octagonal islets with warm bevels, navy insets, restrained shadows, two narrow dock links, runtime resource emblems and rates, and an ownership-colored rim. These markers are trading locations, not additional playable terrain.

Display the terrain paintings across the full faces of point-up runtime hexes. Keep the paintings centered, preserve their aspect ratio, and clip export fringes at the hex boundary. Number tokens sit near the lower part of each tile to leave the landscape visible; roads and player pieces render above the artwork. The existing resource sheet supplies the hand icons. Vazirmatn Regular supplies runtime Persian text. The current interface extends this world with procedural carved limestone controls, dark basalt panels, honey-stone primary actions, chiseled bevels, recessed engraving, restrained mineral grain, ivory dice, and colored player seals. Keep texture near the edges and label fields quiet. Stone is the approved sole interface treatment; see [PHASER_UI_DESIGN.md](PHASER_UI_DESIGN.md).

Player identities use small original runtime stone-seal avatars: a human profile and three distinct geometric robot faces with ownership-colored rims. Recognizable robot names and explicit AI labels are a requested identity convention, not a change to the Achaemenid board, costumes, or architecture. No manufacturer art or existing character art is replaced.

Settlements, cities, and roads now use original top-down orthographic Phaser Graphics geometry: a compact dwelling plan, a wider stepped compound, and a narrow chamfered stone road. Keep silhouettes readable at 21/25/28 × 8 board pixels, with broad bevels and restrained contact shadows. Ownership insets accept arbitrary runtime colors independently of the neutral stone. Do not reintroduce oblique bitmap facades or texture noise into these three pieces. Original paintings remain under `art/reference/pieces/` as preserved references; see [PIECE_RENDERING.md](PIECE_RENDERING.md).
