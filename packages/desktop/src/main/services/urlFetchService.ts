import { extractTextFromBuffer, ExtractResult } from "./fileParserService";

const FETCH_TIMEOUT_MS = 20_000;
const MAX_BYTES = 20 * 1024 * 1024;

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
  const ext = contentType.includes("application/pdf") ? ".pdf" : ".html";
  return extractTextFromBuffer(buffer, ext, convertToMarkdown);
}
