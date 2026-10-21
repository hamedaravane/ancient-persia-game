# Animation: research and implementation

Original research 2026-10-11; Graphics interface migration 2026-10-13. Motion presents confirmed game actions and introduces no rules. The current renderer supersedes earlier visible DOM effects.

## Research

- [Material duration and easing guidance](https://m1.material.io/motion/duration-easing.html) supports short, understandable transitions. We use brief feedback, with stronger motion reserved for confirmed resource travel and board placement.
- [Colonist's portrait rationale](https://blog.colonist.io/why-colonist-is-going-portrait-on-mobile/) informed compact board/control composition. Our feedback remains anchored to the board, resource hand, and player chips, without camera movement or an animation-only screen.
- [W3C animation-from-interactions guidance](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html) supports honoring reduced motion. Resource travel, delta translation, and victory sparkles are omitted; essential totals and notices remain visible.
- [PHASER_UI_DESIGN.md](PHASER_UI_DESIGN.md) records the newer mobile-game interface research and material system.

The current contextual dock adds a finite 160 ms opacity entrance for the standalone dice and ocean guidance, with stationary semantic targets. Resource changes add a subtle stationary cell wash in the unified hand. See [CONTEXTUAL_DOCK.md](CONTEXTUAL_DOCK.md).

## Current feedback

| Event                                  | Visual feedback                                                                                                       | Approximate duration                                                         |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Button press                           | Recessed Graphics face and shortened depth while held; keyboard press also supported                                  | Pointer/key press lifetime                                                   |
| Open a sheet                           | Graphics panel/content fade; semantic hit regions stay stationary                                                     | 180 ms                                                                       |
| Human roll                             | Standalone actual dice in the lower ocean settle, then travel to the reserved header slot; producing board-tile rings | 150 ms settle; 280 ms travel after a 230 ms hold                             |
| Action dock                            | Stable hammer/trade/deck controls fade in once the action phase is available                                          | 150 ms                                                                       |
| Private purchase                       | Actual drawn card selects immediately; a small original back flips to its actual effect emblem                        | 350 ms                                                                       |
| Receive production                     | Up to six own-resource symbols fly from their tiles to the human hand, with actual quantities                         | 460 ms travel, staggered by 30 ms after 200 ms                               |
| Change resources                       | Exact totals update immediately; gained/spent runtime delta labels and player emphasis                                | 320 ms emphasis; 1.1 s delta                                                 |
| Preview target / choose trade resource | Finite gold outline on the corresponding control                                                                      | 320 ms                                                                       |
| Change turn                            | Active-player ownership outline, score pips, and a short emphasis ring                                                | 320 ms                                                                       |
| Confirm building                       | Existing road trace or stone-piece settle, local ring, supplied dust/spark                                            | 400–520 ms                                                                   |
| Move Ahriman                           | Procedural shadow-spirit emblem glides from its previous tile to its confirmed destination                            | 320 ms                                                                       |
| Calm sea                               | Seven subtle wave packets with softly changing surface lighting; rendered at 30 Hz into a small cached target         | Very slow local phase evolution; freezes in menus, modals and reduced motion |
| Victory                                | Preserved medallion with the supplied glint and brief Graphics rosette sparkles                                       | 830 ms including delay                                                       |

No dice result is fabricated. Resource flights use the core production ledger, including actual city quantities and recipient ownership. Blocked tiles may show a muted ring but never send resources. A seven produces no normal resource flights. Starting grants appear directly in the initial hand.

Quick feedback multiplies motion durations and bot pacing by 0.55. The in-game reduced-motion preference combines with the system preference; dice/card travel and scale are skipped, with actual results and action access retained. Optional sound and supported-device haptics are disabled by default, use local synthesis and never gate a command. See [MOBILE_GAME_EXPERIENCE.md](MOBILE_GAME_EXPERIENCE.md) for preferences, persistence and implementation boundaries.

Anahita's narrator portrait has its own layer behind the front dialogue panel and outside the scrolling text mask. A new expression fades in and rises 12 pixels over 280 ms, including when its lazily loaded texture first becomes ready. This is a finite entrance, with no idle bobbing or repeated motion on focus/scroll changes. Reduced motion and hidden-tab preferences settle the portrait immediately. The dialogue controls remain stationary. See [TUTORIAL_DESIGN.md](TUTORIAL_DESIGN.md).

## Ownership and interruption

New matches show a full-height participant introduction after name confirmation and before guidance/setup. Names, seat seals and ownership colors come from the created match; text remains runtime Persian. The existing native dialog holds modal focus and pauses bots. Board textures initialize once on entry, dust/spark download in the background, and the first queued narrator portrait warms while the roster is visible. Optional downloads never gate entry. There is no countdown; entering fades the stationary HUD over 160 ms (shortened by Quick, omitted by Reduced Motion). Resuming a save and entering practice bypass this new-match introduction.

`ui/feedbackEvents.ts` selects one sensory cue per confirmed transition. Construction combines a muted stone contact with a brief tonal response; a score gain adds an ascending bronze-like reward. Production/other resource receipts use a quiet two-note response. Confirmed seven/Ahriman movement uses a descending warning; actual theft, discard and Monopoly losses use a separate lower response. Spending on construction/trades is never classified as loss. Opponent actions are quieter, never vibrate this device, and never expose hidden VP purchases through sound. Existing exact resource/score deltas and board transitions remain authoritative-state decoration.

`ui/GameAudio.ts` synthesizes bounded sounds locally, without music, new assets or gameplay randomness. Existing independent Sound/Haptics preferences remain opt-in and device-local, also available on the introduction. AudioContext creation/resumption requires a trusted pointer, activation click or Enter/Space gesture. Locked, hidden and repeated events are consumed without queuing/replay; normal cues within 180 ms are coalesced, while points, victory and loss retain priority. Haptics use gentle 8–22 ms pulses for personal events, with capability checks and guarded calls. Preference changes, leaving the match, page hiding and destruction stop active sources/vibration; hidden pages also suspend audio. Unsupported/blocked APIs never interrupt commands. Feedback tracks transition identity, so event-ID reset during resume cannot suppress a new command.

- `core/production.ts` computes the pure ledger used both to pay production and describe the confirmed roll.
- The session publishes an identified `MatchTransition` only after a successful command. Drafts, modal changes, rejected actions, layout changes, and effect completion do not publish a transition.
- `ui/GameFeedback.ts` consumes each transition once after semantic HUD and board updates. `ui/GraphicsFeedback.ts` owns the full-shell Phaser feedback layer. `boardToClient()` and `clientToBoard()` bridge the inset board camera and measured semantic controls without using the entire canvas as the board.
- `rendering/boardEffects.ts` owns board tweens and restores committed poses on cancellation. No effect callback pays, builds, relocates in state, or changes turns.
- New state, sheet/selected-card changes, scrolling, board resize, leaving the match, visibility/preference changes, and destruction remove obsolete decoration. Returning from a sheet never replays a payout. Motion preference changes clear active travel immediately.
- `ui/motion.ts` shares the live system preference. Reduced motion replaces board travel/scale with stationary feedback, omits resource flights and victory sparkles, keeps deltas stationary, and opens sheets immediately. The native dialog always applies modal focus semantics immediately.
- Semantic DOM nodes are transparent; there are no visible DOM delta/flight/glint layers and no Web Animation groups. Phaser renders the material press state, feedback, and sheet fade. The modal header and content share an opacity entrance so visible geometry never travels away from its native input targets.
- Stable HUD Text/Image objects survive unchanged content. Removed controls release their objects. The interface repaints on semantic/measurement changes; finite feedback tweens run independently without regenerating all text each frame.

The user-requested procedural sea adds quiet ambient wave motion behind the island. Its independent clock freezes in menus, modal panels, hidden tabs and reduced-motion mode, resuming without a catch-up jump. There is no sharp glitter, parallax, screen shake, full-screen flash, animation-driven input lock, or extra dependency. The island fits automatically without zoom or pan. See [GAME_BACKGROUND_PLAN.md](GAME_BACKGROUND_PLAN.md).

## Verification

Routine verification uses TypeScript, scoped lint/format checks and Node Vitest. Leave production builds, the full `npm run check` and CI to the user under `AGENTS.md`. Pure Node tests cover actual dice geometry, interruption/reduced-motion parity, session roll guards, private purchases and goal persistence in addition to session confirmation, core payment, Ahriman relocation, full inspection IDs, and camera/client coordinate agreement. The user performs actual visual/device review; no browser launch is part of routine verification.
