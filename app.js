const STORAGE_KEY = "golden-pagoda-level-counter-v1";

const DEFAULT_LEVEL_LABELS = [
  "ခုနှစ် သရက် ကုန်း",
  "ငါး သရက် ကုန်း",
  "သုံး သရက် ကုန်း",
  "ကတိဗ္ဗာ တတိယ အဆင့်",
  "သပိတ်ခံ",
  "သုံးဆင့်တန်း",
  "စိန်တောင်",
  "သပိတ်",
  "ခေါင်းလောင်း",
  "အထက်ဌာန ပုံသဏ္ဌာန်",
  "သပိတ်မှောက်",
  "ပန်းချီ",
  "ဘားတန်း",
  "ရင်ဖုံး အဆင့်",
  "ရင်ဖုံး အုပ်",
  "ငှက်မြတ်နား",
];

const DEFAULT_STATE = {
  projectName: "ပုတီး စေတီ Counter",
  note: "အဆင့်ပြည့်လျှင် စေတီ ၁ ဆူ ပြီးမြောက်သည်",
  levelsPerPagoda: 16,
  targetPagodas: 1,
  levelStep: 1,
  levelLabels: DEFAULT_LEVEL_LABELS,
  currentLevel: 0,
  completedPagodas: 0,
  history: [],
};

let state = loadState();
let saveTimer = 0;

const elements = {
  projectTitle: document.querySelector("#projectTitle"),
  noteLine: document.querySelector("#noteLine"),
  currentLevelText: document.querySelector("#currentLevelText"),
  completedPagodasText: document.querySelector("#completedPagodasText"),
  totalLevelsText: document.querySelector("#totalLevelsText"),
  pagodaVisual: document.querySelector("#pagodaVisual"),
  progressText: document.querySelector("#progressText"),
  onePagodaText: document.querySelector("#onePagodaText"),
  levelProgressText: document.querySelector("#levelProgressText"),
  levelGrid: document.querySelector("#levelGrid"),
  projectNameInput: document.querySelector("#projectNameInput"),
  noteInput: document.querySelector("#noteInput"),
  levelsPerPagodaInput: document.querySelector("#levelsPerPagodaInput"),
  targetPagodasInput: document.querySelector("#targetPagodasInput"),
  levelStepInput: document.querySelector("#levelStepInput"),
  sectionLabelsInput: document.querySelector("#sectionLabelsInput"),
  saveState: document.querySelector("#saveState"),
  targetPagodasReport: document.querySelector("#targetPagodasReport"),
  targetProgressReport: document.querySelector("#targetProgressReport"),
  reportCurrentLevel: document.querySelector("#reportCurrentLevel"),
  reportPagodas: document.querySelector("#reportPagodas"),
  reportTotalLevels: document.querySelector("#reportTotalLevels"),
  reportCurrentProgress: document.querySelector("#reportCurrentProgress"),
  historyList: document.querySelector("#historyList"),
};

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => switchPanel(tab.dataset.panel));
});

document.querySelector("#tapButton").addEventListener("click", () => incrementLevels(state.levelStep));
document.querySelector("#incrementBtn").addEventListener("click", () => incrementLevels(state.levelStep));
document.querySelector("#decrementBtn").addEventListener("click", decrementLevel);
document.querySelector("#completePagodaBtn").addEventListener("click", completePagoda);
document.querySelector("#resetCurrentBtn").addEventListener("click", resetCurrentPagoda);
document.querySelector("#resetAllBtn").addEventListener("click", resetAll);
document.querySelector("#exportBtn").addEventListener("click", exportReportPng);
document.querySelector("#copySummaryBtn").addEventListener("click", copySummary);
document.querySelector("#clearHistoryBtn").addEventListener("click", clearHistory);

elements.pagodaVisual.addEventListener("click", () => incrementLevels(state.levelStep));
elements.pagodaVisual.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  incrementLevels(state.levelStep);
});

document.addEventListener("keydown", (event) => {
  const tagName = document.activeElement?.tagName;
  const isTyping = tagName === "INPUT" || tagName === "TEXTAREA";
  if (isTyping || event.key !== " ") return;
  event.preventDefault();
  incrementLevels(state.levelStep);
});

elements.projectNameInput.addEventListener("input", (event) => {
  state.projectName = event.target.value.trimStart() || DEFAULT_STATE.projectName;
  commitState();
});

