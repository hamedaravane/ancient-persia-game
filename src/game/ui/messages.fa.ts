import type { ResourceType, RuleErrorCode } from '../core/types';
import { BRAND } from '../../brand';

export const FA: {
    readonly title: string;
    readonly subtitle: string;
    readonly newGame: string;
    readonly player: string;
    readonly startNote: string;
    readonly roll: string;
    readonly rollTitle: string;
    readonly rolled: string;
    readonly robberMoved: string;
    readonly roadBuilt: string;
    readonly settlementBuilt: string;
    readonly cityBuilt: string;
    readonly tradeCompleted: string;
    readonly nextTurn: string;
    readonly seven: string;
    readonly normalRoll: string;
    readonly chooseRobberTile: string;
    readonly chooseRoadEdge: string;
    readonly chooseSettlementVertex: string;
    readonly chooseCity: string;
    readonly chooseTradeGive: string;
    readonly chooseTradeReceive: string;
    readonly buildHint: string;
    readonly desert: string;
    readonly winnerTitle: string;
    readonly winnerSuffix: string;
    readonly turn: string;
    readonly score: string;
    readonly buildRoad: string;
    readonly buildSettlement: string;
    readonly upgradeCity: string;
    readonly bankTrade: string;
    readonly endTurn: string;
    readonly resources: Readonly<Record<ResourceType, string>>;
    readonly errors: Readonly<Record<RuleErrorCode, string>>;
} = {
    title: BRAND.name,
    subtitle: 'تو و سه رقیب در یک جزیره',
    newGame: 'بازی تازه',
    player: 'بازیکن',
    startNote:
        'اول با تاس شروع‌کننده رو مشخص می‌کنیم؛ بعد هرکس جای دو آبادی و راه‌هاش رو انتخاب می‌کنه.',
    roll: 'انداختن تاس',
    rollTitle: 'تاس',
    rolled: 'نتیجه تاس',
    robberMoved: 'اهریمن جابه‌جا شد؛ این خانه تولید ندارد.',
    roadBuilt: 'راه ساخته شد.',
    settlementBuilt: 'آبادی ساخته شد.',
    cityBuilt: 'آبادی به شهر ارتقا یافت.',
    tradeCompleted: 'مبادله با بانک انجام شد.',
    nextTurn: 'نوبت بعدی آغاز شد.',
    seven: 'تاس ۷؛ اهریمن را به خانه دیگری ببرید.',
    normalRoll: 'برای آغاز نوبت، تاس را بیندازید.',
    chooseRobberTile: 'اهریمن فعال شد؛ خانه مقصد را لمس کنید.',
    chooseRoadEdge: 'برای ساخت راه، یک ضلع خالی را لمس کنید.',
    chooseSettlementVertex: 'برای ساخت آبادی، یک تقاطع خالی را لمس کنید.',
    chooseCity: 'آبادی خود را برای ارتقا انتخاب کنید.',
    chooseTradeGive: 'منبعی را که می‌دهید انتخاب کنید.',
    chooseTradeReceive: 'منبع دریافتی را انتخاب کنید.',
    buildHint: 'ساخت‌وساز به شبکه راه‌ها و منابع کافی نیاز دارد.',
    desert: 'بیابان',
    winnerTitle: 'بازی به پایان رسید',
    winnerSuffix: 'برنده شد!',
    turn: 'دور',
    score: 'امتیاز',
    buildRoad: 'ساخت راه',
    buildSettlement: 'ساخت آبادی',
    upgradeCity: 'ارتقا به شهر',
    bankTrade: 'بانک و بندرها',
    endTurn: 'پایان نوبت',
    resources: {
        wood: 'چوب',
        brick: 'آجر',
        wheat: 'گندم',
        wool: 'پشم',
        stone: 'سنگ',
    },
    errors: {
        'invalid-trade-partner': 'هر معامله باید با صاحب نوبت و یک بازیکن دیگر باشد.',
        'invalid-trade-bundle': 'هر دو طرف باید منابع معتبر و غیرصفر پیشنهاد بدهند.',
        'stale-trade': 'این پیشنهاد دیگر قابل تأیید نیست؛ پیشنهاد تازه‌ای بساز.',
        'wrong-phase': 'در این مرحله امکان این کار نیست.',
        'invalid-player-count': 'بازی به سه یا چهار بازیکن نیاز دارد.',
        'missing-target': 'این انتخاب در صفحه وجود ندارد.',
        occupied: 'این نقطه قبلاً اشغال شده است.',
        'too-close': 'بین دو آبادی باید یک تقاطع خالی فاصله باشد.',
        'not-connected': 'این ساخت‌وساز به شبکه راه‌های شما وصل نیست.',
        'insufficient-resources': 'منابع کافی ندارید.',
        'same-resource-trade': 'برای مبادله باید منبع دیگری انتخاب کنید.',
        'invalid-trade-ratio': 'این نرخ برای منبع انتخاب‌شده در دسترس شما نیست.',
        'same-robber-tile': 'اهریمن باید به خانه دیگری برود.',
        'game-finished': 'بازی به پایان رسیده است.',
    },
};
