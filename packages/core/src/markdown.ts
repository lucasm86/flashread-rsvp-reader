import { Chunk, ChunkSize, PunctuationPauseSettings } from "./types";
import { parseText, splitParagraphs } from "./textParser";
import { buildChunks } from "./chunker";

/** Extra lingering applied to the first chunk of any new paragraph (bigger than a sentence-end pause). */
export const PARAGRAPH_PAUSE_MULTIPLIER = 3;
/** Extra lingering applied to the first chunk of a heading paragraph (bigger than a plain paragraph break). */
export const HEADING_PAUSE_MULTIPLIER = 4.5;

const HEADING_RE = /^#{1,6}\s+/;
const TABLE_SEPARATOR_ROW_RE = /^\|?[\s:|-]+\|?$/;

export function isMarkdownHeading(paragraph: string): boolean {
  return HEADING_RE.test(paragraph.trim());
}

export function isMarkdownTable(paragraph: string): boolean {
  const lines = paragraph
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return false;
  return lines[0].includes("|") && TABLE_SEPARATOR_ROW_RE.test(lines[1]) && lines[1].includes("-");
}

/**
 * Builds chunks from a Markdown document, using the structure to:
 *  - strip heading markers (`#`) and linger longer on the first chunk of a
 *    heading or any new paragraph, so the reader perceives the section change;
 *  - replace whole table blocks with a single "table" chunk that the reader
 *    pauses on and renders in the side panel instead of flashing word by word.
 */
export function buildMarkdownChunks(
  raw: string,
  chunkSize: ChunkSize,
  settings: PunctuationPauseSettings
): Chunk[] {
  const paragraphs = splitParagraphs(raw);
  const chunks: Chunk[] = [];

  paragraphs.forEach((paragraphText, paragraphIndex) => {
    if (isMarkdownTable(paragraphText)) {
      chunks.push({
        words: [],
        display: "",
        orpIndex: 0,
        pauseMultiplier: 1,
        paragraphIndex,
        type: "table",
        tableMarkdown: paragraphText,
      });
      return;
    }

    const heading = isMarkdownHeading(paragraphText);
    const cleanText = heading ? paragraphText.replace(HEADING_RE, "") : paragraphText;
    const tokens = parseText(cleanText, paragraphIndex);
    const paragraphChunks = buildChunks(tokens, chunkSize, settings);

    if (paragraphChunks.length > 0) {
      const extraPause = heading ? HEADING_PAUSE_MULTIPLIER : PARAGRAPH_PAUSE_MULTIPLIER;
      paragraphChunks[0].pauseMultiplier = Math.max(paragraphChunks[0].pauseMultiplier, extraPause);
    }

    chunks.push(...paragraphChunks);
  });

  return chunks;
}
