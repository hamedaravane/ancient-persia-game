# Portrait gameplay screen: research and proposed design

Status: approved design, researched 2026-10-11. The current-rule layout and workspaces are now implemented; future-rule and online sections remain proposals. `GAME_RULES.md` remains authoritative. The current product is a local three/four-player MVP; this proposal also describes the interaction and privacy requirements of a future online version.

## Implementation status

Implemented: responsive DOM/CSS HUD and safe-area sizing, compact-height layout, active-player resource hand, public player summaries, core-derived construction costs/shortages/legal targets, board previews and explicit confirmation, reviewed 4:1 bank trades, contextual primary action, tile inspection, pinch/button zoom and fit, keyboard target/inspection selectors, modal focus handling, local event history, help, and final score breakdown. Phaser draws the original terrain, coastline, and runtime ownership markers inside the measured board viewport. A 56-pixel toolbar clearance within the board region keeps zoom and selection controls off the island. The six-point target, unlimited supplies, automatic setup, and simplified robber are unchanged.

Deferred until explicitly selected: cards and their deck/rules, player trading, finite piece/bank inventories, ports, awards, manual setup, discard/theft, privacy handover, sound, online services, and timers. No placeholder controls imply support for these systems. See [UI_SYSTEM.md](UI_SYSTEM.md) for implemented component responsibilities and interaction details. The wireframes remain schematic design references, including conditionally illustrated future systems.

## Recommendation

Keep the board, turn context, player summaries, and the viewer's five resource totals visible. Put detailed work in one focused bottom sheet at a time: Build, Trade, Cards, or player details. Use one large primary action that follows the current phase. Keep the rules available, but make the next required action understandable without opening them.

This is a proposed structure for base-game-style play, not a commitment to every CATAN rule or expansion. Seafarers, Cities & Knights, six-player play, and real-time simultaneous-turn variants need separate designs if selected later.

## Research and what it supports

