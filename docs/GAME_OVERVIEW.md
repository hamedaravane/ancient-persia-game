# Game overview

## Product

Ancient Persia is a mobile-first Persian-language local multiplayer strategy board game inspired by hex-based resource production and settlement building. It uses a historically grounded Achaemenid visual direction.

## MVP status

The game is playable locally for three or four people sharing one device. Players take turns, roll dice, collect resources, build roads and settlements, upgrade settlements, trade with the bank, move the robber after a seven, and race to six victory points.

The board and rule state live in Phaser-independent TypeScript under `src/game/core/`. Phaser scenes display that state and forward input to core actions. No online services, accounts, bots, chat, or persistence are included.

## Match outline

1. Choose three or four local players.
2. Each player receives two separated starting settlements and a road at each one on a generated 19-hex board; the second settlement grants its adjacent resources once.
3. At the start of each turn, the active player rolls two dice.
4. Matching numbered tiles produce one resource for each adjacent settlement and two for each adjacent city, unless the robber blocks that tile.
5. During the action phase, players may build, upgrade, trade with the bank, and then end their turn manually.
6. The first player to six victory points wins immediately.

## Platform

- Web, designed for mobile portrait first
- 390 × 844 reference canvas, scaled to fit the device
- Phaser 4 presentation and input
- TypeScript game state and rules
- Persian right-to-left interface text kept in runtime strings for localization
