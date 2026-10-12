# MVP rules

This document records the playable local MVP. Larger multiplayer, economic, setup, and scoring systems remain out of scope until designed.

## Board setup

- Generate a radius-two hex board containing 19 tiles.
- Tile counts: four forests, three mesas, four wheat fields, four pastures, three mountains, and one desert.
- Terrain-to-resource mapping: forest → wood, mesa → brick, wheat field → wheat, pasture → wool, mountain → stone. Desert produces nothing.
- Shuffle the terrain and number-token bags for each new game. The 18 productive numbers are `2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12`.
- The robber starts on the desert.
- Nine ports occupy fixed, separated coastal edges: four general ports and one specialist for each of wood, brick, wheat, wool, and stone. Shuffle the port types using the same supplied random source as the board. Each port connects to exactly the two endpoints of its coastal edge.
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

## Bank and port trading

- During the action phase, exchange four identical resources for one different resource at the bank, without needing coastal access.
- A settlement or city at either endpoint of a port grants its owner access immediately, including the turn it is built. A road or a building elsewhere on the coast does not grant access. Access is derived from the building, never tracked separately.
- A general port permits three identical resources for one different resource. A specialist permits two units of its indicated resource for one unit of any different resource; the discount applies to payment, not receipt.
- Choose the best available rate by default. Players may still choose the ordinary 4:1 rate, or 3:1 if they also own a general port. Discounts never combine to produce 1:1. A city has the same rate as a settlement.
- The land robber blocks production, not port access. Ports introduce no pirate, shipping, sea roads, or island-building rules.
- The bank remains unlimited in this MVP; finite bank inventories, negotiated player trading, and other base-game systems are separate decisions.

These maritime rules follow the [official CATAN base rules and almanac](https://www.catan.com/sites/default/files/2021-06/catan_base_rules_2020_200707.pdf), maritime trade and harbor sections. Port types shuffle over this project's fixed coastal slots; these are not a reproduction of CATAN's printed frame layout. Other MVP rules remain as recorded above and below.

## Victory

- Each settlement is worth one victory point. Each city is worth two. Roads are worth zero.
- All starting settlements count toward victory points.
- The first player to reach six points wins immediately; no further action or turn change is allowed.
