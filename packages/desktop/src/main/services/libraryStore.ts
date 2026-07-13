import Store from "electron-store";
import { randomUUID } from "node:crypto";

export type TextSource = "clipboard" | "file" | "paste" | "extension" | "library" | "history";

export interface LibraryItem {
  id: string;
  title: string;
  text: string;
  sourceType: TextSource;
  sourceLabel?: string;
  addedAt: number;
}

export interface HistoryEntry {
  id: string;
  title: string;
  text: string;
  sourceType: TextSource;
  sourceLabel?: string;
  libraryItemId?: string;
  readAt: number;
}

interface LibrarySchema {
  items: LibraryItem[];
  history: HistoryEntry[];
}

const MAX_HISTORY = 200;

let store: Store<LibrarySchema> | null = null;

function getStore(): Store<LibrarySchema> {
  if (!store) {
    store = new Store<LibrarySchema>({
      name: "flashread-library",
      defaults: { items: [], history: [] },
    });
  }
  return store;
}

function deriveTitle(text: string, sourceLabel?: string): string {
  if (sourceLabel) return sourceLabel;
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "Sin título";
  const snippet = words.slice(0, 8).join(" ");
  return words.length > 8 ? snippet + "…" : snippet;
}

export function getLibrary(): LibraryItem[] {
  return [...getStore().get("items")].sort((a, b) => b.addedAt - a.addedAt);
}

export function getLibraryItem(id: string): LibraryItem | undefined {
  return getStore()
    .get("items")
    .find((i) => i.id === id);
}

export function addToLibrary(text: string, sourceType: TextSource, sourceLabel?: string): LibraryItem {
  const item: LibraryItem = {
    id: randomUUID(),
    title: deriveTitle(text, sourceLabel),
    text,
    sourceType,
    sourceLabel,
    addedAt: Date.now(),
  };
  const s = getStore();
  s.set("items", [...s.get("items"), item]);
  return item;
}

export function removeFromLibrary(id: string): void {
  const s = getStore();
  s.set(
    "items",
    s.get("items").filter((i) => i.id !== id)
  );
}

export function getHistory(): HistoryEntry[] {
  return [...getStore().get("history")].sort((a, b) => b.readAt - a.readAt);
}

export function getHistoryEntry(id: string): HistoryEntry | undefined {
  return getStore()
    .get("history")
    .find((h) => h.id === id);
}

export function addHistoryEntry(
  text: string,
  sourceType: TextSource,
  sourceLabel?: string,
  libraryItemId?: string
): HistoryEntry {
  const entry: HistoryEntry = {
    id: randomUUID(),
    title: deriveTitle(text, sourceLabel),
    text,
    sourceType,
    sourceLabel,
    libraryItemId,
    readAt: Date.now(),
  };
  const s = getStore();
  const next = [...s.get("history"), entry];
  // Cap history growth — oldest entries fall off once the list gets long.
  if (next.length > MAX_HISTORY) next.splice(0, next.length - MAX_HISTORY);
  s.set("history", next);
  return entry;
}

export function removeHistoryEntry(id: string): void {
  const s = getStore();
  s.set(
    "history",
    s.get("history").filter((h) => h.id !== id)
  );
}

export function clearHistory(): void {
  getStore().set("history", []);
}
