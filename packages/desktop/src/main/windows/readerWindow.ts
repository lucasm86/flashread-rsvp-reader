import { BrowserWindow, screen } from "electron";
import path from "node:path";
import {
  ReaderSettings,
  ParagraphRange,
  parseDocument,
  buildChunks,
  buildParagraphRanges,
  buildMarkdownChunks,
} from "@flashread/core";
import { getStore } from "../services/store";
import { TextSource, addHistoryEntry } from "../services/libraryStore";

const BASE_WIDTH = 720;
const PANEL_WIDTH = 360;
const BASE_HEIGHT = 260;
const MIN_WIDTH = 420;
const MIN_HEIGHT = 180;

let readerWin: BrowserWindow | null = null;
let currentRawText: string | null = null;
let currentIsMarkdown = false;

interface ChunkPayload {
  chunks: {
    display: string;
    orpIndex: number;
    pauseMultiplier: number;
    wordCount: number;
    paragraphIndex: number;
    type?: "words" | "table";
    tableMarkdown?: string;
  }[];
  paragraphs: ParagraphRange[];
  settings: ReaderSettings;
  notice?: string;
}

function windowWidthFor(showTextPanel: boolean): number {
  return showTextPanel ? BASE_WIDTH + PANEL_WIDTH : BASE_WIDTH;
}

function buildPayload(text: string, settings: ReaderSettings, isMarkdown: boolean, notice?: string): ChunkPayload {
  const chunks = isMarkdown
    ? buildMarkdownChunks(text, settings.chunkSize, settings)
    : buildChunks(parseDocument(text), settings.chunkSize, settings);
  const paragraphs = buildParagraphRanges(chunks);
  return {
    chunks: chunks.map((c) => ({
      display: c.display,
      orpIndex: c.orpIndex,
      pauseMultiplier: c.pauseMultiplier,
      wordCount: c.words.length,
      paragraphIndex: c.paragraphIndex,
      type: c.type,
      tableMarkdown: c.tableMarkdown,
    })),
    paragraphs,
    settings,
    notice,
  };
}

function getOrCreateReaderWindow(settings: ReaderSettings): BrowserWindow {
  if (readerWin && !readerWin.isDestroyed()) {
    readerWin.setAlwaysOnTop(settings.alwaysOnTop);
    return readerWin;
  }

  readerWin = new BrowserWindow({
    width: windowWidthFor(settings.showTextPanel),
    height: BASE_HEIGHT,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    frame: false,
    resizable: true,
    alwaysOnTop: settings.alwaysOnTop,
    center: true,
    show: false,
    backgroundColor: "#1e1e1e",
    webPreferences: {
      preload: path.join(__dirname, "../../preload/readerPreload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  readerWin.once("ready-to-show", () => readerWin?.show());
  readerWin.on("closed", () => {
    readerWin = null;
  });

  readerWin.loadFile(path.join(__dirname, "../../renderer/reader/index.html"));

  return readerWin;
}

export interface OpenReaderOptions {
  sourceLabel?: string;
  libraryItemId?: string;
  /** Skip logging a history entry (used when the caller already logged one). */
  skipHistory?: boolean;
  /** True when `text` is Markdown (from the document-to-Markdown conversion), not plain text. */
  isMarkdown?: boolean;
  /** Discreet, non-blocking message shown once in the reader (e.g. Markdown-conversion fallback notice). */
  notice?: string;
}

export function openReaderWithText(text: string, source: TextSource, opts: OpenReaderOptions = {}): void {
  currentRawText = text;
  currentIsMarkdown = !!opts.isMarkdown;
  if (!opts.skipHistory) {
    addHistoryEntry(text, source, opts.sourceLabel, opts.libraryItemId, opts.isMarkdown);
  }
  const settings = getStore().store;
  const win = getOrCreateReaderWindow(settings);
  const payload = buildPayload(text, settings, currentIsMarkdown, opts.notice);

  const send = () => win.webContents.send("reader:load-text", payload);
  if (win.webContents.isLoading()) {
    win.webContents.once("did-finish-load", send);
  } else {
    send();
  }

  win.show();
  win.focus();
}

export function openReaderForNewText(): void {
  const store = getStore();
  const settings = store.store;
  const win = getOrCreateReaderWindow(settings);

  const activate = () => {
    if (!store.get("showTextPanel")) {
      store.set("showTextPanel", true);
      setReaderPanelVisible(true);
    }
    win.webContents.send("reader:focus-new-tab");
  };

  if (win.webContents.isLoading()) {
    win.webContents.once("did-finish-load", activate);
  } else {
    activate();
  }

  win.show();
  win.focus();
}

export function refreshReaderChunks(settings: ReaderSettings): void {
  if (!readerWin || readerWin.isDestroyed() || !currentRawText) return;
  readerWin.setAlwaysOnTop(settings.alwaysOnTop);
  const payload = buildPayload(currentRawText, settings, currentIsMarkdown);
  readerWin.webContents.send("reader:settings-updated", payload);
}

const CENTER_TOLERANCE_PX = 2;

export function setReaderPanelVisible(showTextPanel: boolean): void {
  if (!readerWin || readerWin.isDestroyed()) return;

  const bounds = readerWin.getBounds();
  const workArea = screen.getDisplayMatching(bounds).workArea;
  const currentCenterX = bounds.x + bounds.width / 2;
  const screenCenterX = workArea.x + workArea.width / 2;
  const wasCentered = Math.abs(currentCenterX - screenCenterX) <= CENTER_TOLERANCE_PX;

  const newWidth = windowWidthFor(showTextPanel);

  if (wasCentered) {
    const newX = Math.round(screenCenterX - newWidth / 2);
    readerWin.setBounds({ x: newX, y: bounds.y, width: newWidth, height: bounds.height });
  } else {
    // Window was moved by the user: keep its left edge fixed rather than
    // forcing it back to the middle of the screen.
    readerWin.setSize(newWidth, bounds.height);
  }

  readerWin.webContents.send("reader:panel-visibility", { showTextPanel });
}

export function closeReaderWindow(): void {
  if (readerWin && !readerWin.isDestroyed()) {
    readerWin.hide();
  }
}

export function minimizeReaderWindow(): void {
  if (readerWin && !readerWin.isDestroyed()) {
    readerWin.minimize();
  }
}