elements.noteInput.addEventListener("input", (event) => {
  state.note = event.target.value.trimStart();
  commitState();
});

elements.levelsPerPagodaInput.addEventListener("input", (event) => {
  state.levelsPerPagoda = clamp(toNumber(event.target.value, DEFAULT_STATE.levelsPerPagoda), 1, 100);
  state.currentLevel = Math.min(state.currentLevel, state.levelsPerPagoda - 1);
  state.levelStep = Math.min(state.levelStep, state.levelsPerPagoda);
  commitState();
});

elements.targetPagodasInput.addEventListener("input", (event) => {
  state.targetPagodas = Math.max(0, toNumber(event.target.value, 0));
  commitState();
});

elements.levelStepInput.addEventListener("input", (event) => {
  state.levelStep = clamp(toNumber(event.target.value, 1), 1, state.levelsPerPagoda);
  commitState();
});

elements.sectionLabelsInput.addEventListener("input", (event) => {
  state.levelLabels = normalizeLevelLabels(event.target.value.split(/\r?\n/));
  commitState();
});

render();

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return { ...DEFAULT_STATE };

    return {
      projectName: saved.projectName || DEFAULT_STATE.projectName,
      note: saved.note ?? DEFAULT_STATE.note,
      levelsPerPagoda: clamp(toNumber(saved.levelsPerPagoda, DEFAULT_STATE.levelsPerPagoda), 1, 100),
      targetPagodas: Math.max(0, toNumber(saved.targetPagodas, DEFAULT_STATE.targetPagodas)),
      levelStep: clamp(toNumber(saved.levelStep, 1), 1, 100),
      levelLabels: normalizeLevelLabels(saved.levelLabels),
      currentLevel: Math.max(0, toNumber(saved.currentLevel, 0)),
      completedPagodas: Math.max(0, toNumber(saved.completedPagodas, 0)),
      history: Array.isArray(saved.history) ? saved.history.slice(0, 30) : [],
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function commitState() {
  saveState();
  render();
}

function saveState() {
  window.clearTimeout(saveTimer);
  elements.saveState.textContent = "Saving";
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  saveTimer = window.setTimeout(() => {
    elements.saveState.textContent = "Saved";
  }, 220);
}

function incrementLevels(step) {
  const count = clamp(toNumber(step, 1), 1, state.levelsPerPagoda);

  for (let index = 0; index < count; index += 1) {
    state.currentLevel += 1;
    if (state.currentLevel >= state.levelsPerPagoda) {
      state.currentLevel = 0;
      state.completedPagodas += 1;
      addHistory();
    }
  }

  commitState();
}

function decrementLevel() {
  if (state.currentLevel > 0) {
    state.currentLevel -= 1;
    commitState();
    return;
  }

  if (state.completedPagodas <= 0) return;

  state.completedPagodas -= 1;
  state.currentLevel = state.levelsPerPagoda - 1;
  state.history.shift();
  commitState();
}

function completePagoda() {
  state.currentLevel = 0;
  state.completedPagodas += 1;
  addHistory();
  commitState();
}

function resetCurrentPagoda() {
  if (!window.confirm("Reset current pagoda level count? Completed pagodas will stay.")) return;
  state.currentLevel = 0;
  commitState();
}

function resetAll() {
  if (!window.confirm("Reset all level and pagoda counts?")) return;
  state.currentLevel = 0;
  state.completedPagodas = 0;
  state.history = [];
  commitState();
}

function clearHistory() {
  state.history = [];
  commitState();
}

function addHistory() {
  state.history.unshift({
    pagoda: state.completedPagodas,
    levels: state.levelsPerPagoda,
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  });
  state.history = state.history.slice(0, 30);
}

function render() {
  const totalLevels = getTotalLevels();
  const currentProgress = getCurrentPagodaProgress();
  const targetProgress = getTargetProgress();

  elements.projectTitle.textContent = state.projectName;
  elements.noteLine.textContent = state.note || DEFAULT_STATE.note;
  elements.currentLevelText.textContent = `${formatNumber(state.currentLevel)} / ${formatNumber(state.levelsPerPagoda)}`;
  elements.completedPagodasText.textContent = formatNumber(state.completedPagodas);
  elements.totalLevelsText.textContent = formatNumber(totalLevels);
  elements.progressText.textContent = `${formatNumber(state.currentLevel)} of ${formatNumber(state.levelsPerPagoda)} levels in this pagoda`;
  elements.onePagodaText.textContent = `${formatNumber(state.levelsPerPagoda)} levels`;
  elements.levelProgressText.textContent = `${formatNumber(state.currentLevel)} / ${formatNumber(state.levelsPerPagoda)} levels`;

  elements.projectNameInput.value = state.projectName;
  elements.noteInput.value = state.note;
  elements.levelsPerPagodaInput.value = state.levelsPerPagoda;
  elements.targetPagodasInput.value = state.targetPagodas;
  elements.levelStepInput.value = state.levelStep;
  elements.levelStepInput.max = state.levelsPerPagoda;
  if (document.activeElement !== elements.sectionLabelsInput) {
    elements.sectionLabelsInput.value = state.levelLabels.join("\n");
  }

  elements.targetPagodasReport.textContent = state.targetPagodas ? formatNumber(state.targetPagodas) : "No target";
  elements.targetProgressReport.textContent = state.targetPagodas ? `${targetProgress}%` : "-";
  elements.reportCurrentLevel.textContent = `${formatNumber(state.currentLevel)} / ${formatNumber(state.levelsPerPagoda)}`;
  elements.reportPagodas.textContent = formatNumber(state.completedPagodas);
  elements.reportTotalLevels.textContent = formatNumber(totalLevels);
  elements.reportCurrentProgress.textContent = `${currentProgress}%`;

  renderPagoda();
  renderLevelGrid();
  renderHistory();
}

function renderPagoda() {
  const fragment = document.createDocumentFragment();
  const levelCount = state.levelsPerPagoda;
  const topToBottom = Array.from({ length: levelCount }, (_, index) => levelCount - index);

  topToBottom.forEach((levelFromBottom, index) => {
    const layer = document.createElement("div");
    const config = getLayerConfig(levelFromBottom, index, levelCount);
    const label = getLevelLabel(levelFromBottom);
    const isFilled = levelFromBottom <= state.currentLevel;

    layer.className = `pagoda-layer pagoda-layer--${config.type}${isFilled ? " is-filled" : ""}`;
    layer.style.setProperty("--w", `${config.width}%`);
    layer.style.setProperty("--h", `${config.height}px`);
    layer.style.setProperty("--delay", `${index * 18}ms`);
    layer.title = `${label} - Level ${levelFromBottom}`;
    layer.innerHTML = `
      <span class="pagoda-label">${escapeHtml(label)}</span>
    `;
    fragment.append(layer);
  });

  elements.pagodaVisual.replaceChildren(fragment);
}

function renderLevelGrid() {
  const fragment = document.createDocumentFragment();

  for (let level = 1; level <= state.levelsPerPagoda; level += 1) {
    const tile = document.createElement("article");
    tile.className = "level-tile";
    tile.classList.toggle("is-complete", level <= state.currentLevel);
    tile.classList.toggle("is-active", level === state.currentLevel + 1 && state.currentLevel < state.levelsPerPagoda);
    tile.innerHTML = `
      <strong>${formatNumber(level)}</strong>
      <span>${escapeHtml(getLevelLabel(level))}</span>
    `;
    fragment.append(tile);
  }

  elements.levelGrid.replaceChildren(fragment);
}

function renderHistory() {
  if (!state.history.length) {
    elements.historyList.innerHTML = `<div class="empty-history">No completed pagodas yet</div>`;
    return;
  }

  const fragment = document.createDocumentFragment();
  state.history.forEach((item) => {
    const row = document.createElement("article");
    row.className = "history-item";
    row.innerHTML = `
      <span>${escapeHtml(item.time || "")}</span>
      <strong>Pagoda ${formatNumber(item.pagoda)} · ${formatNumber(item.levels)} levels</strong>
    `;
    fragment.append(row);
  });
  elements.historyList.replaceChildren(fragment);
}

function switchPanel(panelName) {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.panel === panelName);
  });

  document.querySelectorAll(".panel-view").forEach((panel) => {
    panel.classList.toggle("is-active", panel.id === `${panelName}Panel`);
  });
}

