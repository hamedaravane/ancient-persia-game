# Asset production brief

Prepared 2026-10-12 from the current implementation and a visual inspection of the existing terrain, resource, building, road, and dice artwork. This is a proposed production plan, not a change to gameplay rules or an implemented asset pipeline.

**Later implementation decision:** the user chose original orthographic Phaser Graphics components for settlements, cities, and roads, with color-only board ownership and no number plates. Their bitmap/mask production proposals below are superseded by [PIECE_RENDERING.md](PIECE_RENDERING.md); the preserved original paintings now live under `art/reference/pieces/`. The current saturated ownership palette is documented in [UI_SYSTEM.md](UI_SYSTEM.md). Other asset categories remain applicable.

## 1. Direction and production priorities

Build a coherent miniature Persian world: warm carved stone, restrained gold, lapis/navy surfaces, clear silhouettes, and light from the upper left. Board objects should feel like small crafted playing pieces; the interface should feel related to their materials without competing with the landscapes. Use the existing paintings as the visual reference.

The largest opportunities are the objects and controls seen on every turn. More scenery would have less immediate value than recognizable buildings, a characterful robber, readable dice, and a consistent interface kit.

| Priority | Production category | Reason |
| --- | --- | --- |
| First | Settlement, city, and road board pieces derived from existing art | These are still geometric markers/lines despite being central to play. |
| First | Robber miniature and small robber icon | The current robber is a circle with a Persian letter. |
| First | Button/panel design kit and functional icon set | These establish consistent identity across almost every interaction. |
| Next | Six readable dice faces and a number-token back | Repeated tabletop objects become tangible and recognizable. |
| Next | Player badge frame and a compact score emblem | Make turn ownership and progression feel intentional. |
| Next | Victory emblem and menu brand emblem | Give the beginning and end of a match a memorable identity. |
| Later | A few reusable effect textures and contextual illustrations | Add polish once the recurring objects work at mobile scale. |
| Retain | Terrain, ocean, palace, and five resource illustrations | Existing art already supplies the landscape and resource identity. |
| Defer | Development cards, ports, trading characters, awards, online assets | Their systems are not part of the current MVP. |

