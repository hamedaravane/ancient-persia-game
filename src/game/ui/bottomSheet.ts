import { artSprite, button, escape } from './components';
import { ART, type ArtName } from '../assets';

export interface SheetContent {
    title: string;
    body: string;
    narrator?: { portrait: ArtName; key: string };
    footer?: string;
}

/** Native modal provides focus trapping and makes the covered interface inert. */
export class BottomSheet {
    private dialog = document.createElement('dialog');
    private openerAction: string | undefined;

    constructor(
        private parent: HTMLElement,
        onClose: () => void,
    ) {
        this.dialog.className = 'bottom-sheet';
        this.dialog.setAttribute('aria-labelledby', 'sheet-title');
        parent.append(this.dialog);
        this.dialog.addEventListener('cancel', (event) => {
            event.preventDefault();
            onClose();
        });
        this.dialog.addEventListener('click', (event) => {
            const bounds = this.dialog.getBoundingClientRect();
            if (
                event.target === this.dialog &&
                (event.clientY < bounds.top ||
                    event.clientY > bounds.bottom ||
                    event.clientX < bounds.left ||
                    event.clientX > bounds.right)
            )
                onClose();
        });
    }

    render(content: SheetContent | null, openerAction?: string): void {
        if (!content) {
            if (this.dialog.open) {
                this.dialog.close();
                const opener = [...this.parent.querySelectorAll<HTMLElement>('[data-action]')].find(
                    (el) => el.dataset.action === this.openerAction && !el.closest('dialog'),
                );
                const fallback = this.parent.querySelector<HTMLElement>(
                    '.target-picker button, .primary-row button:not([disabled])',
                );
                (opener ?? fallback)?.focus({ preventScroll: true });
            }
            return;
        }
        const wasOpen = this.dialog.open;
        const focusAction = wasOpen
            ? (document.activeElement as HTMLElement | null)?.dataset.action
            : undefined;
        const narrationChanged =
            !!content.narrator && this.dialog.dataset.narration !== content.narrator.key;
        const scrollTop = this.dialog.querySelector('.sheet-body')?.scrollTop ?? 0;
        if (!wasOpen)
            this.openerAction =
                openerAction ?? (document.activeElement as HTMLElement | null)?.dataset.action;
        const portrait = content.narrator?.portrait;
        this.dialog.classList.toggle('narrator-sheet', !!portrait);
        this.dialog.dataset.portrait = portrait ?? '';
        this.dialog.dataset.narration = content.narrator?.key ?? '';
        const header = `<header class="sheet-header${portrait ? ' narrator-heading' : ''}"><h2 id="sheet-title">${artSprite('rosette', 20)}${escape(content.title)}${portrait ? '<span class="narrator-role">همراه سفر</span>' : ''}</h2>${button('×', 'close-sheet', { className: 'icon-button', label: 'بستن پنجره' })}</header>`;
        const body = `<div class="sheet-body">${content.body}</div>`;
        if (portrait) {
            const [, , width, height] = ART[portrait].frame;
            this.dialog.innerHTML = `<div class="narrator-stage" aria-hidden="true" style="--portrait-ratio:${width / height}">${artSprite(portrait, 320, 'narrator-hero')}</div><section class="narrator-panel">${header}${body}<footer class="narrator-footer">${content.footer ?? ''}</footer></section>`;
        } else this.dialog.innerHTML = `${header}${body}`;
        if (!wasOpen) {
            this.dialog.showModal();
            this.dialog
                .querySelector<HTMLElement>('[data-action="tutorial-next"]')
                ?.focus({ preventScroll: true });
        }
        if (wasOpen) {
            const restored = [...this.dialog.querySelectorAll<HTMLElement>('[data-action]')].find(
                (el) => el.dataset.action === focusAction,
            );
            (narrationChanged
                ? this.dialog.querySelector<HTMLElement>('[data-action="tutorial-next"]')
                : (restored ?? this.dialog.querySelector<HTMLElement>('button'))
            )?.focus({
                preventScroll: true,
            });
            this.dialog.querySelector('.sheet-body')!.scrollTop = narrationChanged ? 0 : scrollTop;
        }
    }
    destroy(): void {
        this.dialog.close();
        this.dialog.remove();
    }
}
