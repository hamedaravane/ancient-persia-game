# Game core

The modules in this directory own the game state and rules. They are plain TypeScript and do not import Phaser.

- `types.ts` defines the board, player, piece, resource, phase, and result types.
- `board.ts` generates the hexes and their shared vertices and edges.
- `game.ts` initializes players and applies validated turn actions as state transitions.

Scenes may call these functions and render the returned state. Keep presentation and input behavior outside this directory.
