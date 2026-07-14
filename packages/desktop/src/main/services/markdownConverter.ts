import { MarkItDown } from "markitdown-ts";
import { convert as officeConvert } from "officeparser";

const CONVERSION_TIMEOUT_MS = 20000;
const markitdown = new MarkItDown();

/** Extensions markitdown-ts converts with fidelity equivalent to the official Python MarkItDown (verified 2026-07-14). */
const MARKITDOWN_CONVERTIBLE_EXTENSIONS = [".docx", ".html"];
/**
 * .odt via officeparser: headings/paragraphs/tables preserved reliably (verified
 * against synthetic test docs with headings/lists/a table). .rtf is deliberately
 * excluded — officeparser has no reliable way to infer headings from RTF's plain
 * font-size/bold runs and tags every single paragraph as an H1, which is actively
 * worse than plain text (same class of problem PDF has), so .rtf always stays on
 * plain-text extraction regardless of the Markdown toggle.
 */
const OFFICEPARSER_CONVERTIBLE_EXTENSIONS = [".odt"];

export function isMarkdownConvertible(ext: string): boolean {
  const normalizedExt = ext.toLowerCase();
  return MARKITDOWN_CONVERTIBLE_EXTENSIONS.includes(normalizedExt) || OFFICEPARSER_CONVERTIBLE_EXTENSIONS.includes(normalizedExt);
}

/**
 * officeparser emits an empty YAML frontmatter block even with no metadata, decorates every
 * heading with a " {#slug-id}" anchor suffix, and inserts standalone `<a id="...">` tags before
 * tables — all meant for rendered Markdown/HTML, not for text that gets read aloud/flashed word
 * by word, so they're stripped here rather than shown as literal noise in the reader.
 */
function cleanOfficeParserMarkdown(markdown: string): string {
  return markdown
    .replace(/^---\s*\n---\s*\n+/, "")
    .replace(/ \{#[\w-]+\}/g, "")
    .replace(/<a id="[^"]*"><\/a>\s*\n?/g, "");
}

/** Converts a document buffer to Markdown, or throws if the format isn't supported or conversion fails/times out. */
export async function convertBufferToMarkdown(buffer: Buffer, ext: string): Promise<string> {
  const normalizedExt = ext.toLowerCase();
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("La conversión a Markdown superó el tiempo límite.")), CONVERSION_TIMEOUT_MS);
  });

  if (OFFICEPARSER_CONVERTIBLE_EXTENSIONS.includes(normalizedExt)) {
    const conversion = officeConvert(buffer, "md", { parseConfig: { fileType: "odt" } }).then((r) =>
      cleanOfficeParserMarkdown(r.value as string)
    );
    const markdown = await Promise.race([conversion, timeout]);
    if (!markdown.trim()) {
      throw new Error("La conversión a Markdown no devolvió contenido.");
    }
    return markdown;
  }

  const result = await Promise.race([markitdown.convertBuffer(buffer, { file_extension: normalizedExt }), timeout]);

  if (!result || !result.markdown.trim()) {
    throw new Error("La conversión a Markdown no devolvió contenido.");
  }

  return result.markdown;
}
