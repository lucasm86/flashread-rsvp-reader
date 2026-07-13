import fs from "node:fs/promises";
import path from "node:path";

const SUPPORTED_EXTENSIONS = [".txt", ".pdf", ".docx"];

export function isSupportedFile(filePath: string): boolean {
  return SUPPORTED_EXTENSIONS.includes(path.extname(filePath).toLowerCase());
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

  throw new Error(`Formato no soportado: ${ext}`);
}
