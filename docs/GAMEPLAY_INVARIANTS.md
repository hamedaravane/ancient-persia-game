# Gameplay invariants

These invariants are enforced by the pure TypeScript rules in `src/game/core/` and must remain true in every resulting game state:

- New ordinary boards use the official fixed A–R token sequence along a counterclockwise corner-to-center spiral, skipping the shuffled desert. They have no adjacent 6/8 tokens; saved boards are not renumbered.
- The disposable beginner exercise never overwrites or mutates a saved match. Its staged roll/resources and idle opponents are explicit; performed production, payments, trades, placements, and scores still use the normal rules.
- Every road has exactly one owner and occupies one valid board edge.
- Every settlement or city has exactly one owner and occupies one valid board vertex.
- An edge can contain at most one road; a vertex can contain at most one building.
- A city can only replace a settlement owned by the active player.
- Outside setup, a new settlement is empty, is connected to the active player's road, and has no building on a neighboring vertex.
- A new road is empty and extends the active player's network. An opponent building interrupts network continuation through its vertex.
- A player pays the full required cost before an ordinary road, settlement, or city upgrade is applied. Opening settlements/roads are free and use separate validated commands.
- Opening starts empty. Starter rolls choose the highest roller, without production or robber activation. Tied highest contenders alone reroll.
- Opening pairs follow the chosen clockwise starter order and then its exact reverse. Each settlement must precede its own adjacent road; the last first-round seat acts twice consecutively. Setup cannot be skipped or mixed with ordinary actions.
- Every opening settlement obeys distance/occupancy but needs no existing road connection. Every opening road touches the currently pending settlement anchor.
- Only a second opening settlement grants one resource per adjacent productive tile, at confirmation. Previews, first settlements, roads, cancellation, and resume never duplicate that grant.
- Partial setup saves preserve the exact acting seat, completed pairs, and pending road anchor. All pairs must finish before ordinary rolls; the chosen starter takes that first roll. Normal round counting wraps at that starter.
- Every board has nine distinct coastal ports: four general and five different specialists. Port access edges do not share endpoints.
- Only a building at one of a port's two coastal endpoints grants its owner access; roads alone never do. Building upgrades preserve access.
- A trade pays exactly the validated 4:1 bank, 3:1 general-port, or matching-payment-resource 2:1 specialist rate and receives one unit of a different resource. Ownership and rates derive from authoritative board state; discounts never stack.
- Newly built ports can be used immediately in the action phase. The land robber does not change port rates or access.
- Only the active player may build, use the bank/ports, or end a turn. Domestic trades may include a nonactive participant, but must always include the active player after roll/robber resolution. Human ordinary action/draft input is rejected during bot turns; domestic negotiation with the acting bot is the exception. Bot ordinary commands cannot execute on the human seat or after victory.
- A fixed human seat owns the personal header row, resource hand, and resource feedback regardless of the active seat. The header’s opponent scoreboard projects only public scores, identities, and turn status; bot activity never swaps the displayed hand or reveals exact opponent inventories.
- Bot turns follow the normal seat order and shared validated rule commands. A stale scheduled command cannot affect a replaced/resumed state. Open dialogs, hidden pages, menu return, and teardown suspend/cancel ordinary automatic play. The domestic workspace permits only paced bot replies to human offers; incoming human decisions and bot-to-bot work remain paused there.
- Domestic exchange conserves every resource across the two hands and charges both outgoing bundles before receipt. Both bundles are nonempty, contain safe nonnegative integer resource quantities, and share no resource type. Invalid, stale, withdrawn, unaccepted, or already-completed offers never transfer resources.
- Offers/counters do not reserve or spend cards. Final confirmation requires current consent and revalidates both balances. A confirmed broadcast trade cancels competing promises; turn changes invalidate pending negotiations.
- Human tutorial practice is earned only by human commands or completed domestic trades involving the human. Bot-to-bot trades, bot rolls/builds/bank trades, and robber moves cannot earn it.
- Only the active player can roll while the game is waiting for the roll.
- A seven suspends production until the robber is moved to a different tile.
- A tile with the robber produces no resources.
- Dice results are generated and stored by core game logic before presentation or animation.
- A settlement produces one resource per matching adjacent tile; a city produces two.
- Victory points derive from owned buildings: one per settlement, two per city. A player at six points ends the match immediately.
- Player ownership colors are runtime data.

Core transitions return a new state on success and preserve the original state when the action is rejected. Phaser scenes never make rule decisions themselves.
