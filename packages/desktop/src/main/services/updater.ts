import { app, dialog } from "electron";
import { autoUpdater, UpdateInfo } from "electron-updater";

export interface UpdateCheckResult {
  status: "up-to-date" | "update-available" | "error";
  message: string;
}

let wired = false;

/**
 * Only the NSIS-installed build has an update feed electron-updater can act
 * on; the portable exe has no installation record to self-replace. Both are
 * shipped from the same release, so a portable-run instance still calling
 * this just surfaces a clean "no se pudo comprobar" instead of updating.
 */
function isSupported(): boolean {
  return app.isPackaged;
}

function wireEvents(): void {
  if (wired) return;
  wired = true;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on("update-downloaded", (info: UpdateInfo) => {
    dialog
      .showMessageBox({
        type: "info",
        title: "Actualización lista",
        message: `FlashRead ${info.version} está listo para instalarse.`,
        detail: "La app se va a reiniciar para aplicar la actualización.",
        buttons: ["Reiniciar ahora", "Más tarde"],
        defaultId: 0,
        cancelId: 1,
      })
      .then((result) => {
        if (result.response === 0) autoUpdater.quitAndInstall();
      });
  });
}

export function initUpdater(): void {
  if (!isSupported()) return;
  wireEvents();
}

/** Silent background check (e.g. on startup) — errors are swallowed, only a found update surfaces (via update-downloaded). */
export function checkForUpdatesSilently(): void {
  if (!isSupported()) return;
  wireEvents();
  autoUpdater.checkForUpdates().catch(() => {});
}

/** User-triggered check (tray menu / Settings) — always resolves with a result to show. */
export function checkForUpdatesManual(): Promise<UpdateCheckResult> {
  if (!isSupported()) {
    return Promise.resolve({
      status: "error",
      message: "Solo disponible en la versión instalada (.exe con instalador), no en modo desarrollo.",
    });
  }
  wireEvents();

  return new Promise((resolve) => {
    const cleanup = () => {
      autoUpdater.removeListener("update-available", onAvailable);
      autoUpdater.removeListener("update-not-available", onNotAvailable);
      autoUpdater.removeListener("error", onError);
    };
    const onAvailable = (info: UpdateInfo) => {
      cleanup();
      resolve({ status: "update-available", message: `Descargando la actualización ${info.version}…` });
    };
    const onNotAvailable = () => {
      cleanup();
      resolve({ status: "up-to-date", message: `Ya tenés la última versión (${app.getVersion()}).` });
    };
    const onError = (err: Error) => {
      cleanup();
      resolve({ status: "error", message: `No se pudo comprobar: ${err.message}` });
    };
    autoUpdater.once("update-available", onAvailable);
    autoUpdater.once("update-not-available", onNotAvailable);
    autoUpdater.once("error", onError);
    autoUpdater.checkForUpdates().catch(onError);
  });
}

export function showUpdateCheckDialog(result: UpdateCheckResult): void {
  dialog.showMessageBox({
    type: result.status === "error" ? "warning" : "info",
    title: "Actualizaciones",
    message: result.message,
  });
}

export function getAppVersion(): string {
  return app.getVersion();
}
