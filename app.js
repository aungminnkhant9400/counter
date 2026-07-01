const STORAGE_KEY = "putee-pagoda-counter-state-v3";
const MAX_VISIBLE_BEADS = 108;

const DEFAULT_STATE = {
  projectName: "ပုတီး စေတီ Counter",
  mantra: "ဂါထာ / ဆုတောင်းစာ",
  levels: 16,
  roundsPerLevel: 10,
  beadsPerRound: 108,
  quickStep: 1,
  completedRounds: 0,
  currentBead: 0,
  history: [],
  savedDate: getTodayKey(),
};

let state = loadState();
let saveTimer = 0;

const elements = {
  projectTitle: document.querySelector("#projectTitle"),
  mantraLine: document.querySelector("#mantraLine"),
  currentLevelText: document.querySelector("#currentLevelText"),
  roundInLevelText: document.querySelector("#roundInLevelText"),
  overallProgressText: document.querySelector("#overallProgressText"),
  currentBead: document.querySelector("#currentBead"),
  roundTarget: document.querySelector("#roundTarget"),
  progressText: document.querySelector("#progressText"),
  beadRing: document.querySelector("#beadRing"),
  formulaText: document.querySelector("#formulaText"),
  targetText: document.querySelector("#targetText"),
  completedRoundsText: document.querySelector("#completedRoundsText"),
  levelGrid: document.querySelector("#levelGrid"),
  projectNameInput: document.querySelector("#projectNameInput"),
  mantraInput: document.querySelector("#mantraInput"),
  levelsInput: document.querySelector("#levelsInput"),
  roundsPerLevelInput: document.querySelector("#roundsPerLevelInput"),
  beadsPerRoundInput: document.querySelector("#beadsPerRoundInput"),
  quickStepInput: document.querySelector("#quickStepInput"),
  saveState: document.querySelector("#saveState"),
  targetRoundsReport: document.querySelector("#targetRoundsReport"),
  targetBeadsReport: document.querySelector("#targetBeadsReport"),
  reportLevel: document.querySelector("#reportLevel"),
  reportRoundInLevel: document.querySelector("#reportRoundInLevel"),
  reportCurrent: document.querySelector("#reportCurrent"),
  reportRounds: document.querySelector("#reportRounds"),
  reportTotal: document.querySelector("#reportTotal"),
  reportProgress: document.querySelector("#reportProgress"),
  historyList: document.querySelector("#historyList"),
};

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => switchPanel(tab.dataset.panel));
});

document.querySelector("#tapButton").addEventListener("click", () => increment(state.quickStep));
document.querySelector("#incrementBtn").addEventListener("click", () => increment(state.quickStep));
document.querySelector("#decrementBtn").addEventListener("click", decrement);
document.querySelector("#completeRoundBtn").addEventListener("click", completeRound);
document.querySelector("#resetRoundBtn").addEventListener("click", resetRound);
document.querySelector("#resetTodayBtn").addEventListener("click", resetAll);
document.querySelector("#exportBtn").addEventListener("click", exportReportPng);
document.querySelector("#copySummaryBtn").addEventListener("click", copySummary);
document.querySelector("#clearHistoryBtn").addEventListener("click", clearHistory);

elements.beadRing.addEventListener("click", () => increment(state.quickStep));
elements.beadRing.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  increment(state.quickStep);
});

document.addEventListener("keydown", (event) => {
  const tagName = document.activeElement?.tagName;
  const isTyping = tagName === "INPUT" || tagName === "TEXTAREA";
  if (isTyping || event.key !== " ") return;
  event.preventDefault();
  increment(state.quickStep);
});

elements.projectNameInput.addEventListener("input", (event) => {
  state.projectName = event.target.value.trimStart() || DEFAULT_STATE.projectName;
  commitState();
});

elements.mantraInput.addEventListener("input", (event) => {
  state.mantra = event.target.value.trimStart();
  commitState();
});

