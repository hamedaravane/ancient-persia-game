# Installable and offline game

## Release behavior

The public name is **Sunmark** (سان‌مارک). The browser title, Apple launcher title, social-sharing metadata, and manifest names use the shared `src/brand.ts` definition. The original `/ancient-persia-game/` manifest ID, published Pages path, `ancient-persia` cache prefix, and `ancient-persia.match.v1` save-key prefix are compatibility identifiers and remain stable through the rename. Changing those just to match the display name could separate existing installs, caches, or saved matches. The package name is `sunmark`; it does not determine the deployment path or app identity.

Sunmark is a standalone Persian/RTL Phaser PWA. `vite-plugin-pwa` generates the manifest and a Workbox service worker during production builds. `src/pwa/browser.ts` registers it under Vite's deployed base path. The stable manifest identity is `/ancient-persia-game/`, resolved against the origin; launch and worker scope still follow the deployment path. The existing GitHub Pages workflow builds with its configured repository/custom-domain base and checks PWA artifacts before deployment. Serve production over HTTPS; localhost is suitable for development previews. A backend, app-store account, or hosted conversion service is not needed for this local multiplayer release.

The main menu offers installation/help, offline preparation status, and the saved match. Help also opens **نصب و بازی آفلاین** and **ذخیره و بازگشت به منو**. These surfaces use the existing Phaser Graphics/Text renderer and transparent semantic input adapter. The interface does not place browser installation or update prompts over an active turn.

On supported browsers, **نصب سان‌مارک** invokes the deferred browser installation prompt after the player taps it. The prompt is consumed once, including dismissals. iPhone/iPad users see Safari Share → Add to Home Screen instructions, including Open as Web App where offered. In-app browsers may need the player to open the link in a supported browser. Installed/standalone detection hides redundant installation prompts. These capabilities vary by browser; a normal browser session remains playable.

## Offline assets and updates

Workbox precaches the HTML, all built JavaScript/CSS, local WOFF2 font, runtime WebP images, manifest, and platform icons. This explicitly includes all six lazily rendered Anahita expressions. Unused-but-shipped runtime art is also available offline. Original art under `art/reference/` is never shipped. Individual cache entries are limited to 4 MiB; a release exceeding that limit fails the build/artifact checks instead of silently losing offline art.

The first complete preparation needs connectivity and roughly 16 MiB of uncompressed response bodies, including the current game bundle and icons. HTTP transfers can be smaller through compression. Preparation runs through the worker alongside the playable game; the UI says **آماده برای بازی آفلاین** only once a worker has activated after its precache installation. An interrupted first installation shows a retry. Existing active workers keep serving their installed version while a newer one downloads. Browser storage clearing/eviction can remove offline availability; this is not an irrevocable device installation.

While a page is open, workers wait for an explicit **به‌روزرسانی و بازکردن نسخه تازه** action. Updates are disabled while an unfinished match is on screen. The player can save and return to the menu, then apply the update. Starting/resuming is disabled while activation is pending. Only the requesting page reloads after controller change; another open tab never reloads automatically. Update checks run on launch and on online/focus/visibility changes, throttled to five minutes. Activation failures allow retry. When all pages are closed, a waiting worker may activate normally before the next launch. Workbox revisions identify changed assets and clean obsolete precache entries on activation.

## Saved matches

`game/persistence/matchStore.ts` stores one version-1 local snapshot in localStorage. The storage key includes the deployed path to isolate project sites on the same origin. The snapshot contains authoritative core state, the last 100 history events, and tutorial memory: enabled/paused state, reviewed/practiced lessons, queued dialogue, and replay status. Synchronous writes happen after session changes, including every confirmed move and tutorial acknowledgement; saving does not depend on a page-exit callback.

