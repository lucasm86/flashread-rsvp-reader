import { Tray, Menu, nativeImage, NativeImage } from "electron";

function makeTrayIcon(size = 16): NativeImage {
  // Solid-color square generated at runtime so the app doesn't depend on
  // a bundled icon asset for the MVP. Replace with a real .ico for release.
  const buffer = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    buffer[i * 4 + 0] = 0x3d; // B
    buffer[i * 4 + 1] = 0x5a; // G
    buffer[i * 4 + 2] = 0xe6; // R
    buffer[i * 4 + 3] = 0xff; // A
  }
  return nativeImage.createFromBitmap(buffer, { width: size, height: size });
}

export interface TrayHandlers {
  onOpenPaste: () => void;
  onOpenSettings: () => void;
  onQuit: () => void;
}

export function createTray(handlers: TrayHandlers): Tray {
  const tray = new Tray(makeTrayIcon());
  tray.setToolTip("FlashRead");

  const menu = Menu.buildFromTemplate([
    { label: "Pegar texto / Arrastrar archivo…", click: handlers.onOpenPaste },
    { label: "Configuración…", click: handlers.onOpenSettings },
    { type: "separator" },
    { label: "Salir", click: handlers.onQuit },
  ]);

  tray.setContextMenu(menu);
  tray.on("click", handlers.onOpenPaste);

  return tray;
}
