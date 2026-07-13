import { globalShortcut, clipboard } from "electron";

let currentAccelerator: string | null = null;

/**
 * Registers `accelerator` as the global "read clipboard" shortcut,
 * unregistering any previously-registered one first. Returns whether
 * registration succeeded (it can fail if another app already owns the
 * combination).
 */
export function setGlobalShortcut(
  accelerator: string,
  onTrigger: (text: string) => void
): boolean {
  if (currentAccelerator) {
    globalShortcut.unregister(currentAccelerator);
    currentAccelerator = null;
  }

  const ok = globalShortcut.register(accelerator, () => {
    const text = clipboard.readText();
    if (text && text.trim()) {
      onTrigger(text);
    }
  });

  if (ok) {
    currentAccelerator = accelerator;
  }

  return ok;
}

export function unregisterAllShortcuts(): void {
  globalShortcut.unregisterAll();
  currentAccelerator = null;
}
