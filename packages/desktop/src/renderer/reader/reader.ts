interface ChunkData {
  display: string;
  orpIndex: number;
  pauseMultiplier: number;
  wordCount: number;
  paragraphIndex: number;
}

interface ParagraphRange {
  paragraphIndex: number;
  startChunkIndex: number;
  endChunkIndex: number;
}

interface ReaderSettingsLike {
  wpm: number;
  fontSize: number;
  fontFamily: string;
  textColor: string;
  orpColor: string;
  backgroundColor: string;
  showTextPanel: boolean;
}

interface LoadPayload {
  chunks: ChunkData[];
  paragraphs: ParagraphRange[];
  settings: ReaderSettingsLike;
}

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

interface FlashReadReaderAPI {
  onLoadText: (cb: (payload: LoadPayload) => void) => void;
  onSettingsUpdated: (cb: (payload: LoadPayload) => void) => void;
  onPanelVisibility: (cb: (payload: { showTextPanel: boolean }) => void) => void;
  onFocusNewTab: (cb: () => void) => void;
  updateWpm: (wpm: number) => void;
  togglePanel: () => void;
  openSettings: () => void;
  closeReader: () => void;
  minimizeReader: () => void;

  loadNewText: (text: string, sourceLabel?: string, saveToLibrary?: boolean) => void;
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
  flashread: FlashReadReaderAPI;
}

