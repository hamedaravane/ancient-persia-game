# Ancient Persia

A mobile-first, Persian-language local strategy board game inspired by hex-based resource production and settlement building. The MVP supports three or four players sharing one device, with a generated board, turn-based production, building, bank trades, a robber, and a six-point victory target.

## Requirements

- Node.js 20 or newer
- npm

## Commands

```sh
npm install
npm run dev
npm run typecheck
npm run build
npm run preview
```

The development server is available at `http://localhost:8080`. The production build is written to `dist/`; deploy the contents of that directory to a static web host.

## Project map

| Path | Purpose |
| --- | --- |
| `src/main.ts` | Browser entry point and global stylesheet import |
| `src/game/main.ts` | Phaser configuration and game startup |
| `src/game/scenes/` | Phaser scenes; scenes render state and forward player actions to core APIs |
| `src/game/core/` | Phaser-independent TypeScript rules and game-state logic |
| `src/game/ui/` | Localized interface strings |
| `src/styles/` | Browser and canvas layout styles |
| `public/assets/` | Runtime art loaded by Phaser from stable public URLs |
| `docs/` | Product direction, confirmed rules, invariants, art and UI guidance, and asset conventions |

`GameScene` provides local match setup, a portrait board, the active player's resource hand, and action controls. It calls pure transitions in `src/game/core/`; the scene owns no gameplay rules. See [docs/GAME_RULES.md](docs/GAME_RULES.md) for the exact MVP rules and [docs/GAMEPLAY_INVARIANTS.md](docs/GAMEPLAY_INVARIANTS.md) for state constraints.

## Assets

Keep game art under `public/assets/`, grouped by purpose: `backgrounds/`, `board/terrains/`, `pieces/`, `dice/`, and `resources/`. Use lowercase kebab-case names. Build runtime asset URLs from `import.meta.env.BASE_URL`, as described in [docs/ASSET_GUIDE.md](docs/ASSET_GUIDE.md).

## Project guidance

- Read [docs/GAME_OVERVIEW.md](docs/GAME_OVERVIEW.md), [docs/GAME_RULES.md](docs/GAME_RULES.md), and [docs/GAMEPLAY_INVARIANTS.md](docs/GAMEPLAY_INVARIANTS.md) before gameplay work.
- Read [docs/ART_DIRECTION.md](docs/ART_DIRECTION.md), [docs/UI_SYSTEM.md](docs/UI_SYSTEM.md), and [docs/ASSET_GUIDE.md](docs/ASSET_GUIDE.md) before visual or UI work.
- Keep gameplay state authoritative; animations only display its results.
- Update the rule documentation in the same change whenever an agreed fixed rule changes.

See [AGENTS.md](AGENTS.md) for the repository’s working conventions.
