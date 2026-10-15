import type { GameState } from '../core/types';
import type { MatchEvent } from '../ui/session';
import type { TutorialMemory } from '../tutorial/director';
import { LESSONS } from '../tutorial/lessons.fa';
import { integer, label, record, validGameState } from './validateState';

export interface SavedMatch {
    version: 1;
    /** Absent in legacy shared-device saves; their first seat becomes the human. */
    humanPlayerId?: string;
    state: GameState;
    tutorial: TutorialMemory;
    history: MatchEvent[];
}
export interface SaveStorage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}
export type SaveStatus = 'saved' | 'empty' | 'invalid' | 'unavailable';

export function decodeSave(raw: string): SavedMatch | null {
    try {
        if (raw.length > 1_000_000) return null;
        const value: unknown = JSON.parse(raw);
        if (!record(value) || value.version !== 1 || !validGameState(value.state)) return null;
        const state = value.state;
        if (
            value.humanPlayerId !== undefined &&
            !state.players.some((player) => player.id === value.humanPlayerId)
        )
            return null;
        const memory = value.tutorial;
        if (
            !record(memory) ||
            typeof memory.enabled !== 'boolean' ||
            typeof memory.replaying !== 'boolean'
        )
            return null;
        for (const key of ['seen', 'practiced', 'queue']) {
            const ids = memory[key];
            if (
                !Array.isArray(ids) ||
                ids.length > Object.keys(LESSONS).length ||
                new Set(ids).size !== ids.length ||
                !ids.every(
                    (id) =>
                        typeof id === 'string' && Object.prototype.hasOwnProperty.call(LESSONS, id),
                )
            )
                return null;
        }
        if (!memory.enabled && !memory.replaying && (memory.queue as unknown[]).length) return null;
        if (
            !Array.isArray(value.history) ||
            value.history.length > 100 ||
            !value.history.every(
                (event) =>
                    record(event) &&
                    integer(event.id, 1) &&
                    integer(event.turn, 1, state.turn) &&
                    label(event.player, 80) &&
                    label(event.text),
            )
        )
            return null;
        return value as unknown as SavedMatch;
    } catch {
        return null;
    }
}

/** Synchronous, atomic small snapshots: no dependency on unload events to save a move. */
export class MatchStore {
    status: SaveStatus = 'empty';
    private previous = '';
    constructor(
        private storage: SaveStorage | null,
        private key = 'ancient-persia.match.v1',
    ) {}

    read(): SavedMatch | null {
        try {
            if (!this.storage) throw new Error('Storage unavailable');
            const raw = this.storage.getItem(this.key);
            if (!raw) return null;
            const value = decodeSave(raw);
            this.status = value ? 'saved' : 'invalid';
            if (value) this.previous = raw;
            return value;
        } catch {
            this.status = 'unavailable';
            return null;
        }
    }
    write(value: SavedMatch): void {
        try {
            if (!this.storage) throw new Error('Storage unavailable');
            const raw = JSON.stringify(value);
            if (raw !== this.previous || this.status !== 'saved')
                this.storage.setItem(this.key, raw);
            this.previous = raw;
            this.status = 'saved';
        } catch {
            this.status = 'unavailable';
        }
    }
}
