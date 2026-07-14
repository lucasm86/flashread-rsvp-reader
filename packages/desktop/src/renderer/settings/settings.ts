interface ReaderSettingsForm {
  wpm: number;
  chunkSize: number;
  usePunctuationPauses: boolean;
  sentencePauseMultiplier: number;
  commaPauseMultiplier: number;
  fontSize: number;
  fontFamily: string;
  textColor: string;
  orpColor: string;
  backgroundColor: string;
  alwaysOnTop: boolean;
  globalShortcut: string;
  showTextPanel: boolean;
  convertToMarkdown: boolean;
}

type FileAssocStatus = "unregistered" | "registered" | "stale";

interface FileAssocState {
  supported: boolean;
  status: FileAssocStatus;
}

interface UpdateCheckResult {
  status: "up-to-date" | "update-available" | "error";
  message: string;
}

interface FlashReadSettingsAPI {
  getSettings: () => Promise<ReaderSettingsForm>;
  updateSettings: (partial: Partial<ReaderSettingsForm>) => Promise<ReaderSettingsForm>;
  getFileAssocStatus: () => Promise<FileAssocState>;
  registerFileAssoc: () => Promise<FileAssocState>;
  unregisterFileAssoc: () => Promise<FileAssocState>;
  getAppVersion: () => Promise<string>;
  checkForUpdates: () => Promise<UpdateCheckResult>;
}

interface Window {
  flashreadSettings: FlashReadSettingsAPI;
}

