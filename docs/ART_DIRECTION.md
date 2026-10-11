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

The current MVP uses the palace art as a subdued background and displays the terrain paintings across the full faces of point-up runtime hexes. Keep the paintings centered, preserve their aspect ratio, and clip export fringes at the hex boundary. Number tokens sit near the lower part of each tile to leave the landscape visible; roads and player pieces render above the artwork. The existing resource sheet supplies the hand icons.
