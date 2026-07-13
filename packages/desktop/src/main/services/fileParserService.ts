import fs from "node:fs/promises";
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

export async function extractTextFromFile(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".txt") {
    return fs.readFile(filePath, "utf-8");
  }

  if (ext === ".pdf") {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfParse = require("pdf-parse");
    const buffer = await fs.readFile(filePath);
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (ext === ".docx") {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mammoth = require("mammoth");
    const buffer = await fs.readFile(filePath);
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (ext === ".epub") {
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

  throw new Error(`Formato no soportado: ${ext}`);
}
