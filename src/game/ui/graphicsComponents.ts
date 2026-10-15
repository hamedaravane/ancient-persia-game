import type { GameObjects } from 'phaser';
import { canvasDisplay } from '../rendering/display';
import { headerBackdrop } from './headerModel';
import { drawPlayerAvatar } from './playerAvatarArt';
import type { AvatarId } from './playerIdentity';
import {
    drawDie,
    drawRosette,
    drawSurface,
    UI_INK,
    type Material,
    type UiBox,
} from './graphicsTheme';

export function drawComponent(
    graphics: GameObjects.Graphics,
    el: HTMLElement,
    box: UiBox,
    pressed: Element | null,
): void {
    const g = graphics;
    const has = (name: string) => el.classList.contains(name);
    const ownerValue = parseInt(
        getComputedStyle(el).getPropertyValue('--owner').trim().replace('#', ''),
        16,
    );
    const owner = Number.isFinite(ownerValue) ? ownerValue : UI_INK.gold;
    const disabled = el instanceof HTMLButtonElement && el.disabled;
    const selected = el.getAttribute('aria-pressed') === 'true';
    if (has('match-bar')) {
        const display = canvasDisplay(g.scene);
        drawSurface(g, headerBackdrop(box, display.width), 'inset', { radius: 0, flat: true });
        g.lineStyle(1, UI_INK.gold, 0.4).lineBetween(
            box.x + 14,
            box.y + box.height - 1,
            box.x + box.width - 14,
            box.y + box.height - 1,
        );
    } else if (has('player-avatar')) {
        drawPlayerAvatar(g, box, el.dataset.avatar as AvatarId, owner);
    } else if (has('header-self')) {
        if (has('is-active'))
            g.fillStyle(owner).fillRoundedRect(box.x + box.width - 2, box.y + 10, 2, 28, 1);
    } else if (has('rival-card')) {
        drawSurface(g, box, 'inset', {
            radius: 5,
            flat: true,
            accent: has('is-active') ? owner : undefined,
            pressed: pressed === el,
        });
        const target = Number(el.dataset.target) || 6;
        const score = Number(el.dataset.score) || 0;
        const spacing = (box.width - 16) / target;
        for (let i = 0; i < target; i++)
            g.fillStyle(i < score ? owner : 0x59605c).fillRect(
                box.x + box.width - 8 - (i + 1) * spacing,
                box.y + box.height - 3,
                Math.max(1, spacing - 2),
                2,
            );
    } else if (has('name-entry')) {
        drawSurface(g, box, 'inset', { radius: 8, flat: true });
        if (el.matches(':focus-within')) {
            g.lineStyle(2, UI_INK.gold).strokeRoundedRect(box.x, box.y, box.width, box.height, 8);
            drawNameSelection(g, el, box);
        }
    } else if (has('resource-hand')) {
        drawSurface(g, { ...box, y: box.y - 5, height: box.height + 8 }, 'inset', {
            radius: 22,
            flat: true,
        });
    } else if (has('bottom-space')) {
        // Paint through the home-indicator inset; semantic controls stay safely above it.
        const display = canvasDisplay(g.scene);
        g.fillStyle(0x252b2d).fillRect(
            0,
            box.y,
            display.width,
            Math.max(0, display.height - box.y),
        );
    } else if (has('action-dock') || has('primary-row')) {
        g.fillStyle(0x252b2d).fillRect(box.x, box.y, box.width, box.height);
    } else if (has('menu-panel')) {
        drawSurface(g, box, 'inset', { radius: 28, accent: 0xb88c48, flat: true });
        // Stepped corner cuts recall palace reliefs; geometry stays quiet behind text.
        for (const direction of [-1, 1]) {
            const x = direction < 0 ? box.x + 12 : box.x + box.width - 12;
            g.lineStyle(2, UI_INK.gold, 0.65)
                .beginPath()
                .moveTo(x, box.y + 44)
                .lineTo(x, box.y + 16)
                .lineTo(x - direction * 28, box.y + 16)
                .strokePath();
        }
    } else if (has('player-chip')) {
        drawSurface(g, box, has('is-active') ? 'limestone' : 'card', {
            accent: has('is-active') ? owner : undefined,
            radius: 13,
            flat: true,
            pressed: pressed === el,
        });
        const target = Number(el.dataset.target) || 6;
        const score = Number(el.dataset.score) || 0;
        const spacing = Math.min(10, (box.width - 18) / target);
        for (let i = 0; i < target; i++) {
            g.fillStyle(i < score ? owner : 0x5a5c51).fillRoundedRect(
                box.x + box.width / 2 + (target / 2 - i - 1) * spacing,
                box.y + box.height - 6,
                spacing - 3,
                3,
                1,
            );
        }
        if (has('is-active')) drawRosette(g, box.x + box.width / 2, box.y + 1, 3.5, owner);
    } else if (has('hand-resource')) {
        drawSurface(g, box, 'card', { radius: 13, flat: true });
        const colors: Record<string, number> = {
            wood: 0x557560,
            brick: 0x965f49,
            wheat: 0x947135,
            wool: 0x687957,
            stone: 0x627078,
        };
        g.fillStyle(colors[el.dataset.resource ?? ''] ?? UI_INK.gold, 0.8).fillRoundedRect(
            box.x + 12,
            box.y + box.height - 3,
            Math.max(3, box.width - 24),
            2,
            1,
        );
    } else if (has('owner-dot') || has('owner-badge')) {
        drawSurface(g, box, 'inset', {
            radius: has('owner-dot') ? 6 : 14,
            accent: owner,
            flat: true,
        });
        g.fillStyle(owner).fillRoundedRect(
            box.x + 2,
            box.y + 2,
            box.width - 4,
            box.height - 4,
            has('owner-dot') ? 4 : 12,
        );
    } else if (has('dice-total')) {
        drawSurface(g, box, 'inset', { radius: 9, flat: true });
    } else if (el.dataset.dice) {
        drawDie(g, box, Number(el.dataset.dice));
    } else if (has('score-symbol')) {
        drawRosette(g, box.x + box.width / 2, box.y + box.height / 2, box.width / 2, 0x65543d);
    } else if (has('total-symbol')) {
        g.fillStyle(0x51564c, 0.6).fillRoundedRect(
            box.x + 3,
            box.y,
            box.width - 3,
            box.height - 3,
            2,
        );
        g.lineStyle(1, 0x51564c).strokeRoundedRect(
            box.x,
            box.y + 3,
            box.width - 3,
            box.height - 3,
            2,
        );
    } else if (has('build-card') || has('trade-review') || el.matches('.results-list article')) {
        drawSurface(g, box, has('trade-review') ? 'inset' : 'card', { radius: 17, flat: true });
    } else if (has('narrator-heading') || has('narrator-footer')) {
        const y = has('narrator-heading') ? box.y + box.height : box.y;
        g.lineStyle(1, UI_INK.gold, 0.22).lineBetween(box.x + 22, y, box.x + box.width - 22, y);
    } else if (has('narrator-task')) {
        g.fillStyle(UI_INK.gold, 0.8).fillRoundedRect(
            box.x + box.width - 3,
            box.y + 5,
            2,
            Math.max(2, box.height - 10),
            1,
        );
    } else if (has('sheet-header')) {
        drawSurface(g, box, 'limestone', { radius: 22, flat: true });
        g.fillStyle(UI_INK.gold, 0.7).fillRoundedRect(
            box.x + box.width / 2 - 18,
            box.y + 5,
            36,
            3,
            2,
        );
    } else if (el instanceof HTMLButtonElement || el.tagName === 'SUMMARY') {
        let material: Material = has('button--end-turn')
            ? 'basalt'
            : has('button--primary')
              ? 'honey'
              : 'limestone';
        if (has('button--tutorial')) material = 'basalt';
        if (has('context-button') || has('button--quiet') || el.tagName === 'SUMMARY')
            material = 'inset';
        if (has('resource-choice') || has('port-chip') || has('port-list-item'))
            material = selected ? 'limestone' : 'card';
        // Icon artwork stays small inside the full-size semantic touch target.
        const surface = has('icon-button')
            ? {
                  x: box.x + (box.width - 32) / 2,
                  y: box.y + (box.height - 32) / 2,
                  width: 32,
                  height: 32,
              }
            : box;
        drawSurface(g, surface, material, {
            pressed: pressed === el,
            disabled,
            accent: selected
                ? material !== 'inset'
                    ? 0x6d4e2d
                    : UI_INK.gold
                : has('is-owned')
                  ? owner
                  : undefined,
            radius: has('icon-button') ? 5 : 14,
            flat: has('context-button'),
        });
        if (selected)
            drawRosette(g, box.x + 9, box.y + 9, 4, material !== 'inset' ? 0x65543d : UI_INK.gold);
        if (el.tagName === 'SUMMARY') {
            const cx = box.x + 12,
                cy = box.y + box.height / 2;
            const open = (el.parentElement as HTMLDetailsElement).open;
            g.lineStyle(2, UI_INK.gold).beginPath();
            if (open)
                g.moveTo(cx - 3, cy - 2)
                    .lineTo(cx, cy + 2)
                    .lineTo(cx + 3, cy - 2);
            else
                g.moveTo(cx - 3, cy - 3)
                    .lineTo(cx + 3, cy)
                    .lineTo(cx - 3, cy + 3);
            g.strokePath();
        }
    } else if (has('piece-symbol')) {
        drawPieceSymbol(
            g,
            box,
            has('piece-symbol--city') ? 'city' : has('piece-symbol--road') ? 'road' : 'settlement',
        );
    } else if (el.matches('.detail-list > div, .history-list > li')) {
        g.lineStyle(1, 0x656b61, 0.6).lineBetween(
            box.x,
            box.y + box.height - 1,
            box.x + box.width,
            box.y + box.height - 1,
        );
    } else if (el.matches('.help-list > li, .plain-list > li')) {
        drawRosette(g, box.x + box.width + 12, box.y + 13, 4, UI_INK.gold);
    }
    if (el.matches('button:focus-visible, summary:focus-visible'))
        g.lineStyle(
            3,
            !has('button--quiet') &&
                !has('context-button') &&
                el.tagName !== 'SUMMARY' &&
                !has('button--end-turn') &&
                !has('button--tutorial') &&
                !has('header-self') &&
                !has('rival-card')
                ? 0x314956
                : 0xffedb8,
        ).strokeRoundedRect(box.x - 2, box.y - 2, box.width + 4, box.height + 4, 16);
}