async function copySummary() {
  const summary = buildSummaryText();
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(summary);
  } else {
    const textarea = document.createElement("textarea");
    textarea.value = summary;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }

  const button = document.querySelector("#copySummaryBtn");
  const original = button.textContent;
  button.textContent = "Copied";
  window.setTimeout(() => {
    button.textContent = original;
  }, 900);
}

function buildSummaryText() {
  return [
    state.projectName,
    state.note,
    `Current level: ${state.currentLevel} / ${state.levelsPerPagoda}`,
    `Current section: ${state.currentLevel ? getLevelLabel(state.currentLevel) : "-"}`,
    `Completed pagodas: ${state.completedPagodas}`,
    `Total levels counted: ${getTotalLevels()}`,
    `Target pagodas: ${state.targetPagodas || "No target"}`,
    `Target progress: ${state.targetPagodas ? `${getTargetProgress()}%` : "-"}`,
  ].join("\n");
}

function exportReportPng() {
  const canvas = document.createElement("canvas");
  const width = 1080;
  const height = 1350;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  const goldGradient = ctx.createLinearGradient(0, 0, width, height);
  goldGradient.addColorStop(0, "#fff8dc");
  goldGradient.addColorStop(0.48, "#f7d86d");
  goldGradient.addColorStop(1, "#b66f06");

  ctx.fillStyle = "#fffaf0";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#17130a";
  ctx.font = '800 52px "Myanmar Text", Arial, sans-serif';
  drawWrappedText(ctx, state.projectName, 70, 95, 940, 58);

  ctx.fillStyle = "#6d5a22";
  ctx.font = '700 28px "Myanmar Text", Arial, sans-serif';
  drawWrappedText(ctx, state.note || DEFAULT_STATE.note, 70, 175, 940, 36);

  drawExportPagoda(ctx, 180, 260, 720, 570, goldGradient);
  drawExportMetrics(ctx, 70, 900, 940);

  const link = document.createElement("a");
  link.download = `golden-pagoda-counter-${getTodayKey()}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function drawExportPagoda(ctx, x, y, width, height, fillStyle) {
  const levels = state.levelsPerPagoda;
  const gap = 4;
  const topToBottom = Array.from({ length: levels }, (_, index) => levels - index);
  const totalUnitHeight = topToBottom.reduce((sum, levelFromBottom, index) => {
    return sum + getLayerConfig(levelFromBottom, index, levels).height;
  }, 0);
  const scale = (height - levels * gap) / totalUnitHeight;

  ctx.save();
  ctx.translate(x, y);

  let layerY = 0;
  for (let index = 0; index < topToBottom.length; index += 1) {
    const levelFromBottom = topToBottom[index];
    const config = getLayerConfig(levelFromBottom, index, levels);
    const layerWidth = width * (config.width / 100);
    const layerHeight = Math.max(18, config.height * scale);
    const layerX = (width - layerWidth) / 2;
    const filled = levelFromBottom <= state.currentLevel;
    const label = getLevelLabel(levelFromBottom);
    const isSharp = config.type === "spire" || config.type === "upper";

    if (isSharp) {
      trapezoid(ctx, layerX, layerY, layerWidth, layerHeight, filled ? fillStyle : "#f0d17a", "#b98518");
    } else {
      roundedRect(ctx, layerX, layerY, layerWidth, layerHeight, 10, filled ? fillStyle : "#ead09a", "#b98518");
    }

    ctx.fillStyle = filled ? "#2d1c05" : "#80642a";
    ctx.font = `800 ${layerHeight < 28 ? 17 : 21}px "Myanmar Text", Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    drawCenteredWrappedText(ctx, label, width / 2, layerY + layerHeight / 2, Math.max(40, layerWidth - 22), layerHeight < 34 ? 18 : 23);
    layerY += layerHeight + gap;
  }

  ctx.restore();
  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";
}

