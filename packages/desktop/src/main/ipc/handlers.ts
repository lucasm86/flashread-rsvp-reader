import { ipcMain } from "electron";
import { getStore } from "../services/store";
import { extractTextFromFile } from "../services/fileParserService";
import { setGlobalShortcut } from "../services/shortcutManager";
import {
  openReaderWithText,
  refreshReaderChunks,
  closeReaderWindow,
  setReaderPanelVisible,
} from "../windows/readerWindow";
import { openSettingsWindow } from "../windows/settingsWindow";

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
    return extractTextFromFile(filePath);
  });

  ipcMain.on("paste:open-reader", (_e, text: string) => {
    openReaderWithText(text, "paste");
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

  ipcMain.on("reader:toggle-panel", () => {
    const store = getStore();
    const next = !store.get("showTextPanel");
    store.set("showTextPanel", next);
    setReaderPanelVisible(next);
  });
}