elements.levelsInput.addEventListener("input", (event) => {
  state.levels = clamp(toNumber(event.target.value, DEFAULT_STATE.levels), 1, 100);
  clampProgressToTarget();
  commitState();
});

elements.roundsPerLevelInput.addEventListener("input", (event) => {
  state.roundsPerLevel = clamp(toNumber(event.target.value, DEFAULT_STATE.roundsPerLevel), 1, 1000);
  clampProgressToTarget();
  commitState();
});

elements.beadsPerRoundInput.addEventListener("input", (event) => {
  state.beadsPerRound = clamp(toNumber(event.target.value, DEFAULT_STATE.beadsPerRound), 1, 1000);
  state.currentBead = Math.min(state.currentBead, state.beadsPerRound - 1);
  commitState();
});

elements.quickStepInput.addEventListener("input", (event) => {
  state.quickStep = clamp(toNumber(event.target.value, 1), 1, 108);
  commitState();
});

document.querySelectorAll(".preset").forEach((button) => {
  button.addEventListener("click", () => {
    state.beadsPerRound = clamp(toNumber(button.dataset.beads, DEFAULT_STATE.beadsPerRound), 1, 1000);
    state.currentBead = Math.min(state.currentBead, state.beadsPerRound - 1);
    commitState();
  });
});

render();

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return { ...DEFAULT_STATE };

    const loaded = {
      projectName: saved.projectName || DEFAULT_STATE.projectName,
      mantra: saved.mantra ?? DEFAULT_STATE.mantra,
      levels: clamp(toNumber(saved.levels, DEFAULT_STATE.levels), 1, 100),
      roundsPerLevel: clamp(toNumber(saved.roundsPerLevel, DEFAULT_STATE.roundsPerLevel), 1, 1000),
      beadsPerRound: clamp(toNumber(saved.beadsPerRound, DEFAULT_STATE.beadsPerRound), 1, 1000),
      quickStep: clamp(toNumber(saved.quickStep, 1), 1, 108),
      completedRounds: Math.max(0, toNumber(saved.completedRounds, 0)),
      currentBead: Math.max(0, toNumber(saved.currentBead, 0)),
      history: Array.isArray(saved.history) ? saved.history.slice(0, 30) : [],
      savedDate: saved.savedDate || getTodayKey(),
    };

    loaded.currentBead = Math.min(loaded.currentBead, loaded.beadsPerRound - 1);
    return clampLoadedProgress(loaded);
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function clampLoadedProgress(nextState) {
  const targetRounds = nextState.levels * nextState.roundsPerLevel;
  nextState.completedRounds = Math.min(nextState.completedRounds, targetRounds);
  if (nextState.completedRounds >= targetRounds) nextState.currentBead = 0;
  return nextState;
}

