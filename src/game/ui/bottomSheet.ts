import { artSprite, button, escape } from './components';
import { AnimationGroup, MOTION, type Motion } from './motion';

/** Native modal provides focus trapping and makes the covered interface inert. */
export class BottomSheet {
    private dialog = document.createElement('dialog');
    private openerAction: string | undefined;
    private animation: AnimationGroup;

    constructor(
        private parent: HTMLElement,
        onClose: () => void,
        motion: Motion,
    ) {
        this.animation = new AnimationGroup(motion);
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

    render(content: { title: string; body: string } | null, openerAction?: string): void {
        if (!content) {
            if (this.dialog.open) {
                this.animation.clear();
                this.dialog.close();
                const opener = [...this.parent.querySelectorAll<HTMLElement>('[data-action]')].find(
                    (el) => el.dataset.action === this.openerAction && !el.closest('dialog'),
                );
                const fallback = this.parent.querySelector<HTMLElement>(
                    '.target-picker select, .primary-row button:not([disabled])',
                );
                (opener ?? fallback)?.focus({ preventScroll: true });
            }
            return;
        }
        const wasOpen = this.dialog.open;
        const focusAction = wasOpen
            ? (document.activeElement as HTMLElement | null)?.dataset.action
            : undefined;
        const scrollTop = this.dialog.querySelector('.sheet-body')?.scrollTop ?? 0;
        if (!wasOpen)
            this.openerAction =
                openerAction ?? (document.activeElement as HTMLElement | null)?.dataset.action;
        this.dialog.innerHTML = `<header class="sheet-header"><h2 id="sheet-title">${artSprite('rosette', 20)}${escape(content.title)}</h2>${button('×', 'close-sheet', { className: 'icon-button', label: 'بستن پنجره' })}</header><div class="sheet-body">${content.body}</div>`;
        if (!wasOpen) {
            this.dialog.showModal();
            this.animation.play(
                this.dialog,
                [
                    { transform: 'translateY(28px)', opacity: 0.4 },
                    { transform: 'translateY(0)', opacity: 1 },
                ],
                { duration: MOTION.sheet, easing: MOTION.ease },
                undefined,
                [{ opacity: 0.5 }, { opacity: 1 }],
            );
        }
        if (wasOpen) {
            const restored = [...this.dialog.querySelectorAll<HTMLElement>('[data-action]')].find(
                (el) => el.dataset.action === focusAction,
            );
            (restored ?? this.dialog.querySelector<HTMLElement>('button'))?.focus({
                preventScroll: true,
            });
            this.dialog.querySelector('.sheet-body')!.scrollTop = scrollTop;
        }
    }
    destroy(): void {
        this.animation.destroy();
        this.dialog.close();
        this.dialog.remove();
    }
}
