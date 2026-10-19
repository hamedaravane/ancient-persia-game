import {
    RESOURCE_TYPES,
    type ActionResult,
    type GameState,
    type RandomSource,
    type ResourceType,
} from './types';
import { resolvePublicVictory } from './scoring';
export const resourceCount = (hand: Record<ResourceType, number>): number =>
    RESOURCE_TYPES.reduce((sum, r) => sum + hand[r], 0);
export function beginRobber(
    state: GameState,
    source: 'seven' | 'knight',
    returnPhase: 'roll' | 'actions',
): GameState {
    const discards =
        source === 'seven'
            ? Object.fromEntries(
                  state.players
                      .filter((p) => resourceCount(p.resources) > 7)
                      .map((p) => [p.id, Math.floor(resourceCount(p.resources) / 2)]),
              )
            : {};
    return {
        ...state,
        phase: Object.keys(discards).length ? 'discard' : 'robber',
        robberResolution: { source, returnPhase, discards, victims: [] },
    };
}
export function resolutionActor(state: GameState): string {
    if (state.phase === 'discard')
        return state.players.find((p) => (state.robberResolution?.discards[p.id] ?? 0) > 0)!.id;
    return state.players[state.activePlayerIndex].id;
}
export function discardResources(
    state: GameState,
    playerId: string,
    bundle: Record<ResourceType, number>,
): ActionResult {
    if (state.phase !== 'discard' || playerId !== resolutionActor(state))
        return { ok: false, state, reason: 'wrong-phase' };
    const player = state.players.find((p) => p.id === playerId)!;
    if (
        !bundle ||
        Object.keys(bundle).length !== RESOURCE_TYPES.length ||
        !RESOURCE_TYPES.every(
            (r) =>
                Number.isSafeInteger(bundle[r]) &&
                bundle[r] >= 0 &&
                bundle[r] <= player.resources[r],
        ) ||
        resourceCount(bundle) !== state.robberResolution!.discards[playerId]
    )
        return { ok: false, state, reason: 'invalid-discard' };
    const resources = Object.fromEntries(
        RESOURCE_TYPES.map((r) => [r, player.resources[r] - bundle[r]]),
    ) as Record<ResourceType, number>;
    const discards = { ...state.robberResolution!.discards };
    delete discards[playerId];
    return {
        ok: true,
        state: {
            ...state,
            players: state.players.map((p) => (p.id === playerId ? { ...p, resources } : p)),
            phase: Object.keys(discards).length ? 'discard' : 'robber',
            robberResolution: { ...state.robberResolution!, discards },
        },
    };
}
export function eligibleVictims(state: GameState, tileId: string): string[] {
    const tile = state.board.tiles.find((t) => t.id === tileId);
    const owner = state.players[state.activePlayerIndex].id;
    return state.players
        .filter(
            (p) =>
                p.id !== owner &&
                resourceCount(p.resources) > 0 &&
                tile?.vertexIds.some((id) => state.board.vertices[id].building?.ownerId === p.id),
        )
        .map((p) => p.id);
}
export function finishRobber(state: GameState): GameState {
    return resolvePublicVictory({
        ...state,
        phase: state.robberResolution?.returnPhase ?? 'actions',
        robberResolution: null,
    });
}
export function moveRobber(state: GameState, tileId: string): ActionResult {
    if (state.phase !== 'robber') return { ok: false, state, reason: 'wrong-phase' };
    if (!state.board.tiles.some((t) => t.id === tileId))
        return { ok: false, state, reason: 'missing-target' };
    if (state.board.tiles.find((t) => t.robber)!.id === tileId)
        return { ok: false, state, reason: 'same-robber-tile' };
    const victims = eligibleVictims(state, tileId);
    const next: GameState = {
        ...state,
        board: {
            ...state.board,
            tiles: state.board.tiles.map((t) => ({ ...t, robber: t.id === tileId })),
        },
        phase: 'steal',
        robberResolution: {
            ...(state.robberResolution ?? {
                source: 'seven',
                returnPhase: 'actions',
                discards: {},
            }),
            victims,
        },
    };
    return { ok: true, state: victims.length ? next : finishRobber(next) };
}
export function stealResource(
    state: GameState,
    victimId: string,
    random: RandomSource = Math.random,
): ActionResult {
    if (state.phase !== 'steal') return { ok: false, state, reason: 'wrong-phase' };
    if (
        !state.robberResolution?.victims.includes(victimId) ||
        !eligibleVictims(state, state.board.tiles.find((t) => t.robber)!.id).includes(victimId)
    )
        return { ok: false, state, reason: 'invalid-victim' };
    const victim = state.players.find((p) => p.id === victimId)!;
    let index = Math.floor(random() * resourceCount(victim.resources));
    const resource = RESOURCE_TYPES.find((r) => {
        index -= victim.resources[r];
        return index < 0;
    })!;
    const owner = state.players[state.activePlayerIndex].id;
    const players = state.players.map((p) =>
        p.id === victimId
            ? { ...p, resources: { ...p.resources, [resource]: p.resources[resource] - 1 } }
            : p.id === owner
              ? { ...p, resources: { ...p.resources, [resource]: p.resources[resource] + 1 } }
              : p,
    );
    return { ok: true, state: finishRobber({ ...state, players }) };
}