function clampProgressToTarget() {
  const targetRounds = getTargetRounds();
  state.completedRounds = Math.min(state.completedRounds, targetRounds);
  if (state.completedRounds >= targetRounds) state.currentBead = 0;
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

function increment(step) {
  const count = clamp(toNumber(step, 1), 1, 108);

  for (let index = 0; index < count; index += 1) {
    if (isComplete()) break;

    state.currentBead += 1;
    if (state.currentBead >= state.beadsPerRound) {
      state.currentBead = 0;
      state.completedRounds += 1;
      addHistory();
      if (isComplete()) break;
    }
  }

  commitState();
}

function decrement() {
  if (state.currentBead > 0) {
    state.currentBead -= 1;
    commitState();
    return;
  }

  if (state.completedRounds <= 0) return;

  state.completedRounds -= 1;
  state.currentBead = state.beadsPerRound - 1;
  state.history.shift();
  commitState();
}

function completeRound() {
  if (isComplete()) return;

  state.currentBead = 0;
  state.completedRounds += 1;
  addHistory();
  clampProgressToTarget();
  commitState();
}

function resetRound() {
  if (!window.confirm("Reset current round only? Completed rounds will stay.")) return;
  state.currentBead = 0;
  commitState();
}

function resetAll() {
  if (!window.confirm("Reset all ပုတီး စေတီ progress?")) return;
  state.completedRounds = 0;
  state.currentBead = 0;
  state.history = [];
  state.savedDate = getTodayKey();
  commitState();
}

function clearHistory() {
  state.history = [];
  commitState();
}

function addHistory() {
  const position = getPositionForRound(state.completedRounds);
  state.history.unshift({
    level: position.level,
    roundInLevel: position.roundInLevel,
    beads: state.beadsPerRound,
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  });
  state.history = state.history.slice(0, 30);
}

function render() {
  const targetRounds = getTargetRounds();
  const targetBeads = getTargetBeads();
  const totalBeads = getTotalBeadsCounted();
  const roundProgress = getRoundProgress();
  const overallProgress = getOverallProgress();
  const position = getCurrentPosition();

  elements.projectTitle.textContent = state.projectName;
  elements.mantraLine.textContent = state.mantra || DEFAULT_STATE.mantra;
  elements.currentLevelText.textContent = `${formatNumber(position.level)} / ${formatNumber(state.levels)}`;
  elements.roundInLevelText.textContent = `${formatNumber(position.roundInLevel)} / ${formatNumber(state.roundsPerLevel)}`;
  elements.overallProgressText.textContent = `${overallProgress}%`;
  elements.currentBead.textContent = formatNumber(state.currentBead);
  elements.roundTarget.textContent = `of ${formatNumber(state.beadsPerRound)}`;
  elements.progressText.textContent = `${roundProgress}% of this round`;
  elements.beadRing.style.setProperty("--progress", `${roundProgress * 3.6}deg`);
  elements.formulaText.textContent = `${formatNumber(state.levels)} levels x ${formatNumber(state.roundsPerLevel)} rounds x ${formatNumber(state.beadsPerRound)} beads`;
  elements.targetText.textContent = `${formatNumber(targetRounds)} rounds · ${formatNumber(targetBeads)} beads`;
  elements.completedRoundsText.textContent = `${formatNumber(state.completedRounds)} / ${formatNumber(targetRounds)} rounds`;

  elements.projectNameInput.value = state.projectName;
  elements.mantraInput.value = state.mantra;
  elements.levelsInput.value = state.levels;
  elements.roundsPerLevelInput.value = state.roundsPerLevel;
  elements.beadsPerRoundInput.value = state.beadsPerRound;
  elements.quickStepInput.value = state.quickStep;

  elements.targetRoundsReport.textContent = formatNumber(targetRounds);
  elements.targetBeadsReport.textContent = formatNumber(targetBeads);
  elements.reportLevel.textContent = `${formatNumber(position.level)} / ${formatNumber(state.levels)}`;
  elements.reportRoundInLevel.textContent = `${formatNumber(position.roundInLevel)} / ${formatNumber(state.roundsPerLevel)}`;
  elements.reportCurrent.textContent = `${formatNumber(state.currentBead)} / ${formatNumber(state.beadsPerRound)}`;
  elements.reportRounds.textContent = formatNumber(state.completedRounds);
  elements.reportTotal.textContent = formatNumber(totalBeads);
  elements.reportProgress.textContent = `${overallProgress}%`;

  document.querySelectorAll(".preset").forEach((button) => {
    button.classList.toggle("is-active", toNumber(button.dataset.beads, 0) === state.beadsPerRound);
  });

  renderBeads(roundProgress);
  renderLevels();
  renderHistory();
}

function renderBeads(progress) {
  const fragment = document.createDocumentFragment();
  const beadCount = Math.min(state.beadsPerRound, MAX_VISIBLE_BEADS);
  const activeCount = Math.round((progress / 100) * beadCount);
  const dotSize = beadCount > 80 ? 12 : beadCount > 54 ? 15 : 19;

  for (let index = 0; index < beadCount; index += 1) {
    const angle = (Math.PI * 2 * index) / beadCount - Math.PI / 2;
    const bead = document.createElement("span");
    bead.className = `bead-dot${index < activeCount ? " is-active" : ""}`;
    bead.style.setProperty("--left", `${50 + Math.cos(angle) * 46}%`);
    bead.style.setProperty("--top", `${50 + Math.sin(angle) * 46}%`);
    bead.style.setProperty("--dot-size", `${dotSize}px`);
    fragment.append(bead);
  }

  const center = elements.beadRing.querySelector(".ring-center");
  elements.beadRing.replaceChildren(fragment, center);
}

function renderLevels() {
  const fragment = document.createDocumentFragment();
  const current = getCurrentPosition();

  for (let index = 0; index < state.levels; index += 1) {
    const level = index + 1;
    const completedForLevel = clamp(
      state.completedRounds - index * state.roundsPerLevel,
      0,
      state.roundsPerLevel,
    );
    const tile = document.createElement("article");
    tile.className = "level-tile";
    tile.classList.toggle("is-complete", completedForLevel >= state.roundsPerLevel);
    tile.classList.toggle("is-active", !isComplete() && current.level === level);
    tile.innerHTML = `
      <div>
        <strong>${formatNumber(level)}</strong>
        <span>${formatNumber(completedForLevel)} / ${formatNumber(state.roundsPerLevel)}</span>
      </div>
    `;
    fragment.append(tile);
  }

  elements.levelGrid.replaceChildren(fragment);
}

function renderHistory() {
  if (!state.history.length) {
    elements.historyList.innerHTML = `<div class="empty-history">No completed rounds yet</div>`;
    return;
  }

  const fragment = document.createDocumentFragment();
  state.history.forEach((item) => {
    const row = document.createElement("article");
    row.className = "history-item";
    row.innerHTML = `
      <span>${escapeHtml(item.time || "")}</span>
      <strong>Level ${formatNumber(item.level)} · Round ${formatNumber(item.roundInLevel)} · ${formatNumber(item.beads)} beads</strong>
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
  const position = getCurrentPosition();
  return [
    state.projectName,
    state.mantra,
    `Formula: ${state.levels} levels x ${state.roundsPerLevel} rounds x ${state.beadsPerRound} beads`,
    `Current level: ${position.level} / ${state.levels}`,
    `Round in level: ${position.roundInLevel} / ${state.roundsPerLevel}`,
    `Current bead: ${state.currentBead} / ${state.beadsPerRound}`,
    `Completed rounds: ${state.completedRounds} / ${getTargetRounds()}`,
    `Total beads: ${getTotalBeadsCounted()} / ${getTargetBeads()}`,
    `Progress: ${getOverallProgress()}%`,
  ].join("\n");
}

function exportReportPng() {
  const canvas = document.createElement("canvas");
  const width = 1080;
  const height = 1350;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f7f6ef";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#17201d";
  ctx.font = '800 52px "Myanmar Text", Arial, sans-serif';
  drawWrappedText(ctx, state.projectName, 70, 95, 940, 58);

  ctx.fillStyle = "#64716c";
  ctx.font = '700 28px "Myanmar Text", Arial, sans-serif';
  drawWrappedText(ctx, state.mantra || DEFAULT_STATE.mantra, 70, 175, 940, 36);

  drawExportRing(ctx, 540, 510, 270);
  drawExportMetrics(ctx, 70, 850, 940);

  const link = document.createElement("a");
  link.download = `putee-pagoda-counter-${getTodayKey()}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function drawExportRing(ctx, centerX, centerY, radius) {
  const beadCount = Math.min(state.beadsPerRound, MAX_VISIBLE_BEADS);
  const progress = getRoundProgress() / 100;
  const activeCount = Math.round(progress * beadCount);

  ctx.lineWidth = 32;
  ctx.strokeStyle = "rgba(22, 115, 95, 0.14)";
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius - 42, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "#16735f";
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius - 42, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
  ctx.stroke();

  for (let index = 0; index < beadCount; index += 1) {
    const angle = (Math.PI * 2 * index) / beadCount - Math.PI / 2;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    ctx.fillStyle = index < activeCount ? "#dba522" : "#f5df9f";
    ctx.strokeStyle = "rgba(116, 78, 15, 0.25)";
    ctx.beginPath();
    ctx.arc(x, y, beadCount > 80 ? 8 : 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(centerX, centerY, 142, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#d8dfda";
  ctx.stroke();

  ctx.fillStyle = "#64716c";
  ctx.font = '800 26px "Myanmar Text", Arial, sans-serif';
  ctx.textAlign = "center";
  ctx.fillText("ယခုအလုံး", centerX, centerY - 50);

  ctx.fillStyle = "#17201d";
  ctx.font = '900 92px "Segoe UI", Arial, sans-serif';
  ctx.fillText(formatNumber(state.currentBead), centerX, centerY + 36);

  ctx.fillStyle = "#64716c";
  ctx.font = '800 28px "Segoe UI", Arial, sans-serif';
  ctx.fillText(`of ${formatNumber(state.beadsPerRound)}`, centerX, centerY + 84);
  ctx.textAlign = "start";
}

function drawExportMetrics(ctx, x, y, width) {
  const position = getCurrentPosition();
  const items = [
    ["Formula", `${formatNumber(state.levels)} x ${formatNumber(state.roundsPerLevel)} x ${formatNumber(state.beadsPerRound)}`],
    ["Current level", `${formatNumber(position.level)} / ${formatNumber(state.levels)}`],
    ["Round in level", `${formatNumber(position.roundInLevel)} / ${formatNumber(state.roundsPerLevel)}`],
    ["Completed rounds", `${formatNumber(state.completedRounds)} / ${formatNumber(getTargetRounds())}`],
    ["Total beads", `${formatNumber(getTotalBeadsCounted())} / ${formatNumber(getTargetBeads())}`],
    ["Overall progress", `${getOverallProgress()}%`],
  ];

  const rowHeight = 74;
  items.forEach(([label, value], index) => {
    const rowY = y + index * rowHeight;
    roundedRect(ctx, x, rowY, width, 54, 8, "#ffffff", "#d8dfda");
    ctx.fillStyle = "#64716c";
    ctx.font = '700 22px "Segoe UI", Arial, sans-serif';
    ctx.fillText(label, x + 24, rowY + 35);
    ctx.fillStyle = "#16735f";
    ctx.font = '900 27px "Myanmar Text", Arial, sans-serif';
    ctx.textAlign = "right";
    ctx.fillText(value, x + width - 24, rowY + 36);
    ctx.textAlign = "start";
  });
}

function getCurrentPosition() {
  if (isComplete()) {
    return { level: state.levels, roundInLevel: state.roundsPerLevel };
  }

  return {
    level: Math.floor(state.completedRounds / state.roundsPerLevel) + 1,
    roundInLevel: (state.completedRounds % state.roundsPerLevel) + 1,
  };
}

function getPositionForRound(completedRoundNumber) {
  const safeRound = Math.max(1, completedRoundNumber);
  return {
    level: Math.ceil(safeRound / state.roundsPerLevel),
    roundInLevel: ((safeRound - 1) % state.roundsPerLevel) + 1,
  };
}

function getTargetRounds() {
  return state.levels * state.roundsPerLevel;
}

function getTargetBeads() {
  return getTargetRounds() * state.beadsPerRound;
}

function getTotalBeadsCounted() {
  return state.completedRounds * state.beadsPerRound + state.currentBead;
}

function getRoundProgress() {
  return Math.round((state.currentBead / state.beadsPerRound) * 100);
}

function getOverallProgress() {
  const targetBeads = getTargetBeads();
  if (!targetBeads) return 0;
  return Math.min(100, Math.round((getTotalBeadsCounted() / targetBeads) * 100));
}

function isComplete() {
  return state.completedRounds >= getTargetRounds() && state.currentBead === 0;
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
