export interface Token {
  text: string;
  isSentenceEnd: boolean;
  isCommaEnd: boolean;
  /** Index of the paragraph (blank-line-separated block) this token belongs to. */
  paragraphIndex: number;
}

export interface Chunk {
  words: Token[];
  display: string;
  /** Index of the ORP (optimal recognition point) character within `display`. */
  orpIndex: number;
  /** Multiplier applied to the base per-word delay for this chunk (1 = no extra pause). */
  pauseMultiplier: number;
  /** Paragraph this chunk belongs to. Chunks never span two paragraphs. */
  paragraphIndex: number;
  /** "table" marks a chunk that holds a whole Markdown table instead of RSVP words. */
  type?: "words" | "table";
  /** Raw Markdown source for a "table" chunk, rendered in the side panel instead of flashed word by word. */
  tableMarkdown?: string;
}

/** A contiguous run of chunks that make up one paragraph, for the side text panel. */
export interface ParagraphRange {
  paragraphIndex: number;
  startChunkIndex: number;
  endChunkIndex: number;
}

export type ChunkSize = 1 | 2 | 3;

export interface PunctuationPauseSettings {
  usePunctuationPauses: boolean;
  sentencePauseMultiplier: number;
  commaPauseMultiplier: number;
}

export interface ReaderSettings extends PunctuationPauseSettings {
  wpm: number;
  chunkSize: ChunkSize;
  fontSize: number;
  fontFamily: string;
  textColor: string;
  orpColor: string;
  backgroundColor: string;
  alwaysOnTop: boolean;
  globalShortcut: string;
  /** Whether the full-text side panel is shown by default when the reader opens. */
  showTextPanel: boolean;
  /** Convert .docx/HTML documents to Markdown before reading, to preserve headings/lists/tables. */
  convertToMarkdown: boolean;
}

export const DEFAULT_SETTINGS: ReaderSettings = {
  wpm: 300,
  chunkSize: 1,
  usePunctuationPauses: true,
  sentencePauseMultiplier: 2.5,
  commaPauseMultiplier: 1.6,
  fontSize: 48,
  fontFamily: "Segoe UI, sans-serif",
  textColor: "#e5e5e5",
  orpColor: "#e63946",
  backgroundColor: "#1e1e1e",
  alwaysOnTop: true,
  globalShortcut: "CommandOrControl+Alt+R",
  showTextPanel: false,
  convertToMarkdown: false,
};
