import type { ResourceType, RuleErrorCode } from '../core/types';

export const FA: {
    readonly title: string;
    readonly subtitle: string;
    readonly choosePlayers: string;
    readonly handover: string;
    readonly newGame: string;
    readonly player: string;
    readonly threePlayers: string;
    readonly fourPlayers: string;
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
    title: 'ایران باستان',
    subtitle: 'بازی راهبردی چندنفره',
    choosePlayers: 'تعداد بازیکنان را انتخاب کنید',
    handover: 'برای نوبت خود، دستگاه را به بازیکن بعدی بدهید.',
    newGame: 'بازی تازه',
    player: 'بازیکن',
    threePlayers: '۳ بازیکن',
    fourPlayers: '۴ بازیکن',
    startNote: 'هر بازیکن با دو آبادی و دو راه آغاز می‌کند؛ آبادی دوم منابع آغازین را می‌دهد.',
    roll: 'انداختن تاس',
    rollTitle: 'تاس',
    rolled: 'نتیجه تاس',
    robberMoved: 'راهزن جابه‌جا شد؛ این خانه تولید ندارد.',
    roadBuilt: 'راه ساخته شد.',
    settlementBuilt: 'آبادی ساخته شد.',
    cityBuilt: 'آبادی به شهر ارتقا یافت.',
    tradeCompleted: 'مبادله با بانک انجام شد.',
    nextTurn: 'نوبت بعدی آغاز شد.',
    seven: 'تاس ۷؛ راهزن را به خانه دیگری ببرید.',
    normalRoll: 'برای آغاز نوبت، تاس را بیندازید.',
    chooseRobberTile: 'راهزن فعال شد؛ خانه مقصد را لمس کنید.',
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
    bankTrade: 'تجارت بانک ۴:۱',
    endTurn: 'پایان نوبت',
    resources: {
        wood: 'چوب',
        brick: 'آجر',
        wheat: 'گندم',
        wool: 'پشم',
        stone: 'سنگ',
    },
    errors: {
        'wrong-phase': 'در این مرحله امکان این کار نیست.',
        'invalid-player-count': 'بازی به سه یا چهار بازیکن نیاز دارد.',
        'missing-target': 'این انتخاب در صفحه وجود ندارد.',
        occupied: 'این نقطه قبلاً اشغال شده است.',
        'too-close': 'بین دو آبادی باید یک تقاطع خالی فاصله باشد.',
        'not-connected': 'این ساخت‌وساز به شبکه راه‌های شما وصل نیست.',
        'insufficient-resources': 'منابع کافی ندارید.',
        'same-resource-trade': 'برای مبادله باید منبع دیگری انتخاب کنید.',
        'same-robber-tile': 'راهزن باید به خانه دیگری برود.',
        'game-finished': 'بازی به پایان رسیده است.',
    },
};
