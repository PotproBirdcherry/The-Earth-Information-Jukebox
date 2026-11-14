// Earth Sonification Jukebox
// Las imágenes (título, ubicación, descripción) vienen de config/imagenes.json,
// que Flask inyecta en la página. Las notas de cada imagen las calcula app.py
// con la escala pentatónica (ruta /api/sonificar/<id>) y aquí se tocan con Web Audio.

const imagenes = JSON.parse(document.getElementById("imagenes-data").textContent);

let currentIndex = 0;
let voiceEnabled = true;

// Estado de la reproducción
let sonido = null;        // { duracion_nota, notas: [{nota, frecuencia, volumen, color}] }
let posicion = 0;         // índice de la nota que sigue
let isPlaying = false;
let stepTimer = null;
const cacheSonidos = new Map();

let audioCtx, analyser, dataArray;

const selector = document.getElementById("selector-imagen");
const btnPlay = document.getElementById("btn-play");
const btnPrev = document.getElementById("btn-prev");
const btnNext = document.getElementById("btn-next");
const btnMode = document.getElementById("btn-mode");
const btnVoice = document.getElementById("btn-voice");
const titleEl = document.getElementById("track-title");
const locationEl = document.getElementById("track-location");
const descriptionEl = document.getElementById("track-description");
const counterEl = document.getElementById("track-counter");
const legendEl = document.getElementById("track-legend");
const noteEl = document.getElementById("current-note");
const imgEl = document.getElementById("nasa-image");
const playhead = document.getElementById("playhead");
const announcer = document.getElementById("live-announcer");
const seekBar = document.getElementById("seek-bar");
const timeDisplay = document.getElementById("time-display");
const canvas = document.getElementById("audio-visualizer");
const ctx = canvas.getContext("2d");

// ---------------------------------------------------------------------------
// Audio
// ---------------------------------------------------------------------------
function initAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64;
    analyser.connect(audioCtx.destination);
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    drawWave();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
}

function playEarcon(freq = 660) {
  initAudioContext();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.12);
}

// Toca una nota de la escala pentatónica con un envolvente suave
function playNote({ frecuencia, volumen }, duracion) {
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(frecuencia, t);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.25 * volumen, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duracion * 0.95);
  osc.connect(gain);
  gain.connect(analyser);
  osc.start(t);
  osc.stop(t + duracion);
}

function announce(text) {
  announcer.textContent = "";
  setTimeout(() => { announcer.textContent = text; }, 50);

  if (voiceEnabled && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "es-MX";
    utterance.rate = 1.05;
    window.speechSynthesis.speak(utterance);
  }
}

function drawWave() {
  requestAnimationFrame(drawWave);
  if (!analyser || !isPlaying) return;

  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  analyser.getByteFrequencyData(dataArray);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const barWidth = (canvas.width / dataArray.length) * 1.5;
  let x = 0;

  for (let i = 0; i < dataArray.length; i++) {
    const barHeight = (dataArray[i] / 255) * canvas.height;
    ctx.fillStyle = i % 2 === 0 ? "#00F0FF" : "#FFB800";
    ctx.fillRect(x, canvas.height - barHeight, barWidth - 3, barHeight);
    x += barWidth;
  }
}

// ---------------------------------------------------------------------------
// Reproducción paso a paso (una nota por columna de la imagen)
// ---------------------------------------------------------------------------
function step() {
  if (posicion >= sonido.notas.length) {
    pauseCurrentTrack();
    posicion = 0;
    updateProgress();
    return;
  }
  const nota = sonido.notas[posicion];
  playNote(nota, sonido.duracion_nota);
  noteEl.textContent = nota.nota;
  posicion++;
  updateProgress();
}

function updateProgress() {
  const total = sonido ? sonido.notas.length : 0;
  const dur = sonido ? sonido.duracion_nota : 0;
  seekBar.value = total ? (posicion / total) * 100 : 0;
  timeDisplay.textContent = `${formatTime(posicion * dur)} / ${formatTime(total * dur)}`;

  // La franja resaltada sigue a la columna que acaba de sonar
  if (total && (isPlaying || posicion > 0)) {
    const columna = Math.max(posicion - 1, 0);
    playhead.style.width = `${100 / total}%`;
    playhead.style.left = `${(columna / total) * 100}%`;
    playhead.hidden = false;
  } else {
    playhead.hidden = true;
  }
}

function stopTimer() {
  clearInterval(stepTimer);
  stepTimer = null;
}

