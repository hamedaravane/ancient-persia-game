import { Scene, type GameObjects } from 'phaser';
import { ART, assetUrl } from '../assets';
import { RESOURCE_TYPES } from '../core/types';
import type { GameSession } from './session';
import { MOTION, type Motion } from './motion';
import { UI_FONT_FAMILY } from './typography';
import { drawSurface, UI_INK, type UiBox } from './graphicsTheme';
import { drawComponent } from './graphicsComponents';
import { measureTextRuns, SemanticTextMetrics } from './semanticText';
import { fitText, textRunPosition } from './textGeometry';
import { GraphicsFeedback } from './GraphicsFeedback';

interface PaintLayer {
    container: GameObjects.Container;
    graphics: GameObjects.Graphics;
    objects: Map<string, GameObjects.Text | GameObjects.Image>;
    used: Set<string>;
}

/**
 * Draws every visible UI surface with Graphics and every label with Phaser Text.
 * The transparent DOM is a responsive layout/semantic input adapter, never a
 * screenshot or texture. It preserves browser Persian shaping, line breaks,
 * native modal focus, scrolling, and exact CSS-pixel hit areas.
 */
export class InterfaceScene extends Scene {
    private hud: PaintLayer;
    private modal: PaintLayer;
    private content: PaintLayer;
    private maskShape: GameObjects.Graphics;
    private modalMask: Phaser.Display.Masks.GeometryMask;
    private dirty = true;
    private observer: MutationObserver;
    private resizeObserver: ResizeObserver;
    private nodeIds = new WeakMap<Node, number>();
    private fontMetrics = new SemanticTextMetrics();
    private nextNode = 0;
    private origin = { x: 0, y: 0 };
    private pressed: Element | null = null;
    private cleanup: Array<() => void> = [];
    private sheetOpenedAt = -Infinity;
    private hadSheet = false;
    feedback: GraphicsFeedback | undefined;

    constructor(
        private parent: HTMLElement,
        private session: GameSession,
        private motion: Motion,
    ) {
        super('InterfaceScene');
    }
    preload(): void {
        for (const name of ['bank', 'victory', 'corner', 'divider', 'rosette', 'glint'] as const)
            this.load.image(`ui-${name}`, assetUrl(ART[name].file));
    }
    create(): void {
        for (const name of ['bank', 'victory', 'corner', 'divider', 'rosette', 'glint'] as const) {
            const [x, y, w, h] = ART[name].frame;
            this.textures.get(`ui-${name}`).add('crop', 0, x, y, w, h);
        }
        this.hud = this.layer();
        this.modal = this.layer();
        this.content = this.layer();
        this.maskShape = this.make.graphics({}, false);
        this.modalMask = this.maskShape.createGeometryMask();
        this.content.container.setMask(this.modalMask);
        this.feedback = new GraphicsFeedback(this, this.parent, this.motion);
        this.parent.classList.add('graphics-ui');
        this.observer = new MutationObserver(this.invalidate);
        // Exclude the stage: Phaser attaches its hidden RTL text canvases there.
        this.observer.observe(this.parent, { attributes: true });
        for (const root of this.parent.querySelectorAll('.main-menu, .match-screen, dialog'))
            this.observer.observe(root, {
                subtree: true,
                childList: true,
                characterData: true,
                attributes: true,
            });
        this.resizeObserver = new ResizeObserver(this.invalidate);
        this.resizeObserver.observe(this.parent);
        for (const el of this.parent.querySelectorAll('.main-menu, .match-screen, dialog'))
            this.resizeObserver.observe(el);
        const listen = (name: string, handler: EventListener) => {
            this.parent.addEventListener(name, handler, true);
            this.cleanup.push(() => this.parent.removeEventListener(name, handler, true));
        };
        listen('scroll', this.invalidate);
        listen('focusin', this.invalidate);
        listen('focusout', this.invalidate);
        listen('toggle', this.invalidate);
        listen('keydown', (event) => {
            const key = (event as KeyboardEvent).key;
            if (key === ' ' || key === 'Enter') {
                this.pressed = (event.target as Element).closest('button:not(:disabled), summary');
                this.invalidate();
            }
        });
        listen('keyup', () => {
            this.pressed = null;
            this.invalidate();
        });
        listen('pointerdown', (event) => {
            this.pressed = (event.target as Element).closest('button:not(:disabled), summary');
            this.invalidate();
        });
        const release = () => {
            this.pressed = null;
            this.invalidate();
        };
        window.addEventListener('pointerup', release);
        window.addEventListener('pointercancel', release);
        window.addEventListener('blur', release);
        this.cleanup.push(() => {
            window.removeEventListener('pointerup', release);
            window.removeEventListener('pointercancel', release);
            window.removeEventListener('blur', release);
        });
        this.cleanup.push(
            this.session.subscribe(this.invalidate),
            this.motion.subscribe(() => {
                this.feedback?.clear();
                if (this.motion.reduced) this.sheetOpenedAt = -Infinity;
                this.invalidate();
            }),
        );
        this.scale.on('resize', this.invalidate);
        let disposed = false;
        const dispose = () => {
            if (disposed) return;
            disposed = true;
            this.feedback?.clear();
            this.feedback = undefined;
            this.observer.disconnect();
            this.resizeObserver.disconnect();
            this.cleanup.forEach((fn) => fn());
            this.scale.off('resize', this.invalidate);
            this.modalMask.destroy();
            this.maskShape.destroy();
            this.parent.classList.remove('graphics-ui');
        };
        this.events.once('shutdown', dispose);
        this.events.once('destroy', dispose);
        this.invalidate();
    }
    invalidate = (): void => {
        this.dirty = true;
    };

