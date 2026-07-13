interface LibraryItem {
  id: string;
  title: string;
  text: string;
  sourceType: string;
  sourceLabel?: string;
  addedAt: number;
}

interface HistoryEntry {
  id: string;
  title: string;
  text: string;
  sourceType: string;
  sourceLabel?: string;
  libraryItemId?: string;
  readAt: number;
}

interface FlashReadPasteAPI {
  openReaderWithText: (text: string, sourceLabel?: string, saveToLibrary?: boolean) => void;
  extractFileText: (filePath: string) => Promise<string>;
  getPathForFile: (file: File) => string;

  getLibrary: () => Promise<LibraryItem[]>;
  removeFromLibrary: (id: string) => void;
  openFromLibrary: (id: string) => void;

  getHistory: () => Promise<HistoryEntry[]>;
  clearHistory: () => void;
  removeHistoryEntry: (id: string) => void;
  openFromHistory: (id: string) => void;
  addHistoryEntryToLibrary: (id: string) => Promise<LibraryItem | null>;
}

interface Window {
  flashreadPaste: FlashReadPasteAPI;
}

(function () {
  const dropzone = document.getElementById("dropzone") as HTMLDivElement;
  const textInput = document.getElementById("text-input") as HTMLTextAreaElement;
  const fileStatus = document.getElementById("file-status") as HTMLParagraphElement;
  const btnRead = document.getElementById("btn-read") as HTMLButtonElement;
  const saveToLibraryCheckbox = document.getElementById("save-to-library") as HTMLInputElement;

  const tabButtons = Array.from(document.querySelectorAll<HTMLButtonElement>(".tab-btn"));
  const tabPanels: Record<string, HTMLElement> = {
    new: document.getElementById("tab-new")!,
    library: document.getElementById("tab-library")!,
    history: document.getElementById("tab-history")!,
  };

  const libraryList = document.getElementById("library-list") as HTMLUListElement;
  const libraryEmpty = document.getElementById("library-empty") as HTMLParagraphElement;
  const historyList = document.getElementById("history-list") as HTMLUListElement;
  const historyEmpty = document.getElementById("history-empty") as HTMLParagraphElement;
  const btnClearHistory = document.getElementById("btn-clear-history") as HTMLButtonElement;

  const SUPPORTED = [".txt", ".pdf", ".docx", ".epub"];
  let lastFileLabel: string | null = null;

  function escapeHtml(str: string): string {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function formatDate(ms: number): string {
    return new Date(ms).toLocaleString();
  }

  function sourceLabelText(sourceType: string): string {
    switch (sourceType) {
      case "clipboard":
        return "portapapeles";
      case "file":
        return "archivo";
      case "paste":
        return "pegado";
      case "extension":
        return "extensión";
      case "library":
        return "biblioteca";
      case "history":
        return "historial";
      default:
        return sourceType;
    }
  }

  function setStatus(message: string, isError = false): void {
    fileStatus.textContent = message;
    fileStatus.classList.toggle("error", isError);
  }

  function startReading(): void {
    const text = textInput.value.trim();
    if (!text) {
      setStatus("Escribí o pegá texto, o arrastrá un archivo.", true);
      return;
    }
    window.flashreadPaste.openReaderWithText(text, lastFileLabel ?? undefined, saveToLibraryCheckbox.checked);
  }

  async function handleFile(file: File): Promise<void> {
    const lower = file.name.toLowerCase();
    if (!SUPPORTED.some((ext) => lower.endsWith(ext))) {
      setStatus(`Formato no soportado: ${file.name}`, true);
      return;
    }
    setStatus(`Leyendo ${file.name}…`);
    try {
      const path = window.flashreadPaste.getPathForFile(file);
      const text = await window.flashreadPaste.extractFileText(path);
      textInput.value = text;
      lastFileLabel = file.name;
      setStatus(`Listo: ${file.name} (${text.length} caracteres)`);
    } catch (err) {
      setStatus(`Error al leer ${file.name}: ${(err as Error).message}`, true);
    }
  }

  btnRead.addEventListener("click", startReading);

  textInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      startReading();
    }
  });

  // Setting .value programmatically (from handleFile) does not fire
  // "input", so this only clears the file label on real user edits.
  textInput.addEventListener("input", () => {
    lastFileLabel = null;
  });

  ["dragenter", "dragover"].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add("drag-over");
    });
  });

  ["dragleave", "drop"].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.remove("drag-over");
    });
  });

  dropzone.addEventListener("drop", (e) => {
    const file = e.dataTransfer?.files?.[0];
    if (file) void handleFile(file);
  });

  interface ItemAction {
    label: string;
    className?: string;
    onClick: (button: HTMLButtonElement) => void;
  }

  function buildItemRow(title: string, metaLine: string, actions: ItemAction[]): HTMLLIElement {
    const li = document.createElement("li");
    li.className = "item-row";

    const info = document.createElement("div");
    info.className = "item-info";
    info.innerHTML = `<div class="item-title">${escapeHtml(title)}</div><div class="item-meta">${escapeHtml(
      metaLine
    )}</div>`;
    li.appendChild(info);

    const actionsEl = document.createElement("div");
    actionsEl.className = "item-actions";
    for (const action of actions) {
      const btn = document.createElement("button");
      btn.textContent = action.label;
      if (action.className) btn.className = action.className;
      btn.addEventListener("click", () => action.onClick(btn));
      actionsEl.appendChild(btn);
    }
    li.appendChild(actionsEl);

    return li;
  }

  async function refreshLibrary(): Promise<void> {
    const items = await window.flashreadPaste.getLibrary();
    libraryList.innerHTML = "";
    libraryEmpty.style.display = items.length === 0 ? "block" : "none";
    for (const item of items) {
      const row = buildItemRow(item.title, `${formatDate(item.addedAt)} · ${sourceLabelText(item.sourceType)}`, [
        { label: "Leer", onClick: () => window.flashreadPaste.openFromLibrary(item.id) },
        {
          label: "Quitar",
          className: "btn-remove",
          onClick: () => {
            window.flashreadPaste.removeFromLibrary(item.id);
            void refreshLibrary();
          },
        },
      ]);
      libraryList.appendChild(row);
    }
  }

  async function refreshHistory(): Promise<void> {
    const entries = await window.flashreadPaste.getHistory();
    historyList.innerHTML = "";
    historyEmpty.style.display = entries.length === 0 ? "block" : "none";
    for (const entry of entries) {
      const row = buildItemRow(entry.title, `${formatDate(entry.readAt)} · ${sourceLabelText(entry.sourceType)}`, [
        { label: "Leer", onClick: () => window.flashreadPaste.openFromHistory(entry.id) },
        {
          label: "Guardar",
          onClick: (btn) => {
            btn.disabled = true;
            void window.flashreadPaste.addHistoryEntryToLibrary(entry.id).then(() => {
              btn.textContent = "Guardado ✓";
            });
          },
        },
        {
          label: "Quitar",
          className: "btn-remove",
          onClick: () => {
            window.flashreadPaste.removeHistoryEntry(entry.id);
            void refreshHistory();
          },
        },
      ]);
      historyList.appendChild(row);
    }
  }

  btnClearHistory.addEventListener("click", () => {
    window.flashreadPaste.clearHistory();
    void refreshHistory();
  });

  function switchTab(name: string): void {
    tabButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === name));
    Object.entries(tabPanels).forEach(([key, el]) => el.classList.toggle("active", key === name));
    if (name === "library") void refreshLibrary();
    if (name === "history") void refreshHistory();
  }

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab as string));
  });

  window.addEventListener("focus", () => {
    const active = tabButtons.find((btn) => btn.classList.contains("active"));
    if (active?.dataset.tab === "library") void refreshLibrary();
    if (active?.dataset.tab === "history") void refreshHistory();
  });
})();