async function obtenerSonido(id) {
  if (!cacheSonidos.has(id)) {
    const resp = await fetch(`/api/sonificar/${encodeURIComponent(id)}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    cacheSonidos.set(id, await resp.json());
  }
  return cacheSonidos.get(id);
}

async function loadTrack(index, autoPlay = false) {
  pauseCurrentTrack();
  currentIndex = index;
  const imagen = imagenes[index];

  selector.value = imagen.id;
  counterEl.textContent = `IMAGEN ${index + 1} DE ${imagenes.length}`;
  locationEl.textContent = `UBICACIÓN: ${imagen.ubicacion}`;
  titleEl.textContent = imagen.titulo;
  descriptionEl.textContent = imagen.descripcion;
  imgEl.src = imagen.url;
  imgEl.alt = `${imagen.titulo}. ${imagen.descripcion}`;
  noteEl.textContent = "—";

  sonido = null;
  posicion = 0;
  updateProgress();
  btnPlay.disabled = true;
  btnPlay.textContent = "Cargando…";

  announce(`${imagen.titulo}. Ubicación: ${imagen.ubicacion}. ${imagen.descripcion}`);

  try {
    const datos = await obtenerSonido(imagen.id);
    if (currentIndex !== index) return; // el usuario ya eligió otra imagen
    sonido = datos;
    btnPlay.disabled = false;
    updatePlayState(false);
    updateProgress();
    if (autoPlay) playCurrentTrack();
  } catch (e) {
    btnPlay.textContent = "Sin sonido";
    announce("No se pudo convertir esta imagen en sonido.");
  }
}

function playCurrentTrack() {
  if (!sonido || isPlaying) return;
  initAudioContext();
  if (posicion >= sonido.notas.length) posicion = 0;
  isPlaying = true;
  updatePlayState(true);
  step();
  stepTimer = setInterval(step, sonido.duracion_nota * 1000);
}

function pauseCurrentTrack() {
  stopTimer();
  isPlaying = false;
  updatePlayState(false);
}

function togglePlay() {
  if (!sonido) return;
  playEarcon(520);
  isPlaying ? pauseCurrentTrack() : playCurrentTrack();
}

function updatePlayState(playing) {
  btnPlay.setAttribute("aria-pressed", playing);
  btnPlay.textContent = playing ? "Pausar" : "Reproducir";
}

function toggleVisualMode() {
  playEarcon(780);
  const isFocus = document.body.classList.toggle("modo-enfoque");
  btnMode.textContent = isFocus ? "Vista: Alto contraste (M)" : "Vista: Normal (M)";
  announce(isFocus ? "Vista de alto contraste activada." : "Vista normal activada.");
}

function toggleVoice() {
  voiceEnabled = !voiceEnabled;
  btnVoice.setAttribute("aria-pressed", voiceEnabled);
  btnVoice.textContent = voiceEnabled ? "Voz: Activada (V)" : "Voz: Desactivada (V)";
  if (voiceEnabled) {
    announce("Voz guía activada.");
  } else if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ---------------------------------------------------------------------------
// Eventos
// ---------------------------------------------------------------------------
btnPlay.addEventListener("click", togglePlay);
btnMode.addEventListener("click", toggleVisualMode);
btnVoice.addEventListener("click", toggleVoice);

selector.addEventListener("change", () => {
  playEarcon(600);
  loadTrack(imagenes.findIndex(i => i.id === selector.value), false);
});

btnPrev.addEventListener("click", () => {
  playEarcon(440);
  loadTrack((currentIndex - 1 + imagenes.length) % imagenes.length, true);
});

btnNext.addEventListener("click", () => {
  playEarcon(660);
  loadTrack((currentIndex + 1) % imagenes.length, true);
});

seekBar.addEventListener("input", () => {
  if (!sonido) return;
  posicion = Math.min(Math.round((seekBar.value / 100) * sonido.notas.length), sonido.notas.length - 1);
  updateProgress();
});

document.addEventListener("keydown", (e) => {
  // No robar las teclas cuando el usuario está en la lista o la barra de tiempo
  if (["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement.tagName)) return;

  if (e.key === "ArrowRight") {
    btnNext.click();
  } else if (e.key === "ArrowLeft") {
    btnPrev.click();
  } else if (e.code === "Space" && document.activeElement.tagName !== "BUTTON") {
    e.preventDefault();
    togglePlay();
  } else if (e.key.toLowerCase() === "m") {
    toggleVisualMode();
  } else if (e.key.toLowerCase() === "v") {
    toggleVoice();
  } else if (e.key.toLowerCase() === "g") {
    playEarcon(700);
    announce(legendEl.textContent.trim().replace(/\s+/g, " "));
  }
});

// Carga la imagen indicada en ?imagen=<id> (por ejemplo, recién subida) o la primera
const inicial = imagenes.findIndex(i => i.id === selector.value);
loadTrack(inicial >= 0 ? inicial : 0, false);