(function () {
  const wordPre = document.getElementById("word-pre") as HTMLSpanElement;
  const wordOrp = document.getElementById("word-orp") as HTMLSpanElement;
  const wordPost = document.getElementById("word-post") as HTMLSpanElement;
  const progressFill = document.getElementById("progress-fill") as HTMLDivElement;
  const btnPlay = document.getElementById("btn-play") as HTMLButtonElement;
  const wpmValueEl = document.getElementById("wpm-value") as HTMLSpanElement;
  const timerDisplay = document.getElementById("timer-display") as HTMLSpanElement;
  const controls = document.getElementById("controls") as HTMLDivElement;
  const btnShowControls = document.getElementById("btn-show-controls") as HTMLButtonElement;
  const textPanel = document.getElementById("text-panel") as HTMLDivElement;
  const textPanelContent = document.getElementById("text-panel-content") as HTMLDivElement;
  const btnTogglePanel = document.getElementById("btn-toggle-panel") as HTMLButtonElement;

  const panelTabButtons = Array.from(document.querySelectorAll<HTMLButtonElement>(".panel-tab-btn"));
  const panelTabContents: Record<string, HTMLElement> = {
    text: document.getElementById("panel-tab-text")!,
    new: document.getElementById("panel-tab-new")!,
    library: document.getElementById("panel-tab-library")!,
    history: document.getElementById("panel-tab-history")!,
  };
  const panelDropzone = document.getElementById("panel-dropzone") as HTMLDivElement;
  const panelTextInput = document.getElementById("panel-text-input") as HTMLTextAreaElement;
  const panelFileStatus = document.getElementById("panel-file-status") as HTMLParagraphElement;
  const panelBtnRead = document.getElementById("panel-btn-read") as HTMLButtonElement;
  const panelSaveToLibrary = document.getElementById("panel-save-to-library") as HTMLInputElement;
  const panelLibraryList = document.getElementById("panel-library-list") as HTMLUListElement;
  const panelLibraryEmpty = document.getElementById("panel-library-empty") as HTMLParagraphElement;
  const panelHistoryList = document.getElementById("panel-history-list") as HTMLUListElement;
  const panelHistoryEmpty = document.getElementById("panel-history-empty") as HTMLParagraphElement;
  const panelBtnClearHistory = document.getElementById("panel-btn-clear-history") as HTMLButtonElement;

  let chunks: ChunkData[] = [];
  let paragraphs: ParagraphRange[] = [];
  let wordSpans: HTMLElement[] = [];
  let currentWordEl: HTMLElement | null = null;
  let settings: ReaderSettingsLike = {
    wpm: 300,
    fontSize: 48,
    fontFamily: "Segoe UI, sans-serif",
    textColor: "#e5e5e5",
    orpColor: "#e63946",
    backgroundColor: "#1e1e1e",
    showTextPanel: false,
  };
  let index = 0;
  let playing = false;
  let timer: number | null = null;
  let remainingMsSuffix: number[] = [];

  function applyStyles(): void {
    const root = document.documentElement.style;
    root.setProperty("--font-size", settings.fontSize + "px");
    root.setProperty("--font-family", settings.fontFamily);
    root.setProperty("--orp-color", settings.orpColor);
    root.setProperty("--text-color", settings.textColor);
    root.setProperty("--bg-color", settings.backgroundColor);
    wpmValueEl.textContent = String(settings.wpm);
  }

  function buildPanel(): void {
    textPanelContent.innerHTML = "";
    wordSpans = new Array(chunks.length);
    currentWordEl = null;

    for (const range of paragraphs) {
      const p = document.createElement("p");
      for (let i = range.startChunkIndex; i <= range.endChunkIndex; i++) {
        const span = document.createElement("span");
        span.className = "word";
        span.textContent = chunks[i].display;
        span.addEventListener("click", () => jumpToChunk(i));
        wordSpans[i] = span;
        p.appendChild(span);
        p.appendChild(document.createTextNode(" "));
      }
      textPanelContent.appendChild(p);
    }
  }

  function updatePanelHighlight(): void {
    if (currentWordEl) currentWordEl.classList.remove("current");
    const el = wordSpans[index] ?? null;
    if (el) {
      el.classList.add("current");
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
    currentWordEl = el;
  }

  function applyPanelVisibility(showTextPanel: boolean): void {
    textPanel.classList.toggle("visible", showTextPanel);
    btnTogglePanel.classList.toggle("active", showTextPanel);
  }

  function switchPanelTab(name: string): void {
    panelTabButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.panelTab === name));
    Object.entries(panelTabContents).forEach(([key, el]) => el.classList.toggle("active", key === name));
    if (name === "library") void refreshPanelLibrary();
    if (name === "history") void refreshPanelHistory();
  }

  panelTabButtons.forEach((btn) => {
    btn.addEventListener("click", () => switchPanelTab(btn.dataset.panelTab as string));
  });

  const PANEL_SUPPORTED_EXTENSIONS = [".txt", ".pdf", ".docx", ".epub"];
  let panelLastFileLabel: string | null = null;

  function setPanelFileStatus(message: string, isError = false): void {
    panelFileStatus.textContent = message;
    panelFileStatus.classList.toggle("error", isError);
  }

  function startPanelReading(): void {
    const text = panelTextInput.value.trim();
    if (!text) {
      setPanelFileStatus("Escribí o pegá texto, o arrastrá un archivo.", true);
      return;
    }
    window.flashread.loadNewText(text, panelLastFileLabel ?? undefined, panelSaveToLibrary.checked);
    panelTextInput.value = "";
    panelLastFileLabel = null;
    panelSaveToLibrary.checked = false;
    setPanelFileStatus("");
  }

  async function handlePanelFile(file: File): Promise<void> {
    const lower = file.name.toLowerCase();
    if (!PANEL_SUPPORTED_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
      setPanelFileStatus(`Formato no soportado: ${file.name}`, true);
      return;
    }
    setPanelFileStatus(`Leyendo ${file.name}…`);
    try {
      const path = window.flashread.getPathForFile(file);
      const text = await window.flashread.extractFileText(path);
      panelTextInput.value = text;
      panelLastFileLabel = file.name;
      setPanelFileStatus(`Listo: ${file.name} (${text.length} caracteres)`);
    } catch (err) {
      setPanelFileStatus(`Error al leer ${file.name}: ${(err as Error).message}`, true);
    }
  }

  panelBtnRead.addEventListener("click", startPanelReading);

  panelTextInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      startPanelReading();
    }
  });

  panelTextInput.addEventListener("input", () => {
    panelLastFileLabel = null;
  });

  ["dragenter", "dragover"].forEach((evt) => {
    panelDropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      panelDropzone.classList.add("drag-over");
    });
  });

  ["dragleave", "drop"].forEach((evt) => {
    panelDropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      panelDropzone.classList.remove("drag-over");
    });
  });

  panelDropzone.addEventListener("drop", (e) => {
    const file = e.dataTransfer?.files?.[0];
    if (file) void handlePanelFile(file);
  });

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

  async function refreshPanelLibrary(): Promise<void> {
    const items = await window.flashread.getLibrary();
    panelLibraryList.innerHTML = "";
    panelLibraryEmpty.style.display = items.length === 0 ? "block" : "none";
    for (const item of items) {
      const row = buildItemRow(item.title, `${formatDate(item.addedAt)} · ${sourceLabelText(item.sourceType)}`, [
        { label: "Leer", onClick: () => window.flashread.openFromLibrary(item.id) },
        {
          label: "Quitar",
          className: "btn-remove",
          onClick: () => {
            window.flashread.removeFromLibrary(item.id);
            void refreshPanelLibrary();
          },
        },
      ]);
      panelLibraryList.appendChild(row);
    }
  }

  async function refreshPanelHistory(): Promise<void> {
    const entries = await window.flashread.getHistory();
    panelHistoryList.innerHTML = "";
    panelHistoryEmpty.style.display = entries.length === 0 ? "block" : "none";
    for (const entry of entries) {
      const row = buildItemRow(entry.title, `${formatDate(entry.readAt)} · ${sourceLabelText(entry.sourceType)}`, [
        { label: "Leer", onClick: () => window.flashread.openFromHistory(entry.id) },
        {
          label: "Guardar",
          onClick: (btn) => {
            btn.disabled = true;
            void window.flashread.addHistoryEntryToLibrary(entry.id).then(() => {
              btn.textContent = "OK";
            });
          },
        },
        {
          label: "Quitar",
          className: "btn-remove",
          onClick: () => {
            window.flashread.removeHistoryEntry(entry.id);
            void refreshPanelHistory();
          },
        },
      ]);
      panelHistoryList.appendChild(row);
    }
  }

  panelBtnClearHistory.addEventListener("click", () => {
    window.flashread.clearHistory();
    void refreshPanelHistory();
  });

  function jumpToChunk(target: number): void {
    if (chunks.length === 0) return;
    index = Math.max(0, Math.min(target, chunks.length - 1));
    renderChunk();
    if (playing) scheduleNext();
  }

  function currentParagraphIdx(): number {
    return paragraphs.findIndex((r) => index >= r.startChunkIndex && index <= r.endChunkIndex);
  }

  function nextParagraph(): void {
    const cur = currentParagraphIdx();
    const target = cur >= 0 && cur < paragraphs.length - 1 ? paragraphs[cur + 1].startChunkIndex : chunks.length - 1;
    jumpToChunk(target);
  }

  function prevParagraph(): void {
    const cur = currentParagraphIdx();
    if (cur < 0) return;
    const atStart = index <= paragraphs[cur].startChunkIndex;
    const target = atStart && cur > 0 ? paragraphs[cur - 1].startChunkIndex : paragraphs[cur].startChunkIndex;
    jumpToChunk(target);
  }

  function buildRemainingSuffix(): void {
    remainingMsSuffix = new Array(chunks.length + 1);
    remainingMsSuffix[chunks.length] = 0;
    const msPerWord = 60000 / settings.wpm;
    for (let i = chunks.length - 1; i >= 0; i--) {
      const delay = msPerWord * chunks[i].wordCount * chunks[i].pauseMultiplier;
      remainingMsSuffix[i] = delay + remainingMsSuffix[i + 1];
    }
  }

  function formatHms(ms: number): string {
    const totalSeconds = Math.max(0, Math.round(ms / 1000));
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }

  function updateTimerDisplay(): void {
    timerDisplay.textContent = formatHms(remainingMsSuffix[index] ?? 0);
  }

  function renderChunk(): void {
    const chunk = chunks[index];
    if (!chunk) return;
    const { display, orpIndex } = chunk;
    wordPre.textContent = display.slice(0, orpIndex);
    wordOrp.textContent = display.slice(orpIndex, orpIndex + 1);
    wordPost.textContent = display.slice(orpIndex + 1);

    const denom = chunks.length > 1 ? chunks.length - 1 : 1;
    const pct = (index / denom) * 100;
    progressFill.style.width = pct + "%";

    updatePanelHighlight();
    updateTimerDisplay();
  }

  function clearTimer(): void {
    if (timer !== null) {
      window.clearTimeout(timer);
      timer = null;
    }
  }

  function scheduleNext(): void {
    clearTimer();
    if (!playing) return;
    const chunk = chunks[index];
    if (!chunk) {
      pause();
      return;
    }
    const msPerWord = 60000 / settings.wpm;
    const delay = msPerWord * chunk.wordCount * chunk.pauseMultiplier;

    timer = window.setTimeout(() => {
      if (index < chunks.length - 1) {
        index++;
        renderChunk();
        scheduleNext();
      } else {
        pause();
      }
    }, delay);
  }

  function play(): void {
    if (chunks.length === 0) return;
    if (index >= chunks.length - 1) index = 0;
    playing = true;
    btnPlay.textContent = "⏸";
    renderChunk();
    scheduleNext();
  }

  function pause(): void {
    playing = false;
    btnPlay.textContent = "▶";
    clearTimer();
  }

  function toggle(): void {
    if (playing) pause();
    else play();
  }

  function next(): void {
    pause();
    if (index < chunks.length - 1) {
      index++;
      renderChunk();
    }
  }

  function prev(): void {
    pause();
    if (index > 0) {
      index--;
      renderChunk();
    }
  }

  function changeWpm(delta: number): void {
    settings.wpm = Math.max(100, Math.min(1000, settings.wpm + delta));
    wpmValueEl.textContent = String(settings.wpm);
    window.flashread.updateWpm(settings.wpm);
    buildRemainingSuffix();
    updateTimerDisplay();
    if (playing) scheduleNext();
  }

  function loadPayload(payload: LoadPayload, resetPosition: boolean): void {
    const wasPlaying = playing;
    pause();
    chunks = payload.chunks;
    paragraphs = payload.paragraphs;
    settings = payload.settings;
    if (resetPosition || index >= chunks.length) index = 0;
    applyStyles();
    applyPanelVisibility(settings.showTextPanel);
    buildPanel();
    buildRemainingSuffix();
    renderChunk();
    if (resetPosition) switchPanelTab("text");
    if (resetPosition || wasPlaying) play();
  }

  window.flashread.onLoadText((payload) => loadPayload(payload, true));
  window.flashread.onSettingsUpdated((payload) => loadPayload(payload, false));

  window.addEventListener("focus", () => {
    const active = panelTabButtons.find((btn) => btn.classList.contains("active"));
    if (active?.dataset.panelTab === "library") void refreshPanelLibrary();
    if (active?.dataset.panelTab === "history") void refreshPanelHistory();
  });
  window.flashread.onPanelVisibility(({ showTextPanel }) => applyPanelVisibility(showTextPanel));
  window.flashread.onFocusNewTab(() => {
    applyPanelVisibility(true);
    switchPanelTab("new");
    panelTextInput.focus();
  });

  btnPlay.addEventListener("click", toggle);
  document.getElementById("btn-next")!.addEventListener("click", next);
  document.getElementById("btn-prev")!.addEventListener("click", prev);
  document.getElementById("btn-next-paragraph")!.addEventListener("click", nextParagraph);
  document.getElementById("btn-prev-paragraph")!.addEventListener("click", prevParagraph);
  document.getElementById("btn-wpm-up")!.addEventListener("click", () => changeWpm(25));
  document.getElementById("btn-wpm-down")!.addEventListener("click", () => changeWpm(-25));
  document.getElementById("btn-settings")!.addEventListener("click", () => window.flashread.openSettings());
  btnTogglePanel.addEventListener("click", () => window.flashread.togglePanel());
  document.getElementById("btn-window-minimize")!.addEventListener("click", () => window.flashread.minimizeReader());
  document.getElementById("btn-window-close")!.addEventListener("click", () => window.flashread.closeReader());

  document.getElementById("btn-toggle-controls")!.addEventListener("click", () => {
    controls.classList.add("hidden");
    btnShowControls.classList.add("visible");
  });
  btnShowControls.addEventListener("click", () => {
    controls.classList.remove("hidden");
    btnShowControls.classList.remove("visible");
  });

  window.addEventListener("keydown", (e) => {
    switch (e.code) {
      case "Space":
        e.preventDefault();
        toggle();
        break;
      case "ArrowRight":
        e.preventDefault();
        if (e.shiftKey) nextParagraph();
        else next();
        break;
      case "ArrowLeft":
        e.preventDefault();
        if (e.shiftKey) prevParagraph();
        else prev();
        break;
      case "ArrowUp":
        e.preventDefault();
        changeWpm(25);
        break;
      case "ArrowDown":
        e.preventDefault();
        changeWpm(-25);
        break;
      case "KeyT":
        window.flashread.togglePanel();
        break;
      case "Escape":
        window.flashread.closeReader();
        break;
    }
  });

  applyStyles();
})();