(function () {
  const form = document.getElementById("settings-form") as HTMLFormElement;
  const saveStatus = document.getElementById("save-status") as HTMLSpanElement;

  const fields = {
    wpm: document.getElementById("wpm") as HTMLInputElement,
    chunkSize: document.getElementById("chunkSize") as HTMLSelectElement,
    usePunctuationPauses: document.getElementById("usePunctuationPauses") as HTMLInputElement,
    sentencePauseMultiplier: document.getElementById("sentencePauseMultiplier") as HTMLInputElement,
    commaPauseMultiplier: document.getElementById("commaPauseMultiplier") as HTMLInputElement,
    fontSize: document.getElementById("fontSize") as HTMLInputElement,
    fontFamily: document.getElementById("fontFamily") as HTMLInputElement,
    textColor: document.getElementById("textColor") as HTMLInputElement,
    orpColor: document.getElementById("orpColor") as HTMLInputElement,
    backgroundColor: document.getElementById("backgroundColor") as HTMLInputElement,
    alwaysOnTop: document.getElementById("alwaysOnTop") as HTMLInputElement,
    globalShortcut: document.getElementById("globalShortcut") as HTMLInputElement,
    showTextPanel: document.getElementById("showTextPanel") as HTMLInputElement,
    convertToMarkdown: document.getElementById("convertToMarkdown") as HTMLInputElement,
  };

  function populate(settings: ReaderSettingsForm): void {
    fields.wpm.value = String(settings.wpm);
    fields.chunkSize.value = String(settings.chunkSize);
    fields.usePunctuationPauses.checked = settings.usePunctuationPauses;
    fields.sentencePauseMultiplier.value = String(settings.sentencePauseMultiplier);
    fields.commaPauseMultiplier.value = String(settings.commaPauseMultiplier);
    fields.fontSize.value = String(settings.fontSize);
    fields.fontFamily.value = settings.fontFamily;
    fields.textColor.value = settings.textColor;
    fields.orpColor.value = settings.orpColor;
    fields.backgroundColor.value = settings.backgroundColor;
    fields.alwaysOnTop.checked = settings.alwaysOnTop;
    fields.globalShortcut.value = settings.globalShortcut;
    fields.showTextPanel.checked = settings.showTextPanel;
    fields.convertToMarkdown.checked = settings.convertToMarkdown;
  }

  function readForm(): Partial<ReaderSettingsForm> {
    return {
      wpm: Number(fields.wpm.value) || 300,
      chunkSize: Number(fields.chunkSize.value) as 1 | 2 | 3,
      usePunctuationPauses: fields.usePunctuationPauses.checked,
      sentencePauseMultiplier: Number(fields.sentencePauseMultiplier.value) || 2.5,
      commaPauseMultiplier: Number(fields.commaPauseMultiplier.value) || 1.6,
      fontSize: Number(fields.fontSize.value) || 48,
      fontFamily: fields.fontFamily.value || "Segoe UI, sans-serif",
      textColor: fields.textColor.value,
      orpColor: fields.orpColor.value,
      backgroundColor: fields.backgroundColor.value,
      alwaysOnTop: fields.alwaysOnTop.checked,
      globalShortcut: fields.globalShortcut.value || "CommandOrControl+Alt+R",
      showTextPanel: fields.showTextPanel.checked,
      convertToMarkdown: fields.convertToMarkdown.checked,
    };
  }

  window.flashreadSettings.getSettings().then(populate);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const updated = await window.flashreadSettings.updateSettings(readForm());
    populate(updated);
    saveStatus.textContent = "Guardado ✓";
    saveStatus.classList.add("visible");
    window.setTimeout(() => saveStatus.classList.remove("visible"), 1500);
  });

  const fileAssocStatus = document.getElementById("fileAssocStatus") as HTMLParagraphElement;
  const fileAssocRegisterBtn = document.getElementById("fileAssocRegisterBtn") as HTMLButtonElement;
  const fileAssocUnregisterBtn = document.getElementById("fileAssocUnregisterBtn") as HTMLButtonElement;

  function renderFileAssocState(state: FileAssocState): void {
    if (!state.supported) {
      fileAssocStatus.textContent = "Solo disponible en la versión empaquetada (.exe); no en modo desarrollo.";
      fileAssocRegisterBtn.disabled = true;
      fileAssocUnregisterBtn.disabled = true;
      return;
    }
    fileAssocRegisterBtn.disabled = false;
    fileAssocUnregisterBtn.disabled = state.status === "unregistered";
    if (state.status === "registered") {
      fileAssocStatus.textContent = "Registrado para esta instalación.";
    } else if (state.status === "stale") {
      fileAssocStatus.textContent = "Registrado, pero apuntando a otra ubicación del .exe — volvé a registrar.";
    } else {
      fileAssocStatus.textContent = "No registrado todavía.";
    }
  }

  window.flashreadSettings.getFileAssocStatus().then(renderFileAssocState);

  fileAssocRegisterBtn.addEventListener("click", async () => {
    fileAssocRegisterBtn.disabled = true;
    try {
      renderFileAssocState(await window.flashreadSettings.registerFileAssoc());
    } catch (err) {
      fileAssocStatus.textContent = `Error al registrar: ${(err as Error).message}`;
      fileAssocRegisterBtn.disabled = false;
    }
  });

  fileAssocUnregisterBtn.addEventListener("click", async () => {
    fileAssocUnregisterBtn.disabled = true;
    try {
      renderFileAssocState(await window.flashreadSettings.unregisterFileAssoc());
    } catch (err) {
      fileAssocStatus.textContent = `Error al quitar el registro: ${(err as Error).message}`;
      fileAssocUnregisterBtn.disabled = false;
    }
  });

  const appVersionEl = document.getElementById("appVersion") as HTMLSpanElement;
  const updateStatus = document.getElementById("updateStatus") as HTMLParagraphElement;
  const checkUpdatesBtn = document.getElementById("checkUpdatesBtn") as HTMLButtonElement;

  window.flashreadSettings.getAppVersion().then((v) => (appVersionEl.textContent = v));

  checkUpdatesBtn.addEventListener("click", async () => {
    checkUpdatesBtn.disabled = true;
    updateStatus.textContent = "Buscando…";
    try {
      const result = await window.flashreadSettings.checkForUpdates();
      updateStatus.textContent = result.message;
    } catch (err) {
      updateStatus.textContent = `Error: ${(err as Error).message}`;
    } finally {
      checkUpdatesBtn.disabled = false;
    }
  });
})();
