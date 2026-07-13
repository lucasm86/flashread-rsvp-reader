import { Token, Chunk, ChunkSize, PunctuationPauseSettings } from "./types";
import { computeOrpIndex } from "./orp";

/**
 * Groups tokens into display chunks of up to `chunkSize` words, computing
 * the ORP pivot for the joined display string and any punctuation-driven
 * pause multiplier for the chunk. A chunk never spans two paragraphs —
 * grouping stops early at a paragraph boundary — so the side text panel
 * can cleanly map chunks back to paragraphs.
 */
export function buildChunks(
  tokens: Token[],
  chunkSize: ChunkSize,
  settings: PunctuationPauseSettings
): Chunk[] {
  const chunks: Chunk[] = [];
  let i = 0;

  while (i < tokens.length) {
    const paragraphIndex = tokens[i].paragraphIndex;
    let end = i;
    while (end < tokens.length && tokens[end].paragraphIndex === paragraphIndex && end - i < chunkSize) {
      end++;
    }

    const words = tokens.slice(i, end);
    const display = words.map((w) => w.text).join(" ");
    const orpIndex = computeOrpIndex(display);

    let pauseMultiplier = 1;
    if (settings.usePunctuationPauses) {
      if (words.some((w) => w.isSentenceEnd)) {
        pauseMultiplier = settings.sentencePauseMultiplier;
      } else if (words.some((w) => w.isCommaEnd)) {
        pauseMultiplier = settings.commaPauseMultiplier;
      }
    }

    chunks.push({ words, display, orpIndex, pauseMultiplier, paragraphIndex });
    i = end;
  }

  return chunks;
}
