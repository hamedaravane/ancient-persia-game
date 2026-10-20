import { button, escape } from './components';
import type { SheetContent } from './bottomSheet';
import type { GameSession } from './session';

function menuOption(label: string, hint: string, action: string): string {
    return button(
        `<span class="pause-option-copy"><span>${escape(label)}</span><small>${escape(hint)}</small></span><span aria-hidden="true">‹</span>`,
        action,
        { className: 'button pause-option' },
    );
}

export const pauseMenuBack = (): string =>
    button('بازگشت به منوی توقف', 'open:help', { className: 'button full-width' });

/** A small navigation menu; rules, lessons and inspection lists live on their own screens. */
export function pauseMenuContent(session: GameSession, updateReady: boolean): SheetContent {
    const practice = !!session.practice;
    return {
        title: session.state?.phase === 'finished' ? 'منوی بازی' : 'بازی متوقف است',
        key: 'pause-menu',
        focusAction: 'resume-game',
        body: `<div class="pause-menu">
            <section class="pause-section"><h3>راهنما</h3>
                ${menuOption(practice ? 'آموزش تمرین' : 'آموزش و آناهیتا', practice ? 'هدف و مراحل این تمرین' : session.tutorial.enabled ? 'آناهیتا روشن است • درس‌ها و قوانین' : 'آناهیتا خاموش است • برای روشن‌کردن بزن', practice ? 'open:rules' : 'open:journal')}
            </section>
            <section class="pause-section"><h3>بازی</h3>
                ${menuOption('بررسی بازی', 'رویدادها و خانه‌های جزیره', 'open:review')}
                ${menuOption(practice ? 'خروج از تمرین' : 'بازگشت به منوی اصلی', practice ? 'بازی اصلی محفوظ می‌ماند' : session.saveStatus === 'unavailable' ? 'ذخیره خودکار در دسترس نیست' : 'ادامه این بازی با دکمهٔ «بازی»', 'new-game')}
            </section>
            <section class="pause-section"><h3>برنامه</h3>
                ${menuOption('صدا و حرکت', 'صدای کارها، حرکت کمتر و بازخورد سریع', 'open:experience')}
                ${menuOption(updateReady ? 'به‌روزرسانی بازی' : 'نصب و بازی آفلاین', updateReady ? 'نسخه تازه آماده است' : 'نصب، ذخیره و وضعیت برنامه', 'open-app')}
            </section>
        </div>`,
        footer: button(
            session.state?.phase === 'finished'
                ? 'بازگشت به جزیره'
                : practice
                  ? 'ادامه تمرین'
                  : 'ادامه بازی',
            'resume-game',
            { className: 'button button--primary full-width' },
        ),
    };
}

export function gameReviewContent(session: GameSession): SheetContent {
    return {
        title: 'بررسی بازی',
        key: 'game-review',
        body: `<div class="pause-menu">
            ${menuOption('رویدادهای بازی', 'مرور تاس‌ها، ساخت‌وساز و معامله‌ها', 'open:history')}
            ${menuOption('خانه‌های جزیره', 'فهرست زمین‌ها و تولید هر خانه', 'open:inspect')}
            ${menuOption('راهنمای رابط بازی', 'تاس لمسی، هزینه‌ها و دست کارت‌ها', 'open:experience-guide')}
            ${!session.practice ? `<section class="pause-section"><h3>شروع دوباره</h3>${menuOption('شروع بازی تازه', 'پس از تأیید، بازی فعلی جایگزین می‌شود', 'restart-match')}</section>` : ''}
        </div>`,
        footer: pauseMenuBack(),
    };
}
