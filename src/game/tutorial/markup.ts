import { artSprite, button, escape, number } from '../ui/components';
import type { GameSession } from '../ui/session';
import type { SheetContent } from '../ui/bottomSheet';
import { CHAPTERS, LESSONS, type LessonId } from './lessons.fa';

export function tutorialContent(session: GameSession): SheetContent {
    const director = session.tutorial;
    const id = director.current!;
    const lesson = LESSONS[id];
    const practice = session.practice;
    return {
        title: 'آناهیتا',
        narrator: { portrait: `anahita-${lesson.expression}`, key: id },
        body: `<article class="narrator-dialogue" aria-label="گفت‌وگو با آناهیتا">
            <div class="narrator-copy"><p class="eyebrow">${CHAPTERS[lesson.chapter]}</p><h3>${escape(lesson.title)}</h3><p>${escape(lesson.text)}</p></div>
            <p class="narrator-task">${escape(lesson.task)}</p>
        </article>`,
        footer: `<div class="narrator-controls">${button(practice?.stage === 'complete' ? 'دیدن آبادی و امتیاز تازه' : director.remaining > 1 ? 'بعدش چی؟' : 'بریم سراغش', 'tutorial-next', { className: 'button button--primary' })}${button(practice ? 'خروج از تمرین' : 'فعلاً بدون راهنما', 'tutorial-pause', { className: 'button button--quiet' })}</div><p class="footnote">${practice ? 'این تمرین ذخیره نمی‌شود؛ با خروج، بازی اصلی محفوظ می‌ماند.' : 'اگه پنجره رو ببندی، راهنما متوقف می‌شه؛ از دفتر سفر می‌تونی برگردی.'}</p>`,
    };
}

export function journalContent(session: GameSession): { title: string; body: string } {
    const director = session.tutorial;
    return {
        title: 'دفتر سفر آناهیتا',
        body: `<div class="journal-intro">${artSprite('anahita-calm', 76, 'narrator-portrait')}<p class="sheet-intro">هر قدممون یه خاطره‌ست. تا اینجا ${number(director.seen.size)} از ${number(Object.keys(LESSONS).length)} گفت‌وگو رو مرور کردیم و ${number(director.practiced.size)} مفهوم رو توی بازی تمرین کردیم.</p></div>
        ${button(director.enabled ? 'فعلاً بدون راهنما' : 'ادامهٔ همراهی آناهیتا', director.enabled ? 'tutorial-pause' : 'tutorial-resume', { className: 'button button--primary full-width' })}
        <p class="footnote">خوندن یه گفت‌وگو با انجام‌دادن کارش فرق داره. هر درس سرِ وقتش می‌رسه؛ لازم نیست برای ادامهٔ بازی همه رو تموم کنی. این دفتر فقط تا پایان همین بازی پیشرفتمون رو نگه می‌داره.</p>
        ${CHAPTERS.map(
            (chapter, index) =>
                `<section class="journal-chapter"><h3>${chapter}</h3><div class="target-list">${(
                    Object.keys(LESSONS) as LessonId[]
                )
                    .filter((id) => LESSONS[id].chapter === index)
                    .map((id) =>
                        button(
                            `<span>${escape(LESSONS[id].title)}</span><span class="muted">${director.practiced.has(id) ? 'تمرین شد' : director.seen.has(id) ? 'مرور شد' : 'هنوز نرسیدیم • مرور آزاد'}</span>`,
                            `lesson:${id}`,
                            {
                                className: 'button journal-lesson',
                                label: `${LESSONS[id].title}؛ ${director.practiced.has(id) ? 'تمرین شد' : director.seen.has(id) ? 'مرور شد' : 'هنوز توی بازی معرفی نشده'}؛ مرور گفت‌وگو`,
                            },
                        ),
                    )
                    .join('')}</div></section>`,
        ).join('')}`,
    };
}
