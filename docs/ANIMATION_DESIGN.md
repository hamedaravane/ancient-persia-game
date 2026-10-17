# Animation: research and implementation

Original research 2026-10-11; Graphics interface migration 2026-10-13. Motion presents confirmed MVP actions and introduces no rules. The current renderer supersedes earlier visible DOM effects.

## Research

- [Material duration and easing guidance](https://m1.material.io/motion/duration-easing.html) supports short, understandable transitions. We use brief feedback, with stronger motion reserved for confirmed resource travel and board placement.
- [Colonist's portrait rationale](https://blog.colonist.io/why-colonist-is-going-portrait-on-mobile/) informed compact board/control composition. Our feedback remains anchored to the board, resource hand, and player chips, without camera movement or an animation-only screen.
- [W3C animation-from-interactions guidance](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html) supports honoring reduced motion. Resource travel, delta translation, and victory sparkles are omitted; essential totals and notices remain visible.
- [PHASER_UI_DESIGN.md](PHASER_UI_DESIGN.md) records the newer mobile-game interface research and material system.

## Current feedback

| Event                                  | Visual feedback                                                                                                                 | Approximate duration                                                         |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Button press                           | Recessed Graphics face and shortened depth while held; keyboard press also supported                                            | Pointer/key press lifetime                                                   |
| Open a sheet                           | Graphics panel/content fade; semantic hit regions stay stationary                                                               | 220 ms                                                                       |
| Roll                                   | Emphasis ring around confirmed dice; producing board-tile rings                                                                 | 400–520 ms                                                                   |
| Receive production                     | Preserved resource icon in an ownership-bordered card flies from its tile to the active hand or another player's public summary | 620 ms travel, staggered by 35 ms after 220 ms                               |
| Change resources                       | Exact totals update immediately; gained/spent runtime delta labels and player emphasis                                          | 400 ms emphasis; 1.1 s delta                                                 |
| Preview target / choose trade resource | Finite gold outline on the corresponding control                                                                                | 400 ms                                                                       |
| Change turn                            | Active-player ownership outline, score pips, and a short emphasis ring                                                          | 400 ms                                                                       |
| Confirm building                       | Existing road trace or stone-piece settle, local ring, supplied dust/spark                                                      | 400–520 ms                                                                   |
| Move Ahriman                           | Procedural shadow-spirit emblem glides from its previous tile to its confirmed destination                                      | 400 ms                                                                       |
| Calm sea                               | Seven subtle wave packets with softly changing surface lighting; rendered at 30 Hz into a small cached target                   | Very slow local phase evolution; freezes in menus, modals and reduced motion |
| Victory                                | Preserved medallion with the supplied glint and brief Graphics rosette sparkles                                                 | 830 ms including delay                                                       |

No dice result is fabricated. Resource flights use the core production ledger, including actual city quantities and recipient ownership. Blocked tiles may show a muted ring but never send resources. A seven produces no normal resource flights. Starting grants appear directly in the initial hand.

Anahita's narrator portrait has its own layer behind the front dialogue panel and outside the scrolling text mask. A new expression fades in and rises 12 pixels over 280 ms, including when its lazily loaded texture first becomes ready. This is a finite entrance, with no idle bobbing or repeated motion on focus/scroll changes. Reduced motion and hidden-tab preferences settle the portrait immediately. The dialogue controls remain stationary. See [TUTORIAL_DESIGN.md](TUTORIAL_DESIGN.md).

## Ownership and interruption

- `core/production.ts` computes the pure ledger used both to pay production and describe the confirmed roll.
- The session publishes an identified `MatchTransition` only after a successful command. Drafts, modal changes, rejected actions, layout changes, and effect completion do not publish a transition.
- `ui/GameFeedback.ts` consumes each transition once after semantic HUD and board updates. `ui/GraphicsFeedback.ts` owns the full-shell Phaser feedback layer. `boardToClient()` and `clientToBoard()` bridge the inset board camera and measured semantic controls without using the entire canvas as the board.
- `rendering/boardEffects.ts` owns board tweens and restores committed poses on cancellation. No effect callback pays, builds, relocates in state, or changes turns.
- New state, sheet changes, board resize, leaving the match, visibility/preference changes, and destruction remove obsolete decoration. Returning from a sheet never replays a payout. Motion preference changes clear active travel immediately.
- `ui/motion.ts` shares the live system preference. Reduced motion replaces board travel/scale with stationary feedback, omits resource flights and victory sparkles, keeps deltas stationary, and opens sheets immediately. The native dialog always applies modal focus semantics immediately.
- Semantic DOM nodes are transparent; there are no visible DOM delta/flight/glint layers and no Web Animation groups. Phaser renders the material press state, feedback, and sheet fade. The modal header and content share an opacity entrance so visible geometry never travels away from its native input targets.
- Stable HUD Text/Image objects survive unchanged content. Removed controls release their objects. The interface repaints on semantic/measurement changes; finite feedback tweens run independently without regenerating all text each frame.

The user-requested procedural sea adds quiet ambient wave motion behind the island. Its independent clock freezes in menus, modal panels, hidden tabs and reduced-motion mode, resuming without a catch-up jump. There is no sharp glitter, parallax, screen shake, full-screen flash, animation-driven input lock, or extra dependency. The island fits automatically without zoom or pan. See [GAME_BACKGROUND_PLAN.md](GAME_BACKGROUND_PLAN.md).

## Verification

Use `npm run check`. Pure Node tests cover session confirmation, core payment, Ahriman relocation, full inspection IDs, and camera/client coordinate agreement. The user performs actual visual/device review; no browser launch is part of routine verification.
