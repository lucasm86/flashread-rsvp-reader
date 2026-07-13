import { BrowserWindow } from "electron";
import path from "node:path";

let pasteWin: BrowserWindow | null = null;

export function openPasteWindow(): void {
  if (pasteWin && !pasteWin.isDestroyed()) {
    pasteWin.show();
    pasteWin.focus();
    return;
  }

  pasteWin = new BrowserWindow({
    width: 580,
    height: 560,
    minWidth: 420,
    minHeight: 360,
    resizable: true,
    title: "FlashRead",
    webPreferences: {
      preload: path.join(__dirname, "../../preload/pastePreload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  pasteWin.setMenuBarVisibility(false);
  pasteWin.loadFile(path.join(__dirname, "../../renderer/paste/index.html"));
  pasteWin.on("closed", () => {
    pasteWin = null;
  });
}
