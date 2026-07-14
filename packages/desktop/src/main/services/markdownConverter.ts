import { MarkItDown } from "markitdown-ts";

const CONVERSION_TIMEOUT_MS = 20000;
const markitdown = new MarkItDown();

/** Extensions markitdown-ts converts with fidelity equivalent to the official Python MarkItDown (verified 2026-07-14). */
export const MARKDOWN_CONVERTIBLE_EXTENSIONS = [".docx", ".html"];

export function isMarkdownConvertible(ext: string): boolean {
  return MARKDOWN_CONVERTIBLE_EXTENSIONS.includes(ext.toLowerCase());
}

/** Converts a document buffer to Markdown, or throws if the format isn't supported or conversion fails/times out. */
export async function convertBufferToMarkdown(buffer: Buffer, ext: string): Promise<string> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("La conversión a Markdown superó el tiempo límite.")), CONVERSION_TIMEOUT_MS);
  });

  const result = await Promise.race([markitdown.convertBuffer(buffer, { file_extension: ext }), timeout]);

  if (!result || !result.markdown.trim()) {
    throw new Error("La conversión a Markdown no devolvió contenido.");
  }

  return result.markdown;
}
