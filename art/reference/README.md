# Preserved art references

`pieces/settlement.png`, `pieces/city.png`, and `pieces/road.png` are the project's original, unmodified bitmap illustrations. They previously lived at `public/assets/pieces/<kind>/<kind>.png` but were not loaded by the gameplay scene.

The board now uses original orthographic Phaser Graphics pieces in `src/game/rendering/pieces.ts`. The references are retained here, outside the runtime asset tree, so Vite no longer ships unused paintings. Their oblique perspective, intricate compound silhouettes, and baked magenta ownership areas do not suit the new small, fully recolorable board components. Do not trace these files or use them as runtime textures for the three pieces.

See `docs/PIECE_RENDERING.md` for the renderer API and visual demo.

## Ocean background

`backgrounds/ocean-surface.png` is the original unmodified 853 × 1844 RGB ocean supplied by the user, formerly `public/assets/backgrounds/game.png`. It is 2,027,549 bytes, with SHA-256 `0a14aca6723a66186216c8adce8b1e07ff3e02b7eb8a1cb45b168d16c038e8cb`.

The user requested a lighter code-driven ocean with calm animated waves. `src/game/rendering/ProceduralOcean.ts` now supplies the match sea without an ocean image request. The painting is retained here so its pixels remain available as project work while Vite no longer copies it into deployment output. No re-encoding or repainting was performed. See [GAME_BACKGROUND_PLAN.md](../../docs/GAME_BACKGROUND_PLAN.md).
