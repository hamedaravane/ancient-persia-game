# Gameplay invariants

These invariants are enforced by the pure TypeScript rules in `src/game/core/` and must remain true in every resulting game state:

- Every road has exactly one owner and occupies one valid board edge.
- Every settlement or city has exactly one owner and occupies one valid board vertex.
- An edge can contain at most one road; a vertex can contain at most one building.
- A city can only replace a settlement owned by the active player.
- A new settlement is empty, is connected to the active player's road, and has no building on a neighboring vertex.
- A new road is empty and extends the active player's network. An opponent building interrupts network continuation through its vertex.
- A player pays the full required cost before a road, settlement, or city upgrade is applied.
- A trade gives four units of one resource and receives one unit of a different resource.
- Only the active player can take an action during the action phase.
- Only the active player can roll while the game is waiting for the roll.
- A seven suspends production until the robber is moved to a different tile.
- A tile with the robber produces no resources.
- Dice results are generated and stored by core game logic before presentation or animation.
- A settlement produces one resource per matching adjacent tile; a city produces two.
- Victory points derive from owned buildings: one per settlement, two per city. A player at six points ends the match immediately.
- Player ownership colors are runtime data.

Core transitions return a new state on success and preserve the original state when the action is rejected. Phaser scenes never make rule decisions themselves.
