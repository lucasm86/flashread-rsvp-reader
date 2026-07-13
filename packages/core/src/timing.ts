import { Chunk } from "./types";

/** Milliseconds to display `chunk` at the given words-per-minute rate. */
export function delayForChunk(chunk: Chunk, wpm: number): number {
  const msPerWord = 60000 / wpm;
  return msPerWord * chunk.words.length * chunk.pauseMultiplier;
}
