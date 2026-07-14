import { app } from "electron";
import fs from "node:fs";
import path from "node:path";
import { createTray } from "./tray";
import { getStore } from "./services/store";
import { startLocalServer } from "./services/localServer";
import { setGlobalShortcut } from "./services/shortcutManager";
import { registerIpcHandlers } from "./ipc/handlers";
import { extractTextFromFile, isSupportedFile } from "./services/fileParserService";
import { openReaderWithText, openReaderForNewText, openReaderWithError } from "./windows/readerWindow";
import { openSettingsWindow } from "./windows/settingsWindow";

const gotLock = app.requestSingleInstanceLock();

/** Finds the first argv entry that looks like a file we can open (skips exe path and CLI flags). */
function extractFileArgFromArgv(argv: string[]): string | null {
  for (const arg of argv.slice(1)) {
    if (arg.startsWith("-")) continue;
    if (!isSupportedFile(arg)) continue;
    if (!fs.existsSync(arg)) continue;
    return arg;
  }
  return null;
}

/** Opens a file handed to the app via "Abrir con"/the Explorer context menu/a CLI arg. */
async function openFileArg(filePath: string): Promise<void> {
  try {
    const convertToMarkdown = getStore().get("convertToMarkdown");
    const result = await extractTextFromFile(filePath, convertToMarkdown);
    openReaderWithText(result.text, "file", {
      sourceLabel: path.basename(filePath),
      isMarkdown: result.isMarkdown,
      notice: result.notice,
    });
  } catch (err) {
    openReaderWithError(`No se pudo abrir ${path.basename(filePath)}: ${(err as Error).message}`);
  }
}

if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", (_event, argv) => {
    // Another launch attempt happened — either a plain relaunch (e.g. the
    // user double-clicked the exe again) or Windows opening a file via
    // "Abrir con"/the Explorer context menu, which passes the file path
    // as an argv entry to the new (redirected) instance.
    const filePath = extractFileArgFromArgv(argv);
    if (filePath) {
      void openFileArg(filePath);
    } else {
      openReaderForNewText();
    }
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

    // First launch of the app itself via "Abrir con"/the context menu.
    const filePath = extractFileArgFromArgv(process.argv);
    if (filePath) void openFileArg(filePath);
  });

  // No-op listener: intentionally NOT calling app.quit() here so the app
  // stays alive in the tray even when every window is closed.
  app.on("window-all-closed", () => {});
}