Historical ornament should follow [ART_DIRECTION.md](ART_DIRECTION.md). For a specific architectural reference, the Met's [Achaemenid bull capital](https://www.metmuseum.org/art/collection/search/324025) supports a stylized paired-animal/column vocabulary. The British Museum's [Achaemenid luxury guide](https://www.britishmuseum.org/sites/default/files/2023-04/Luxury_and_power_large_print_guide.pdf) discusses rosette ornament on Persian vessels. Our proposed use of these references in button corners and emblems is a contemporary game-design interpretation, not a reconstruction of an ancient interface. Avoid automatically treating every ancient Near Eastern motif as Persian or combining unrelated periods.

## 2. What the implementation actually needs

### Rendering boundaries

- `src/game/scenes/GameScene.ts` loads the six terrain paintings. Roads, buildings, tokens, and the robber currently use Phaser Graphics and runtime text.
- `src/game/ui/GameHud.ts`, `sheets.ts`, and `src/styles/global.css` render the controls as HTML/CSS. Interface assets must work with responsive DOM elements; a Phaser-only interface pack would not fit this architecture.
- `src/game/rendering/boardEffects.ts` already moves and scales piece containers. `src/game/ui/GameFeedback.ts` flies the existing resource icons toward the hand/player summaries. New artwork should fit those adapters and effects.
- Game state is authoritative. Art, effects, and animation completion never pay resources, determine legality, roll dice, or change ownership.

### Scale constraints

The reference is 390 × 844 **CSS pixels**, with a maximum shell width of 480. On the reference layout the board viewport and canvas are 468 pixels high during ordinary play. Placement temporarily reserves 56 pixels for its destination selector. Compact layouts reduce fixed UI rows. Actual board size comes from the available canvas, not from a fixed background image.

`fitBoard()` fits the entire radius-two island to the measured canvas with a 32-pixel ocean margin on every side, reserving space for the coast and future compact port markers. There is no fixed radius cap, zoom, or panning. At a 390 × 468 canvas, hex radius is about 37.6, a point-up hex is 65 × 75 pixels, and the land footprint is 326 × 301. Art must remain readable at the fitted mobile size.

| Element | Current footprint | Proposed art footprint at normal board/UI scale |
| --- | --- | --- |
| Settlement | Triangle, 20 × 19 board pixels | Visible body about 20–22 wide × 22–26 high |
| City | Rounded square, 20 × 20 | Visible body about 24–26 wide × 26–30 high |
| Road | 7-pixel stroke along a 38-pixel edge | Body about 26–30 long × 7–9 wide, excluding small shadow |
| Robber | 20-pixel circle | Visible body about 18–22 wide × 26–28 high |
| Number token | 24-pixel circle with 14-pixel text | Retain approximately 24-pixel diameter |
| Resource icon | Maximum 32-pixel dimension; smaller in compact costs | Retain current footprint |
| Functional icon | Mixed text symbols/CSS silhouettes | Usually 20–24 CSS pixels inside existing controls |
| Main touch control | 48-pixel minimum button height | Keep 48; ornament fits inside it |
| Player ownership badge | 16-pixel circle, 48 in details | Keep compact badge near 16–18; larger version in details |

New footprints are starting targets for a size proof, not approved layout changes. There is little room to enlarge a building without obscuring a neighboring tile, road junction, or number. A 128-pixel export is a texture size, not permission to display it 128 pixels wide.

### Existing artwork audit

| Existing file | Inspection | Production action |
| --- | --- | --- |
| `pieces/settlement/settlement.png`, 1254 × 1254 RGBA | Detailed multi-building compound, trees, jars, bright magenta roofs/bands | Preserve as a source reference and possible larger construction illustration. Make a simpler board-scale derivative and explicit recoloring mask. |
| `pieces/city/city.png`, 1312 × 1199 RGBA | Monumental central building, columns, stairway, surrounding structures; magenta color areas | Preserve. Derive a distinct, compact city silhouette rather than shrinking the entire compound to 24 pixels. |
| `pieces/road/road.png`, 1536 × 1024 RGBA | Raised diagonal stone span, large end pillars, magenta center, broad surrounding glow | Preserve as a style reference. Its pillars/glow and fixed perspective do not fit narrow shared board edges; derive a restrained paving segment. |
| `dice/dice.png`, 1254 × 1254 RGBA | Many dice poses packed into one sheet, warm body and navy pips | Preserve. Select usable faces only after documenting bounds/value/orientation; otherwise derive six clean final faces from this style. There is no documented animation order. |
| `resources/resources.png`, 1448 × 1086 RGBA | Five distinct, cohesive painted objects | Reuse. Existing crops are documented in [ASSET_GUIDE.md](ASSET_GUIDE.md). |
| Six terrain PNGs, each 1254 × 1254 RGBA | Detailed point-up hex paintings | Retain geometry, crop, alignment, and paintings. |
| Palace and ocean backgrounds | Correctly separated menu/match uses | Retain. No additional gameplay wallpaper is needed. |

The magenta areas are visible in the building/road files, but there is no ownership-mask contract in the loader. Do not assume that a chroma-key operation will produce clean color masks. Fine roof shading and gold details need deliberate separation by the artist.

## 3. Settlement, city, and road kit — highest board impact

### Settlement

Design a small warm-stone dwelling/compound with one dominant roof mass, a strong doorway, and a simple stepped outline. Keep the existing painting's materials and architectural language. Reduce the many trees, jars, crates, terraces, and tiny walls to a few large readable forms. The board-scale settlement should feel smaller and less ceremonial than the city.

One roof or cloth band may carry player color. Give that color area enough visual area to remain visible at 20–22 pixels wide. Avoid a tiny banner as the sole ownership signal. Keep stone, wood, and gold outside the mask.

### City

Use a larger stepped mass and a clear columned facade or central raised hall. Differentiate the city by silhouette and structure before detail: it must remain distinct from a settlement in grayscale and at fitted board size. Preserve the existing city's central entrance/column identity, but omit most surrounding compound structures in the board version. Do not make every structure look equally palatial.

### Roads

Use low stone paving or a modest constructed causeway with a colored central strip. Remove tall endpoint monuments from the board version: settlement/city pieces must occupy those junctions, and roads need to connect naturally. Keep the road body shorter than the full edge so endpoint buildings and ownership badges have room. Avoid ground islands, grass, long cast shadows, or a glow baked into the road texture.

The board has three undirected edge orientations: 30°, 90°, and 150° in screen coordinates. For painted depth and upper-left lighting, provide three matching views with the **same logical edge length**, rather than rotating one strongly lit isometric painting. If the final road is essentially flat paving with a symmetric short shadow, one rotatable body/mask can be enough; choose that simplification during the first size proof. Do not paint three unrelated road designs.

### Layers and exports

For each building, supply three aligned transparent exports on a 128 × 128 canvas: `body.png`, `color-mask.png`, and `shadow.png`. The body keeps the stone/material rendering and shaded neutral colorable areas; the mask identifies only roof/cloth/color-inlay regions. Define a consistent mask convention: opaque white where color applies, transparent elsewhere, with alpha for soft edges. The future renderer must preserve shading when applying color, rather than placing a flat opaque patch over the painting. These masks are new work, not currently supported asset metadata.

Use the same frame for every layer. Aim for roughly 80% meaningful object coverage, leaving modest room for antialiasing and shadow. Record a ground anchor near the lower center, based on the actual image; `(0.5, 0.85)` is a starting guide, not a required anchor for every silhouette. Put an anchor cross on a separate reference layer, never in the export.

For roads, use matching 128 × 128 transparent frames per view and record two logical endpoint coordinates in each frame. Logical edge length can be 100 source pixels; paint the body between those endpoints with suitable junction gaps. Scale by endpoint distance, not the enclosing square. Supply aligned body/mask/shadow layers as for buildings.

The renderer places the building ground anchor at the vertex and layers buildings over roads. Ownership uses an unobstructed colored inset without a number plate; HUD badges carry player numbers. Keep neutral stone and outlines independent from the runtime ownership color. See [UI_SYSTEM.md](UI_SYSTEM.md) for the current palette.

### States and motion

Design reference examples for owned, legal target, selected preview, and just built/upgraded. Only the static body/mask/shadow layers need export. Legality rings, translucent previews, ownership color, selection outlines, and build-pop motion should be generated in code. A preview must remain distinguishable from a committed building.

Settlement-to-city uses the same ground anchor; align the two designs so replacement feels like an upgrade at the same site. No animation sheet is needed for the existing scale/fade placement effect. Keep larger existing paintings available for a future 64–96-pixel construction/detail illustration, without adding a hero image that pushes costs and action buttons below the fold.

## 4. Robber — the first new character asset

Design one compact fictional road bandit/traveler miniature in the same painted style: charcoal-brown clothing, a simple wrapped outer garment, leather pouch/belt, sturdy footwear, and a distinctive off-center shoulder or short staff silhouette. Use a restrained warm edge highlight so the character separates from forest, mountains, and desert. Head and shoulder shape matter more than facial detail.

Treat this as a fictional character informed by the historical direction, not a claimed reconstruction of an Achaemenid robber's uniform. Avoid identifying a real ethnic group as the robber or giving the character royal/guard regalia. No skulls, oversized weapons, medieval fantasy armor, or exaggerated magical smoke. Its role is to block production; the MVP has no combat or theft action.

Use a slightly elevated three-quarter view compatible with the terrain/buildings. At approximately 18–22 × 26–28 visible board pixels, details should resolve into a few broad dark/light shapes. Keep it in the tile's upper area, away from the lower number token and edge structures. A larger ground anchor or taller pose will require adjusting the presentation offset in `renderTile()` and the matching movement path; the current circle center cannot simply become the feet position.

Deliver `pieces/robber/body.png` and `shadow.png`, aligned 128 × 128 transparent PNGs, plus a simple 24 × 24-viewBox `ui/icons/robber.svg` for future status/detail use. The shadow should be a tight contact ellipse, exported separately. Record the feet anchor. No ownership mask is needed: the robber belongs to no player.

Show these states in a design reference: resting on a tile, selected destination ghost, and production blocked. Generate the ghost through opacity/outline and show a clear runtime blocked indicator where useful. Keep the tile number readable. There is no need for angry/attacking/winning variants or a walk cycle: existing movement is a short slide between confirmed tiles. A walk animation can be considered later only if it is perceptible at this size.

## 5. Buttons, panels, and ornamental vocabulary — highest interface impact

Create a small reusable component kit with lapis/navy faces, warm ivory text zones, restrained carved-gold edges, and a shallow bevel. A small rosette or stepped-stone corner can connect controls to the board artwork. Reserve richer decoration for primary actions and major sheet headings. Keep the center of every text-bearing component quiet.

Supply a design sheet covering: primary action, secondary/dock action, quiet/cancel action, compact icon button, player chip, resource cell, construction card, trade selector, and bottom-sheet header. These are component designs, not necessarily nine separate raster frames.

For each interactive component, specify normal, pressed, disabled, selected/active when applicable, and keyboard focus. Include a desktop hover treatment if useful. Pressed controls should appear slightly inset; disabled controls should look unavailable while their labels remain readable; selected choices need a clear outline/check as well as color. Focus is a separate outer outline, not a gold decoration mistaken for selection.

### Preferred deliverables

- Two reusable material treatments: navy panel and warm-gold primary button. Provide color/gradient recipes in the design file; only export textures if painting adds visible value.
- A small vector ornament set: corner motif, divider end motif, and rosette. Usually 16–24 CSS pixels for corners and 12–16 for dividers; use SVG viewBoxes with spare room for strokes.
- If a painted frame is required, deliver a **nine-slice frame**: corners stay fixed, edges stretch/repeat, and the center remains quiet. A proposed button frame is 192 × 144 source pixels at 3×, with 24-source-pixel slice insets (8 displayed pixels). Test it at 48 CSS pixels high and widths from approximately 140 to 366. This is one stretchable source, not one asset per label.
- An optional 192 × 192 panel-frame source at 3× with 36-source-pixel corner insets (12 displayed pixels), if the vector/CSS treatment is insufficient. The 20-pixel rounded sheet shape can remain CSS, with ornament layered inside its header; it need not inherit a square frame's corner geometry.

The UI is DOM-based, so integration should use CSS borders, gradients, inline SVG, or `border-image` on a decorative layer. [MDN's border-image-slice documentation](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/border-image-slice) explains the fixed-corner/edge approach. Avoid applying a full fixed-size painting to a responsive button or turning the HUD into a single raster image. Preserve native buttons, dialog behavior, and visible focus.

All Persian wording, counters, costs, names, ratios, and labels remain runtime Vazirmatn text. Test long labels such as the robber confirmation and trade warnings. Ornament must not steal padding from these labels or force taller HUD rows. Keep the existing 48-pixel touch targets; a 22-pixel drawing can sit inside a 48-pixel button.

Retain ivory-on-navy and dark-on-gold text contrast. Meaningful outlines, selected indicators, and controls should target at least 3:1 against adjacent surfaces; this follows [W3C non-text contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html). Pure decoration can be quieter. Do not use low-contrast gold engraving as the only indication that a button can be pressed.

## 6. Functional icon family

Replace mixed text symbols and generic silhouettes with a coherent small vector set. Use a 24 × 24 viewBox, approximately 2-unit strokes where stroked, optical centering, and broadly consistent weight. At 20–24 CSS pixels, thin detailed relief drawings will disappear. Prefer a single monochrome shape or two restrained tones over miniature paintings for basic controls.

| Icon | Visual brief | Existing/future placement |
| --- | --- | --- |
| Build | Small stepped building/columned facade | Current build dock |
| Bank trade | Two clear exchange arrows; optional simple counter/scale hint | Current bank dock; do not imply a port or player negotiation |
| Road / settlement / city | Distinct simplified silhouettes matching new pieces | Current construction list and player statistics |
| Dice | Two simple dice silhouettes | Roll action, if room; final results use readable faces |
| End turn | Handover/advance cue | Primary action; keep runtime label |
| Confirm / cancel | Check and close | Confirmation/dismissal where helpful |
| More/help | Ellipsis and simple help symbol | Current top-bar help entry; no new menu required |
| History | Short stacked list/scroll silhouette | Current context/history action |
| Score | Compact rosette/seal/star-like merit emblem | Player detail and result totals where space permits |
| Robber / blocked | Bandit silhouette; separate blocked/slash mark | Tile status/help if needed |

Allow roughly 16–18 glyphs, sharing shapes where possible. Create a glyph only for a real use; confirm and cancel may remain text if their addition crowds the action. Do not invent settings, audio controls, chat, reconnection, shop, or friends buttons just because an icon exists.

Use `currentColor` for general icons so CSS can control their state. Avoid embedded bitmap images, linked fonts, filters requiring large rendering bounds, and hardcoded ownership colors. Directional handover/advance arrows may need an explicit RTL variant; magnifiers, dice, buildings, and physical board geography should not be mirrored. Show both directions in the design file where needed. Essential actions retain text/accessible labels.

## 7. Dice and number tokens

### Dice

Use the existing sheet's warm ivory/stone appearance with navy pips. Supply six final faces with unambiguous values from one to six, equal framing, equal face size, consistent perspective, and a small contact shadow. Prefer a near-front view whose result face dominates; multiple visible faces must not make the result ambiguous. Pips are part of the dice art; Persian sums/totals are runtime text.

First see whether six clean poses can be extracted from `dice/dice.png`. The sheet has many poses but no documented frame/value ordering, so do not assume a regular grid means valid animation frames. If no consistent six-face set exists, make focused derivatives in the same style and retain the original sheet.

Suggested exports: `dice/face-1.png` through `face-6.png`, 96 × 96 transparent PNGs for approximately 24–28 CSS-pixel display. The current 48-pixel match bar is tight: two faces plus total must fit the existing dice-result area without squeezing the active player/phase text. Do a top-bar size proof before rendering all faces. Keep a numeric accessible result and runtime total.

The present effect briefly wiggles the confirmed readout. Six static faces are enough for that. Do not commission a 36-combination result sheet or a long animation per result. If a tumble is added later, request a small, consistently framed strip only after specifying playback and landing behavior; the stored core roll still determines the result and presentation never generates a second roll.

### Tile number token

Create one light carved-stone/ivory round back, approximately 24 board pixels in diameter, with a shallow edge and quiet flat center. A 96 × 96 transparent PNG is sufficient for a first export. Reserve approximately 18 pixels of displayed center for one- and two-digit 14-pixel numbers; keep ornament outside that area.

Only `board/tokens/number.png` is required. Do not bake individual numbers or probability dots into separate images. Current code colors 6/8 text red; retain that runtime distinction. Normal, rolled/producing, and robber-blocked reference states can use code overlays, rings, or icons. If probability dots are later approved as an additional overlay, derive them from the existing probability query, not from hand-authored image variants.

The desert currently has a small Persian label. It can retain that runtime label; do not add a decorative desert medallion unless it improves the crowded tile at real size.

## 8. Player identity and score

Create one reusable badge frame resembling a small stone-and-metal seal, with a clean center for runtime player number and an ownership-colored inset/rim. Keep the strip version around 16–18 CSS pixels; use a more detailed 40–48-pixel version in player details if needed. Suggested exports are simple SVGs sharing a viewBox, or aligned 144 × 144 PNG frame/mask layers for a 48-pixel maximum use.

Use the session's runtime ownership colors, player numbers, names, scores, and resource totals in HUD badges. Active-turn emphasis should be a static clear border/underline with a brief transition; no permanently spinning badge or flashing halo. A badge should not enlarge the 64/56-pixel player-strip row or force names offscreen.

A set of four distinct glyphs is optional after the basic frame works. If commissioned, use clearly distinguishable simple forms such as rosette, mountain, leaf, and column, and keep them available to any player color. These are identity aids, not different civilizations with implied rules. At 16 pixels, the number is more important than an intricate emblem. Do not commission four character portraits for these small chips.

Use a single small score emblem in details/results, from the functional icon family. No longest-road/largest-army badges or invented trophy progression belong to this MVP; points currently come only from settlements and cities, with a target of six.

## 9. Victory, menu identity, loading, and contextual art

### Shared brand and victory emblems

Design a distinctive compact emblem derived from the game's stone/rosette/column vocabulary. A stylized paired-bull capital is one possible reference, but its silhouette must work without copying a detailed monument photograph. Avoid making a religious or royal symbol a casual robber marker or routine error indicator.

Supply a simple vector brand emblem for approximately 48–72 CSS-pixel menu use and a richer transparent victory medallion at 384 × 384 for about 96–128-pixel use in the results sheet. The victory version can add gold relief and a restrained ribbon shape, with no text. A shared motif makes the pair coherent; they do not need identical detail density.

Keep the winner name, player color, score, and score breakdown in runtime UI. An optional color mask can personalize the victory medallion, with the same separation conventions as buildings. Design one winner treatment; other players still receive the existing clear breakdown. A full-screen victory painting would hide the board/results and is unnecessary.

The current palace menu background stays. Place the emblem near the existing runtime title and choices without baking a title into the palace. A simple emblem variant can also serve as a small loading mark beside runtime loading text. Do not add a new splash screen or artificial loading delay to showcase it.

### Contextual illustrations — optional

If more illustrated moments are desired after the first two batches, create up to three small 256 × 256 cutouts: a bank counter/merchant's scale, a construction model, and a quiet finished-game seal arrangement. Display around 64–96 CSS pixels in sheet headers/empty regions only when they leave costs, balances, and confirmation controls easy to reach.

The bank illustration should communicate an exchange counter, not a coastal harbor or ship: the current exchange is a universal 4:1 bank rule. No invented currency is shown as a spendable resource. These illustrations are lower priority than the actual selectors and buttons and can be omitted on compact screens.

## 10. Effects, coastline, resources, and sound

### Small effect kit — optional finishing pass

Current rings, road traces, piece pops, robber slides, and resource flights already exist. Keep them. If painted textures improve the style, supply only a few reusable transparent textures: `effects/spark.png` (64 × 64), `effects/dust.png` (128 × 128), and optionally `effects/glint.png` (64 × 64). Use near-white/neutral textures for runtime tint; dust should be soft warm-neutral with transparent edges.

Use a few particles on confirmed construction and a short glint on victory/resource arrival. Keep dust behind the piece, clear of its ownership inset and the tile token. A gold glint is decorative and must not be mistaken for another resource. Do not bake ownership color, resource type, numbers, or full-screen flashes into effect sheets.

A spritesheet is unnecessary unless the effect visibly deforms. If one is commissioned, use equal untrimmed frames with a declared frame size/count, order, frame rate, duration, pivot, and non-looping playback. The code must cancel it when a sheet opens, the board layout changes, a new command arrives, motion preference changes, or the scene is destroyed. Reduced motion keeps stable cues and resource deltas. No animation creates or delays the game-state transition.

### Resource artwork

Keep all five existing objects: bundled wood, bricks, tied wheat, wool bundle, and stone. The implementation calls the fifth resource `stone`; do not replace it with shiny metallic ore or introduce a sixth resource. Preserve the same order and icon proportions in the hand, costs, trade selectors, and flights.

If optimization becomes useful, derive a compact atlas or individual approximately 96–128-pixel exports from the existing artwork with consistent optical scale and documented frames. That is an export task, not a repaint. The current CSS references explicit crop coordinates, so swapping an atlas requires an intentional simultaneous CSS/metadata change. The base paintings should remain available outside the runtime tree if a smaller runtime set is introduced later.

### Coast and ocean

The ocean image stays behind the board. The coastline is generated from the actual island boundary, so it fits every terrain shuffle and viewport. Retain that approach. A future small foam texture or stone-edge material could be applied to procedural geometry, but a prepainted island outline or full-screen board image would fight the current layout.

Additional ships, islands, beaches, ports, and animated water are lower value and can imply interactions that do not exist. Keep the perimeter clear for roads and buildings. No additional background commission is recommended in the first batches.

### Sound — separate optional commission

Beyond visual assets, short tactile sound effects could eventually strengthen button presses, dice settling, resource arrival, placement, bank exchange, robber movement, and victory. This is optional and not an instruction to add sound now. If commissioned, provide lossless WAV masters, short clean tails, no speech, consistent loudness, and permission/license records; prepare compact web exports during integration. Avoid one sound per flying resource in a large payout. Audio implementation would need a user-initiated unlock, mute control, and interruption policy. No background music or audio settings UI is currently implemented.

## 11. Delivery contract

### Source and runtime organization

Keep current filenames unchanged during planning. Proposed runtime additions follow existing lowercase kebab-case conventions; their containing folder already identifies their role, so short names are enough:

```text
public/assets/
  pieces/
    settlement/{body,color-mask,shadow}.png
    city/{body,color-mask,shadow}.png
    road/{body-30,color-mask-30,shadow-30}.png
    road/{body-90,color-mask-90,shadow-90}.png
    road/{body-150,color-mask-150,shadow-150}.png
    robber/{body,shadow}.png
  board/tokens/number.png
  dice/face-1.png ... face-6.png
  ui/icons/*.svg
  ui/ornaments/*.svg
  ui/frames/primary.png                 # only if a painted frame is needed
  ui/emblems/{brand.svg,victory.png}
  effects/{spark,dust,glint}.png         # optional
```

This tree is a proposal, not assets that already exist. One-orientation flat roads reduce the road set to `body.png`, `color-mask.png`, and `shadow.png`. Choose one approach, not both sets. Ownership-badge layers may be added under `ui/emblems/` if raster treatment is selected.

For new layered source art, use a proposed non-runtime location such as `art/source/` with a short README and manifest. Supply PSD/KRA/AFDESIGN or vector masters as appropriate, including an exported preview and the font/brush references needed to reopen them. Do not put unused enormous masters under `public/assets/`. The integration pass should update [ASSET_GUIDE.md](ASSET_GUIDE.md) when adding real files or changing the loader.

### Metadata and export rules

- RGBA PNG for painted cutouts; optimized SVG for simple glyphs/ornaments. Preserve genuine transparency. No JPEG cutouts, checkerboard backgrounds, white mattes, or opaque backgrounds disguised as transparent.
- Use sRGB and clean antialiased edges. Inspect for pale, red, or magenta fringes against both navy and warm terrain; alpha bounds alone do not prove clean edges. Keep shadows separate when supplied.
- Every related layer must use identical dimensions, alignment, and crop. Do not auto-trim layers independently. Record canvas size, visible bounds, normalized ground pivot, nominal display size, mask convention, and road endpoints when applicable.
- Supply one design master per object and one runtime set, not copies per player color or device density. Proposed 128-pixel pieces cover their fitted mobile use; enlarge only if a real proof shows a need.
- For atlases, deliver machine-readable JSON frame rectangles, original sizes, trim offsets, pivots, and animation order. Do not rely on guessed grids. Use at least 2–4 source pixels of separation/edge extrusion as appropriate to the packer, and validate texture sampling. Disable atlas rotation until the chosen Phaser/CSS loaders explicitly support it.
- SVGs should have explicit viewBoxes, predictable stroke bounds, and no embedded text, external font dependency, scripts, or linked raster files. Decorative graphics remain separate from accessible labels.
- For nine-slice sources, mark slice boundaries, display border widths, minimum size, and stretch/repeat behavior in the handoff. Corners cannot contain text that would need mirroring or localization.
- Provide the right to use and modify every asset, and record third-party reference/licensing information. AI generation is a starting point; masks, six exact dice values, matched orientations, transparency, and aligned exports usually require deliberate cleanup.

### Practical performance targets

The existing six terrain sources total roughly 14 MiB on disk and several other existing sheets are multi-megabyte paintings. Do not add similarly large images for tiny UI objects. Use the proposed 96/128-pixel cutouts and vector icons; aim for an initial new core kit around 1 MiB compressed or less, checking actual quality rather than treating that as a hard limit. File size and decoded texture memory are different budgets.

Avoid 4K exports for 24-pixel objects, unneeded looping animation sheets, and multiple color copies. The integration pass can reuse one texture across many instances, load match-only art for matches, and keep optional victory art out of the critical path when practical. The current loader uses individual PNGs; an atlas is optional, not a prerequisite for the first batch.

## 12. Production sequence and acceptance proof

### First proof before the full commission

Design one settlement, one city, one robber, one road treatment, one primary button, and three sample icons (build, exchange, fit). Put them into a design-tool composition using the approved [gameplay wireframe](design/gameplay-screen-wireframes.svg), existing terrain/ocean, and actual pixel sizes. Supply both a 1× proof and enlarged detail views. The user need not wait for an entire asset pack to assess whether these silhouettes and materials work.

Show all four ownership colors, a road junction with a building, two adjacent road orientations, a numbered/blocked tile, and the longest primary-action label. Include the current normal/compact portrait layouts and 320-, 390-, and 480-pixel widths. This is a design proof, not a replacement runtime screenshot or a request to launch a browser.

### Batch order

1. Approve the material/silhouette proof; finish board piece layers, robber, core controls, and functional icons.
2. Finish six dice faces, token back, ownership badge, and victory/menu emblems.
3. Add optional particle textures, contextual illustrations, and sound only if the first two batches reveal a useful gap.

Do not commission development-card fronts/backs, finite-inventory trays, port buildings, player-trade panels, longest-road/army awards, online avatars, currency shops, or reconnection UI until their corresponding systems are adopted. Current gameplay has unlimited pieces, local shared-device play, bank-only trading, no cards, and no robber theft/discard. Asset production must follow those decisions.

### Acceptance criteria for each batch

- Recognizable at fitted mobile board size, not just on a large source canvas; verify the smallest supported canvas as there is no zoom control.
- Settlement and city remain distinct in grayscale. Board ownership colors stand apart from terrain, with neutral borders preserving piece boundaries. Player numbers remain in HUD badges.
- Tile numbers, road junctions, and valid-target cues remain clear; the robber does not hide the number token.
- Body, mask, and shadow stay aligned during scale/move/upgrade. Road endpoints fit geometry without visible gaps or giant pillars.
- Control frames stretch without warping ornament, text stays runtime RTL, and touch/focus behavior remains intact.
- Default, preview, selected, pressed, disabled, active-turn, and reduced-motion examples communicate the same states without relying on animation alone.
- No gameplay-relevant information is embedded only in an image; no unsupported game system is implied by a decorative asset.
- Transparency, pivots, frame bounds, slice metadata, source location, and naming are documented before integration.

The result should make the current board and interactions feel deliberately crafted while preserving the mobile layout and existing game rules.
