# Procedural stone board pieces

Settlement, city, and road pieces use original, direct top-down floor-plan geometry in `src/game/rendering/pieces.ts`. They use Phaser Graphics only. There are no PNG/SVG textures, traced outlines, player-color image copies, or generated texture caches for these pieces.

## Visual design

- **Settlement:** a compact chamfered stone structure with one broad threshold and one ownership inset; default footprint 21 × 21 board pixels.
- **City:** a wider L-shaped compound with two end pads and an L-shaped ownership inset; default footprint 25 × 25. A 14 × 14 open quarter cuts deeply into its outline, replacing the former shallow corner notches that read as another square at mobile size. Its concave silhouette differs from the settlement in full grayscale, without relying on size or color alone.
- **Road:** a chamfered stone bar with a continuous ownership strip, restrained end caps, and two joints; default length 28 and thickness 8. Board integration centers it on the edge with endpoint clearance, shrinking its length proportionally on smaller boards.
- Warm neutral stone, a dark keyline, a short contact shadow, and broad bevel strokes provide material character. There are no perspective side walls, pitched roofs, fine texture, or tiny ornament.
- Geometry rotates in the renderer. Bevel-edge normals are evaluated after rotation, so upper-left lighting and world-axis shadow offsets remain consistent across road orientations.

Dimensions describe stone geometry before outlines, contact shadow, and selection cues. All three pieces anchor at local `(0, 0)`; both building types use the board intersection itself. A city upgrade preserves the same logical anchor.

## API

```ts
import { createBuildingPiece, createRoadPiece } from '../rendering/pieces';

const settlement = createBuildingPiece(scene, {
  x: 120,
  y: 160,
  kind: 'settlement',
  size: 21,
  color: 0x167ef2,
});
const city = createBuildingPiece(scene, {
  x: 120,
  y: 160,
  kind: 'city',
  size: 25,
  color: player.color,
});
const road = createRoadPiece(scene, {
  x: 150,
  y: 180,
  length: 28,
  thickness: 8,
  angle: Math.PI / 6,
  color: player.color,
  state: { preview: true, legal: true, selected: true },
});

road.setColor(0xf024a1).setAngle(Math.PI / 2);
road.setState({}); // Replaces all visual state flags.
road.setPosition(180, 190);
boardContainer.add(road.container);
// Destroying the owning board container also destroys the piece's child layers.
```

Factories add the returned container to the scene. `PieceView` exposes `container`, read-only references to its material `layers`, `setColor`, `setState`, `setAngle`, `setPosition`, and `destroy`. Position and dimensions are board pixels; `angle` is radians. Size/length/thickness are specified at creation. Drawing updates reuse existing Graphics objects instead of allocating replacement display objects.

Ownership accepts any numeric 24-bit RGB color, including black and white. Only the ownership surface and its derived highlights/shades depend on it. Stone, outline, neutral bevels, shadow, and state-cue colors are independent. There is no knowledge of the game's player palette inside the component. Optional `grayscale: true` desaturates every material and state layer for visual inspection.

Pieces deliberately have no owner numbers or plates: their ownership insets stay fully visible at mobile scale. Player numbers and names remain in the HUD. Default session colors and their terrain-contrast rationale are documented in [UI_SYSTEM.md](UI_SYSTEM.md); these defaults are not embedded in the renderer.

## Visual states

`state` contains independent boolean flags:

| Flag       | Presentation                                                                      |
| ---------- | --------------------------------------------------------------------------------- |
| `legal`    | Thin pale perimeter with a dark separator for readability over light terrain      |
| `preview`  | Translucent stone, ownership surface, bevel, and shadow                           |
| `selected` | Stronger perimeter; may combine with legal/preview for an uncommitted destination |
| `disabled` | Desaturated ownership color and subdued material opacity                          |
| No flags   | Normal committed piece                                                            |

Calling `setState({})` restores normal materials. These flags affect presentation only; they do not make targets legal, disable input, or commit a placement.

`GameScene` uses core/session targets: unoccupied legal destinations become translucent candidate pieces, the chosen destination receives stronger selection emphasis, and city-upgrade previews replace the settlement visual at the same vertex. Roads occupy the midpoint of the existing edge and derive their rotation from its endpoints. Neutral thin lines remain the empty board-edge grid. Existing build effects animate the returned building containers. The board fits automatically with ocean clearance and has no zoom/pan; piece geometry and nearest-target selection use these fitted board coordinates. Rules remain unchanged.

## Visual demo

Run the existing development command and visit **`/?demo=pieces`** (append `?demo=pieces` to the app's base URL when deployed under a prefix).

The isolated, lazily loaded demo uses the production renderer and includes:

- All four default session colors at real gameplay size; a live native color picker replaces the fourth with any arbitrary color and updates the state/orientation samples.
- Settlement/city/road samples with all layers converted to grayscale, including near-black and near-white owner colors.
- Roads at 30°, 90°, and 150° with consistent world-space lighting.
- Normal, legal, preview, selected, disabled, and combined confirmation-preview states.
- A separate 3× detail row, explicitly labelled as enlarged.

The demo canvas resizes to its actual CSS width using `Scale.NONE`; actual-size samples are never stretched to fit the screen. The page scrolls vertically and provides a link back to normal gameplay. It loads no terrain or piece image assets. Its stylesheet and scene load only when this query is selected.

## Preserved artwork and checks

Original piece paintings are preserved byte-for-byte under `art/reference/pieces/`; see [the reference README](../art/reference/README.md). Their prior oblique perspective, fine detail, and magenta ownership areas were unsuitable for small, arbitrary-color orthographic rendering. They are no longer copied from `public/` into the production build. Other artwork, including Ahriman, terrain, and resource icons, is unchanged.

Verification uses the repository typecheck/build and focused recording checks for arbitrary-color/material separation, all-layer grayscale, shared anchors, road dimensions at all six directed edge angles, world-space lighting, text-free pieces, state reset, redraw allocation, and disposal. Recording checks validate drawing commands, not browser rasterization. Interactive device review remains with the user; no browser is launched as part of this task.

`rendering/pieceShapes.ts` shares the original contours between the board renderer and HUD symbols. Binary silhouette tests in `tests/piece-shapes.test.ts` sample 21/25 CSS-pixel sizes without any color/shading and verify a broad shape difference and that the city inset cannot fill its open quarter. These checks do not establish device rasterization quality; use the existing actual-size/grayscale gallery for user visual review.
