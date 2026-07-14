import { app } from "electron";
import { createTray } from "./tray";
import { getStore } from "./services/store";
import { startLocalServer } from "./services/localServer";
import { setGlobalShortcut } from "./services/shortcutManager";
import { registerIpcHandlers } from "./ipc/handlers";
import { openReaderWithText, openReaderForNewText } from "./windows/readerWindow";
import { openSettingsWindow } from "./windows/settingsWindow";

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    // Another launch attempt happened (e.g. user double-clicked the exe
    // again). Surface the reader instead of spawning a new app.
    openReaderForNewText();
  });

  app.whenReady().then(() => {
    const store = getStore();

    registerIpcHandlers();

    createTray({
      onOpenPaste: () => openReaderForNewText(),
      onOpenSettings: () => openSettingsWindow(),
      onQuit: () => app.quit(),
    });

    startLocalServer((text, opts) => openReaderWithText(text, "extension", opts));

    setGlobalShortcut(store.get("globalShortcut"), (text) => {
      openReaderWithText(text, "clipboard");
    });
  });

  // No-op listener: intentionally NOT calling app.quit() here so the app
  // stays alive in the tray even when every window is closed.
  app.on("window-all-closed", () => {});
}