function drawExportMetrics(ctx, x, y, width) {
  const items = [
    ["Current level", `${formatNumber(state.currentLevel)} / ${formatNumber(state.levelsPerPagoda)}`],
    ["Completed pagodas", formatNumber(state.completedPagodas)],
    ["Total levels counted", formatNumber(getTotalLevels())],
    ["Target pagodas", state.targetPagodas ? formatNumber(state.targetPagodas) : "No target"],
    ["Target progress", state.targetPagodas ? `${getTargetProgress()}%` : "-"],
  ];

  const rowHeight = 74;
  items.forEach(([label, value], index) => {
    const rowY = y + index * rowHeight;
    roundedRect(ctx, x, rowY, width, 54, 8, "#ffffff", "#dfc576");
    ctx.fillStyle = "#6d5a22";
    ctx.font = '700 22px "Segoe UI", Arial, sans-serif';
    ctx.fillText(label, x + 24, rowY + 35);
    ctx.fillStyle = "#9a6408";
    ctx.font = '900 27px "Myanmar Text", Arial, sans-serif';
    ctx.textAlign = "right";
    ctx.fillText(value, x + width - 24, rowY + 36);
    ctx.textAlign = "start";
  });
}

function getTotalLevels() {
  return state.completedPagodas * state.levelsPerPagoda + state.currentLevel;
}

