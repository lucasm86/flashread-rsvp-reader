import { contextBridge, ipcRenderer, webUtils } from "electron";

contextBridge.exposeInMainWorld("flashread", {
  onLoadText: (cb: (payload: unknown) => void) => {
    ipcRenderer.on("reader:load-text", (_e, payload) => cb(payload));
  },
  onSettingsUpdated: (cb: (payload: unknown) => void) => {
    ipcRenderer.on("reader:settings-updated", (_e, payload) => cb(payload));
  },
  onPanelVisibility: (cb: (payload: { showTextPanel: boolean }) => void) => {
    ipcRenderer.on("reader:panel-visibility", (_e, payload) => cb(payload));
  },
  onFocusNewTab: (cb: () => void) => {
    ipcRenderer.on("reader:focus-new-tab", () => cb());
  },
  onShowToast: (cb: (message: string) => void) => {
    ipcRenderer.on("reader:show-toast", (_e, message) => cb(message));
  },
  updateWpm: (wpm: number) => ipcRenderer.send("reader:update-wpm", wpm),
  togglePanel: () => ipcRenderer.send("reader:toggle-panel"),
  openSettings: () => ipcRenderer.send("reader:open-settings"),
  closeReader: () => ipcRenderer.send("reader:close"),
  minimizeReader: () => ipcRenderer.send("reader:minimize"),

  loadNewText: (text: string, sourceLabel?: string, saveToLibrary?: boolean, isMarkdown?: boolean) =>
    ipcRenderer.send("paste:open-reader", { text, sourceLabel, saveToLibrary, isMarkdown }),
  extractFileText: (filePath: string) => ipcRenderer.invoke("file:extract-text", filePath),
  extractUrlText: (url: string) => ipcRenderer.invoke("url:extract-text", url),
  getPathForFile: (file: File) => webUtils.getPathForFile(file),

  getLibrary: () => ipcRenderer.invoke("library:get"),
  removeFromLibrary: (id: string) => ipcRenderer.send("library:remove", id),
  openFromLibrary: (id: string) => ipcRenderer.send("library:open", id),

  getHistory: () => ipcRenderer.invoke("history:get"),
  clearHistory: () => ipcRenderer.send("history:clear"),
  removeHistoryEntry: (id: string) => ipcRenderer.send("history:remove", id),
  openFromHistory: (id: string) => ipcRenderer.send("history:open", id),
  addHistoryEntryToLibrary: (id: string) => ipcRenderer.invoke("history:add-to-library", id),
});
