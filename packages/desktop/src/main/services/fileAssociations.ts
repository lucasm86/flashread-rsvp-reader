import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { app } from "electron";

const execFileAsync = promisify(execFile);

const PROG_ID = "FlashRead.Document";
const VERB_NAME = "FlashRead";
const VERB_LABEL = "Leer con FlashRead";

/**
 * .pdf/.docx/.txt per the Phase 2 spec, plus .epub since the app already
 * supports it as a first-class drag&drop format.
 */
export const ASSOCIABLE_EXTENSIONS = [".txt", ".pdf", ".docx", ".epub"];

export type FileAssocStatus = "unregistered" | "registered" | "stale";

export interface FileAssocState {
  supported: boolean;
  status: FileAssocStatus;
}

/**
 * Only meaningful for the packaged portable .exe: registering the dev
 * electron.exe would associate files with the wrong binary.
 */
function isSupported(): boolean {
  return process.platform === "win32" && app.isPackaged;
}

async function regSetDefault(key: string, value: string): Promise<void> {
  await execFileAsync("reg", ["add", key, "/ve", "/d", value, "/f"]);
}

async function regSetValue(key: string, name: string, value: string): Promise<void> {
  await execFileAsync("reg", ["add", key, "/v", name, "/d", value, "/f"]);
}

async function regDeleteKey(key: string): Promise<void> {
  try {
    await execFileAsync("reg", ["delete", key, "/f"]);
  } catch {
    // Already absent — unregister must be idempotent.
  }
}

async function regDeleteValue(key: string, name: string): Promise<void> {
  try {
    await execFileAsync("reg", ["delete", key, "/v", name, "/f"]);
  } catch {
    // Already absent.
  }
}

async function regQueryDefault(key: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("reg", ["query", key, "/ve"]);
    const match = stdout.match(/REG_SZ\s+(.+)\r?\n?$/m);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

export async function registerFileAssociations(): Promise<void> {
  if (!isSupported()) {
    throw new Error("Solo disponible en la versión empaquetada (.exe) de la app.");
  }
  const exePath = process.execPath;
  const command = `"${exePath}" "%1"`;
  const progIdKey = `HKCU\\Software\\Classes\\${PROG_ID}`;

  await regSetDefault(progIdKey, "Documento FlashRead");
  await regSetDefault(`${progIdKey}\\DefaultIcon`, `${exePath},0`);
  await regSetDefault(`${progIdKey}\\shell\\open\\command`, command);

  for (const ext of ASSOCIABLE_EXTENSIONS) {
    // Adds FlashRead to the "Open with" list without touching the
    // extension's actual default handler.
    await regSetValue(`HKCU\\Software\\Classes\\${ext}\\OpenWithProgids`, PROG_ID, "");

    // A standalone "Leer con FlashRead" context-menu entry, independent of
    // Open-With/default-app state.
    const shellKey = `HKCU\\Software\\Classes\\SystemFileAssociations\\${ext}\\shell\\${VERB_NAME}`;
    await regSetDefault(shellKey, VERB_LABEL);
    await regSetValue(shellKey, "Icon", `${exePath},0`);
    await regSetDefault(`${shellKey}\\command`, command);
  }
}

export async function unregisterFileAssociations(): Promise<void> {
  for (const ext of ASSOCIABLE_EXTENSIONS) {
    await regDeleteValue(`HKCU\\Software\\Classes\\${ext}\\OpenWithProgids`, PROG_ID);
    await regDeleteKey(`HKCU\\Software\\Classes\\SystemFileAssociations\\${ext}\\shell\\${VERB_NAME}`);
  }
  await regDeleteKey(`HKCU\\Software\\Classes\\${PROG_ID}`);
}

export async function getFileAssociationState(): Promise<FileAssocState> {
  const supported = isSupported();
  if (!supported) return { supported, status: "unregistered" };

  const command = await regQueryDefault(`HKCU\\Software\\Classes\\${PROG_ID}\\shell\\open\\command`);
  if (!command) return { supported, status: "unregistered" };
  return { supported, status: command.includes(process.execPath) ? "registered" : "stale" };
}