function getCurrentPagodaProgress() {
  return Math.round((state.currentLevel / state.levelsPerPagoda) * 100);
}

function getTargetProgress() {
  if (!state.targetPagodas) return 0;
  const targetLevels = state.targetPagodas * state.levelsPerPagoda;
  return Math.min(100, Math.round((getTotalLevels() / targetLevels) * 100));
}

function roundedRect(ctx, x, y, width, height, radius, fill, stroke) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.lineTo(x + width - safeRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  ctx.lineTo(x + width, y + height - safeRadius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  ctx.lineTo(x + safeRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  ctx.lineTo(x, y + safeRadius);
  ctx.quadraticCurveTo(x, y, x + safeRadius, y);
  ctx.closePath();

  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }

  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function trapezoid(ctx, x, y, width, height, fill, stroke) {
  const shoulder = Math.min(width * 0.18, 30);
  ctx.beginPath();
  ctx.moveTo(x + shoulder, y);
  ctx.lineTo(x + width - shoulder, y);
  ctx.lineTo(x + width, y + height);
  ctx.lineTo(x, y + height);
  ctx.closePath();

  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }

  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text).split(/\s+/);
  let line = "";
  let currentY = y;

  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = word;
      currentY += lineHeight;
    } else {
      line = candidate;
    }
  });

  if (line) ctx.fillText(line, x, currentY);
}

function drawCenteredWrappedText(ctx, text, centerX, centerY, maxWidth, lineHeight) {
  const lines = [];
  const words = String(text).split(/\s+/).filter(Boolean);
  let line = "";

  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  });

  if (line) lines.push(line);

  const firstY = centerY - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((wrappedLine, index) => {
    ctx.fillText(wrappedLine, centerX, firstY + index * lineHeight);
  });
}

function getLevelLabel(levelFromBottom) {
  const normalizedLevel = Math.max(1, Math.round(toNumber(levelFromBottom, 1)));
  return state.levelLabels[normalizedLevel - 1] || `အဆင့် ${formatNumber(normalizedLevel)}`;
}

function normalizeLevelLabels(labels) {
  const savedLabels = Array.isArray(labels) ? labels : [];
  const cleanLabels = savedLabels.map((label) => String(label || "").trim());
  const nextLabels = DEFAULT_LEVEL_LABELS.map((label, index) => cleanLabels[index] || label);

  cleanLabels.slice(DEFAULT_LEVEL_LABELS.length).forEach((label, index) => {
    nextLabels[DEFAULT_LEVEL_LABELS.length + index] = label || `အဆင့် ${formatNumber(DEFAULT_LEVEL_LABELS.length + index + 1)}`;
  });

  return nextLabels;
}

function getLayerConfig(levelFromBottom, topIndex, levelCount) {
  if (levelCount === DEFAULT_LEVEL_LABELS.length) {
    const configs = [
      { width: 98, height: 30, type: "base" },
      { width: 96, height: 30, type: "base" },
      { width: 94, height: 30, type: "base" },
      { width: 84, height: 28, type: "plinth" },
      { width: 76, height: 28, type: "plinth" },
      { width: 68, height: 28, type: "plinth" },
      { width: 72, height: 52, type: "bell-base" },
      { width: 72, height: 52, type: "bell-mid" },
      { width: 65, height: 50, type: "bell-crown" },
      { width: 48, height: 26, type: "neck" },
      { width: 40, height: 26, type: "neck" },
      { width: 31, height: 25, type: "neck" },
      { width: 26, height: 40, type: "upper" },
      { width: 23, height: 40, type: "upper" },
      { width: 18, height: 38, type: "upper" },
      { width: 14, height: 30, type: "spire" },
    ];

    return configs[levelFromBottom - 1];
  }

  const width = 22 + (topIndex / Math.max(1, levelCount - 1)) * 76;
  const height = topIndex < 4 ? 30 : topIndex < 9 ? 36 : 42;
  return { width, height, type: topIndex > levelCount - 4 ? "base" : "neck" };
}

function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(Math.max(0, Math.round(toNumber(value, 0))));
}

function toNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
