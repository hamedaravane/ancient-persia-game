# Game overview

## Product

Ancient Persia is a mobile-first Persian-language local multiplayer strategy board game inspired by hex-based resource production and settlement building. It uses a historically grounded Achaemenid visual direction.

## MVP status

The game is playable locally for three or four people sharing one device. Players take turns, roll dice, collect resources, build roads and settlements, upgrade settlements, trade with the bank using eligible coastal port rates, move the robber after a seven, and race to six victory points.

The board and rule state live in Phaser-independent TypeScript under `src/game/core/`. A local session adapter publishes confirmed state to the Phaser board and Graphics interface. Transparent semantic controls provide responsive measurements, keyboard/screen-reader input, scrolling, and modal focus. Controls use responsive layouts and focused bottom sheets; placement and bank exchanges require confirmation. No online services, accounts, bots, chat, or persistence are included.

## Match outline

The menu also offers **سفر با آناهیتا**, an opt-in guided version of the same three- or four-player local match. Anahita introduces rules through contextual Persian dialogue, six supplied expressions, phase-aware objectives, and a replayable lesson journal. Help → **دفتر سفر آناهیتا** can enable, pause, or review guidance during any match. Narrative progress lasts for the current match only. See [TUTORIAL_DESIGN.md](TUTORIAL_DESIGN.md) for research, lesson flow, and implementation boundaries.

1. Choose three or four local players.
2. Each player receives two separated starting settlements and a road at each one on a generated 19-hex board; the second settlement grants its adjacent resources once.
3. At the start of each turn, the active player rolls two dice.
4. Matching numbered tiles produce one resource for each adjacent settlement and two for each adjacent city, unless the robber blocks that tile.
5. During the action phase, players may build, upgrade, trade with the bank, and then end their turn manually.
6. The first player to six victory points wins immediately.

## Platform

- Web, designed for mobile portrait first
- 390 × 844 reference layout, responsive to the available safe area
- Phaser 4 board and Graphics UI presentation in one canvas; transparent DOM/CSS layout and accessibility adapter
- TypeScript game state and rules
- Persian right-to-left interface text kept in runtime strings for localization
