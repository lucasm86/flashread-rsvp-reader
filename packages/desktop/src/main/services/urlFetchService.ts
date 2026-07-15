import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { extractTextFromBuffer, ExtractResult } from "./fileParserService";

const FETCH_TIMEOUT_MS = 20_000;
const MAX_BYTES = 20 * 1024 * 1024;

/**
 * Isolates the main article from a full page (same idea as browser reader
 * mode) so URL reads skip nav/ads/sidebars. Returns null if Readability
 * can't identify an article (e.g. non-article pages, SPA shells) — callers
 * should fall back to the raw page in that case rather than erroring out.
 */
function extractReadableHtml(html: string, url: URL): string | null {
  try {
    const dom = new JSDOM(html, { url: url.toString() });
    const article = new Readability(dom.window.document).parse();
    if (!article || !article.content) return null;
    const title = article.title ? `<h1>${article.title}</h1>\n` : "";
    return `${title}${article.content}`;
  } catch {
    return null;
  }
}

function normalizeUrl(input: string): URL {
  let candidate = input.trim();
  if (!/^https?:\/\//i.test(candidate)) candidate = `https://${candidate}`;
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error("URL inválida.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Solo se admiten URLs http/https.");
  }
  return parsed;
}

/** Fetches a URL and routes it through the same extraction/Markdown pipeline used for files. */
export async function extractTextFromUrl(input: string, convertToMarkdown: boolean): Promise<ExtractResult> {
  const url = normalizeUrl(input);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(url, { signal: controller.signal, redirect: "follow" });
  } catch (err) {
    throw new Error(`No se pudo descargar la página: ${(err as Error).message}`);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`La página respondió con error ${response.status}.`);
  }

  const declaredLength = Number(response.headers.get("content-length") ?? "0");
  if (declaredLength > MAX_BYTES) {
    throw new Error("La página es demasiado grande para leer (más de 20 MB).");
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength > MAX_BYTES) {
    throw new Error("La página es demasiado grande para leer (más de 20 MB).");
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/pdf")) {
    return extractTextFromBuffer(buffer, ".pdf", convertToMarkdown);
  }

  const readable = extractReadableHtml(buffer.toString("utf-8"), url);
  const htmlBuffer = readable ? Buffer.from(readable, "utf-8") : buffer;
  return extractTextFromBuffer(htmlBuffer, ".html", convertToMarkdown);
}
