# Animation: research and implementation

Researched 2026-10-11; implementation completed 2026-10-12. Motion presents confirmed MVP actions; it introduces no game rules.

## Brief reference review

- [Material duration and easing guidance](https://m1.material.io/motion/duration-easing.html) recommends short, understandable transitions and durations appropriate to travel distance. Its [current motion system](https://m3.material.io/styles/motion) distinguishes spatial movement from effects such as opacity. We use one small timing/easing vocabulary, with stronger motion reserved for resource travel and piece placement.
- [Colonist's portrait rationale](https://blog.colonist.io/why-colonist-is-going-portrait-on-mobile/) is a useful reference for a compact mobile board and controls. Our adaptation keeps feedback anchored to the board, hand, and player chips, without introducing an animation-only screen or moving the camera automatically. This is our design choice, not a claim about Colonist's current animations.
- [W3C animation-from-interactions guidance](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html) and [WebKit's reduced-motion guidance](https://webkit.org/blog/7551/responsive-design-for-motion/) support honoring the system preference. Translation, scale effects, dice rotation, board tweens, and resource travel are replaced with brief opacity feedback and stationary resource deltas.

## Implemented feedback

| Event | Visual feedback | Approximate duration |
| --- | --- | --- |
| Button press | Small press response; selected trade choice or target confirmation pulses | 100–160 ms |
| Open a sheet | Short upward entrance and fade; native modal semantics apply immediately | 220 ms |
| Start match / change turn | Fade into the match, active-player emphasis, hand refresh | 220–400 ms |
| Roll dice | Brief rotation/settle of the confirmed readout; producing tile rings | 360–520 ms |
| Receive production | One atlas icon per tile/recipient grant flies to the active hand's matching resource or another player's public resource total; ownership border and quantity label distinguish recipients | 620 ms travel, lightly staggered; normally about 1 second overall |
| Change resources | Exact totals update immediately; gained/spent delta badges and count emphasis accompany production, construction, and bank exchange | 400 ms emphasis; 1.1 s badge |
| Confirm building | Road highlight traces the edge; settlement/city marker settles into place with a local ring | 400–520 ms |
| Move robber | The marker glides from its old tile to its already-confirmed destination | 400 ms |
| Victory | Restrained emphasis on the winner in the existing results sheet | 500 ms |

No dice value is fabricated for the animation. A city grant is labeled with its true quantity. Tile/recipient grants aggregate multiple producing buildings belonging to the same owner. Blocked tiles may show a muted ring but never send resources. A seven produces no normal resource flights. Starting grants appear in the initial hand rather than replaying a dice-production sequence.

## Architecture and interruption

- `core/production.ts` computes the pure production ledger used both to pay resources in `rollDice` and to describe a confirmed roll. Presentation does not recalculate production rules.
- The local session publishes a monotonically identified `MatchTransition` only after a successful core command. UI drafts, modal changes, rejected actions, resizing, and animation completion do not publish a new match transition. Only the latest transition is retained, so snapshots do not accumulate in history.
- `ui/GameFeedback.ts` consumes each transition once, after HUD and board rendering. Its pointer-transparent DOM layer bridges the canvas and HUD using fitted-board client coordinates. Offscreen sources are omitted rather than flying from unrelated positions. Hand totals and player summaries remain authoritative throughout.
- `rendering/boardEffects.ts` owns bounded Phaser tweens. Canceling an effect restores the committed piece pose. No completion callback pays, builds, moves a robber in state, or changes a turn.
- `ui/motion.ts` shares the live system preference and owns cancelable Web Animation groups. Bottom sheets own a separate group so a gameplay interruption cannot cancel a newly opened sheet's entrance.
- New commands, sheet opening, board layout changes, resize, leaving the match, document visibility changes, preference changes, and destruction clean up obsolete effects. Returning from a sheet does not replay payouts. Dismissing a sheet releases its modal/focus state immediately.
- Unchanged HUD regions retain their nodes, avoiding animation restarts and unnecessary DOM replacement during drafts or inspection. Feedback nodes are decorative and excluded from accessibility announcements; existing text, counts, phase guidance, and live notices carry the information.
- The supplied polish art now adds a small dust puff behind confirmed building markers, a road-placement sparkle, and a victory-medallion glint inside the modal. These share the existing finite animation groups, interruption cleanup, and reduced-motion policy. Dice use inspected final-face crops and never fabricate a roll for their wiggle animation.
- No continuous ocean/parallax animation, screen shake, full-screen flashes, new dependencies, or animation-driven input locks are added. The island fits automatically without zoom/pan. Canvas resize or placement-row changes clear travel effects so resource flights never use stale positions.

## Verification

Use the repository typecheck/build and focused pure checks for production grants, confirmed-transition identity, animation cancellation, reduced-motion fallback, and camera-to-client projection. The user performs interactive device testing; no browser launch is part of routine verification.
