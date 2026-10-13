# Procedural ocean and island background

Status: implemented after the user's request to replace the heavy ocean image with calm, code-driven water. The palace menu art and existing island/port/coast rendering remain unchanged. The previous image brief is superseded by this runtime material.

## Asset decision

The original ocean was a 853 × 1844 RGB PNG, **2,027,549 bytes** on disk. A full RGBA GPU upload occupies approximately 6 MiB before other image/framebuffer overhead. It provided a useful initial look but required a background download and could not supply the requested gentle wave motion.

The original pixels are preserved without re-encoding at `art/reference/backgrounds/ocean-surface.png`, outside the runtime tree. SHA-256: `0a14aca6723a66186216c8adce8b1e07ff3e02b7eb8a1cb45b168d16c038e8cb`. Vite no longer ships the former `public/assets/backgrounds/game.png`, and neither the loader nor CSS references it.

The new sea is generated from bundled code and needs **no ocean image request**. Terrain, resource, piece, port, and menu assets are retained. No new raster texture, external library, or per-player copy is added.

## Visual design

- Directly overhead water: no horizon, sky, perspective compression, large breakers, or camera motion.
- Saturated deep blue, azure and blue-green depth variation, with a broad soft upper-left illumination and a subtle darker lower region behind the HUD.
- Seven overlapping wave packets. Fine ripple wavelengths are 12–43 CSS pixels; two quieter 82/148-pixel undertones keep the surface coherent. Total mathematical height amplitude is less than one CSS pixel.
- Curved, modulated packets and a static domain warp break long repeated bands into organic little patterns. Their phases evolve slowly; the fine crests travel only fractions of a pixel per second.
- Surface slopes drive softly tinted reflection and relief. Highlights stay blue-green rather than bright white. There is no foam animation, sharp glitter, flashing caustics, or animated pixel noise.
- Broad depth noise is stationary. Sub-byte spatial dithering smooths gradients without flickering. The island, number tokens, player pieces, and stone UI remain the visual priority.
- The material's coordinates are CSS pixels, so resizing preserves ripple scale and geographic orientation; it does not mirror in RTL or stretch a fixed painting.

## Runtime architecture and budget

`scenes/BackdropScene.ts` shows the original palace image on the menu and `rendering/ProceduralOcean.ts` during matches. Both sit behind the existing board camera in the same Phaser game/context.

`rendering/oceanShader.ts` supplies a texture-free fragment material using Phaser 4's ShaderQuad configuration and uniform callback. `oceanModel.ts` supplies the shared wave parameters, the analytical height/slopes used by the fallback, value noise, the bounded local clock, and target sizing. It contains no Phaser or browser imports and never consumes match randomness.

The WebGL path draws into one cached `RenderTexture`:

- Preserve viewport aspect ratio at creation, with a cap of **320 × 640 pixels** (204,800 pixels / 0.78 MiB RGBA color storage; framebuffer overhead is separate).
- Refresh at most 30 times per second. The material is opaque and overwrites its full target; it does not accumulate translucent trails.
- RenderTexture uses Phaser 4's `all` mode to execute queued draws before presenting the image. Empty command buffers reuse the cached image. Shader parallel compilation is allowed to complete without treating a pending program as a failure.
- Reuse the target across resize and match changes. Change the viewport uniform/display size; never allocate a new target for each wave frame, action or resize.
- Advance the ocean's own clock only while a match is visible, no modal is open, and reduced motion is off. Menus, covered views, hidden tabs, and reduced-motion preferences freeze the same surface. Resume without catch-up or a phase reset; long frame gaps are capped at 50 ms.
- Wrap the clock at a shared 628.3-second period. Every temporal frequency divides this period, avoiding a seam or long-running phase precision loss.
- Destroy the unattached shader, surface/framebuffer, generated fallback texture, and graphics on scene shutdown/destruction.

The Canvas path generates a small stationary depth field once per resize and draws at most 160 low-contrast curved wavelets with Phaser Graphics, sharing the same slow wave field/clock. It also needs no image download. This is a simpler fallback, not an identical reproduction of the GPU material.

## Coast and composition

The existing radius-two island still fits inside its measured board viewport with 40 CSS pixels of ocean clearance. At the 390 × 844 reference screen the board camera is 390 × 428 and the land approximately 310 × 286. Ports retain their offshore placement and touch behavior.

The coast continues to derive from actual boundary edges in `rendering/boardCoast.ts`: a shallow-water wash, narrow warm sand/stone rim and sparse broken surf beneath the terrain. There is no circular island mask, fixed outline in the ocean material, or additional playable water. The shader never samples state, changes the shore, or moves the board.

Render order remains procedural sea → board-derived shallows/rim → terrain → board pieces/ports/tokens → Graphics interface → confirmed-action feedback.

## Verification and practical limits

`npm run check` verifies lint, formatting, pure Node tests, and the production build. Ocean tests cover random-source isolation, analytical derivatives, amplitude bounds, seamless looping, frozen/resumed time, noise continuity, and render-target pixel budgets.

The actual fragment material was also compiled/linked with local headless EGL/GLES and rendered at 296 × 640, displayed at the 390 × 844 reference size, at several times. This checks GLSL validity and the standalone material appearance without opening a browser. It does not test Phaser composition, the Canvas fallback on a browser, mobile GPU timing, or device-specific visual preference. Interactive/device review remains with the user, per the repository guide.
