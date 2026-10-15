import { setupPlayerIndex } from '../core/setup';
import { RESOURCE_TYPES, type GameState } from '../core/types';

const object = (v: unknown): v is Record<string, unknown> =>
    typeof v === 'object' && v !== null && !Array.isArray(v);
const dice = (v: unknown) =>
    Array.isArray(v) && v.length === 2 && v.every((n) => Number.isInteger(n) && n >= 1 && n <= 6);

/** A partial opening must be resumable without duplicate pieces or resource grants. */
export function validOpening(state: GameState): boolean {
    const raw: unknown = state.setup;
    const opening =
        state.phase === 'setup-roll' ||
        state.phase === 'setup-settlement' ||
        state.phase === 'setup-road';
    if (!opening) return raw === undefined || raw === null;
    if (!object(raw) || state.turn !== 1 || state.lastRoll !== null || state.winnerId !== null)
        return false;
    if (!Number.isInteger(state.startingPlayerIndex)) return false;
    const players = state.players;
    const buildings = Object.values(state.board.vertices).filter((v) => v.building);
    const roads = Object.values(state.board.edges).filter((e) => e.road);
    if (state.board.tiles.some((t) => t.robber && t.terrain !== 'desert')) return false;
    const lastRoll = raw.lastRoll;
    if (
        lastRoll !== null &&
        !(
            object(lastRoll) &&
            players.some((p) => p.id === lastRoll.playerId) &&
            dice(lastRoll.dice)
        )
    )
        return false;
    if (state.phase === 'setup-roll') {
        if (raw.kind !== 'starter' || !Array.isArray(raw.contenders) || !object(raw.rolls))
            return false;
        const contenders = raw.contenders;
        const rolls = raw.rolls;
        if (
            contenders.length < 2 ||
            contenders.length > players.length ||
            new Set(contenders).size !== contenders.length ||
            !contenders.every(
                (i, index) =>
                    Number.isInteger(i) &&
                    i >= 0 &&
                    i < players.length &&
                    (!index || contenders[index - 1] < i),
            )
        )
            return false;
        const rolled = Object.keys(rolls).length;
        if (rolled >= contenders.length || state.activePlayerIndex !== contenders[rolled])
            return false;
        if (
            !Object.values(rolls).every(dice) ||
            !Object.keys(rolls).every((id) =>
                contenders.slice(0, rolled).some((i) => players[i].id === id),
            )
        )
            return false;
        if (
            rolled &&
            (!object(lastRoll) ||
                lastRoll.playerId !== players[contenders[rolled - 1]].id ||
                JSON.stringify(lastRoll.dice) !== JSON.stringify(rolls[String(lastRoll.playerId)]))
        )
            return false;
        return (
            state.startingPlayerIndex === 0 &&
            buildings.length === 0 &&
            roads.length === 0 &&
            players.every((p) => RESOURCE_TYPES.every((r) => p.resources[r] === 0))
        );
    }
    if (raw.kind !== 'placement' || !object(lastRoll) || !Array.isArray(raw.settlements))
        return false;
    const settled: unknown[] = raw.settlements;
    if (
        settled.length >= players.length * 2 ||
        !settled.every((id) => typeof id === 'string' && !!state.board.vertices[id])
    )
        return false;
    const completed = settled as string[];
    const pending = raw.settlementId;
    if (
        state.phase === 'setup-settlement'
            ? pending !== null
            : typeof pending !== 'string' || !state.board.vertices[pending]
    )
        return false;
    const placed = pending === null ? completed : [...completed, pending as string];
    if (
        new Set(placed).size !== placed.length ||
        buildings.length !== placed.length ||
        roads.length !== completed.length
    )
        return false;
    const starter = state.startingPlayerIndex!;
    if (state.activePlayerIndex !== setupPlayerIndex(players.length, starter, completed.length))
        return false;
    for (let i = 0; i < placed.length; i++) {
        const owner = players[setupPlayerIndex(players.length, starter, i)].id;
        const vertex = state.board.vertices[placed[i]];
        if (vertex.building?.type !== 'settlement' || vertex.building.ownerId !== owner)
            return false;
        if (
            vertex.edgeIds.filter((id) => state.board.edges[id].road?.ownerId === owner).length !==
            (i < completed.length ? 1 : 0)
        )
            return false;
    }
    if (
        !roads.every((e) =>
            completed.some(
                (id) =>
                    e.vertexIds.includes(id) &&
                    state.board.vertices[id].building?.ownerId === e.road!.ownerId,
            ),
        )
    )
        return false;
    for (const player of players) {
        const expected = { wood: 0, brick: 0, wheat: 0, wool: 0, stone: 0 };
        for (let i = players.length; i < placed.length; i++) {
            if (players[setupPlayerIndex(players.length, starter, i)].id !== player.id) continue;
            for (const tile of state.board.tiles)
                if (tile.resource && state.board.vertices[placed[i]].tileIds.includes(tile.id))
                    expected[tile.resource] += 1;
        }
        if (!RESOURCE_TYPES.every((r) => player.resources[r] === expected[r])) return false;
    }
    return true;
}
