import { contextBridge, ipcRenderer, webUtils } from "electron";

contextBridge.exposeInMainWorld("flashreadPaste", {
  openReaderWithText: (text: string) => ipcRenderer.send("paste:open-reader", text),
  extractFileText: (filePath: string) => ipcRenderer.invoke("file:extract-text", filePath),
  getPathForFile: (file: File) => webUtils.getPathForFile(file),
});
