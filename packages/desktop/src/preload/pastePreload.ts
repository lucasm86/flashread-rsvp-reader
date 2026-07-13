import { contextBridge, ipcRenderer, webUtils } from "electron";

contextBridge.exposeInMainWorld("flashreadPaste", {
  openReaderWithText: (text: string, sourceLabel?: string, saveToLibrary?: boolean) =>
    ipcRenderer.send("paste:open-reader", { text, sourceLabel, saveToLibrary }),
  extractFileText: (filePath: string) => ipcRenderer.invoke("file:extract-text", filePath),
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