    update(time: number): void {
        if (!this.hud) return;
        // Sheet geometry stays aligned with its semantic hit regions throughout entrance.
        if (this.dirty) {
            this.dirty = false;
            this.paint(time);
        }
        if (this.hadSheet && time - this.sheetOpenedAt < MOTION.sheet) {
            const progress = Math.min(1, (time - this.sheetOpenedAt) / MOTION.sheet);
            const alpha = 0.45 + 0.55 * (1 - Math.pow(1 - progress, 3));
            this.modal.container.setAlpha(alpha);
            this.content.container.setAlpha(alpha);
        }
    }
    private layer(): PaintLayer {
        const container = this.add.container();
        const graphics = this.add.graphics();
        container.add(graphics);
        return { container, graphics, objects: new Map(), used: new Set() };
    }
    private begin(layer: PaintLayer): void {
        layer.graphics.clear();
        layer.used.clear();
    }
    private end(layer: PaintLayer): void {
        // Keep stable Text/Image instances; discard nodes removed by a HUD/sheet update.
        for (const [id, object] of layer.objects)
            if (!layer.used.has(id)) {
                object.destroy();
                layer.objects.delete(id);
            }
    }
    private key(node: Node, suffix = ''): string {
        if (!this.nodeIds.has(node)) this.nodeIds.set(node, ++this.nextNode);
        return `${this.nodeIds.get(node)}:${suffix}`;
    }
    private box(element: Element): UiBox {
        const rect = element.getBoundingClientRect();
        return {
            x: rect.left - this.origin.x,
            y: rect.top - this.origin.y,
            width: rect.width,
            height: rect.height,
        };
    }
    private paint(time: number): void {
        const origin = this.parent.getBoundingClientRect();
        this.origin = { x: origin.left, y: origin.top };
        for (const layer of [this.hud, this.modal, this.content]) this.begin(layer);
        const menu = this.parent.querySelector<HTMLElement>('.main-menu')!;
        const match = this.parent.querySelector<HTMLElement>('.match-screen')!;
        this.paintTree(this.session.state ? match : menu, this.hud);
        const dialog = this.parent.querySelector<HTMLDialogElement>('dialog[open]');
        this.modal.container.setVisible(!!dialog);
        this.content.container.setVisible(!!dialog);
        if (dialog) {
            if (!this.hadSheet) this.sheetOpenedAt = this.motion.reduced ? -Infinity : time;
            const box = this.box(dialog);
            this.modal.graphics
                .fillStyle(0x040e20, 0.78)
                .fillRect(0, 0, this.scale.width, this.scale.height);
            drawSurface(this.modal.graphics, box, 'inset', {
                radius: 24,
                accent: 0x8b8069,
                flat: true,
            });
            const header = dialog.querySelector<HTMLElement>('.sheet-header')!;
            this.paintTree(header, this.modal);
            const body = dialog.querySelector<HTMLElement>('.sheet-body')!;
            const clip = this.box(body);
            this.maskShape
                .clear()
                .fillStyle(0xffffff)
                .fillRect(clip.x, clip.y, clip.width, clip.height);
            this.paintTree(body, this.content, clip);
            this.scrollIndicator(body, this.modal.graphics);
            this.modal.container.setAlpha(1);
            this.content.container.setAlpha(1);
        }
        this.hadSheet = !!dialog;
        for (const layer of [this.hud, this.modal, this.content]) this.end(layer);
    }
    private paintTree(root: HTMLElement, layer: PaintLayer, clip?: UiBox): void {
        const visit = (element: HTMLElement) => {
            if (
                element.hidden ||
                element.classList.contains('sr-only') ||
                element.classList.contains('board-canvas')
            )
                return;
            const style = getComputedStyle(element);
            if (style.display === 'none') return;
            const box = this.box(element);
            if (box.width <= 0 || box.height <= 0) return;
            if (clip && (box.y + box.height < clip.y || box.y > clip.y + clip.height)) return;
            this.paintElement(element, box, layer);
            // Native closed details retain descendant DOM nodes but hide their contents.
            for (const node of element.childNodes) {
                if (node instanceof HTMLElement) {
                    if (
                        element instanceof HTMLDetailsElement &&
                        !element.open &&
                        node.tagName !== 'SUMMARY'
                    )
                        continue;
                    visit(node);
                } else if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim())
                    this.paintText(node, element, layer);
            }
        };
        visit(root);
    }
    private paintElement(el: HTMLElement, box: UiBox, layer: PaintLayer): void {
        drawComponent(layer.graphics, el, box, this.pressed);
        const has = (name: string) => el.classList.contains(name);
        if (el.dataset.art) this.paintImage(layer, el, `ui-${el.dataset.art}`, 'crop', box);
        if (has('resource-icon')) {
            const resource = RESOURCE_TYPES.find((r) => has(`resource-icon--${r}`));
            if (resource) this.paintImage(layer, el, 'art-resources', resource, box);
        }
    }
    private paintImage(
        layer: PaintLayer,
        node: HTMLElement,
        texture: string,
        frame: string,
        box: UiBox,
    ): void {
        if (!this.textures.exists(texture) || !this.textures.get(texture).has(frame)) return;
        const id = this.key(node, 'image');
        let image = layer.objects.get(id) as GameObjects.Image | undefined;
        if (!image) {
            image = this.add.image(0, 0, texture, frame);
            layer.container.add(image);
            layer.objects.set(id, image);
        }
        layer.used.add(id);
        const style = getComputedStyle(node);
        const matrix = new DOMMatrixReadOnly(
            style.transform === 'none' ? undefined : style.transform,
        );
        image
            .setPosition(box.x + box.width / 2, box.y + box.height / 2)
            .setDisplaySize(
                parseFloat(style.width) * Math.hypot(matrix.a, matrix.b),
                parseFloat(style.height) * Math.hypot(matrix.c, matrix.d),
            )
            .setRotation(Math.atan2(matrix.b, matrix.a));
        image.setAlpha(node.closest('button:disabled') ? 0.45 : 1);
    }
    private paintText(node: Node, element: HTMLElement, layer: PaintLayer): void {
        const style = getComputedStyle(element);
        const runs = measureTextRuns(node);
        for (const [index, run] of runs.entries()) {
            const id = this.key(node, String(index));
            let text = layer.objects.get(id) as GameObjects.Text | undefined;
            const size = parseFloat(style.fontSize);
            const metrics = this.fontMetrics.get(style);
            if (!text) {
                text = this.add
                    .text(0, 0, run.value, {
                        fontFamily: UI_FONT_FAMILY,
                        fontSize: size,
                        color: style.color,
                        rtl: style.direction === 'rtl',
                        // Phaser 4 positions RTL text using backing-canvas width.
                        // Logical resolution keeps its right edge correct on Retina devices.
                        resolution: 1,
                        metrics,
                        padding: { x: 1, y: 3 },
                    })
                    .setOrigin(0, 0);
                layer.objects.set(id, text);
                layer.container.add(text);
            }
            layer.used.add(id);
            if (text.text !== run.value) text.setText(run.value);
            if (text.style.color !== style.color) text.setColor(style.color);
            if (text.style.fontSize !== `${size}px`) text.setStyle({ fontSize: size, metrics });
            if (style.textOverflow === 'ellipsis') {
                const width =
                    element.clientWidth -
                    parseFloat(style.paddingLeft) -
                    parseFloat(style.paddingRight);
                const fitted = fitText(
                    run.value,
                    width,
                    (value) => text!.context.measureText(value).width,
                );
                if (text.text !== fitted) text.setText(fitted);
            }
            const { x, y } = textRunPosition(
                run.rect,
                text.width,
                metrics,
                text.padding,
                this.origin,
                style.direction === 'rtl',
            );
            text.setPosition(x, y).setAlpha(1);
            // Honor CSS overflow regions without shrinking Persian labels or text.
            let ancestor: HTMLElement | null = element;
            let left = 0,
                right = this.scale.width;
            while (ancestor && ancestor !== this.parent) {
                if (['hidden', 'clip'].includes(getComputedStyle(ancestor).overflowX)) {
                    const box = this.box(ancestor);
                    left = Math.max(left, box.x);
                    right = Math.min(right, box.x + box.width);
                }
                ancestor = ancestor.parentElement;
            }
            const resolution = text.style.resolution;
            const cropLeft = Math.max(0, left - x);
            const cropWidth = Math.max(0, Math.min(text.width, right - x) - cropLeft);
            if (cropLeft === 0 && cropWidth >= text.width) text.setCrop();
            else
                text.setCrop(
                    cropLeft * resolution,
                    0,
                    cropWidth * resolution,
                    text.height * resolution,
                );
        }
    }
    private scrollIndicator(body: HTMLElement, graphics: GameObjects.Graphics): void {
        if (body.scrollHeight <= body.clientHeight + 1) return;
        const box = this.box(body);
        const height = Math.max(28, (body.clientHeight / body.scrollHeight) * (box.height - 16));
        const y =
            box.y +
            8 +
            (body.scrollTop / (body.scrollHeight - body.clientHeight)) * (box.height - 16 - height);
        graphics
            .fillStyle(0x151b1d, 0.7)
            .fillRoundedRect(box.x + 3, box.y + 8, 3, box.height - 16, 2);
        graphics.fillStyle(UI_INK.gold, 0.8).fillRoundedRect(box.x + 3, y, 3, height, 2);
    }
}
