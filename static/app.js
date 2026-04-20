const fileInput = document.getElementById("file-input");
const dropZone = document.getElementById("drop-zone");
const uploadSection = document.getElementById("upload-section");
const readerSection = document.getElementById("reader-section");
const loadingEl = document.getElementById("loading");
const uploadError = document.getElementById("upload-error");
const textDisplay = document.getElementById("text-display");
const docTitle = document.getElementById("doc-title");
const progressBar = document.getElementById("progress-bar");

const btnPlay = document.getElementById("btn-play");
const btnPause = document.getElementById("btn-pause");
const btnStop = document.getElementById("btn-stop");
const btnContrast = document.getElementById("btn-contrast");
const btnNew = document.getElementById("btn-new");

const speedSlider = document.getElementById("speed-slider");
const speedLabel = document.getElementById("speed-label");
const fontSlider = document.getElementById("font-slider");
const fontLabel = document.getElementById("font-label");
const voiceSelect = document.getElementById("voice-select");

let sentences = [];
let currentIndex = 0;
let isSpeaking = false;
let isPaused = false;
let voices = [];

// ── Voice loading ────────────────────────────────────────────────────────────
function loadVoices() {
  voices = speechSynthesis.getVoices();
  voiceSelect.innerHTML = "";
  voices.forEach((v, i) => {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = `${v.name} (${v.lang})`;
    voiceSelect.appendChild(opt);
  });
  // Prefer an English voice by default
  const preferred = voices.findIndex(v => v.lang.startsWith("en"));
  if (preferred >= 0) voiceSelect.value = preferred;
}

speechSynthesis.onvoiceschanged = loadVoices;
loadVoices();

// ── File upload ──────────────────────────────────────────────────────────────
dropZone.addEventListener("dragover", e => { e.preventDefault(); dropZone.classList.add("dragover"); });
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));
dropZone.addEventListener("drop", e => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});
fileInput.addEventListener("change", () => { if (fileInput.files[0]) handleFile(fileInput.files[0]); });

async function handleFile(file) {
  showError("");
  showLoading(true);

  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch("/extract", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Upload failed.");
    renderDocument(data.filename, data.text);
  } catch (err) {
    showLoading(false);
    showError(err.message);
  }
}

// ── Render ───────────────────────────────────────────────────────────────────
function renderDocument(filename, rawText) {
  stopSpeech();
  sentences = splitSentences(rawText);
  currentIndex = 0;

  docTitle.textContent = filename;
  textDisplay.innerHTML = sentences
    .map((s, i) => `<span class="sentence" data-index="${i}">${escapeHtml(s)} </span>`)
    .join("");

  textDisplay.querySelectorAll(".sentence").forEach(el => {
    el.addEventListener("click", () => {
      currentIndex = parseInt(el.dataset.index);
      if (isSpeaking) { stopSpeech(); speak(currentIndex); }
    });
  });

  uploadSection.hidden = true;
  loadingEl.hidden = true;
  readerSection.hidden = false;
  updateProgress();
}

function splitSentences(text) {
  // Split on sentence-ending punctuation, keep delimiter attached
  return text
    .replace(/([.!?])\s+/g, "$1\n")
    .split("\n")
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── Speech ───────────────────────────────────────────────────────────────────
function speak(index) {
  if (index >= sentences.length) { stopSpeech(); return; }

  isSpeaking = true;
  isPaused = false;
  highlightSentence(index);

  const utt = new SpeechSynthesisUtterance(sentences[index]);
  utt.rate = parseFloat(speedSlider.value);
  const voiceIndex = parseInt(voiceSelect.value);
  if (voices[voiceIndex]) utt.voice = voices[voiceIndex];

  utt.onend = () => {
    markSpoken(index);
    currentIndex = index + 1;
    updateProgress();
    if (isSpeaking) speak(currentIndex);
  };

  utt.onerror = () => { if (isSpeaking) speak(index + 1); };

  speechSynthesis.speak(utt);
  btnPlay.hidden = true;
  btnPause.hidden = false;
}

function stopSpeech() {
  speechSynthesis.cancel();
  isSpeaking = false;
  isPaused = false;
  btnPlay.hidden = false;
  btnPause.hidden = true;
  clearHighlights();
}

function pauseSpeech() {
  if (speechSynthesis.speaking) {
    speechSynthesis.pause();
    isPaused = true;
    btnPause.hidden = true;
    btnPlay.hidden = false;
    btnPlay.textContent = "▶ Resume";
  }
}

function resumeSpeech() {
  if (isPaused) {
    speechSynthesis.resume();
    isPaused = false;
    btnPlay.hidden = true;
    btnPause.hidden = false;
    btnPlay.textContent = "▶ Play";
  } else {
    speak(currentIndex);
    btnPlay.textContent = "▶ Play";
  }
}

function highlightSentence(index) {
  clearHighlights();
  const el = textDisplay.querySelector(`[data-index="${index}"]`);
  if (el) {
    el.classList.add("current");
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

function markSpoken(index) {
  const el = textDisplay.querySelector(`[data-index="${index}"]`);
  if (el) { el.classList.remove("current"); el.classList.add("spoken"); }
}

function clearHighlights() {
  textDisplay.querySelectorAll(".sentence").forEach(el => {
    el.classList.remove("current", "spoken");
  });
}

function updateProgress() {
  const pct = sentences.length ? (currentIndex / sentences.length) * 100 : 0;
  progressBar.style.width = `${Math.min(pct, 100)}%`;
}

// ── Controls ─────────────────────────────────────────────────────────────────
btnPlay.addEventListener("click", resumeSpeech);
btnPause.addEventListener("click", pauseSpeech);
btnStop.addEventListener("click", () => { stopSpeech(); currentIndex = 0; updateProgress(); });

speedSlider.addEventListener("input", () => {
  speedLabel.textContent = `${parseFloat(speedSlider.value).toFixed(1)}×`;
  if (isSpeaking && !isPaused) { speechSynthesis.cancel(); speak(currentIndex); }
});

fontSlider.addEventListener("input", () => {
  const size = fontSlider.value;
  fontLabel.textContent = `${size}px`;
  textDisplay.style.fontSize = `${size}px`;
});

btnContrast.addEventListener("click", () => {
  document.body.classList.toggle("high-contrast");
  btnContrast.textContent = document.body.classList.contains("high-contrast")
    ? "Normal Mode" : "High Contrast";
});

btnNew.addEventListener("click", () => {
  stopSpeech();
  fileInput.value = "";
  readerSection.hidden = true;
  uploadSection.hidden = false;
  showError("");
});

// Spacebar to play/pause
document.addEventListener("keydown", e => {
  if (e.code === "Space" && e.target.tagName !== "INPUT" && e.target.tagName !== "SELECT") {
    e.preventDefault();
    isSpeaking && !isPaused ? pauseSpeech() : resumeSpeech();
  }
});

// ── Helpers ──────────────────────────────────────────────────────────────────
function showLoading(show) {
  loadingEl.hidden = !show;
  uploadSection.hidden = show;
}

function showError(msg) {
  uploadError.textContent = msg;
  uploadError.hidden = !msg;
}
