# Development cards, seven resolution and ten-point scoring

These rules implement the requested base-game development deck, robber sequence and scoring titles. The in-game figure remains Ahriman (اهریمن); saved-state and command identifiers continue to use `robber`. Resources named `stone` and `wheat` are this game's ore and grain. The [official CATAN Rules & Almanac](https://www.catan.com/sites/default/files/2021-06/catan_base_rules_2020_200707.pdf) is the rule reference.

## Development deck and timing

New matches shuffle exactly 25 individually identified cards: 14 Knights, 5 Victory Points, 2 Road Building, 2 Monopoly, and 2 Year of Plenty (Invention). Buying costs one stone, wheat and wool, draws one card privately, and may be repeated while the deck/resources allow. Purchasing neither consumes the turn's development play nor allows an immediate non-VP play.

A player may play one non-VP development card during their own turn, either before rolling or after normal roll resolution. Buying during a round stamps that owner's round number: because each player has one turn per round, it is unavailable until their next turn. The play flag resets only at turn handover, never at dice roll. Mandatory discard/move/theft/free-road operations must finish before another ordinary command is available.

- **Knight:** consume the card, increment that player's played-Knight count, then move Ahriman and choose a theft victim if one is eligible. It does not trigger discards. A pre-roll Knight returns to the still-required roll; an action-phase Knight returns to actions.
- **Road Building:** reserve up to two mandatory, sequential free road placements under the ordinary ownership/connectivity rules. The first changes legality for the second. Each player has 15 road pieces; if only one piece/legal placement remains, the effect completes after one. The card cannot start without a legal placement. Cancellation clears a preview without abandoning its required placement. No wood/brick is charged. Public-score victory can end the match after the first road.
- **Monopoly:** choose one resource; atomically transfer all cards of that type from every opponent to the active player. Other resources stay unchanged.
- **Year of Plenty:** choose two resources, which may be identical. This project retains its previously unlimited resource bank; finite bank stock and settlement/city piece supplies are outside this change.
- **Victory Points:** remain in the private hand and cannot be played as an ordinary card. All held VP cards count, including cards bought this turn. If hidden points are needed to reach ten, the player explicitly declares victory; only the winner's VP cards become public. Bots make that declaration through the same command.

The Persian card workspace shows buying costs/current stock, each owned card's effect and timing restriction, and resource choices for Monopoly/Year of Plenty. Opponent hands and future deck order are never rendered. Opponent planning uses public scores, geometry, resource totals and its own hand; it does not inspect opposing VP cards or future draws.

## Seven: discard, move, then steal

A seven produces nothing. Snapshot each player with more than seven **resource** cards and require a chosen discard bundle of `floor(total / 2)`. Development cards are excluded. Each discard must be safe, nonnegative, within that owner's holdings, and exactly the required size. The local interface resolves choices in seat order, including a human discard during a bot's turn; the active turn itself never changes. This sequential local input represents every player's own choice and does not permit normal actions between choices.

After all discards, the active player must move Ahriman to a different hex, including the desert if desired. The occupied hex stays blocked until Ahriman moves again. No resources are produced by movement. Then select exactly one opponent who owns a settlement/city adjacent to that hex and has at least one resource. Repeated buildings do not duplicate eligibility; the active player and empty hands are excluded. Sample uniformly across the victim's individual resource cards, not uniformly across resource types, and transfer one card. If no eligible victim exists, finish immediately without a theft.

While any step is pending, rolling again, buying/playing cards, paid construction, domestic/bank trading, victory declaration and turn handover are rejected. Bots pause for the human's discard or victim choice, respect dialogs/hidden pages and complete their own mandatory operations through the same command dispatcher. Confirmed pending steps survive reload; unconfirmed discard/placement drafts restart empty.

## Scoring titles and victory

`core/scoring.ts` computes an edge-simple continuous trail for Longest Road: segments may not repeat, disconnected components and branches are not summed, and an opponent building stops traversal through its intersection. Own buildings do not interrupt it. The title needs at least five segments and is worth two points.

Largest Army needs three **played** Knights and is worth two points. Held Knights never count. Both titles retain the incumbent on a tie and transfer only to a strictly greater qualifying value. If a road interruption removes the incumbent from the longest qualifying group, a unique longest player receives the title; a tie between others leaves it unowned. Values below the threshold cannot hold the title. Recalculate titles after road/building changes and played Knights.

Total private score is settlements + twice cities + held VP cards + two for each owned title. Public score excludes another player's hidden VP cards until that player wins; ranks/leader badges use public scores even when the human can see their own private total. Only the active player can win. Receiving a title off-turn can raise a player to ten without ending the match; they win on their own turn. Public totals of ten finish automatically after a scoring action or at the start of that player's turn. Hidden-point totals expose an explicit declaration action, available before the roll or during normal actions. Finished games reject further moves.

## State, recovery and boundaries

`GameState.development` owns the finite deck, private hands, used-card ledger with player attribution, played counts and turn play flag. `awards` preserves incumbents for historical tie decisions. `robberResolution` and `roadBuilding` preserve mandatory operations and their return phase.

New saves use version 2 while retaining the existing storage key. Strict validation checks all 25 unique cards against the original distribution, purchase rounds, used-card attribution, Knight counters, title eligibility and mandatory phase metadata before rendering. Unfinished six-point version-1 saves acquire a deterministic fresh deck, zero played Knights, recomputed titles and a ten-point target while retaining their board and resources; an unresolved old seven enters the new discard sequence. Completed historical six-point games keep their old results. Invalid/incompatible saves, including road inventories beyond the new 15-piece supply, are not silently rewritten; the source storage is preserved until the user explicitly starts a replacement.

Core modules own every rule; scenes and semantic controls only dispatch choices. `developmentDeck.ts`, `development.ts`, `robber.ts` and `scoring.ts` stay Phaser-independent. The existing transition pipeline carries public action notices without logging the type of a newly bought private card.

## Trade outcomes

A rejection closes the negotiation panel without moving resources. An accepted proposal still requires the existing explicit final confirmation; acceptance alone is not yet an exchange. Successful final confirmation transfers once, records the public receipt in history/table, and returns directly to the board. A final rejection of a human broadcast closes when no other replies remain pending. Stale/invalid actions keep the workspace and explain their failure. Tutorial practice is credited without opening another completion dialog over the returned board.

## Verification

Focused Node suites cover the exact deck, costs and repeated purchases; purchase/play timing before and after dice; all card effects; partial Road Building; played-Knight awards/transfers; seven thresholds, choices and all mandatory guards; desert movement, eligible victims and weighted random theft; route forks, loops and interruptions; title ties and off-turn victory; hidden-score projections; strict save validation/migration/resume; automatic trade dismissal; and seeded full-session progression. TypeScript, scoped lint and formatting supplement these checks. Browser/device tests, production builds and CI remain user-run under `AGENTS.md`.