/** Browser ranges retain Persian shaping; Phaser paints the invisible native input's selection. */
function drawNameSelection(g: GameObjects.Graphics, el: HTMLElement, box: UiBox): void {
    const input = el.querySelector('input');
    const text = el.querySelector('.name-entry-value')?.firstChild;
    if (!input || document.activeElement !== input || !text) return;
    const length = text.textContent?.length ?? 0;
    const start = Math.min(input.selectionStart ?? 0, length);
    const end = Math.min(input.selectionEnd ?? start, length);
    const range = document.createRange();
    range.setStart(text, start);
    range.setEnd(text, end);
    const parent = el.getBoundingClientRect();
    const rect = range.getBoundingClientRect();
    const left = Math.max(box.x + 14, box.x + rect.left - parent.left);
    const right = Math.min(box.x + box.width - 14, box.x + rect.right - parent.left);
    const top = rect.height ? box.y + rect.top - parent.top : box.y + 12;
    const height = rect.height || 28;
    if (end > start) {
        if (right > left) g.fillStyle(UI_INK.gold, 0.25).fillRect(left, top, right - left, height);
    } else {
        const x = rect.height ? Math.min(box.x + box.width - 14, left) : box.x + box.width - 14;
        g.lineStyle(1.5, UI_INK.gold).lineBetween(x, top, x, top + height);
    }
}

function drawPieceSymbol(g: GameObjects.Graphics, box: UiBox, kind: string): void {
    const { x, y, width: w, height: h } = box;
    drawSurface(g, box, 'honey', { radius: 4, flat: true });
    g.fillStyle(0x283e55);
    if (kind === 'road') {
        g.fillRoundedRect(x + 3, y + 2, w - 6, Math.max(2, h - 4), 2);
    } else {
        g.fillRect(x + w * 0.2, y + h * 0.2, w * 0.6, h * 0.6);
        g.fillStyle(UI_INK.gold).fillRect(x + w * 0.4, y + h * 0.5, w * 0.2, h * 0.35);
        if (kind === 'city')
            g.fillStyle(0x283e55).fillRect(x + w * 0.65, y + h * 0.1, w * 0.25, h * 0.5);
    }
}
