import { Chunk, ParagraphRange } from "./types";

/**
 * Groups consecutive chunks that share the same paragraphIndex into
 * ranges, so a UI can render one block per paragraph and jump straight
 * to the first chunk of any paragraph.
 */
export function buildParagraphRanges(chunks: Chunk[]): ParagraphRange[] {
  const ranges: ParagraphRange[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const paragraphIndex = chunks[i].paragraphIndex;
    const last = ranges[ranges.length - 1];
    if (last && last.paragraphIndex === paragraphIndex) {
      last.endChunkIndex = i;
    } else {
      ranges.push({ paragraphIndex, startChunkIndex: i, endChunkIndex: i });
    }
  }

  return ranges;
}