| Primary source | Finding | Design implication |
| --- | --- | --- |
| [Official 2025 CATAN base rulebook](https://www.catan.com/sites/default/files/2025-03/CN3081%20CATAN%E2%80%93The%20Game%20Rulebook%20secure%20%281%29.pdf), downloaded and read directly | Production precedes actions; trades/builds can repeat in either order; a seven interrupts ordinary play | Model screen states explicitly. Trading and building should remain available together after required resolutions |
| [Official archived rules and almanac](https://www.catan.com/sites/default/files/2021-06/catan_base_rules_2020_200707.pdf) | Explains costs, placement, production, and development effects | Costs, legal locations, and card effects need dedicated readable surfaces |
| [Official 25th-anniversary almanac](https://www.catan.com/sites/default/files/2021-07/catan-25th-rules_eng-200313.pdf) | Explains physical piece supplies and returning a settlement after upgrading | Show remaining inventory with each build option if finite supplies are adopted |
| [Official base-game FAQ](https://www.catan.com/faq/basegame) | Clarifies pre-roll development play, hidden resource types, public hand size, trading, and victory exceptions | Separate public summaries from private information; Cards can remain usable before rolling when allowed |
| [Colonist portrait rationale, June 2025](https://blog.colonist.io/why-colonist-is-going-portrait-on-mobile/) | The developer chose portrait for easier one-handed use and focused iteration | Portrait is a credible primary format. Their reported speed gains are internal observations, not a proven benefit for this game |
| [Colonist trade redesign, August 2023](https://blog.colonist.io/improving-the-colonist-trade-system/) | Reports confusion about giving/receiving, bank access, rates, and offer responses | Use labeled give/receive areas, distinct player/bank destinations, and visible response states |
| [CATAN Universe official media](https://catanuniverse.com/en/media/) | The published wide-screen sample has a large board, extensive player banners, side tools, and a trade area | Study its coverage of game information, then redesign its spatial arrangement for portrait. The inspected 2020 media image includes expansion elements and does not establish the current mobile interface |
| [Apple layout guidance](https://developer.apple.com/design/human-interface-guidelines/layout) and [design tips](https://developer.apple.com/design/tips/) | Prioritizes essential information, grouping, safe areas, and sufficiently large targets | Give the board room; move secondary detail into panels; keep controls distinct from scenery |
| [Android minimum target guidance](https://developer.android.com/develop/ui/compose/accessibility/api-defaults#minimum-touch-target-sizes) | Recommends 48 dp interactive targets | Target at least 48 CSS pixels for ordinary web HUD controls, adapting rather than scaling them down |
| [Material bottom-sheet guidance](https://m1.material.io/components/bottom-sheets.html) | Describes bottom-anchored supplementary surfaces and distinguishes modal from persistent behavior | Use deliberate expanded/compact workspaces; do not stack several sheets or leave hidden controls interactive |

Research used documentation and published reference images, not a live app usability study. All layout measurements and workflow choices below are our recommendations, not claims that another game uses this exact arrangement.

## Systems the screen must accommodate

### Base-game reference

The classic reference includes resource production, construction costs and placement, finite pieces, player trading, bank/port rates, development cards, a seven's discard/robber/theft sequence, bonus awards, hidden information, setup, and a ten-point victory on one's own turn. These are reference requirements rather than adopted project decisions. [2025 rulebook](https://www.catan.com/sites/default/files/2025-03/CN3081%20CATAN%E2%80%93The%20Game%20Rulebook%20secure%20%281%29.pdf)

The classic piece pool is 15 roads, 5 settlements, and 4 cities per player; upgrading returns the settlement. Put those counts in the construction workspace if we adopt them. [25th-anniversary almanac](https://www.catan.com/sites/default/files/2021-07/catan-25th-rules_eng-200313.pdf)

For reference, the base game supplies 19 cards per resource and 25 development cards: 14 Knights, 5 Victory Points, and two each of Monopoly, Road Building, and Invention. Its two major awards contribute two points each; route length and played Knights determine eligibility, not total roads owned or unplayed cards. These finite stocks and awards are not implemented here. [2025 rulebook](https://www.catan.com/sites/default/files/2025-03/CN3081%20CATAN%E2%80%93The%20Game%20Rulebook%20secure%20%281%29.pdf)

### Current product and future surfaces

| System | Current implementation | Proposed access |
| --- | --- | --- |
| Board, roads, settlements, cities, robber | Present | Main board, with contextual inspection and targeting |
| Five resource types | Present; current core calls the mountain resource `stone` | Permanent hand strip; stable ordering everywhere |
| Score and target | Public building-derived points; target six | Player strip and score breakdown; read the target from game state |
| Dice and turn ownership | Present | Compact top summary; rolling uses the lower primary action |
| Construction costs | Costs, shortages, and availability exposed in the Build sheet | One-tap Build sheet with cost and availability per row |
| Remaining pieces | No supply limits | Show built totals in player details for now; no invented remaining counts |
| Bank trading | Four-for-one, one resource type each way | Trade sheet showing the applicable rate and both sides before confirming |
| Player trades and counters | Absent | Future Players trade workspace and incoming-offer notice |
| Ports and improved rates | Absent | Future board markers plus per-resource rates in Bank trading |
| Development cards | Absent | Future Cards dock entry, private hand, purchase and effect workflows |
| Discarding and robber theft | Absent; seven only requires relocation | Future forced-resolution panels and victim selection |
| Longest road/route and largest army | Absent | Future award markers and score breakdown |
| Finite bank and development deck | Absent | Future availability and shortage feedback; exact supply visibility needs a decision |
| Starting placement | Automatic | Future guided settlement/road selection if interactive setup is adopted |
| Connectivity, reconnection, account identity | Absent | Future online status and recovery states |
| Event history and help | Local history and help sheets implemented | Context line and top menu |
| Chat and sound preferences | Absent | Future communication/settings surfaces |

Do not show inactive placeholder systems as if they work. For the current MVP, the dock has Build and Trade. Cards and Players trading appear when their rules are implemented.

## Information hierarchy

### Always available on the normal board view

- Board ownership, terrain, readable number tokens, robber location, and last dice result.
- Active player and current phase. State what the viewer must do, if anything.
- The viewer's five exact resource counts, including zero values. Online, these do not switch to the active player's resources.
- Compact player summaries: identity/color, visible score, and public resource-card total where that information policy applies.
- One primary action: Roll, End Turn, Confirm Placement, or the required resolution.
- Build and Trade access; Cards access and count when enabled.
- A small connection indicator online and a durable entry to event history/settings.

### One tap away

Construction costs, remaining supplies, score components, public award progress, owned development cards, bank rates, trade offers, full history, rules, audio settings, and player details.

### Visible when relevant

Production gains, missing materials for a selected action, a pending trade, discard requirements, a robber victim choice, a delayed server response, or reconnection. These temporarily take precedence over optional information.

## Measured portrait layout

See [the three-state wireframe](design/gameplay-screen-wireframes.svg). It illustrates the future full-system layout; conditional features are labeled as proposed.

Use the safe content area, not the device's raw physical screen dimensions, for these measurements. The reference below assumes a 390 × 844 CSS-pixel safe content area. Real safe-area insets and browser chrome reduce available height. Background art may extend beyond it; controls may not.

| Region | Reference y range | Height | Purpose |
| --- | --- | --- | --- |
| Match bar | 0–48 | 48 | Turn/phase, last roll, online status, overflow |
| Player strip | 48–112 | 64 | Four compact player summaries |
| Board viewport | 112–580 | 468, flexible | Island, coast, targeting and inspection |
| Event/context line | 580–620 | 40 | Latest meaningful event or incoming trade notice; tap for history |
| Private hand | 620–700 | 80 | Five resource icons, counts, short labels |
| Action dock | 700–764 | 64 | Build / Trade / Cards, with concise labels |
| Primary action | 764–828 | 64 | A large phase-dependent control |
| Bottom spacing | 828–844 | 16 | Breathing room within the safe area |

Fixed UI occupies 376 pixels; the board receives the rest. At a safe height of 763, the board region is 387 pixels. This fits the current 304-pixel land height and 16-pixel coastal shelf on each side. On shorter screens, reduce board scale or compact spacing before reducing text/controls. The bottom workspaces scroll when needed; the normal board view does not become a long scrolling page.

At 390 pixels wide, keep the default hex radius near 38 and center the island in the measured board viewport. Its approximate land bounds are 329 × 304 pixels. Preserve aspect ratio and coast clearance. Recompute placement from the viewport rather than retaining a hard-coded y coordinate from the current screen.

The four player chips get approximately 85 pixels each with 12-pixel outer margins and 8-pixel gaps. Keep them simple: a short name or initial, ownership marker, score, and resource total. Put development totals and award detail in the tapped player sheet if additional badges would crowd the chips. The viewer's score may include a clearly labeled private total when hidden scoring is implemented; opponents see only public points.

At narrower widths, shorten displayed names, reduce decorative spacing, and scale only the board. Maintain about 48-pixel HUD touch targets. Board edges/intersections are closer together than that; use nearest-valid-target selection, a visible preview, and confirmation. Provide pinch zoom plus an explicit recenter control; zoom is an aid rather than a requirement for reading the ordinary board. Do not simply give every neighboring vertex a large overlapping hit circle.

For a compact-height preset, reduce the player strip from 64 to 56 pixels, hand from 80 to 72, context line from 40 to 36, dock and primary rows from 64 to 56 each, and bottom spacing from 16 to 8. Keep their actual buttons at least 48 pixels high. This saves 44 pixels without reducing text sizes. Sheet content can scroll independently.

Outside placement mode, tapping a tile opens a small inspector with its resource, number, production probability, robber-blocked status, and adjacent buildings. Keep number tokens readable at the current board scale; probability pips or detail must supplement the number rather than replace it. Inspection must not place a piece or trigger a robber move accidentally.

## Construction workspace

Open Build with one tap. List Road, Settlement, City, and, when supported, Buy Development Card. Each row has a recognizable icon, label, full resource cost, availability, and inventory information. Use resource icons with counts rather than a sentence the user must decode.

| Option | Existing/common cost | What to communicate |
| --- | --- | --- |
| Road | 1 wood + 1 brick | Availability of a connected empty edge |
| Settlement | 1 wood + 1 brick + 1 wheat + 1 wool | Network connection and distance restrictions |
| City | 2 wheat + 3 mountain resource | Upgrades an owned settlement; adds one point relative to that settlement |
| Development purchase, future | 1 wheat + 1 wool + 1 mountain resource | Draws a card; deck availability |

Existing construction costs come from `GAME_RULES.md`; the future development cost matches the [official archived base rules](https://www.catan.com/sites/default/files/2021-06/catan_base_rules_2020_200707.pdf). Display terminology can call the current `stone` resource «سنگ معدن» if chosen; changing its core identifier is unnecessary.

Availability must consider more than affordability. Distinguish insufficient materials, no legal location, exhausted pieces, wrong phase, and awaiting another required action. An unavailable row remains inspectable and explains its reason. Shortages use both numbers and contrast; color alone is insufficient.

Selecting a build type collapses the sheet into a compact placement tray. Reveal the full board, highlight only legal candidates, and show the selected cost. Tapping a candidate previews a translucent piece; it does not spend resources. The lower primary action becomes Confirm Build, with a separate Cancel control. After confirmation succeeds, update authoritative state and resource totals, then show feedback. On rejection, preserve context and explain the current reason. Do not offer an Undo button for a committed multiplayer action unless the game explicitly supports it.

On the normal screen, End Turn is visually distinct from opening a workspace. Warn only when ending would discard an unfinished local draft/preview; avoid a confirmation dialog on every routine turn end. Do not automatically end a turn just because no build is currently affordable.

## Trading workspace

Trading gets its own surface because it includes composing an exchange, choosing a counterpart, reviewing responses, and completing an agreement. Avoid placing the full trade editor permanently beside the board.

Use a modal bottom sheet that can expand to most of the safe height. Its header retains turn context and a compact owned-resource summary. Inside, show two stacked sections with unmistakable labels: «می‌دهید» and «می‌گیرید». Both sides remain visible in the review and confirmation state. Do not rely on arrows or positive/negative colors alone.

### Bank

- This is the current MVP's only trade destination. When player trading exists, give Bank and Players distinct labeled controls.
- Selecting the offered resource shows its applicable rate next to that resource. In the MVP it is always 4:1. If port rules are adopted, derive 3:1/2:1 eligibility from the authoritative game state.
- Preview the exact payment and receipt, such as four wood for one ore. Show owned counts, any shortage, and the resulting counts before confirmation.
- Confirm exchanges atomically. Show pending feedback and disable duplicate submission until success/failure arrives.
- Bank supply shortages and unavailable rates get specific explanations when those systems exist. Merely drawing a port should never grant an unimplemented trade advantage.

### Players, future

- Select quantities to give and receive, then broadcast an offer or address an eligible player. Keep the exact offer visible during negotiation.
- On small screens, use five resource selectors and a shared 48-pixel quantity stepper per section, with selected quantities displayed on their resource cards. Avoid ten tiny plus/minus pairs.
- Show the responses for each eligible player: waiting, willing, declined, or counteroffer. Our proposed agreement flow lets the proposer choose one willing partner and confirm the final exchange. This is an interaction policy to adopt, not a CATAN rule.
- Incoming offers appear in the context line with an offer-count badge and optional restrained sound. They do not unexpectedly replace board targeting or open a full modal.
- A recipient can inspect and answer an offer during someone else's turn when the active player is involved. Keep trading between two inactive players unavailable under the base-game reference.
- Counteroffers show their revised quantities explicitly; never silently change the original offer. Start with exact exchanges. Open-ended offers and embargoes can be later product decisions.
- Offers expire on relevant phase/turn changes, cancellation, or invalidation. Immediately before committing, revalidate both hands and the current turn. Competing acceptances must not create two exchanges.
- If a partner can no longer trade, say the offer is unavailable. Do not reveal which hidden cards they lack. A server acknowledgement distinguishes an executed exchange from merely expressing willingness.

The separation of bank/player destinations, vertical exchange direction, and visible response states are informed by [Colonist's published trade research](https://blog.colonist.io/improving-the-colonist-trade-system/). Persian labels, confirmation behavior, input sizing, and our initial feature scope are our proposed adaptations.

## Development cards, future

Cards belong in a private sheet, accessible through the dock with an owned-count badge. Keep a purchase shortcut and its cost readable. Show the effect and current playability for each card, including concise reasons such as bought this turn or action card already played. Keep eligible pre-roll play accessible; do not disable the entire Cards entry until after rolling. Victory-point cards need separate treatment from playable action cards. [Official FAQ](https://www.catan.com/faq/basegame)

The reference effects imply different interfaces:

| Reference card | Proposed interaction |
| --- | --- |
| Knight | Review effect, collapse sheet, choose robber destination, then eligible victim if theft is enabled |
| Road Building | Guided first and second road placement, with a clear progress indicator and handling for piece/legal-location limits |
| Invention / Year of Plenty | Select two available resources, including the same resource twice where allowed, then review |
| Monopoly | Select a resource type and review the effect before playing; reveal only the resulting transfers allowed by the information policy |
| Victory Point | Private score contribution; reveal according to the selected victory rules rather than an ordinary Play button |

These effects are described in the [archived base rules](https://www.catan.com/sites/default/files/2021-06/catan_base_rules_2020_200707.pdf) and [2025 rulebook](https://www.catan.com/sites/default/files/2025-03/CN3081%20CATAN%E2%80%93The%20Game%20Rulebook%20secure%20%281%29.pdf). Our card names, Persian theming, deck makeup, and enabled effects still require product decisions before implementation.

## Phase and interruption behavior

| State | Board behavior | Lower primary action / workspace |
| --- | --- | --- |
| Initial placement, if adopted | Highlight valid settlement/road candidates in sequence | Confirm current placement, with setup progress |
| Your pre-roll | Inspect freely; show whose turn it is | Roll; Cards can expose permitted pre-roll actions |
| Production resolution | Highlight producing tiles and blocked tiles distinctly | Update counts from state; brief, skippable feedback |
| Your action phase | Inspect and enter build modes | End Turn, with Build/Trade/Cards access |
| Build targeting | Show valid candidates and a selected preview | Confirm Build / Cancel |
| Another player's turn | Your hand remains visible; board inspection stays available | Waiting for player; offer response available when eligible |
| Discard after seven, if adopted | Ordinary building/trading blocked | Select exactly the required resource count and confirm |
| Waiting for other discards | Preserve board and completion status | Waiting indicator; do not expose discarded types to opponents unless policy allows it |
| Robber relocation | Highlight valid destinations | Confirm destination |
| Victim choice, if theft adopted | Mark eligible adjacent opponents | Select opponent; random card chosen by rules/server |
| Card effect resolution | Follow that effect's targeting sequence | Effect-specific confirmation and progress |
| Command pending | Preserve preview; block duplicate submission | Pending status; no false success animation |
| Disconnected/reconnecting | Show last confirmed state with an explicit connection notice | Stop submitting moves; reconnect and resynchronize |
| Finished | Keep the final board available behind results | Result breakdown, rematch/leave as supported |

For the current MVP, a seven enters robber relocation directly. A fuller implementation needs additional states and transition rules before discard/theft UI can work. Timer duration, timeout behavior, reconnect grace periods, pause/resign rules, and automatic actions are online product decisions; they are not supplied by the board game's physical rules.

## Public information, private information, and local play

Online, distinguish viewer identity from active-player identity. Show the viewer's exact hand and owned cards while another player acts. Opponent summaries use public score, public hand size, played cards/awards, and permitted public actions; never show exact resource compositions or hidden card types. The same distinction applies to trade errors, animations, history, notifications, and spectators. Hidden victory points do not belong in an opponent's public total. [Official FAQ](https://www.catan.com/faq/basegame)

A future server must send a viewer-specific state projection rather than sending everyone's hidden data and concealing it only visually. Reconnection must restore the confirmed phase, outstanding offers, and required actions without applying a move twice. Local drafts are UI state; spending, dice, theft, awards, and victory remain authoritative rule transitions.

In shared-device play, keep the active-player hand model but add a handover cover before showing the next player's private information if privacy becomes part of the product. Online and local modes can share the same screen components while choosing different viewer identities. These are proposed privacy requirements, not a claim that the current local MVP already enforces hidden information.

## Event history, help, and match completeness

The context line answers what just happened and what to do next. Examples: dice result with personal production, blocked production, an accepted trade, or a required robber move. Keep the latest dice result persistent even after the brief message changes. Resource gains may briefly show +1/+2 beside the affected counts, then settle to the authoritative total.

Tapping history opens a chronological sheet. Separate game events and player chat; both can share an entry point, but should not compete in a permanent scrolling sidebar. Keep private events visible only to their owner. While chat and its keyboard are open, preserve a route to urgent required actions and a clear close control. Group trade notifications to avoid spam.

Overflow contains rules, cost reference, sound, reduced motion, and supported match controls. Online connection feedback must distinguish reconnecting from another player merely taking time. A turn clock appears only in timed modes and uses the server deadline; do not invent a countdown for untimed play.

End-of-match results explain points and awards and provide supported rematch/leave actions. A temporary inspection mode lets players see the final board. Returning from help, player details, or chat restores the current game context rather than resetting the chosen tool unexpectedly.

## Visual direction and accessibility

- Preserve the existing ocean, terrain, resources, and Achaemenid identity. Use navy surfaces, warm ivory text, muted gold framing, and restrained lapis accents. Decoration belongs at panel edges, not behind numbers or dense controls.
- Keep resource counts prominent and labels short; use consistent order across hand, costs, trading, and card choices. In Persian, mirror reading order and control alignment while keeping the geographic board unchanged.
- Use runtime Vazirmatn text. The currently shipped Regular weight is enough for the first pass through size, spacing, and contrast; add a heavier weight only when actual components need it.
- Start around 14–16 CSS pixels for useful labels and 18–20 for key values. Dense secondary labels may be smaller only after reviewing readability. Wrap messages and support long player names; current scene text has no general wrapping and should not be copied as the final layout behavior.
- Pair player color with initials, shape, or ownership markings. Pair availability/error color with icons and text.
- Keep opaque surfaces under resource counts and controls. Sea details should not lower text contrast.
- Support keyboard/focus navigation and semantic labels for HUD actions. Avoid interactions available only through a long press or drag.
- A sheet traps focus when modal, disables input to covered board/UI, and has a visible close control. Back closes the current surface before it attempts to leave the match. Forced actions explain why ordinary dismissal is unavailable.
- Use short feedback animations and a reduced-motion option. State changes occur independently of animation completion. Production should not lock the screen for a long spectacle every turn.

## Implementation direction

Keep Phaser responsible for board art, camera, animation, and board targeting; keep rules in pure TypeScript. I recommend a DOM/CSS HUD for the hand, buttons, sheets, forms, and chat. It will give us real text wrapping, RTL layout, scrolling, keyboard handling, accessibility semantics, and touch dimensions independent of board zoom. This presentation split is implemented for the current-rule interface.

Use a measured board viewport between the upper player strip and lower HUD. The board renderer and input transform consume the same viewport measurements. Continue to use the existing assets and derive the coast from the same geometry. Background, board, and overlays must remain aligned through resizing.

Create reusable components around responsibility: MatchBar, PlayerStrip, ResourceHand, ContextLine, ActionDock, PrimaryAction, BottomSheet, BuildSheet, TradeSheet, CardsSheet, PlayerDetails, and MatchHistory. Sheets share inventory views, resource selectors, and confirmation summaries rather than each inventing a different interaction.

Expose typed presentation data for viewer identity, active identity, phase, costs, available actions, legal targets, and reasons for unavailability. Compute rule-derived eligibility in core APIs; a UI preview does not duplicate rules or authorize a move. Online, pending actions need identifiers and authoritative acknowledgements. Keep UI state limited to open surfaces, drafts, camera, and previews.

## Suggested delivery order

1. **Current-rule UI:** reusable responsive shell, persistent five-resource hand, compact player/turn summaries, event line, Build sheet with real costs/reasons, Bank trade review, contextual primary action, and clear placement preview/confirmation. Preserve six-point victory, unlimited supplies, automatic setup, and simplified robber behavior.
2. **Interaction polish:** board inspection/zoom, history, help, messaging, safe areas, focus, reduced motion, and local handover privacy if selected.
3. **Approved rule additions:** implement each selected finite-supply, development, harbor, player-trade, award, discard/theft, or setup system in core and document its rules alongside its UI.
4. **Online play:** authenticated viewer projection, server authority, negotiation lifecycle, pending/failed commands, reconnection, and selected timer/disconnect policies.

The structure is designed now for future systems; building the screen does not require shipping all those systems at once. Decisions still needed include which base-game rules to adopt, hidden-information policy, exact card design, finite bank visibility, online timing, trade agreement semantics, and whether manual setup is desired.
