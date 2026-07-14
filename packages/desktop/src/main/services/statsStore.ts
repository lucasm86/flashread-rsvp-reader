import Store from "electron-store";
import { randomUUID } from "node:crypto";

export interface StatsSession {
  id: string;
  wordsRead: number;
  durationMs: number;
  wpmAvg: number;
  endedAt: number;
}

export interface StatsSummary {
  totalWordsRead: number;
  totalSessions: number;
  totalDurationMs: number;
  recentSessions: StatsSession[];
}

interface StatsSchema {
  totalWordsRead: number;
  totalSessions: number;
  totalDurationMs: number;
  recentSessions: StatsSession[];
}

const MAX_RECENT_SESSIONS = 50;
// Skips near-empty sessions (e.g. opening a text and closing it right away) so
// they don't pollute the session count/average.
const MIN_WORDS_TO_LOG = 5;

let store: Store<StatsSchema> | null = null;

function getStore(): Store<StatsSchema> {
  if (!store) {
    store = new Store<StatsSchema>({
      name: "flashread-stats",
      defaults: { totalWordsRead: 0, totalSessions: 0, totalDurationMs: 0, recentSessions: [] },
    });
  }
  return store;
}

export function recordSession(wordsRead: number, durationMs: number): void {
  if (wordsRead < MIN_WORDS_TO_LOG || durationMs <= 0) return;

  const session: StatsSession = {
    id: randomUUID(),
    wordsRead,
    durationMs,
    wpmAvg: Math.round(wordsRead / (durationMs / 60000)),
    endedAt: Date.now(),
  };

  const s = getStore();
  const recentSessions = [session, ...s.get("recentSessions")].slice(0, MAX_RECENT_SESSIONS);
  s.set({
    totalWordsRead: s.get("totalWordsRead") + wordsRead,
    totalSessions: s.get("totalSessions") + 1,
    totalDurationMs: s.get("totalDurationMs") + durationMs,
    recentSessions,
  });
}

export function getStatsSummary(): StatsSummary {
  const s = getStore();
  return {
    totalWordsRead: s.get("totalWordsRead"),
    totalSessions: s.get("totalSessions"),
    totalDurationMs: s.get("totalDurationMs"),
    recentSessions: s.get("recentSessions"),
  };
}
