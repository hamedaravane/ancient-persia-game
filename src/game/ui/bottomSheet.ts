import { artSprite, button, escape } from './components';
import { ART, type ArtName } from '../assets';

export interface SheetContent {
    title: string;
    body: string;
    narrator?: { portrait: ArtName; key: string };
    footer?: string;
    /** Keep a native edit session intact when unrelated platform state changes. */
    preserveInput?: boolean;
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
                    (el) =>
                        el.dataset.action === this.openerAction &&
                        !el.closest('dialog, [hidden]') &&
                        !el.matches(':disabled'),
                );
                const fallback =
                    this.parent.querySelector<HTMLElement>(
                        '.match-screen:not([hidden]) .target-picker button:not([disabled]), .match-screen:not([hidden]) .primary-row button:not([disabled])',
                    ) ??
                    this.parent.querySelector<HTMLElement>(
                        '.match-screen:not([hidden]) .match-bar button:not([disabled]), .main-menu:not([hidden]) button:not([disabled])',
                    );
                (opener ?? fallback)?.focus({ preventScroll: true });
            }
            return;
        }
        const wasOpen = this.dialog.open;
        if (wasOpen && content.preserveInput && this.dialog.querySelector('input')) return;
        const activeInput =
            document.activeElement instanceof HTMLInputElement ? document.activeElement : null;
        const selection = activeInput
            ? ([activeInput.selectionStart, activeInput.selectionEnd] as const)
            : null;
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
        const nameInput = this.dialog.querySelector<HTMLInputElement>('#player-name');
        if (!wasOpen) {
            this.dialog.showModal();
            (
                nameInput ?? this.dialog.querySelector<HTMLElement>('[data-action="tutorial-next"]')
            )?.focus({ preventScroll: true });
        }
        if (wasOpen) {
            const restored = [...this.dialog.querySelectorAll<HTMLElement>('[data-action]')].find(
                (el) => el.dataset.action === focusAction,
            );
            (narrationChanged
                ? this.dialog.querySelector<HTMLElement>('[data-action="tutorial-next"]')
                : (restored ?? nameInput ?? this.dialog.querySelector<HTMLElement>('button'))
            )?.focus({
                preventScroll: true,
            });
            this.dialog.querySelector('.sheet-body')!.scrollTop = narrationChanged ? 0 : scrollTop;
            if (nameInput && selection && selection[0] !== null && selection[1] !== null)
                nameInput.setSelectionRange(selection[0], selection[1]);
        }
    }
    destroy(): void {
        this.dialog.close();
        this.dialog.remove();
    }
}
