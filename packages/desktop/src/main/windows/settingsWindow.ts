import { BrowserWindow } from "electron";
import path from "node:path";

let settingsWin: BrowserWindow | null = null;

export function openSettingsWindow(): void {
  if (settingsWin && !settingsWin.isDestroyed()) {
    settingsWin.show();
    settingsWin.focus();
    return;
  }

  settingsWin = new BrowserWindow({
    width: 480,
    height: 680,
    resizable: true,
    title: "FlashRead — Configuración",
    webPreferences: {
      preload: path.join(__dirname, "../../preload/settingsPreload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  settingsWin.setMenuBarVisibility(false);
  settingsWin.loadFile(path.join(__dirname, "../../renderer/settings/index.html"));
  settingsWin.on("closed", () => {
    settingsWin = null;
  });
}
