import type { AppPlatform } from './app';
import type { GameSession } from '../game/ui/session';
import type { SheetContent } from '../game/ui/bottomSheet';
import { button, escape } from '../game/ui/components';
import { BRAND } from '../brand';

export function offlineLabel(app: AppPlatform): string {
    if (app.offline === 'ready') return 'آماده برای بازی آفلاین';
    if (app.offline === 'error') return 'آماده‌سازی آفلاین کامل نشد؛ دوباره امتحان کن.';
    if (app.offline === 'unsupported')
        return 'بازی آفلاین اینجا در دسترس نیست؛ لینک بازی رو در مرورگر گوشی باز کن.';
    return app.online
        ? 'داریم بازی رو برای اجرای آفلاین آماده می‌کنیم…'
        : 'برای آماده‌سازی آفلاین، یک بار به اینترنت وصل شو.';
}
export function saveLabel(session: GameSession): string {
    if (session.saveStatus === 'unavailable')
        return 'ذخیره روی این دستگاه در دسترس نیست؛ با بستن برنامه ممکنه بازی از دست بره.';
    if (session.saveStatus === 'invalid')
        return 'ذخیره قبلی قابل بازیابی نیست؛ می‌تونی یک بازی تازه شروع کنی.';
    return 'بازی و پیشرفت آموزش، خودکار روی همین دستگاه ذخیره می‌شن.';
}
export function resumeMenu(app: AppPlatform, session: GameSession): string {
    const saved = session.savedMatch;
    return `${saved ? `<section class="resume-match"><h2>${saved.state.phase === 'finished' ? 'آخرین سفر' : 'سفرت ناتموم مونده'}</h2>${button(saved.state.phase === 'finished' ? 'دیدن نتیجه آخرین بازی' : 'ادامه بازی', 'resume-match', { className: 'button button--primary full-width', disabled: app.updating })}<p class="footnote">${escape(saveLabel(session))}</p></section>` : session.saveStatus === 'unavailable' || session.saveStatus === 'invalid' ? `<p class="availability">${escape(saveLabel(session))}</p>` : ''}`;
}
export function menuPlatform(app: AppPlatform): string {
    return `<p class="footnote" role="status">${offlineLabel(app)}</p>
        ${app.updateReady ? `<p class="footnote">نسخه تازه آماده‌ست؛ هر وقت خواستی به‌روزش کن.</p>` : ''}
        ${button(app.updateReady ? 'نسخه تازه و تنظیمات برنامه' : app.installed ? 'برنامه و بازی آفلاین' : `نصب ${BRAND.persianName} روی گوشی`, 'open-app', { className: 'button full-width', disabled: app.updating })}`;
}
export function appContent(app: AppPlatform, session: GameSession): SheetContent {
    const active = !!session.state && session.state.phase !== 'finished';
    const instruction = app.ios
        ? 'توی Safari، منوی اشتراک‌گذاری رو باز کن و «افزودن به صفحه اصلی» (Add to Home Screen) رو بزن. اگر «Open as Web App» رو دیدی، روشنش کن؛ بعد «Add» رو بزن.'
        : 'منوی مرورگر رو باز کن و «نصب برنامه» یا «افزودن به صفحه اصلی» رو بزن. اگر این گزینه رو نمی‌بینی، لینک بازی رو در Chrome یا مرورگر پشتیبانی‌شده باز کن.';
    return {
        title: `${BRAND.persianName}، همیشه همراهت`,
        body: `<h3>${app.installed ? 'بازی نصب شده' : 'نصب روی گوشی'}</h3><p>${app.installed ? 'از آیکون بازی روی صفحه اصلی، مستقیم وارد جزیره شو.' : instruction}</p>
            ${app.installPrompt && !app.installed ? button(`نصب ${BRAND.persianName}`, 'app-install', { className: 'button button--primary full-width' }) : ''}
            <h3>بازی بدون اینترنت</h3><p role="status">${offlineLabel(app)}</p><p class="footnote">تمام جزیره و شش تصویر آناهیتا آماده می‌شن. بار اول اینترنت لازمه؛ بعد از آماده‌شدن، می‌تونی بدون اینترنت بازی کنی.</p>
            ${app.offline === 'error' ? button('دوباره آماده کن', 'app-retry', { className: 'button full-width' }) : ''}
            <h3>ادامه سفر</h3><p>${escape(saveLabel(session))}</p><p class="footnote">ذخیره روی همین دستگاهه؛ با پاک‌کردن داده‌های سایت ممکنه حذف بشه.</p>
            <h3>نسخه بازی</h3><p>${app.updating ? 'در حال به‌روزرسانی…' : app.updateReady ? (active ? 'نسخه تازه آماده‌ست. اول به منو برگرد؛ سفرت ذخیره می‌مونه و بعد می‌تونی به‌روزش کنی.' : 'نسخه تازه آماده‌ست؛ ذخیره سفرت باقی می‌مونه.') : 'وقتی نسخه تازه‌ای آماده بشه، اینجا خبرت می‌کنیم.'}</p>
            ${app.updateReady ? button('به‌روزرسانی و بازکردن نسخه تازه', 'app-update', { className: 'button button--primary full-width', disabled: active || app.updating }) : ''}
            ${app.error ? `<p class="availability" role="alert">${escape(app.error)}</p>` : ''}
            ${session.state ? button('ذخیره و بازگشت به منو', 'new-game', { className: 'button full-width' }) : ''}`,
    };
}
