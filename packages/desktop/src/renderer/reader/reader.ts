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

interface FlashReadReaderAPI {
  onLoadText: (cb: (payload: LoadPayload) => void) => void;
  onSettingsUpdated: (cb: (payload: LoadPayload) => void) => void;
  onPanelVisibility: (cb: (payload: { showTextPanel: boolean }) => void) => void;
  updateWpm: (wpm: number) => void;
  togglePanel: () => void;
  openSettings: () => void;
  closeReader: () => void;
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
  const controls = document.getElementById("controls") as HTMLDivElement;
  const btnShowControls = document.getElementById("btn-show-controls") as HTMLButtonElement;
  const textPanel = document.getElementById("text-panel") as HTMLDivElement;
  const textPanelContent = document.getElementById("text-panel-content") as HTMLDivElement;
  const btnTogglePanel = document.getElementById("btn-toggle-panel") as HTMLButtonElement;

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

  function jumpToChunk(target: number): void {
    if (chunks.length === 0) return;
    index = Math.max(0, Math.min(target, chunks.length - 1));
    renderChunk();
    if (playing) scheduleNext();
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
    renderChunk();
    if (resetPosition || wasPlaying) play();
  }

  window.flashread.onLoadText((payload) => loadPayload(payload, true));
  window.flashread.onSettingsUpdated((payload) => loadPayload(payload, false));
  window.flashread.onPanelVisibility(({ showTextPanel }) => applyPanelVisibility(showTextPanel));

  btnPlay.addEventListener("click", toggle);
  document.getElementById("btn-next")!.addEventListener("click", next);
  document.getElementById("btn-prev")!.addEventListener("click", prev);
  document.getElementById("btn-wpm-up")!.addEventListener("click", () => changeWpm(25));
  document.getElementById("btn-wpm-down")!.addEventListener("click", () => changeWpm(-25));
  document.getElementById("btn-settings")!.addEventListener("click", () => window.flashread.openSettings());
  btnTogglePanel.addEventListener("click", () => window.flashread.togglePanel());

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
        next();
        break;
      case "ArrowLeft":
        e.preventDefault();
        prev();
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
