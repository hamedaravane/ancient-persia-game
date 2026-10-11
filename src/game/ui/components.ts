import type { ResourceType } from '../core/types';
import { FA } from './messages.fa';
import { ART, DICE_FACES, assetUrl, type ArtFrame, type ArtName } from '../assets';

export const number = (value: number): string => value.toLocaleString('fa-IR');
export const escape = (text: string): string => text.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
export const color = (value: number): string => `#${value.toString(16).padStart(6, '0')}`;

/** Decorative source crop; game information always stays in runtime text. */
export function frameSprite(art: ArtFrame, width: number, className = ''): string {
    const [x, y, w, h] = art.frame;
    const scale = width / w;
    const px = (value: number) => `${Number(value.toFixed(3))}px`;
    return `<span aria-hidden="true" class="art-sprite ${escape(className)}" style="width:${px(width)};height:${px(h * scale)};background-image:url('${assetUrl(art.file)}');background-size:${px(art.source[0] * scale)} ${px(art.source[1] * scale)};background-position:${px(-x * scale)} ${px(-y * scale)};${art.clip ? `clip-path:${art.clip};` : ''}"></span>`;
}

export const artSprite = (name: ArtName, width: number, className = ''): string => frameSprite(ART[name], width, className);

export function diceFace(value: number): string {
    const frame = DICE_FACES[value - 1];
    return frame ? frameSprite(frame, 24, 'dice-face') : '';
}

export function button(label: string, action: string, options: { className?: string; disabled?: boolean; label?: string; pressed?: boolean; ownerColor?: number } = {}): string {
    return `<button type="button" data-action="${escape(action)}" class="${options.className ?? 'button'}"${options.ownerColor !== undefined ? ` style="--owner:${color(options.ownerColor)}"` : ''}${options.disabled ? ' disabled' : ''}${options.label ? ` aria-label="${escape(options.label)}"` : ''}${options.pressed !== undefined ? ` aria-pressed="${options.pressed}"` : ''}>${label}</button>`;
}

/** Uses the original resource atlas without creating duplicate image assets. */
export function resourceIcon(resource: ResourceType): string {
    return `<span class="resource-icon resource-icon--${resource}" aria-hidden="true"></span>`;
}

export function resourceValue(resource: ResourceType, count: number, shortage = 0): string {
    return `<span class="resource-value${shortage ? ' is-short' : ''}" aria-label="${number(count)} ${FA.resources[resource]}${shortage ? `، کمبود ${number(shortage)}` : ''}">${resourceIcon(resource)}<span>${number(count)}</span><span class="sr-only">${FA.resources[resource]}${shortage ? `؛ کمبود ${number(shortage)}` : ''}</span></span>`;
}
