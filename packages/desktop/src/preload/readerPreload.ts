import { contextBridge, ipcRenderer } from "electron";

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
  updateWpm: (wpm: number) => ipcRenderer.send("reader:update-wpm", wpm),
  togglePanel: () => ipcRenderer.send("reader:toggle-panel"),
  openSettings: () => ipcRenderer.send("reader:open-settings"),
  closeReader: () => ipcRenderer.send("reader:close"),
});
