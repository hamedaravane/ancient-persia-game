# Preserved piece references

`pieces/settlement.png`, `pieces/city.png`, and `pieces/road.png` are the project's original, unmodified bitmap illustrations. They previously lived at `public/assets/pieces/<kind>/<kind>.png` but were not loaded by the gameplay scene.

The board now uses original orthographic Phaser Graphics pieces in `src/game/rendering/pieces.ts`. The references are retained here, outside the runtime asset tree, so Vite no longer ships unused paintings. Their oblique perspective, intricate compound silhouettes, and baked magenta ownership areas do not suit the new small, fully recolorable board components. Do not trace these files or use them as runtime textures for the three pieces.

See `docs/PIECE_RENDERING.md` for the renderer API and visual demo.
