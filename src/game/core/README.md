# Game core

The modules in this directory own the game state and rules. They are plain TypeScript and do not import Phaser.

- `types.ts` defines the board, player, piece, resource, phase, and result types.
- `board.ts` generates the hexes and their shared vertices and edges.
- `commands.ts` defines serializable actions and dispatches them through the validated rules.
- `bot.ts` chooses deterministic actions using public board data and the bot’s own inventory; pacing and controller ownership remain outside core.
- `setup.ts` owns highest-roll starter selection, forward/reverse opening order, free placement/road anchoring, and second-settlement resources.
- `game.ts` initializes players and applies validated turn actions as state transitions.
- `building.ts` owns construction costs and geometry/ownership validation, shared by commands and previews.
- `production.ts` computes per-tile/per-recipient production grants shared by dice payment and presentation.
- `queries.ts` exposes build availability, shortages, legal target IDs, public player summaries, and dice production probabilities without mutating state. `getBankTradeError` in `game.ts` is shared by bank commands and previews.

The local session adapter calls these functions and publishes the resulting state to the Phaser board/Graphics interface and their semantic input adapter. Drafts and previews live outside core and never spend resources. Confirmation always revalidates through a core command. Keep presentation and input behavior outside this directory.
