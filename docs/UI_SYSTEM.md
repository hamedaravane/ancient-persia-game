# UI system

## Layout targets

- Mobile portrait is primary, with a 390 × 844 CSS-pixel reference safe-content layout and a centered maximum width of 480 pixels.
- Use real CSS pixels for HUD text and touch controls. The DOM grid reserves 48 pixels for the match bar, 64 for players, 40 for context, 80 for resources, 64 for the dock, 64 for the primary action, and 16 for bottom spacing. The board receives the remaining height.
- Measure safe-content height, excluding device insets. Below 720 pixels, use the approved compact rows: players 56, context 36, hand 72, dock 56, primary 56, and bottom spacing 8. Primary buttons remain 48 pixels high.
- The board region includes a 56-pixel toolbar clearance for zoom/fit and target selection. ResizeObserver measures the remaining canvas area. Phaser uses `Scale.NONE` with explicit `scale.resize` calls; it never scales HUD text or controls.
- Fit the island to that canvas with a maximum hex radius of 38 and room for its coastal shelf. Preserve the board's geographic orientation in the RTL interface. Pinch zoom, drag while zoomed, and explicit zoom/fit controls affect only the board.
- Ocean artwork covers the match shell; palace artwork appears only on the menu. Controls have solid navy surfaces, ivory text, muted gold borders, and lapis accents.

## Components and ownership

- `src/game/ui/GameHud.ts` assembles the match bar, player strip, context line, resource hand, action dock, and primary action. DOM nodes for the board viewport remain stable across updates.
- `components.ts` supplies shared button, resource, number-formatting, color, and escaped-text markup helpers. Resource icons crop the existing atlas through CSS rather than duplicating files.
- `bottomSheet.ts` uses a native modal dialog with focus trapping, an inert covered interface, a visible close button, Escape/backdrop dismissal, and focus restoration. Sheets scroll independently of the screen.
- `sheets.ts` renders construction, bank trade, player/tile details, history, help, results, and an unfinished-trade warning.
- `session.ts` owns the local match adapter, open sheet, uncommitted trade choices and placement preview, notices, the latest confirmed transition, and the last 100 events. It calls pure core commands and publishes confirmed state. No persistence or online viewer projection is implied.
- `GameFeedback.ts` bridges confirmed transition feedback between board and HUD. `motion.ts` shares reduced-motion preferences and finite DOM animation groups. Unchanged HUD markup retains its nodes.
- `GameScene.ts` presents terrain, number tokens, production highlights, runtime ownership markers, and previews. `rendering/boardInput.ts` uses one input surface and nearest-legal-target selection rather than overlapping edge/vertex hit objects.
- `src/game/assets.ts` records inspected source frames for supplied polish art. `components.ts` renders decorative DOM crops for dice, ornaments, bank art, and the results medallion; Phaser uses the same registry for the robber, stone number-token backs, and construction effects. Persian numbers/labels and player ownership remain runtime data. Compact sheets omit the bank header illustration.

## Language and interaction

- Persian, right-to-left, runtime text throughout. Resource order is consistently wood, brick, wheat, wool, stone in RTL reading order.
- Player chips show name, score, total resources, and active-turn emphasis. Runtime ownership colors are paired with player numbers on chips, roads, and buildings. Player details show public building counts and the score breakdown.
- The persistent five-resource hand belongs to the active player in shared-device play. Each exact count has a resource icon and label. No online privacy or handover-cover policy has been added.
- The dock exposes only implemented workspaces: Build and Bank Trade. Before rolling or resolving the robber, sheets remain inspectable and explain why actions are unavailable. Unsupported cards, ports, player trades, timers, and online controls are absent.
- Construction lists full costs, explicit shortages, built counts, and availability from core queries. Supply is unlimited; do not display invented remaining-piece counts. Select a type, choose a highlighted legal target, review the board preview, then confirm. Cancel changes no game state or resources.
- Robber destinations also require preview and confirmation. Clearing the preview does not bypass required relocation.
- Bank trading stacks labeled give/receive selectors, shows the 4:1 rate, exact payment/receipt, and resulting balances before confirmation. Validation and execution share core rules. Trade choices survive sheet dismissal; ending a turn warns only if an unfinished trade would be discarded.
- The primary button follows the phase: Roll, Confirm Placement, End Turn, or Results. A placement without a target cannot be confirmed. Ordinary turn endings have no confirmation dialog.
- Tap a tile for number, production probability, robber status, and neighboring buildings. A focusable select provides keyboard access to inspection and target choices. HUD controls have semantic labels and visible focus styles.
- Context prioritizes the required next action and links to history. Dice remain visible for the turn, matching unblocked tiles are highlighted, and resource totals come from confirmed state. Feedback is announced through a polite live region.
- Results explain each player's settlement/city score and allow final-board inspection or returning to the menu for a new match.
- No animation gates a state change. Confirmed actions drive short dice, production, resource-delta, building, robber, turn, and victory effects. Sheet entrances and press feedback use the same motion vocabulary. Live reduced-motion preferences replace travel/scale/rotation with opacity feedback and stationary deltas. See [ANIMATION_DESIGN.md](ANIMATION_DESIGN.md) for research, timings, ownership, and interruption behavior.

## Typography

- Use self-hosted Vazirmatn for DOM and Phaser text, with Tahoma, Arial, and sans-serif fallbacks.
- Ship only Regular (400). Use size, spacing, and contrast for hierarchy; add other weights only for a concrete need.
- Declare the face in `src/styles/global.css`; use `UI_FONT_FAMILY` for canvas labels.
- Preload the local font in `index.html` and await `loadUiFont()` before creating Phaser text. A download failure falls back to system fonts.
- Preserve upstream Persian shaping, digits, punctuation, and Latin coverage and retain the license.

## Design reference and future scope

The approved [gameplay screen design](GAMEPLAY_SCREEN_DESIGN.md) and [wireframes](design/gameplay-screen-wireframes.svg) remain the design references. Their current-rule structure is implemented; future cards, negotiated player trading, hidden information, finite inventories, awards, and online behavior require documented rule/product decisions first. `GAME_RULES.md` remains authoritative.

The user performs interactive device testing. Routine verification uses TypeScript, the production build, and focused pure-core/session behavior checks; do not launch a browser unless requested.
