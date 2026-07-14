import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { convertBufferToMarkdown, isMarkdownConvertible } from "./markdownConverter";

const SUPPORTED_EXTENSIONS = [".txt", ".pdf", ".docx", ".epub", ".html"];

export interface ExtractResult {
  text: string;
  /** True when `text` is Markdown (headings/tables preserved) rather than plain text. */
  isMarkdown: boolean;
  /** Set when Markdown conversion was requested but failed and we fell back to plain text. */
  notice?: string;
}

export function isSupportedFile(filePath: string): boolean {
  return SUPPORTED_EXTENSIONS.includes(path.extname(filePath).toLowerCase());
}

/** Strips HTML tags/entities, keeping paragraph breaks. Used for EPUB chapters and as the plain-text fallback for HTML. */
function stripHtml(html: string): string {
  return html
    .replace(/<(script|style|head)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li)>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractEpubText(filePath: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { EPub } = require("epub2");
  const epub = await EPub.createAsync(filePath);
  const chapters: string[] = [];
  for (const item of epub.flow) {
    if (!item.id) continue;
    const html = await epub.getChapterRawAsync(item.id);
    const text = stripHtml(html);
    if (text) chapters.push(text);
  }
  // Chapters are joined as separate paragraphs so the reader's
  // paragraph-aware side panel treats each chapter as a jump point.
  return chapters.join("\n\n");
}

async function extractDocxPlainText(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mammoth = require("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

/**
 * Extracts text from raw file bytes already in memory (used by the local
 * WS server, which receives files from the browser extension without
 * ever writing them to disk itself — except EPUB, which epub2 can only
 * read from a real path, so that one case uses a short-lived temp file).
 *
 * `convertToMarkdown` only affects .docx and .html: PDF has no reliable
 * structure for either MarkItDown implementation to preserve (verified
 * against real contracts — headings/nested lists never survive, and
 * tables come out scrambled), so it always stays on plain-text extraction.
 */
export async function extractTextFromBuffer(
  buffer: Buffer,
  ext: string,
  convertToMarkdown = false
): Promise<ExtractResult> {
  const normalizedExt = ext.toLowerCase();

  if (normalizedExt === ".txt") {
    return { text: buffer.toString("utf-8"), isMarkdown: false };
  }

  if (normalizedExt === ".pdf") {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfParse = require("pdf-parse");
    const data = await pdfParse(buffer);
    return { text: data.text, isMarkdown: false };
  }

  if (normalizedExt === ".docx" || normalizedExt === ".html") {
    if (convertToMarkdown && isMarkdownConvertible(normalizedExt)) {
      try {
        const markdown = await convertBufferToMarkdown(buffer, normalizedExt);
        return { text: markdown, isMarkdown: true };
      } catch (err) {
        const plain =
          normalizedExt === ".docx" ? await extractDocxPlainText(buffer) : stripHtml(buffer.toString("utf-8"));
        return {
          text: plain,
          isMarkdown: false,
          notice: `No se pudo convertir a Markdown (${(err as Error).message}); se usó texto plano.`,
        };
      }
    }
    const plain =
      normalizedExt === ".docx" ? await extractDocxPlainText(buffer) : stripHtml(buffer.toString("utf-8"));
    return { text: plain, isMarkdown: false };
  }

  if (normalizedExt === ".epub") {
    const tmpPath = path.join(os.tmpdir(), `flashread-${Date.now()}-${Math.random().toString(36).slice(2)}.epub`);
    await fs.writeFile(tmpPath, buffer);
    try {
      return { text: await extractEpubText(tmpPath), isMarkdown: false };
    } finally {
      await fs.unlink(tmpPath).catch(() => {});
    }
  }

  throw new Error(`Formato no soportado: ${normalizedExt}`);
}

export async function extractTextFromFile(filePath: string, convertToMarkdown = false): Promise<ExtractResult> {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".epub") {
    return { text: await extractEpubText(filePath), isMarkdown: false };
  }

  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    throw new Error(`Formato no soportado: ${ext}`);
  }

  const buffer = await fs.readFile(filePath);
  return extractTextFromBuffer(buffer, ext, convertToMarkdown);
}
