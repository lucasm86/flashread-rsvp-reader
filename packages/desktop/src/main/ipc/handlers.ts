import { ipcMain } from "electron";
import { getStore } from "../services/store";
import { extractTextFromFile } from "../services/fileParserService";
import { extractTextFromUrl } from "../services/urlFetchService";
import { setGlobalShortcut } from "../services/shortcutManager";
import {
  registerFileAssociations,
  unregisterFileAssociations,
  getFileAssociationState,
} from "../services/fileAssociations";
import { checkForUpdatesManual, getAppVersion } from "../services/updater";
import { recordSession, getStatsSummary } from "../services/statsStore";
import {
  getLibrary,
  getLibraryItem,
  addToLibrary,
  removeFromLibrary,
  getHistory,
  getHistoryEntry,
  removeHistoryEntry,
  clearHistory,
} from "../services/libraryStore";
import {
  openReaderWithText,
  refreshReaderChunks,
  closeReaderWindow,
  minimizeReaderWindow,
  setReaderPanelVisible,
  savePlaybackPosition,
} from "../windows/readerWindow";
import { openSettingsWindow } from "../windows/settingsWindow";

interface OpenReaderPayload {
  text: string;
  sourceLabel?: string;
  saveToLibrary?: boolean;
  isMarkdown?: boolean;
}

export function registerIpcHandlers(): void {
  ipcMain.handle("settings:get", () => {
    return getStore().store;
  });

  ipcMain.handle("settings:update", (_e, partial: Record<string, unknown>) => {
    const store = getStore();
    const prevShortcut = store.get("globalShortcut");

    store.set({ ...store.store, ...partial });
    const updated = store.store;

    if (updated.globalShortcut !== prevShortcut) {
      setGlobalShortcut(updated.globalShortcut, (text) =>
        openReaderWithText(text, "clipboard")
      );
    }

    refreshReaderChunks(updated);
    setReaderPanelVisible(updated.showTextPanel);
    return updated;
  });

  ipcMain.handle("file:extract-text", async (_e, filePath: string) => {
    const convertToMarkdown = getStore().get("convertToMarkdown");
    return extractTextFromFile(filePath, convertToMarkdown);
  });

  ipcMain.handle("url:extract-text", async (_e, url: string) => {
    const convertToMarkdown = getStore().get("convertToMarkdown");
    return extractTextFromUrl(url, convertToMarkdown);
  });

  ipcMain.on("paste:open-reader", (_e, payload: OpenReaderPayload) => {
    let libraryItemId: string | undefined;
    if (payload.saveToLibrary) {
      libraryItemId = addToLibrary(payload.text, "paste", payload.sourceLabel, payload.isMarkdown).id;
    }
    openReaderWithText(payload.text, "paste", {
      sourceLabel: payload.sourceLabel,
      libraryItemId,
      isMarkdown: payload.isMarkdown,
    });
  });

  ipcMain.on("reader:update-wpm", (_e, wpm: number) => {
    getStore().set("wpm", wpm);
  });

  ipcMain.on("reader:open-settings", () => {
    openSettingsWindow();
  });

  ipcMain.on("reader:close", () => {
    closeReaderWindow();
  });

  ipcMain.on("reader:minimize", () => {
    minimizeReaderWindow();
  });

  ipcMain.on("reader:save-position", (_e, chunkIndex: number) => {
    savePlaybackPosition(chunkIndex);
  });

  ipcMain.on("reader:record-session", (_e, wordsRead: number, durationMs: number) => {
    recordSession(wordsRead, durationMs);
  });

  ipcMain.handle("stats:get", () => getStatsSummary());

  ipcMain.on("reader:toggle-panel", () => {
    const store = getStore();
    const next = !store.get("showTextPanel");
    store.set("showTextPanel", next);
    setReaderPanelVisible(next);
  });

  ipcMain.handle("library:get", () => getLibrary());

  ipcMain.on("library:remove", (_e, id: string) => {
    removeFromLibrary(id);
  });

  ipcMain.on("library:open", (_e, id: string) => {
    const item = getLibraryItem(id);
    if (item) {
      openReaderWithText(item.text, "library", {
        sourceLabel: item.sourceLabel,
        libraryItemId: item.id,
        isMarkdown: item.isMarkdown,
        resumeAt: item.lastChunkIndex,
      });
    }
  });

  ipcMain.handle("history:get", () => getHistory());

  ipcMain.on("history:clear", () => {
    clearHistory();
  });

  ipcMain.on("history:remove", (_e, id: string) => {
    removeHistoryEntry(id);
  });

  ipcMain.on("history:open", (_e, id: string) => {
    const entry = getHistoryEntry(id);
    if (entry) {
      openReaderWithText(entry.text, "history", {
        sourceLabel: entry.sourceLabel,
        libraryItemId: entry.libraryItemId,
        isMarkdown: entry.isMarkdown,
        resumeAt: entry.lastChunkIndex,
      });
    }
  });

  ipcMain.handle("history:add-to-library", (_e, id: string) => {
    const entry = getHistoryEntry(id);
    if (!entry) return null;
    return addToLibrary(entry.text, entry.sourceType, entry.sourceLabel, entry.isMarkdown);
  });

  ipcMain.handle("fileAssoc:status", () => getFileAssociationState());

  ipcMain.handle("fileAssoc:register", async () => {
    await registerFileAssociations();
    return getFileAssociationState();
  });

  ipcMain.handle("fileAssoc:unregister", async () => {
    await unregisterFileAssociations();
    return getFileAssociationState();
  });

  ipcMain.handle("app:get-version", () => getAppVersion());

  ipcMain.handle("updates:check", () => checkForUpdatesManual());
}
