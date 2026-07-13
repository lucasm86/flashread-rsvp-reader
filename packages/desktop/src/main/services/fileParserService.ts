import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const SUPPORTED_EXTENSIONS = [".txt", ".pdf", ".docx", ".epub"];

export function isSupportedFile(filePath: string): boolean {
  return SUPPORTED_EXTENSIONS.includes(path.extname(filePath).toLowerCase());
}

/** Strips HTML tags/entities from an EPUB chapter, keeping paragraph breaks. */
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

/**
 * Extracts text from raw file bytes already in memory (used by the local
 * WS server, which receives files from the browser extension without
 * ever writing them to disk itself — except EPUB, which epub2 can only
 * read from a real path, so that one case uses a short-lived temp file).
 */
export async function extractTextFromBuffer(buffer: Buffer, ext: string): Promise<string> {
  const normalizedExt = ext.toLowerCase();

  if (normalizedExt === ".txt") {
    return buffer.toString("utf-8");
  }

  if (normalizedExt === ".pdf") {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfParse = require("pdf-parse");
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (normalizedExt === ".docx") {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mammoth = require("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (normalizedExt === ".epub") {
    const tmpPath = path.join(os.tmpdir(), `flashread-${Date.now()}-${Math.random().toString(36).slice(2)}.epub`);
    await fs.writeFile(tmpPath, buffer);
    try {
      return await extractEpubText(tmpPath);
    } finally {
      await fs.unlink(tmpPath).catch(() => {});
    }
  }

  throw new Error(`Formato no soportado: ${normalizedExt}`);
}

export async function extractTextFromFile(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".epub") {
    return extractEpubText(filePath);
  }

  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    throw new Error(`Formato no soportado: ${ext}`);
  }

  const buffer = await fs.readFile(filePath);
  return extractTextFromBuffer(buffer, ext);
}
