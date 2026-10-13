# Coastal ports

## Rules and state

The user requested CATAN-style ports and maritime bank trading. The implemented scope is nine ports: four general 3:1 ports and five specialist 2:1 ports, one for each existing resource. Ordinary 4:1 bank trade remains available. A settlement or city at either endpoint grants access; roads alone do not. Specialist rates apply to the resource paid, and discounts never stack. Access starts immediately after building, survives city upgrades, and is unaffected by the land robber. See [GAME_RULES.md](GAME_RULES.md) and the [official CATAN base rules](https://www.catan.com/sites/default/files/2021-06/catan_base_rules_2020_200707.pdf), maritime trade and harbor sections.

`Board.ports` stores stable IDs, a coastal edge ID, and a resource or `null` for general ports. `core/ports.ts` derives access and rates from endpoint buildings; ownership is not duplicated in port state. Board generation walks the coastal cycle clockwise, uses nine fixed separated slots on projecting segments, and shuffles port types with the supplied random source. The slots are this game's geometry convention rather than a copy of the printed CATAN frame. Initial automatic placement, unlimited bank and piece supplies, simplified robber, and the six-point target remain the existing MVP rules.

`tradeWithBank()` and `getBankTradeError()` share eligibility and balance validation. Omitting a ratio uses the best available rate. Explicit ordinary bank or owned-port rates are validated again on confirmation. Rejections preserve the original state, and successful trades change only the active player's resource counts.

## Board presentation

`rendering/ports.ts` creates original top-down stone islets, without new external artwork. Each 32-pixel octagonal body has a navy inset, warm bevel, contact shadow, and a 38-pixel water halo. An ownership-colored rim accepts arbitrary player colors. Specialist emblems use the existing resource sheet; general ports have broad procedural exchange arrows. Ratios are runtime Persian text.

The marker center sits 20 CSS pixels along the coastal edge's outward normal. Two dock links connect it toward the edge endpoints, stopping short to leave player buildings visible. Ports render below terrain and pieces. `fitBoard()` reserves 40 pixels on each side for the offshore offset and halo; the map remains centered, fitted, and free of zoom/panning controls. The reference 390 × 428 board camera has a land footprint near 310 × 286 pixels.

Markers use nearest-center picking within 22 pixels when inspecting the board. On very short canvases, hit areas may overlap slightly; nearest-center selection disambiguates them. During placement, only placement selection is active. The bank sheet also provides a full directory with 48-pixel buttons, so exact taps on the board are never required.

## Trade workspace

The dock opens **Bank and Ports**. Payment cards show each resource's best rate. The review shows exact payment, receipt, source, and resulting balances. Players can choose another available rate explicitly; changing the payment resource restores the best rate. Closing the sheet preserves the draft, while a successful action or confirmed turn handover clears it.

Owned-port chips open details. The collapsible directory lists all nine ports and their current users. Port details explain type, access, adjacent land, and ownership; an owned-port shortcut opens trading with its specialist payment resource selected. Player details also list accessible ports. All control text stays Persian and runtime-rendered.

## Verification

Vitest covers deterministic setup, port distribution and endpoint separation, building-only access, specialist payment direction, rates, immutability, immediate access, upgrades, robber behavior, compact marker bounds/spacing, and session quote/payment/history agreement. The suites run in Node without constructing Phaser or launching a browser. The user handles visual device review.
