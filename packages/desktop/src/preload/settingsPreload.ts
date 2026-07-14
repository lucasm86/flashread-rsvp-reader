import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("flashreadSettings", {
  getSettings: () => ipcRenderer.invoke("settings:get"),
  updateSettings: (partial: Record<string, unknown>) =>
    ipcRenderer.invoke("settings:update", partial),
  getFileAssocStatus: () => ipcRenderer.invoke("fileAssoc:status"),
  registerFileAssoc: () => ipcRenderer.invoke("fileAssoc:register"),
  unregisterFileAssoc: () => ipcRenderer.invoke("fileAssoc:unregister"),
});
