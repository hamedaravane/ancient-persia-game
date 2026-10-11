# UI system

## Layout targets

- Mobile portrait is the primary target, with a 390 × 844 reference canvas.
- Phaser scales the fixed portrait coordinate space to fit the available display.
- Keep game content clear within the screen's safe area.
- Preserve enough room for the board to remain the primary visual focus.

## Language and interaction

- Persian is the interface language and is rendered right-to-left.
- Keep all visible words in runtime text, separate from core game rules, for easy localization.
- Primary touch controls should be at least 44–48 CSS pixels high or wide.
- Select a build tool, then tap a board edge or intersection. Select a robber destination by tapping another tile.
- Bank trading uses a two-step choice: select the resource to exchange, then select the resource to receive.
- Show concise validation feedback in the interface.

## MVP interface

- The opening panel offers three-player and four-player local matches.
- The portrait game screen shows the active player, turn, score, dice result, board, active player's resources, build tools, bank trading, and manual end-turn control.
- Player colors are runtime values. The board draws player-owned roads and buildings in those colors.
- Use reusable panels and consistent color, spacing, and touch feedback when extending the interface.

## Typography

- Use self-hosted Vazirmatn for both DOM and Phaser canvas text, with Tahoma, Arial, and sans-serif as fallbacks.
- The current interface uses only Regular (400), so ship only that WOFF2 face. Add other weights when a specific interface element needs them.
- Declare the face in `src/styles/global.css`; use `UI_FONT_FAMILY` from `src/game/ui/typography.ts` for Phaser text.
- Preload the local font in `index.html` and await `loadUiFont()` before creating Phaser text. Canvas labels need the font available when their size is measured and their textures are drawn. A download failure falls back to system fonts so the game can still start.
- Preserve full upstream glyph coverage for Persian shaping, digits, punctuation, and Latin text. Keep the upstream license with the font.

## Future UI work

A reusable component library, final type sizes and spacing scales, safe-area refinement, and dedicated trade/confirmation sheets remain future work.
