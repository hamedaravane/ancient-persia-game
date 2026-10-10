# Agent Instructions

Before implementing gameplay changes, read:

1. docs/GAME_OVERVIEW.md
2. docs/GAME_RULES.md
3. docs/GAMEPLAY_INVARIANTS.md

For visual/UI work also read:

4. docs/ART_DIRECTION.md
5. docs/UI_SYSTEM.md
6. docs/ASSET_GUIDE.md

Architecture rules:

- Phaser is the presentation layer.
- Core gameplay rules belong in src/game/core.
- Do not place rule calculations inside Scenes or sprites.
- Gameplay state determines animation, never the opposite.
- Do not duplicate player-colored assets.
- Player ownership color is runtime data.
- Persian text is rendered at runtime and must not be baked into image assets.
- Mobile portrait is the primary target.
- Do not modify fixed gameplay rules without explicitly updating documentation.