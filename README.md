# Sunmark

**Sunmark (سان‌مارک)** is a mobile-first, Persian-language local strategy board game inspired by hex-based resource production and settlement building. The MVP starts four-player matches with one human and three automatic local bots, with a generated board, player-chosen opening settlements/roads in CATAN order, turn-based production, building, negotiated player/bot trades, bank trades, Ahriman, and a ten-point victory target.

[Play the game](https://hamedaravane.github.io/ancient-persia-game/)

The game is branded **Sunmark** throughout its menu, tutorial, browser, and install metadata. The existing Pages address and internal save/app identifiers remain stable so current installations and saved matches continue working.

## Requirements

- Node.js 24 LTS recommended (also supports Node 22.13+ within the 22 release line, and Node 26+)
- npm

## Commands

```sh
npm install
npm run dev
npm run typecheck
npm test
npm run test:watch
npm run lint
npm run lint:fix
npm run format
npm run format:check
npm run check
npm run build
npm run preview
```

The development server is available at `http://localhost:8080`. The production build is written to `dist/`; deploy the contents of that directory to a static web host.

`npm run check` runs lint, formatting verification, Vitest, the production build (including TypeScript), and PWA artifact verification. `npm test` runs once; `npm run test:watch` reruns affected tests while developing. `npm run lint:fix` and `npm run format` apply fixes; the other checks do not rewrite source files.

Vitest shares the Vite configuration and runs explicit-import TypeScript tests from `tests/` in Node. Test deterministic core rules, session commands, and pure layout calculations without constructing Phaser or loading a browser. Keep real rendering and device checks with the user. Mocks, environment stubs, and global stubs reset between tests. No DOM emulator or browser test runner is needed for these suites.

ESLint uses a flat configuration, TypeScript project-service analysis, recommended rules, and typed promise checks. Browser globals apply to game source; Node globals apply to tooling and tests. Core modules cannot import Phaser or presentation modules. Prettier owns formatting, with `eslint-config-prettier` disabling conflicting lint rules. The formatting baseline uses four spaces for code, two for JSON/Markdown/YAML, single quotes, and LF line endings; artwork, wireframes, build output, coverage, and the generated lockfile are excluded.

## GitHub Pages

The playable game is published at [hamedaravane.github.io/ancient-persia-game](https://hamedaravane.github.io/ancient-persia-game/). This runs the current single-player game with local bots in the browser; it does not add online matchmaking or a server.

`.github/workflows/deploy-pages.yml` deploys each push to `main` and supports manual runs from GitHub Actions or `gh workflow run deploy-pages.yml`. It installs locked dependencies with Node 24, checks lint/formatting/tests, type-checks and builds the game, uploads only `dist/`, and deploys through the `github-pages` environment. Official actions are pinned to verified release commits; publishing permissions are limited to the deployment job.

The workflow reads the site's base path from Pages settings and passes it to Vite at build time. This preserves the shared local configuration while making JavaScript, CSS, terrain, ocean artwork, resource icons, and fonts load correctly below the repository URL. To reproduce the project-site build locally:

```sh
npm run build -- --base=/ancient-persia-game/
```

Pages must use **GitHub Actions** as its publishing source. The setup follows [GitHub's custom Pages workflow guidance](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) and [Vite's Pages deployment guidance](https://vite.dev/guide/static-deploy.html). Monitor publishing with `gh run list --workflow deploy-pages.yml`.

## Installable app and offline play

The two-button menu offers Play and Tutorial. Tutorial is a short, disposable exercise connecting dice, terrain production, road expansion, trading for a missing resource, and a settlement score change. It explains the ten-point goal up front and preserves the saved match; Play then resumes that match or starts ordinary setup. Non-installed browser visits show a dismissible installation modal with Android/Chrome or iPhone instructions; the browser’s Home Screen/install action also works. After offline preparation completes, all game art, fonts, and Anahita expressions are available without connectivity. One local match and its tutorial progress are saved automatically; the **بازی** button resumes unfinished games after reopening. Downloaded updates prompt for confirmation, save the match, and reload into the new release. Pending domestic-trade consent is restored without automatic payment.

Run `npm run pwa:check` after a production build to verify install metadata, icon dimensions, scoped launch URLs, controlled updates, and offline asset coverage. The Pages workflow runs this before deployment. Ordinary `npm run dev` does not register a service worker; use the production preview on localhost or HTTPS for PWA checks. See [docs/PWA_RELEASE.md](docs/PWA_RELEASE.md) for implementation, storage limits, icon reproduction, and the user’s Android/iPhone release checklist.

## Project map

| Path               | Purpose                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------ |
| `src/main.ts`      | Browser entry point and global stylesheet import                                           |
| `src/game/main.ts` | Phaser configuration and game startup                                                      |
| `src/game/scenes/` | Phaser scenes; scenes render state and forward player actions to core APIs                 |
| `src/game/core/`   | Phaser-independent TypeScript rules and game-state logic                                   |
| `src/game/ui/`     | Localized interface strings                                                                |
| `tests/`           | Vitest rule, session, and layout tests                                                     |
| `src/styles/`      | Browser and canvas layout styles                                                           |
| `public/assets/`   | Runtime art loaded by Phaser from stable public URLs                                       |
| `docs/`            | Product direction, confirmed rules, invariants, art and UI guidance, and asset conventions |

The local session and HUD provide match setup, a portrait board, the fixed human player's resource hand, and action controls. The board scene calls pure transitions in `src/game/core/`; the scene owns no gameplay rules. See [docs/SINGLE_PLAYER.md](docs/SINGLE_PLAYER.md) for bots/controller/save compatibility and [docs/GAME_RULES.md](docs/GAME_RULES.md) for the exact MVP rules and [docs/GAMEPLAY_INVARIANTS.md](docs/GAMEPLAY_INVARIANTS.md) for state constraints.

## Assets

Keep game art under `public/assets/`, grouped by purpose: `backgrounds/`, `board/terrains/`, `pieces/`, `dice/`, and `resources/`. Use lowercase kebab-case names. Build runtime asset URLs from `import.meta.env.BASE_URL`, as described in [docs/ASSET_GUIDE.md](docs/ASSET_GUIDE.md).

Runtime bitmap images are optimized full-resolution WebP exports. Their complete PNG masters are preserved under `art/reference/`. Re-export with `npm run assets:optimize` and verify with `npm run assets:check`; these optional maintenance commands need Python 3 and Pillow >= 10.2 with WebP support. Regular npm development/build commands use the committed exports. See the asset guide for quality checks and per-group commands.

## Project guidance

- Read [docs/GAME_OVERVIEW.md](docs/GAME_OVERVIEW.md), [docs/GAME_RULES.md](docs/GAME_RULES.md), and [docs/GAMEPLAY_INVARIANTS.md](docs/GAMEPLAY_INVARIANTS.md) before gameplay work.
- Read [docs/ART_DIRECTION.md](docs/ART_DIRECTION.md), [docs/UI_SYSTEM.md](docs/UI_SYSTEM.md), and [docs/ASSET_GUIDE.md](docs/ASSET_GUIDE.md) before visual or UI work.
- Keep gameplay state authoritative; animations only display its results.
- Update the rule documentation in the same change whenever an agreed fixed rule changes.

See [AGENTS.md](AGENTS.md) for the repository’s working conventions.

Player-to-player trading follows CATAN domestic-trade restrictions with clear offer/counter/review/receipt states and local bot negotiation. See [DOMESTIC_TRADING.md](docs/DOMESTIC_TRADING.md).

## Procedural board art

The board uses code-generated, softly detailed terrain with a small reusable texture cache. Ahriman (اهریمن) is a procedural shadow-spirit marker that blocks production; trade scales are also drawn in code. Original paintings remain preserved under `art/reference/`, outside runtime downloads. See [the visual direction, size study and rendering budgets](docs/PROCEDURAL_BOARD_ART.md).

## Development cards and official scoring

Matches now use the 25-card development deck, complete seven discard/move/theft resolution, Longest Road and Largest Army, and a ten-point victory on the winner's own turn. Hidden VP cards remain private until victory declaration. The Cards control explains costs, effects and play timing. Completed/rejected trades return directly to the board. See [rules, save compatibility and verification](docs/DEVELOPMENT_AND_SCORING.md).

## Gameplay experience research

The [mobile UI/UX research](docs/MOBILE_GAME_EXPERIENCE_RESEARCH.md) studies ten games and proposes a more tactile dice flow, compact resource-led construction, and a private development-card hand. Open the [independent interactive study](docs/design/turn-experience-study.html) through the development server at `/docs/design/turn-experience-study.html` to explore scripted examples. It does not change the real game or saved match; the report includes a staged production plan and player-review criteria.
