/* Independent, scripted design study. Never imports the game or accesses its saved match. */
(() => {
    'use strict';

    const resources = ['wood', 'brick', 'wheat', 'wool', 'stone'];
    const names = { wood: 'چوب', brick: 'خشت', wheat: 'گندم', wool: 'پشم', stone: 'سنگ' };
    const costs = {
        road: { wood: 1, brick: 1 },
        settlement: { wood: 1, brick: 1, wheat: 1, wool: 1 },
        city: { wheat: 2, stone: 3 },
        development: { wheat: 1, wool: 1, stone: 1 },
    };
    const builds = { road: 'راه', settlement: 'آبادی', city: 'شهر' };
    const cardNames = {
        knight: 'شوالیه',
        'year-of-plenty': 'سال فراوانی',
        'road-building': 'راه‌سازی',
        'victory-point': 'امتیاز مخفی',
    };
    const fa = (n) => n.toLocaleString('fa-IR');
    const total = (hand) => resources.reduce((sum, r) => sum + hand[r], 0);
    const missing = (hand, cost) =>
        Object.entries(cost)
            .filter(([r, n]) => hand[r] < n)
            .map(([r, n]) => `${fa(n - hand[r])} ${names[r]}`)
            .join('، ');
    const affordable = (hand, cost) => !missing(hand, cost);
    const score = (s) => s.points + s.cards.filter((c) => c.kind === 'victory-point').length;
    const playable = (s, c) =>
        ['roll', 'actions'].includes(s.phase) &&
        !s.playedCard &&
        c.kind !== 'victory-point' &&
        c.bought < s.turn;

    function fresh(scenario = 'ordinary') {
        return {
            scenario,
            turn: 2,
            phase: 'roll',
            dice: null,
            hand: {
                wood: 4,
                brick: scenario === 'seven' ? 2 : 1,
                wheat: scenario === 'seven' ? 2 : 1,
                wool: 0,
                stone: 1,
            },
            cards: [
                { id: 'old-knight', kind: 'knight', bought: 1 },
                { id: 'new-plenty', kind: 'year-of-plenty', bought: 2 },
            ],
            stock: 18,
            playedCard: false,
            points: 3,
            robber: 9,
            returnPhase: 'actions',
            selectedTile: null,
            selectedSite: null,
            pendingBuild: null,
            freeRoads: 0,
            placed: [],
            goal: null,
            discardRequired: 0,
            discard: { wood: 0, brick: 0, wheat: 0, wool: 0, stone: 0 },
            notice: 'تاس‌ها آماده‌اند',
        };
    }

    function rollSample(s) {
        if (s.phase !== 'roll') return s;
        const dice = s.scenario === 'seven' ? [3, 4] : s.scenario === 'empty' ? [1, 2] : [4, 4];
        const next = { ...s, dice, hand: { ...s.hand } };
        if (s.scenario === 'seven') {
            next.discardRequired = total(s.hand) > 7 ? Math.floor(total(s.hand) / 2) : 0;
            next.phase = next.discardRequired ? 'discard' : 'robber';
            next.returnPhase = 'actions';
            next.notice = '۷؛ هیچ زمینی منبع تولید نمی‌کند';
        } else {
            next.phase = 'actions';
            if (s.scenario === 'ordinary') {
                const wood =
                    s.robber === 16
                        ? 0
                        : s.placed.some((p) => p.kind === 'city' && p.site === 1)
                          ? 2
                          : 1;
                const wheat =
                    s.robber === 2
                        ? 0
                        : s.placed.some((p) => p.kind === 'city' && p.site === 0)
                          ? 2
                          : 1;
                next.hand.wood += wood;
                next.hand.wheat += wheat;
                next.notice =
                    [wood ? `+${fa(wood)} چوب` : '', wheat ? `+${fa(wheat)} گندم` : '']
                        .filter(Boolean)
                        .join(' · ') || 'این بار منبعی نگرفتی';
            } else next.notice = 'این بار منبعی نگرفتی';
        }
        return next;
    }

    function projectedTrade(s, give, receive) {
        if (s.phase !== 'actions' || give === receive || s.hand[give] < 4) return null;
        return { ...s.hand, [give]: s.hand[give] - 4, [receive]: s.hand[receive] + 1 };
    }

    function discardSample(s) {
        if (
            s.phase !== 'discard' ||
            total(s.discard) !== s.discardRequired ||
            resources.some((r) => s.discard[r] < 0 || s.discard[r] > s.hand[r])
        )
            return s;
        return {
            ...s,
            hand: Object.fromEntries(resources.map((r) => [r, s.hand[r] - s.discard[r]])),
            phase: 'robber',
            discardRequired: 0,
            notice: 'اهریمن را به زمینی متفاوت ببر',
        };
    }

    // The small model is exposed only for non-browser checks of this sample's scenarios.
    if (!globalThis.document) {
        globalThis.SunmarkStudy = {
            fresh,
            rollSample,
            projectedTrade,
            discardSample,
            playable,
            score,
        };
        return;
    }

    const { document, window } = globalThis;
    const $ = (id) => document.getElementById(id);
    const phone = document.querySelector('.phone');
    const dialog = $('panel');
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    $('reduced-motion').checked = motionQuery.matches;
    let state = fresh();
    let panel = null;
    let selectedCard = null;
    let give = 'wood';
    let receive = 'wool';
    let plenty = ['wool', 'stone'];
    let audioContext = null;
    let productionCue = false;
    let cueTimer = null;
    let lastGains = { wood: 0, wheat: 0 };
    const decorations = new Set();

    const svg = (body, size = 28, cls = '') =>
        `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 40 40" aria-hidden="true">${body}</svg>`;
    const motifs = {
        wood: '<path d="M14 34V20h10v14z" fill="#7c573b"/><path d="m20 3 12 15h-7l8 9H7l8-9H8Z" fill="#426447"/><path d="m20 6 5 13h-4l5 7h-6Z" fill="#708965"/>',
        brick: '<path d="M4 17h26l6 6v12H4Z" fill="#a96f4e"/><path d="m4 17 6-7h20v13H4Z" fill="#c89365"/><path d="M16 10v13M4 28h32M24 23v12" fill="none" stroke="#79543b" stroke-width="2"/>',
        wheat: '<path d="M20 37V9M20 26 9 15M20 23l11-11M20 33 8 23M20 30l13-11" fill="none" stroke="#79632c" stroke-width="2"/><g fill="#bd963f"><ellipse cx="12" cy="14" rx="4" ry="7" transform="rotate(-35 12 14)"/><ellipse cx="27" cy="12" rx="4" ry="7" transform="rotate(35 27 12)"/><ellipse cx="11" cy="24" rx="4" ry="7" transform="rotate(-40 11 24)"/><ellipse cx="29" cy="23" rx="4" ry="7" transform="rotate(40 29 23)"/><ellipse cx="20" cy="8" rx="4" ry="6"/></g>',
        wool: '<path d="M9 29C0 28 2 16 9 15 7 5 19 3 24 9c8-5 15 5 10 10 8 7-1 17-9 13-5 6-14 3-16-3Z" fill="#eee4ca" stroke="#7c8069" stroke-width="2"/><path d="M14 15c12-5 16 15 4 14-10-1-7-12 0-10 5 1 3 7-1 5" fill="none" stroke="#a4a088" stroke-width="2"/>',
        stone: '<path d="m4 28 7-20 13-4 12 14-6 17H12Z" fill="#83918b" stroke="#586a64" stroke-width="2"/><path d="m11 8 8 13 17-3-12-14Z" fill="#c1c9bb"/><path d="m19 21-7 14h18Z" fill="#677c74"/>',
        hammer: '<path d="m11 32 15-20 6 4-15 20Z" fill="#846139" stroke="#483f2d" stroke-width="1.5"/><path d="m14 10 5-7 13 9 4-1 2 7-8 3-6-5-4 3-8-5Z" fill="#596d60" stroke="#293d32" stroke-width="2"/><path d="m19 4 11 8-4 3-10-7Z" fill="#bec6ac"/>',
        trade: '<path d="M20 6v27M6 12h28M12 33h16M8 12 3 25h11L8 12m24 0-6 13h11l-5-13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="20" cy="6" r="3" fill="currentColor"/>',
        road: '<path d="m5 24 27-14 5 10-27 14Z" fill="#dbccb0" stroke="#4b6049" stroke-width="2"/><path d="m7 24 26-12 2 5-26 13Z" fill="#537854"/><path d="m17 20 4 8m5-13 4 8" stroke="#a7b697" stroke-width="1.5"/>',
        settlement:
            '<path d="M8 33V17L20 6l12 11v16Z" fill="#d3c5a5" stroke="#55634c" stroke-width="2"/><path d="m6 18 14-14 14 14-4 3L20 11 10 21Z" fill="#537854"/><path d="M16 33V22h8v11Z" fill="#40553e"/>',
        city: '<path d="M3 34V9h13v13h9V5h12v29Z" fill="#d9cbab" stroke="#55634c" stroke-width="2"/><path d="M3 8h13v6H3Zm22-4h12v6H25ZM10 25h7v9h-7zm18-6h6v7h-6z" fill="#496d4b"/>',
        knight: '<path d="M12 34h19l-3-5-2-13-2-9-8-4 1 6-9 11 5 4 6-5-3 10Z" fill="#d9c293" stroke="#89704e" stroke-width="2"/><path d="m17 8 6 2-2 5" fill="none" stroke="#384b39" stroke-width="2"/><circle cx="16" cy="15" r="1.5" fill="#384b39"/>',
        sun: '<g fill="#d4b374"><path d="m20 1 3 10 8-7-2 11 11-1-9 7 8 7-11-1 1 11-8-8-6 9-1-11-11 3 6-9-9-5 11-2-4-9 10 6Z"/><circle cx="20" cy="20" r="8" fill="#284335"/><circle cx="20" cy="20" r="4"/></g>',
    };
    const icon = (kind, size = 28) => svg(motifs[kind] ?? motifs.sun, size);
    function deck(size = 34) {
        return svg(
            '<rect x="4" y="5" width="23" height="30" rx="3" fill="#8e8667" transform="rotate(-9 16 20)"/><rect x="10" y="3" width="23" height="31" rx="3" fill="#a8956d" transform="rotate(8 22 19)"/><rect x="9" y="3" width="23" height="32" rx="3" fill="#233c30" stroke="#d5b776" stroke-width="1.5"/><path d="M13 8h15v22H13Z" fill="none" stroke="#c5ab73" stroke-width=".7"/><path d="m20.5 12 2 5 5 2-5 3-2 5-2-5-5-3 5-2Z" fill="#d5b776"/>',
            size,
            'card-stack',
        );
    }
    function die(value, sizeClass = '') {
        const positions = [];
        if (value % 2) positions.push([50, 50]);
        if (value >= 2) positions.push([27, 27], [73, 73]);
        if (value >= 4) positions.push([73, 27], [27, 73]);
        if (value === 6) positions.push([27, 50], [73, 50]);
        return `<span class="die ${sizeClass}">${positions.map(([x, y]) => `<i class="pip" style="left:${x}%;top:${y}%"></i>`).join('')}</span>`;
    }
    function button(label, action, cls = 'secondary', disabled = false, accessibleLabel = '') {
        return `<button type="button" class="${cls}" data-action="${action}"${disabled ? ' disabled' : ''}${accessibleLabel ? ` aria-label="${accessibleLabel}"` : ''}>${label}</button>`;
    }
    function costChips(cost, hand = state.hand) {
        return `<div class="costs">${Object.entries(cost)
            .map(([r, n]) => {
                const short = Math.max(0, n - hand[r]);
                return `<span class="cost-chip${short ? ' is-short' : ''}" role="img" aria-label="${names[r]}؛ داری ${fa(hand[r])}؛ هزینه ${fa(n)}${short ? `؛ ${fa(short)} کم` : '؛ کافی است'}">${icon(r, 22)}<bdi dir="ltr">${fa(hand[r])}/${fa(n)}</bdi>${short ? `<span>· ${fa(short)} کم</span>` : '<span aria-hidden="true">✓</span>'}</span>`;
            })
            .join('')}</div>`;
    }

    const terrain = [
        'forest',
        'pasture',
        'wheat',
        'mountain',
        'mesa',
        'forest',
        'pasture',
        'wheat',
        'mountain',
        'desert',
        'forest',
        'pasture',
        'wheat',
        'mesa',
        'mountain',
        'pasture',
        'forest',
        'wheat',
        'mesa',
    ];
    const palette = {
        forest: '#819775',
        pasture: '#a9b083',
        wheat: '#c7b37f',
        mountain: '#a4aca0',
        mesa: '#b68f73',
        desert: '#d1bc8b',
    };
    const terrainNames = {
        forest: 'جنگل',
        pasture: 'چراگاه',
        wheat: 'کشتزار',
        mountain: 'کوهستان',
        mesa: 'تپه',
        desert: 'بیابان',
    };
    const tiles = [];
    for (let r = -2; r <= 2; r++)
        for (let q = Math.max(-2, -r - 2); q <= Math.min(2, -r + 2); q++)
            tiles.push({ x: 195 + Math.sqrt(3) * 32 * (q + r / 2), y: 184 + 48 * r });
    const corner = (i, c) => ({
        x: tiles[i].x + 32 * Math.cos(((c * 60 - 90) * Math.PI) / 180),
        y: tiles[i].y + 32 * Math.sin(((c * 60 - 90) * Math.PI) / 180),
    });
    const homes = [corner(2, 0), corner(16, 3), corner(15, 3)];
    // One fixed counterclockwise variable-setup spiral, skipping the central desert.
    const spiral = [0, 3, 7, 12, 16, 17, 18, 15, 11, 6, 2, 1, 4, 8, 13, 14, 10, 5];
    const sequence = [5, 2, 6, 3, 8, 10, 9, 12, 11, 4, 8, 10, 9, 4, 5, 6, 3, 11];
    const numbers = Object.fromEntries(spiral.map((id, index) => [id, sequence[index]]));
    const opponents = [
        { ...corner(3, 0), id: 'surena', color: '#bf8e7c' },
        { ...corner(11, 2), id: 'arya', color: '#77a5b5' },
        { ...corner(16, 1), id: 'surena', color: '#bf8e7c' },
    ];
    const sites = [corner(7, 0), corner(10, 2), corner(15, 4)];
    function locations(kind = state.pendingBuild) {
        return (kind === 'city' ? homes : sites)
            .map((p, i) => ({ p, i }))
            .filter(({ i }) => !state.placed.some((b) => b.kind === kind && b.site === i));
    }
    const canPlayCard = (card) =>
        playable(state, card) && (card.kind !== 'road-building' || locations('road').length > 0);
    const victims = (tile) => [
        ...new Set(
            opponents
                .filter(
                    (p) =>
                        Math.abs(Math.hypot(p.x - tiles[tile].x, p.y - tiles[tile].y) - 32) < 0.1,
                )
                .map((p) => p.id),
        ),
    ];
    function tinyBuilding(p, city = false, fill = '#6b875e') {
        return `<g transform="translate(${p.x - 9} ${p.y - 11})"><path d="${city ? 'M0 18V2h7v7h6V0h7v18Z' : 'M1 18V7L9 0l8 7v11Z'}" fill="${fill}" stroke="#f0dcad" stroke-width="1.7"/></g>`;
    }
    function renderBoard() {
        let content =
            '<ellipse cx="195" cy="194" rx="158" ry="139" fill="#476b56" opacity=".35"/><path d="M34 203q15-94 103-143M354 176q-4 108-124 148" fill="none" stroke="#86a293" stroke-width="1" opacity=".3"/>';
        tiles.forEach((t, i) => {
            const points = Array.from({ length: 6 }, (_, c) => corner(i, c))
                .map((p) => `${p.x},${p.y}`)
                .join(' ');
            const producing =
                productionCue &&
                ((i === 16 && lastGains.wood > 0) || (i === 2 && lastGains.wheat > 0));
            const target = state.phase === 'robber' && i !== state.robber;
            const number = numbers[i] ?? null;
            content += `<g class="${producing ? 'producing' : ''} ${target ? 'tile-target' : ''} ${state.selectedTile === i ? 'is-selected' : ''}"${target ? ` data-action="tile:${i}" role="button" tabindex="0" aria-label="انتخاب ${terrainNames[terrain[i]]} ${number ? fa(number) : ''}"` : ''}><polygon class="land-tile" points="${points}" fill="${palette[terrain[i]]}"/>`;
            const motif =
                terrain[i] === 'forest'
                    ? 'wood'
                    : terrain[i] === 'pasture'
                      ? 'wool'
                      : terrain[i] === 'wheat'
                        ? 'wheat'
                        : terrain[i] === 'mountain'
                          ? 'stone'
                          : terrain[i] === 'mesa'
                            ? 'brick'
                            : 'sun';
            content += `<g transform="translate(${t.x - 13} ${t.y - 23}) scale(.65)">${motifs[motif]}</g>`;
            if (number)
                content += `<circle cx="${t.x}" cy="${t.y + 13}" r="9.5" fill="#e4d6b4" stroke="#877955"/><text class="tile-number${number === 8 || number === 6 ? ' tile-number--red' : ''}" x="${t.x}" y="${t.y + 13}">${fa(number)}</text>`;
            content += '</g>';
        });
        content += `<path d="M${homes[0].x} ${homes[0].y}l28 16 0 32 28 16" stroke="#e0c894" stroke-width="6" fill="none"/><path d="M${homes[0].x} ${homes[0].y}l28 16 0 32 28 16" stroke="#5d7b55" stroke-width="3" fill="none"/>`;
        homes.forEach((p, i) => {
            content += tinyBuilding(
                p,
                state.placed.some((b) => b.kind === 'city' && b.site === i),
            );
        });
        opponents.forEach((p) => {
            content += tinyBuilding(p, false, p.color);
        });
        state.placed
            .filter((p) => p.kind !== 'city')
            .forEach((p) => {
                const pos = sites[p.site];
                content +=
                    p.kind === 'road'
                        ? `<path d="M${pos.x} ${pos.y}l27 16" stroke="#eddaae" stroke-width="7"/><path d="M${pos.x} ${pos.y}l27 16" stroke="#587c54" stroke-width="4"/>`
                        : tinyBuilding(pos);
            });
        const spirit = tiles[state.robber];
        content += `<g transform="translate(${spirit.x} ${spirit.y - 5})"><path d="m0-14 6 9 16-4-9 16-7-1L0 16-6 6l-7 1-9-16 16 4Z" fill="#263a36" stroke="#d6c6a1" stroke-width="1.5"/><path d="m-5 0 3 1m4 0 3-1" stroke="#e4ba77" stroke-width="2"/></g>`;
        if (state.phase === 'placement')
            locations().forEach(({ p, i }) => {
                content += `<g class="site${state.selectedSite === i ? ' is-selected' : ''}" data-action="site:${i}" role="button" tabindex="0" aria-label="محل نمایشی ${fa(i + 1)}"><circle cx="${p.x}" cy="${p.y}" r="14"/><text x="${p.x}" y="${p.y + 1}" class="tile-number" fill="#e7d9b7">${fa(i + 1)}</text></g>`;
            });
        $('island').innerHTML = content;
    }

    function render() {
        $('score-label').textContent = `${fa(score(state))} از ۱۰ امتیاز`;
        document
            .querySelector('.identity')
            .setAttribute(
                'aria-label',
                `آرمان؛ ${fa(score(state))} از ۱۰ امتیاز؛ وضعیت و کارت‌های خودت`,
            );
        $('dice-slot').innerHTML = state.dice ? state.dice.map((n) => die(n)).join('') : '';
        $('dice-slot').setAttribute(
            'aria-label',
            state.dice
                ? `تاس ${fa(state.dice[0])} و ${fa(state.dice[1])}؛ مجموع ${fa(totalDice())}`
                : 'هنوز تاس نریخته‌ای',
        );
        $('roll-object').hidden = state.phase !== 'roll' || score(state) >= 10;
        $('roll-object').disabled = state.phase !== 'roll';
        document.querySelector('.hero-dice').innerHTML = die(3) + die(5);
        $('phase-label').textContent = {
            roll: 'نوبت تو',
            actions: 'جزیره منتظر تصمیم توست',
            discard: '۷ · انتخاب منابع دورریختنی',
            robber: 'اهریمن · انتخاب زمین تازه',
            steal: 'اهریمن · انتخاب حریف',
            placement: state.freeRoads ? 'راه‌سازی · راه رایگان' : 'انتخاب محل ساخت',
            finished: 'پیروزی تو',
        }[state.phase];
        $('receipt').textContent = state.notice;
        $('resource-hand').innerHTML = resources
            .map(
                (r) =>
                    `<div class="resource" data-resource="${r}" role="img" aria-label="${names[r]} ${fa(state.hand[r])}">${icon(r)}<strong>${fa(state.hand[r])}</strong><span>${names[r]}</span></div>`,
            )
            .join('');
        const ready = Object.keys(builds).filter(
            (kind) => affordable(state.hand, costs[kind]) && locations(kind).length,
        ).length;
        if (state.phase === 'actions') {
            $('action-dock').innerHTML =
                button(
                    `${icon('hammer')}<span>ساخت · ${fa(ready)} آماده</span>`,
                    'open:build',
                    'tool',
                ) +
                button(`${icon('trade')}<span>معامله</span>`, 'open:trade', 'tool tool--quiet') +
                button(
                    `${deck()}<span>توسعه · ${fa(state.cards.length)}</span>`,
                    'open:cards',
                    'tool tool--card',
                );
            $('primary-row').innerHTML =
                score(state) >= 10
                    ? button('اعلام پیروزی', 'declare', 'primary')
                    : button('پایان نوبت', 'end', 'secondary');
        } else if (state.phase === 'roll') {
            const eligible = state.cards.filter(canPlayCard).length;
            $('action-dock').innerHTML =
                '<div class="pre-roll-label">زمین‌ها را می‌توانی همین حالا ببینی.</div>';
            $('primary-row').innerHTML =
                score(state) >= 10
                    ? button('اعلام پیروزی', 'declare', 'primary')
                    : eligible
                      ? button(
                            `${deck(24)}پیش از تاس · ${fa(eligible)} کارت آماده`,
                            'open:cards',
                            'secondary',
                        )
                      : button('دارایی و برنامهٔ ساخت', 'open:build', 'secondary');
        } else {
            $('action-dock').innerHTML =
                `<div class="pre-roll-label">${state.phase === 'placement' ? button('فهرست محل‌ها', 'open:sites', '') + (state.freeRoads ? '' : button('لغو ساخت', 'cancel-build', '')) : state.phase === 'robber' ? button('انتخاب زمین از فهرست', 'open:tiles', '') : 'ابتدا این مرحله را کامل کن.'}</div>`;
            $('primary-row').innerHTML =
                state.phase === 'discard'
                    ? button('انتخاب منابع', 'open:discard', 'primary')
                    : state.phase === 'robber'
                      ? button(
                            'تأیید جابه‌جایی اهریمن',
                            'move',
                            'primary',
                            state.selectedTile === null,
                        )
                      : state.phase === 'steal'
                        ? button('انتخاب حریف', 'open:steal', 'primary')
                        : state.phase === 'placement'
                          ? button(
                                `تأیید ${state.freeRoads ? 'راه رایگان' : `ساخت ${builds[state.pendingBuild]}`}`,
                                'confirm-build',
                                'primary',
                                state.selectedSite === null,
                            )
                          : button('دیدن امتیاز', 'score', 'primary');
        }
        $('board-message').textContent =
            state.phase === 'placement'
                ? 'محل را ببین؛ منابع فقط با تأیید پرداخت می‌شوند.'
                : state.phase === 'robber'
                  ? 'زمین فعلی قابل انتخاب نیست؛ بیابان هم مجاز است.'
                  : '';
        renderBoard();
    }
    const totalDice = () => state.dice[0] + state.dice[1];
    function announce(text = state.notice) {
        $('announcement').textContent = text;
    }
    function receipt(text) {
        state.notice = text;
        render();
        announce(text);
    }
    function goalText(hand = state.hand) {
        if (!state.goal) return '';
        const lack = missing(hand, costs[state.goal]);
        return `<div class="goal">هدف تو: ${builds[state.goal]} · ${lack ? `${lack} کم` : 'منابع آماده ✓'}</div>`;
    }
    function picker(action, selected) {
        return `<div class="resource-picker">${resources.map((r) => `<button type="button" class="resource-choice" data-action="${action}:${r}" aria-pressed="${selected === r}">${icon(r)}${names[r]}</button>`).join('')}</div>`;
    }
    function cardStatus(c) {
        return c.kind === 'victory-point'
            ? 'فقط هنگام پیروزی رو می‌شود'
            : c.bought >= state.turn
              ? '◷ نوبت بعد'
              : state.playedCard
                ? 'این نوبت کارت بازی کرده‌ای'
                : canPlayCard(c)
                  ? '✓ آماده'
                  : c.kind === 'road-building' && !locations('road').length
                    ? 'محل نمایشی برای راه نمانده'
                    : 'پس از مرحلهٔ اجباری';
    }
    const cardText = {
        knight: 'اهریمن را جابه‌جا کن؛ از یک حریف مجاور یک منبع تصادفی بگیر. دورریختن ندارد.',
        'year-of-plenty': 'دو منبع انتخاب کن؛ یکسان یا متفاوت.',
        'road-building': 'دو راه رایگان؛ اتصال و انتخاب محل همچنان مهم است.',
        'victory-point': 'یک امتیاز برای تو؛ برای حریف‌ها مخفی می‌ماند تا پیروزی را اعلام کنی.',
    };
    function renderPanel() {
        const focusedAction = document.activeElement?.dataset?.action;
        let title, body;
        let footer = '';
        if (panel === 'build') {
            title = 'ساخت‌وساز';
            body =
                '<p class="legend">نمادها: دارایی / هزینه · ✓ کافی · «کم» نیاز باقی‌مانده</p>' +
                goalText();
            body += Object.entries(builds)
                .map(([kind, name]) => {
                    const lack = missing(state.hand, costs[kind]);
                    const available = locations(kind).length > 0;
                    const reason =
                        state.phase !== 'actions'
                            ? 'ساخت پس از تاس و پایان مراحل اجباری'
                            : !available
                              ? 'محل نمایشی برای این سازه نمانده'
                              : lack
                                ? `${lack} کم`
                                : 'منابع آماده · محل را انتخاب کن';
                    return `<article class="build-row"><span class="build-piece">${icon(kind, 40)}</span><div class="row-heading"><strong>${name}</strong><span class="points">${kind === 'road' ? 'گسترش شبکه' : kind === 'settlement' ? '+۱ امتیاز' : '+۱ با ارتقا'}</span></div>${costChips(costs[kind])}<p class="blocker">${reason}</p><div class="row-actions">${button('انتخاب محل', `build:${kind}`, 'primary', state.phase !== 'actions' || !!lack || !available)}${button(state.goal === kind ? '✓ هدف تو' : 'هدف من', `pin:${kind}`, 'pin-button')}</div></article>`;
                })
                .join('');
            footer = button('نام منابع و جزئیات ساخت', 'open:cost-help', 'secondary');
        } else if (panel === 'trade') {
            title = 'مبادله با بانک';
            const after = projectedTrade(state, give, receive);
            body = `${goalText()}<p class="legend">می‌دهی · نرخ نمونه ۴ به ۱</p>${picker('give', give)}<p class="legend">می‌گیری</p>${picker('receive', receive)}<div class="trade-quote"><span>${icon(give)}۴ ${names[give]}</span><span>←</span><span>${icon(receive)}۱ ${names[receive]}</span></div><p class="hint">داری: ${fa(state.hand[give])} ${names[give]}</p>`;
            if (after && state.goal) {
                const lack = missing(after, costs[state.goal]);
                body += `<div class="goal">پس از پرداخت و دریافت: ${lack ? `هنوز ${lack} کم` : locations(state.goal).length ? `${builds[state.goal]} آماده می‌شود ✓` : 'منابع آماده؛ محل نمایشی نمانده'}</div>`;
            }
            if (!after)
                body += `<p>${give === receive ? 'دو منبع متفاوت انتخاب کن.' : `برای پرداخت ۴ ${names[give]} کافی نداری.`}</p>`;
            footer = button('تأیید مبادله', 'trade', 'primary', !after);
        } else if (panel === 'cards') {
            title = 'کارت‌های تو';
            body = `<p class="legend">در هر نوبت یک کارت غیرامتیازی؛ کارت تازه از نوبت بعد.</p><div class="card-hand">${state.cards.length ? state.cards.map((c) => `<button type="button" class="development-card" data-action="card:${c.id}" aria-pressed="${selectedCard === c.id}">${icon(c.kind === 'knight' ? 'knight' : c.kind === 'road-building' ? 'road' : 'sun', 38)}<strong>${cardNames[c.kind]}</strong><small>${cardStatus(c)}</small></button>`).join('') : '<p>هنوز کارتی نداری.</p>'}</div>`;
            const card = state.cards.find((c) => c.id === selectedCard);
            if (card)
                body += `<div class="card-detail"><strong>${cardNames[card.kind]}</strong><p>${cardText[card.kind]}</p><p class="hint">${cardStatus(card)}</p>${card.kind !== 'victory-point' ? button('بازی‌کردن این کارت', 'play-card', 'primary', !canPlayCard(card)) : ''}</div>`;
            body += `<div class="buy-row"><div class="row-heading"><strong>خرید یک کارت مخفی</strong><span class="hint">${fa(state.stock)} باقی</span></div><p class="legend">دارایی / هزینه</p>${costChips(costs.development)}${button('خرید یک کارت', 'buy-card', 'primary', state.phase !== 'actions' || !state.stock || !affordable(state.hand, costs.development))}<p class="hint">${state.phase !== 'actions' ? 'خرید پس از تاس و پایان مراحل اجباری.' : 'کارت تازه به دست خودت اضافه می‌شود.'}</p></div>`;
        } else if (panel === 'plenty') {
            title = 'دو منبع انتخاب کن';
            body = `<p>انتخاب اول</p>${picker('plenty0', plenty[0])}<p>انتخاب دوم</p>${picker('plenty1', plenty[1])}`;
            footer = button('گرفتن دو منبع', 'confirm-plenty', 'primary');
        } else if (panel === 'discard') {
            title = '۷ · منابع دورریختنی';
            const chosen = total(state.discard);
            body = `<p>دقیقاً ${fa(state.discardRequired)} کارت انتخاب کن. کارت‌های توسعه شمرده نمی‌شوند.</p><p>انتخاب‌شده: ${fa(chosen)} از ${fa(state.discardRequired)}</p>${resources.map((r) => `<div class="discard-row"><span>${icon(r)}${names[r]} · داری ${fa(state.hand[r])}</span><span class="counter">${button('−', `minus:${r}`, '', state.discard[r] === 0, `کم‌کردن ${names[r]} از دورریختنی‌ها`)}<b>${fa(state.discard[r])}</b>${button('+', `plus:${r}`, '', state.discard[r] >= state.hand[r] || chosen >= state.discardRequired, `دورریختن یک ${names[r]}`)}</span></div>`).join('')}`;
            footer = button(
                'تأیید دورریختن',
                'discard',
                'primary',
                chosen !== state.discardRequired,
            );
        } else if (panel === 'steal') {
            title = 'از کدام حریف؟';
            body =
                '<p>یک حریف کنار زمین اهریمن را انتخاب کن؛ یک کارت منبع تصادفی از او می‌گیری.</p>' +
                `<div class="destination-list">${victims(state.robber)
                    .map((id) =>
                        button(
                            `${id === 'surena' ? 'سورنا' : 'آریا'} · کارت منبع دارد`,
                            `steal:${id}`,
                            'secondary',
                        ),
                    )
                    .join('')}</div>`;
        } else if (panel === 'sites') {
            title = 'محل‌های نمایشی ساخت';
            body =
                '<p class="hint">این محل‌ها فقط نمونهٔ طراحی‌اند. در بازی واقعی، قوانین محل‌های مجاز را تعیین می‌کنند.</p><div class="destination-list">' +
                locations()
                    .map(({ i }) => button(`دیدن محل ${fa(i + 1)}`, `site:${i}`, 'secondary'))
                    .join('') +
                '</div>';
        } else if (panel === 'tiles') {
            title = 'زمین تازهٔ اهریمن';
            body =
                '<div class="destination-list">' +
                tiles
                    .map((_, i) =>
                        i === state.robber
                            ? ''
                            : button(
                                  `${terrainNames[terrain[i]]} · محل ${fa(i + 1)}`,
                                  `tile:${i}`,
                                  'secondary',
                              ),
                    )
                    .join('') +
                '</div>';
        } else if (panel === 'cost-help') {
            title = 'هزینه، دارایی و کمبود';
            body =
                resources
                    .map((r) => `<p>${icon(r, 24)} ${names[r]} · داری ${fa(state.hand[r])}</p>`)
                    .join('') +
                '<p>راه: ۱ چوب و ۱ خشت. آبادی: ۱ چوب، ۱ خشت، ۱ گندم و ۱ پشم. شهر: ۲ گندم و ۳ سنگ؛ جای آبادی خودت ساخته می‌شود.</p><p>راه مسیر گسترش را باز می‌کند؛ به‌خودی‌خود امتیاز ندارد. زمین و اتصال هم باید اجازهٔ ساخت بدهند.</p>';
            footer = button('بازگشت به ساخت', 'open:build', 'secondary');
        } else if (panel === 'score') {
            title = 'امتیاز تو';
            body = `<p>ساختمان‌ها: ${fa(state.points)} · کارت امتیاز مخفی: ${fa(state.cards.filter((c) => c.kind === 'victory-point').length)}</p><p>مجموع تو: ${fa(score(state))} از ۱۰. امتیاز مخفی حریف‌ها نمایش داده نمی‌شود.</p><p class="hint">در بازی واقعی، طولانی‌ترین راه و بزرگ‌ترین ارتش هرکدام ۲ امتیاز دارند. این مطالعه فقط یک نوبت نمایشی را بررسی می‌کند.</p>`;
            footer =
                button('دیدن کارت‌های خودم', 'open:cards', 'secondary') +
                button('برنامهٔ ساخت', 'open:build', 'secondary');
        } else if (panel === 'rivals') {
            title = 'حریف‌ها · امتیاز نمایان';
            body =
                '<p>سورنا: ۲ · آریا: ۳ · بهمن: ۲</p><p>این‌ها حریف‌های نمونه‌اند. چهرهٔ کارت‌های توسعه و امتیاز مخفی حریف‌ها در رابط عمومی نمایش داده نمی‌شود.</p>';
        } else {
            title = 'بازی متوقف است';
            body =
                '<p>این یک نمونهٔ مستقل طراحی است. تاس و منبع‌ها دادهٔ نمایشی دارند و به ذخیرهٔ بازی اصلی دست نمی‌زنند.</p><p>در بازی واقعی، پیش از تاس هم می‌توانی یک کارت توسعهٔ مجاز بازی کنی. ساخت و خرید کارت پس از تاس و پایان مراحل اجباری باز می‌شوند.</p>';
            footer = button('ادامه', 'close', 'primary');
        }
        $('panel-title').textContent = title;
        $('panel-body').innerHTML = body;
        $('panel-footer').innerHTML = footer;
        if (focusedAction)
            [...dialog.querySelectorAll('[data-action]')]
                .find((el) => el.dataset.action === focusedAction)
                ?.focus({ preventScroll: true });
    }
    function openPanel(kind) {
        clearDecorations();
        panel = kind;
        renderPanel();
        positionPanel();
        if (!dialog.open) dialog.showModal();
        $('panel-title').focus({ preventScroll: true });
    }
    function positionPanel() {
        const bounds = phone.getBoundingClientRect();
        dialog.style.left = `${bounds.left + 12}px`;
        dialog.style.width = `${bounds.width - 24}px`;
        dialog.style.maxHeight = `${Math.min(window.innerHeight - 24, bounds.height * 0.8)}px`;
        dialog.style.bottom = `${Math.max(12, window.innerHeight - bounds.bottom + 12)}px`;
    }
    function closePanel() {
        if (dialog.open) dialog.close();
        panel = null;
    }

    function sound(frequency = 340) {
        if (!$('sound').checked) return;
        try {
            const Context = window.AudioContext || window.webkitAudioContext;
            if (!Context) return;
            audioContext ??= new Context();
            void audioContext.resume().catch(() => {});
            const oscillator = audioContext.createOscillator();
            const gain = audioContext.createGain();
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(
                frequency * 0.6,
                audioContext.currentTime + 0.08,
            );
            gain.gain.setValueAtTime(0.04, audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
            oscillator.connect(gain).connect(audioContext.destination);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.11);
        } catch {
            /* Audio is optional; unsupported devices retain complete visual feedback. */
        }
    }
    function clearDecorations() {
        if (cueTimer !== null) window.clearTimeout(cueTimer);
        cueTimer = null;
        if (productionCue) {
            productionCue = false;
            renderBoard();
        }
        for (const item of [...decorations]) {
            item.animation.cancel();
            item.element.remove();
            item.cleanup?.();
            decorations.delete(item);
        }
    }
    function decorate(element, frames, options, cleanup) {
        if ($('reduced-motion').checked || !element.animate) {
            element.remove();
            cleanup?.();
            return;
        }
        const animation = element.animate(frames, options);
        const item = { animation, element, cleanup };
        decorations.add(item);
        void animation.finished
            .then(() => {
                decorations.delete(item);
                element.remove();
                cleanup?.();
            })
            .catch(() => {});
    }
    function animateRoll(start) {
        if ($('reduced-motion').checked) return;
        const end = $('dice-slot').getBoundingClientRect();
        const ghost = document.createElement('div');
        ghost.className = 'floating-dice';
        ghost.setAttribute('aria-hidden', 'true');
        ghost.style.cssText = `left:${start.left}px;top:${start.top}px;width:${start.width}px;height:${start.height}px;`;
        ghost.innerHTML = state.dice.map((n) => die(n)).join('');
        document.body.append(ghost);
        const destination = $('dice-slot');
        destination.style.opacity = '0';
        const x = end.left + end.width / 2 - start.left - start.width / 2;
        const y = end.top + end.height / 2 - start.top - start.height / 2;
        decorate(
            ghost,
            [
                { transform: 'translate(0, 0) scale(.94) rotate(-3deg)', offset: 0 },
                { transform: 'translate(0, 0) scale(1) rotate(0deg)', offset: 0.22 },
                { transform: 'translate(0, 0) scale(1) rotate(0deg)', offset: 0.43 },
                { transform: `translate(${x}px, ${y}px) scale(.35) rotate(0deg)`, offset: 1 },
            ],
            { duration: 560, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'forwards' },
            () => {
                destination.style.opacity = '';
            },
        );
        if (state.scenario !== 'ordinary') return;
        for (const [index, r] of [
            [16, 'wood'],
            [2, 'wheat'],
        ]) {
            if (!lastGains[r]) continue;
            const board = $('island').getBoundingClientRect();
            const scale = Math.min(board.width / 390, board.height / 380);
            const t = tiles[index];
            const sx = board.left + (board.width - 390 * scale) / 2 + t.x * scale;
            const sy = board.top + (board.height - 380 * scale) / 2 + t.y * scale;
            const target = document.querySelector(`[data-resource="${r}"]`).getBoundingClientRect();
            const flight = document.createElement('span');
            flight.className = 'resource-flight';
            flight.setAttribute('aria-hidden', 'true');
            flight.innerHTML =
                icon(r, 30) + (lastGains[r] > 1 ? `<span>×${fa(lastGains[r])}</span>` : '');
            flight.style.cssText = `left:${sx - 15}px;top:${sy - 15}px;`;
            document.body.append(flight);
            decorate(
                flight,
                [
                    { opacity: 0, transform: 'translate(0,0)' },
                    { opacity: 1, offset: 0.2 },
                    { opacity: 1, offset: 0.8 },
                    {
                        opacity: 0,
                        transform: `translate(${target.left + target.width / 2 - sx}px,${target.top + target.height / 2 - sy}px)`,
                    },
                ],
                { duration: 560, delay: 150, easing: 'cubic-bezier(.2,.6,.3,1)' },
            );
        }
    }
    function beginBuild(kind) {
        if (
            state.phase !== 'actions' ||
            !affordable(state.hand, costs[kind]) ||
            !locations(kind).length
        )
            return;
        closePanel();
        state.phase = 'placement';
        state.pendingBuild = kind;
        state.returnPhase = 'actions';
        state.selectedSite = null;
        receipt('محل‌ها را ببین؛ انتخاب با توست.');
    }
    function completeBuild() {
        if (state.phase !== 'placement' || !locations().some(({ i }) => i === state.selectedSite))
            return;
        const kind = state.pendingBuild;
        if (!state.freeRoads && !affordable(state.hand, costs[kind])) return;
        if (!state.freeRoads) for (const [r, n] of Object.entries(costs[kind])) state.hand[r] -= n;
        state.placed.push({ kind, site: state.selectedSite });
        if (kind !== 'road') state.points++;
        state.selectedSite = null;
        if (state.freeRoads > 1 && locations('road').length) {
            state.freeRoads--;
            receipt('یک راه رایگان دیگر انتخاب کن.');
        } else {
            state.freeRoads = 0;
            state.phase = state.returnPhase;
            receipt(
                kind === 'road'
                    ? 'راه ساخته شد · شبکه‌ات گسترش یافت'
                    : `${builds[kind]} ساخته شد · +۱ امتیاز`,
            );
        }
        sound(kind === 'road' ? 240 : 480);
        if (score(state) >= 10) receipt('۱۰ امتیاز داری؛ می‌توانی پیروزی را اعلام کنی.');
    }
    function consumeCard(card) {
        state.cards = state.cards.filter((c) => c.id !== card.id);
        state.playedCard = true;
    }
    function playCard() {
        const card = state.cards.find((c) => c.id === selectedCard);
        if (!card || !canPlayCard(card)) return;
        if (card.kind === 'year-of-plenty') {
            openPanel('plenty');
            return;
        }
        state.returnPhase = state.phase;
        consumeCard(card);
        closePanel();
        if (card.kind === 'knight') {
            state.phase = 'robber';
            state.selectedTile = null;
            receipt('شوالیه · جابه‌جایی و دزدی؛ بدون دورریختن');
        } else {
            state.phase = 'placement';
            state.pendingBuild = 'road';
            state.freeRoads = Math.min(2, locations('road').length);
            state.selectedSite = null;
            receipt('راه‌سازی · دو راه رایگان');
        }
    }
    function moveSpirit() {
        if (
            state.phase !== 'robber' ||
            state.selectedTile === null ||
            state.selectedTile === state.robber
        )
            return;
        state.robber = state.selectedTile;
        state.selectedTile = null;
        if (victims(state.robber).length) {
            state.phase = 'steal';
            receipt('از یک حریف مجاور یک منبع تصادفی بگیر.');
            openPanel('steal');
        } else {
            state.phase = state.returnPhase;
            receipt('حریف مجاور با منبع وجود ندارد؛ جابه‌جایی کامل شد.');
        }
    }
    function restart() {
        clearDecorations();
        closePanel();
        state = fresh($('scenario').value);
        selectedCard = null;
        give = 'wood';
        receive = 'wool';
        plenty = ['wool', 'stone'];
        render();
        announce('نوبت نمونه از نو آماده شد.');
    }
    function handle(action) {
        const [kind, value] = action.split(':');
        if (kind === 'open') {
            openPanel(value);
            return;
        }
        if (kind === 'close') {
            closePanel();
            return;
        }
        if (['score', 'rivals', 'pause'].includes(kind)) {
            openPanel(kind);
            return;
        }
        if (kind === 'roll' && state.phase === 'roll') {
            clearDecorations();
            const start = document.querySelector('.hero-dice').getBoundingClientRect();
            const before = state;
            state = rollSample(state);
            lastGains = {
                wood: state.hand.wood - before.hand.wood,
                wheat: state.hand.wheat - before.hand.wheat,
            };
            productionCue = state.scenario === 'ordinary';
            if (productionCue)
                cueTimer = window.setTimeout(() => {
                    productionCue = false;
                    cueTimer = null;
                    renderBoard();
                }, 800);
            render();
            sound(280);
            announce(`تاس ${fa(state.dice[0])} و ${fa(state.dice[1])}؛ ${state.notice}`);
            if (state.scenario !== 'seven') animateRoll(start);
            if (state.phase === 'discard') openPanel('discard');
            return;
        }
        if (kind === 'pin' && costs[value]) {
            state.goal = value;
            renderPanel();
            return;
        }
        if (kind === 'build' && builds[value]) {
            beginBuild(value);
            return;
        }
        if (
            kind === 'site' &&
            state.phase === 'placement' &&
            locations().some(({ i }) => i === Number(value))
        ) {
            closePanel();
            state.selectedSite = Number(value);
            render();
            announce(`محل ${fa(Number(value) + 1)} انتخاب شد؛ هنوز ساخته نشده.`);
            return;
        }
        if (
            kind === 'tile' &&
            state.phase === 'robber' &&
            tiles[Number(value)] &&
            Number(value) !== state.robber
        ) {
            closePanel();
            state.selectedTile = Number(value);
            render();
            announce(`${terrainNames[terrain[Number(value)]]} انتخاب شد؛ جابه‌جایی را تأیید کن.`);
            return;
        }
        if (kind === 'confirm-build') {
            completeBuild();
            return;
        }
        if (kind === 'cancel-build' && state.phase === 'placement' && !state.freeRoads) {
            state.phase = 'actions';
            state.pendingBuild = null;
            state.selectedSite = null;
            receipt('ساخت لغو شد؛ چیزی خرج نشد.');
            return;
        }
        if (kind === 'move') {
            moveSpirit();
            return;
        }
        if ((kind === 'give' || kind === 'receive') && resources.includes(value)) {
            if (kind === 'give') give = value;
            else receive = value;
            renderPanel();
            return;
        }
        if (kind === 'trade') {
            const after = projectedTrade(state, give, receive);
            if (!after) return;
            state.hand = after;
            closePanel();
            receipt(`مبادله انجام شد · −۴ ${names[give]} · +۱ ${names[receive]}`);
            sound(400);
            return;
        }
        if (kind === 'card' && state.cards.some((c) => c.id === value)) {
            selectedCard = value;
            renderPanel();
            return;
        }
        if (kind === 'play-card') {
            playCard();
            return;
        }
        if (
            kind === 'buy-card' &&
            state.phase === 'actions' &&
            state.stock &&
            affordable(state.hand, costs.development)
        ) {
            for (const [r, n] of Object.entries(costs.development)) state.hand[r] -= n;
            state.stock--;
            const drawn = ['road-building', 'knight', 'victory-point'][(17 - state.stock) % 3];
            const card = { id: `draw-${state.stock}`, kind: drawn, bought: state.turn };
            state.cards.push(card);
            selectedCard = card.id;
            receipt(`${cardNames[drawn]} خریدی · فقط برای تو نمایان است`);
            renderPanel();
            sound(520);
            return;
        }
        if (kind.startsWith('plenty') && resources.includes(value)) {
            plenty[kind === 'plenty0' ? 0 : 1] = value;
            renderPanel();
            return;
        }
        if (kind === 'confirm-plenty') {
            const card = state.cards.find((c) => c.id === selectedCard);
            if (!card || card.kind !== 'year-of-plenty' || !playable(state, card)) return;
            plenty.forEach((r) => {
                state.hand[r]++;
            });
            consumeCard(card);
            closePanel();
            receipt(`دو منبع گرفتی · ${names[plenty[0]]} و ${names[plenty[1]]}`);
            return;
        }
        if (
            (kind === 'plus' || kind === 'minus') &&
            state.phase === 'discard' &&
            resources.includes(value)
        ) {
            const n = state.discard[value] + (kind === 'plus' ? 1 : -1);
            if (
                n < 0 ||
                n > state.hand[value] ||
                (kind === 'plus' && total(state.discard) >= state.discardRequired)
            )
                return;
            state.discard[value] = n;
            renderPanel();
            return;
        }
        if (kind === 'discard' && state.phase === 'discard') {
            const next = discardSample(state);
            if (next === state) return;
            state = next;
            closePanel();
            render();
            announce();
            return;
        }
        if (kind === 'steal' && state.phase === 'steal' && victims(state.robber).includes(value)) {
            // A scripted hidden sample card, not a view of any real opponent's hand.
            state.hand.brick++;
            state.phase = state.returnPhase;
            closePanel();
            receipt('یک منبع تصادفی گرفتی · +۱ خشت');
            return;
        }
        if (kind === 'declare' && ['roll', 'actions'].includes(state.phase) && score(state) >= 10) {
            state.phase = 'finished';
            receipt('پیروز شدی؛ امتیازهای مخفی تو رو شدند.');
            return;
        }
        if (kind === 'end' && state.phase === 'actions') {
            clearDecorations();
            state.turn++;
            state.phase = 'roll';
            state.dice = null;
            state.playedCard = false;
            state.selectedSite = state.selectedTile = null;
            receipt('نوبت نمایشی بعدی · کارت‌های قدیمی دوباره آماده‌اند');
        }
    }
    document.addEventListener('click', (event) => {
        const target = event.target.closest('[data-action]');
        if (!target || target.disabled) return;
        if (!phone.contains(target) && !dialog.contains(target)) return;
        handle(target.dataset.action);
    });
    $('island').addEventListener('keydown', (event) => {
        const target = event.target.closest('[data-action]');
        if (target && ['Enter', ' '].includes(event.key)) {
            event.preventDefault();
            handle(target.dataset.action);
        }
    });
    dialog.addEventListener('close', () => {
        panel = null;
        const next =
            state.phase === 'roll' ? $('roll-object') : $('primary-row').querySelector('button');
        next?.focus({ preventScroll: true });
    });
    $('restart').addEventListener('click', restart);
    $('scenario').addEventListener('change', restart);
    $('reduced-motion').addEventListener('change', clearDecorations);
    $('sound').addEventListener('change', () => {
        if ($('sound').checked) sound(280);
        else if (audioContext) void audioContext.suspend().catch(() => {});
    });
    motionQuery.addEventListener('change', (event) => {
        $('reduced-motion').checked = event.matches;
        clearDecorations();
    });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) clearDecorations();
    });
    window.addEventListener('resize', () => {
        clearDecorations();
        if (dialog.open) positionPanel();
    });
    render();
})();
