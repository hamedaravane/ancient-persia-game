# MVP rules

This document records the playable local MVP. Larger multiplayer, economic, setup, and scoring systems remain out of scope until designed.

## Board setup

- Generate a radius-two hex board containing 19 tiles.
- Tile counts: four forests, three mesas, four wheat fields, four pastures, three mountains, and one desert.
- Terrain-to-resource mapping: forest → wood, mesa → brick, wheat field → wheat, pasture → wool, mountain → stone. Desert produces nothing.
- Shuffle the terrain and number-token bags for each new game. The 18 productive numbers are `2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12`.
- The robber starts on the desert.
- In snake order, each player places two separated starting settlements and one road attached to each. Each player's second settlement grants one resource from every adjacent productive tile. There is no resource grant for the first settlement.

## Turn and production

- The active player rolls two six-sided dice at the start of a turn.
- A total from 2 to 12 activates every productive tile with that number.
- Each adjacent settlement produces one unit of the tile's resource for its owner; each adjacent city produces two.
- A robber on a tile blocks that tile's production.
- A total of seven gives no normal production. The active player must move the robber to a different tile before taking other actions. The MVP robber does not steal a resource.
- After resolving the roll and any robber move, the active player can take actions until manually ending the turn. There is no action limit in the MVP.

## Building

- Road cost: one wood and one brick.
- Settlement cost: one wood, one brick, one wheat, and one wool.
- City upgrade cost: two wheat and three stone.
- A road occupies one unoccupied board edge and must connect at one endpoint to the player's own building or an existing road in their network. An opponent's building blocks a road network from continuing through that intersection.
- A settlement occupies an empty board vertex, must connect to one of the player's roads, and cannot be adjacent to another settlement or city.
- A city replaces one of the active player's settlements at the same vertex.
- Building and upgrades have no additional per-turn or piece-supply limits in this MVP.

## Bank trading and victory

- During the action phase, exchange four units of one resource for one unit of a different resource at the bank.
- Each settlement is worth one victory point. Each city is worth two. Roads are worth zero.
- All starting settlements count toward victory points.
- The first player to reach six points wins immediately; no further action or turn change is allowed.
