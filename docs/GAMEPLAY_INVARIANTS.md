# Gameplay Invariants

- A road belongs to exactly one player.
- A settlement belongs to exactly one player.
- A city replaces an existing settlement.
- A player cannot build using insufficient resources.
- A settlement can only be placed on a valid board vertex.
- Two settlements cannot violate the minimum-distance rule.
- A road must occupy a valid board edge.
- One board edge can contain at most one road.
- One board vertex can contain at most one building.
- Dice results are game-state data, not animation-generated randomness.
- Visual animation must never determine gameplay results.
- Player-owned pieces use runtime ownership colors.