Launching shows **ادامه بازی** rather than immediately starting the saved match. Resume never generates a new board, rolls dice, or replays a historical transition. Mandatory robber relocation is restored without a target. Optional placement previews, trade drafts, animation, and open workspaces are discarded. Pending narrator dialogue resumes. Finished games can reopen their results. Returning to the menu preserves the snapshot; choosing a new match requires confirmation before replacing it.

`validateState.ts` checks fixed board geometry, terrain/number/port bags, references, owners, resources, dice/phase data, and victory consistency before rendering restored data. The topology comparison uses an explicitly constant random source and does not consume game randomness. Malformed, incompatible-version, or unknown-lesson saves remain untouched on load and show a recovery message. There is no migration from future schemas; change the version and provide a migration when saved rules or data change. Storage denial/quota failure does not block play, but a visible message explains that closing the app may lose the match.

Saves are local to the browser/app storage container, without account sync or backup. Safari and an installed iOS app may use separate storage containers. Concurrent sessions share one save slot within a container; the latest saved session wins. Clearing site data or uninstall/storage policies can remove saves. **ادامه بازی** describes same-device recovery, not cloud durability.

## Icons

`public/icons/` contains PNG exports for 192/512 app icons, a 512 maskable icon, and a 180 Apple touch icon. PNG is intentional platform packaging; in-game illustrations remain optimized WebP. `scripts/export-pwa-icons.py` derives the icons from the preserved victory-emblem PNG using the existing reviewed crop, an opaque navy ground, and proportional resampling. The maskable version keeps the complete emblem inside the central safe circle. No source art or Persian text is repainted. Run `npm run pwa:icons` with Pillow to reproduce them; normal builds use checked-in exports.

## Verification

`npm run check` runs lint, formatting, Node tests, the production build, and `npm run pwa:check`. The artifact check verifies manifest identity/scope/start URLs, platform icon dimensions, controlled update activation, and every shipped offline file, including Anahita's six expressions. CI performs this check on the real Pages base-path build. Persistence tests cover roll/robber/build recovery, discarded drafts, tutorial continuity, replacement confirmation, invalid/versioned saves, and unavailable storage. Platform tests simulate installation/update/worker events without launching a browser.

To reproduce the deployed path locally:

```sh
npm run build -- --base=/ancient-persia-game/
npm run pwa:check
npm run preview -- --host
```

The service worker is disabled in the ordinary Vite development server to avoid caching source during editing. Test the production preview on localhost or an HTTPS host; a phone visiting a plain HTTP LAN address does not satisfy the secure-context requirement.

The user performs interactive/device testing. Before announcing the release broadly, check on Android Chrome and iPhone Safari/Home Screen:

1. Install from the menu; check icon, standalone chrome, RTL, safe areas, and portrait/landscape layout.
2. Wait for offline-ready status, enable airplane mode, fully close/reopen, and start both guided and unguided games. Replay all six expressions from the journal without a missing-art placeholder persisting.
3. Close/reopen after a roll, build, trade, and mandatory robber prompt. Resume the exact board/resources/turn and tutorial progress. Confirm a preview did not spend resources.
4. Return to the menu, cancel new-game replacement, resume, then explicitly replace the save.
5. Deploy a newer version while a match is open: the match must stay open, update must wait for the menu, and the saved match must survive updating. Keep a second tab open to check that it is not force-reloaded.
6. Interrupt first-time preparation, reconnect, and retry. Check startup time and responsiveness while cache installation runs. Verify the visible storage warning with browser storage blocked.

Node/artifact checks do not establish actual browser installation or visual/performance behavior on phones.

## Primary references

- [MDN: making PWAs installable](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)
- [Vite PWA: registration](https://vite-pwa-org.netlify.app/guide/register-service-worker), [static assets](https://vite-pwa-org.netlify.app/guide/static-assets), and [prompted updates](https://vite-pwa-org.netlify.app/guide/prompt-for-update)
- [Apple: adding a website to the Home Screen](https://support.apple.com/en-euro/guide/iphone/iph42ab2f3a7/ios)
- [GitHub Pages HTTPS](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https)
