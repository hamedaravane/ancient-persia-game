import type { AppPlatform } from '../../pwa/app';
import { menuStatus } from '../../pwa/markup';
import { BRAND } from '../../brand';
import { artSprite, button } from './components';
import type { GameSession } from './session';

export function menuContent(app: AppPlatform, session: GameSession): string {
    return `${artSprite('corner', 42, 'panel-corner panel-corner--start')}${artSprite('corner', 42, 'panel-corner panel-corner--end')}${artSprite('rosette', 44, 'menu-emblem')}
        <p class="eyebrow">${BRAND.persianName} • سرزمین فرصت‌ها</p><h1 dir="ltr" lang="en">${BRAND.name}</h1><p>جزیره منتظر تصمیم توئه.</p>${artSprite('divider', 120, 'menu-divider')}
        <div class="menu-actions">${button('بازی', 'play', { className: 'button button--primary full-width', disabled: app.updating })}${button('آموزش', 'tutorial', { className: 'button button--tutorial full-width', disabled: app.updating })}</div>
        <p class="footnote">توی آموزش، آناهیتا قدم‌به‌قدم کنارت می‌مونه.</p>${menuStatus(app, session)}`;
}
