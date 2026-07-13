import { Token } from "./types";

const SENTENCE_END_RE = /[.!?]+["')\]]*$/;
const COMMA_END_RE = /[,;:]+["')\]]*$/;

/**
 * Splits a single paragraph of raw text into word tokens, flagging
 * sentence- and comma-ending words so the chunker can apply reading
 * pauses without re-scanning text. `paragraphIndex` is stamped onto
 * every token as-is (callers composing multiple paragraphs pass it in).
 */
export function parseText(raw: string, paragraphIndex = 0): Token[] {
  const normalized = raw.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const rawWords = normalized.split(" ").filter(Boolean);

  return rawWords.map((text) => ({
    text,
    isSentenceEnd: SENTENCE_END_RE.test(text),
    isCommaEnd: !SENTENCE_END_RE.test(text) && COMMA_END_RE.test(text),
    paragraphIndex,
  }));
}

/**
 * Splits raw text into paragraphs. Prefers blank-line-separated blocks;
 * falls back to single line breaks when the text has no blank lines
 * (common for text extracted from PDFs or pasted from other apps).
 */
export function splitParagraphs(raw: string): string[] {
  const blankLineSplit = raw
    .split(/\r?\n\s*\r?\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (blankLineSplit.length > 1) return blankLineSplit;

  const singleLineSplit = raw
    .split(/\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return singleLineSplit.length > 1 ? singleLineSplit : blankLineSplit;
}

/**
 * Parses a full document into word tokens, preserving paragraph
 * boundaries so the reader can show a paragraph-aware side panel and
 * jump between sections.
 */
export function parseDocument(raw: string): Token[] {
  const paragraphs = splitParagraphs(raw);
  const tokens: Token[] = [];
  paragraphs.forEach((paragraph, paragraphIndex) => {
    tokens.push(...parseText(paragraph, paragraphIndex));
  });
  return tokens;
}
