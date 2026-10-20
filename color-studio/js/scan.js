// Scan flow: choose camera/upload → (permission → live camera with light meter) → align in oval → quiz → analyze.
import { CROP, REGIONS, regionRect, analyzeCanvas, recommendedLook } from './analysis.js';
import { setProfile, setPhoto } from './store.js';
import { toast } from './ui.js';

const $ = (s, r = document) => r.querySelector(s);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let stream = null, meterTimer = 0;
const align = { img: null, w: 0, h: 0, base: 1, z: 1, x: 0, y: 0 };
const quiz = {};

const QUESTIONS = [
  { key: 'veins', q: 'Warna urat di pergelangan tanganmu?', opts: [['green', 'Kehijauan'], ['blue', 'Kebiruan / ungu'], ['mixed', 'Campuran / sulit dilihat']] },
  { key: 'jewelry', q: 'Perhiasan yang membuat kulitmu tampak lebih cerah?', opts: [['gold', 'Emas'], ['silver', 'Perak'], ['both', 'Keduanya sama']] },
  { key: 'sun', q: 'Saat terkena matahari, kulitmu…', opts: [['tan', 'Mudah kecokelatan'], ['burn', 'Mudah memerah'], ['both', 'Keduanya']] },
  { key: 'features', q: 'Warna rambut & mata alamimu?', opts: [['light', 'Cokelat terang'], ['medium', 'Cokelat tua'], ['dark', 'Hitam pekat']] },
];

export function showStep(name) {
  document.querySelectorAll('[data-scan]').forEach((el) => { el.hidden = el.dataset.scan !== name; });
  if (name !== 'camera') stopCamera();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function enterScan() { showStep('choose'); }
export function leaveScan() { stopCamera(); }

/* ---------- camera ---------- */
async function startCamera() {
  const err = $('#camError');
  err.hidden = true;
  if (!navigator.mediaDevices?.getUserMedia) {
    err.textContent = 'Browser ini tidak mendukung akses kamera. Silakan unggah foto.'; err.hidden = false; return;
  }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
  } catch (e) {
    err.textContent = e.name === 'NotAllowedError'
      ? 'Izin kamera ditolak. Kamu bisa mengizinkannya lewat ikon gembok di address bar, atau unggah foto saja.'
      : e.name === 'NotFoundError' ? 'Kamera tidak ditemukan di perangkat ini. Silakan unggah foto.'
      : 'Kamera tidak bisa dibuka (' + e.name + '). Silakan unggah foto.';
    err.hidden = false;
    return;
  }
  const v = $('#video');
  v.srcObject = stream;
  await v.play().catch(() => {});
  showStep('camera');
  startMeter();
}

function stopCamera() {
  clearInterval(meterTimer);
  if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
}

function drawCover(ctx, src, sw, sh, W, H, mirror) {
  const s = Math.max(W / sw, H / sh);
  const w = sw * s, h = sh * s;
  ctx.save();
  if (mirror) { ctx.translate(W, 0); ctx.scale(-1, 1); }
  ctx.drawImage(src, (W - w) / 2, (H - h) / 2, w, h);
  ctx.restore();
}

function startMeter() {
  const v = $('#video'), meter = $('#lightMeter');
  const c = document.createElement('canvas'); c.width = 60; c.height = 75;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  meterTimer = setInterval(() => {
    if (!v.videoWidth) return;
    drawCover(ctx, v, v.videoWidth, v.videoHeight, 60, 75, true);
    const half = (x0) => {
      const d = ctx.getImageData(x0, 22, 14, 30).data; let s = 0;
      for (let i = 0; i < d.length; i += 4) s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      return s / (d.length / 4);
    };
    const l = half(16), r = half(30), avg = (l + r) / 2;
    let state = 'ok', txt = 'Cahaya bagus — siap difoto';
    if (avg < 70) { state = 'bad'; txt = 'Terlalu redup — cari cahaya jendela'; }
    else if (avg > 225) { state = 'warn'; txt = 'Terlalu terang — kurangi cahaya langsung'; }
    else if (Math.abs(l - r) > 28) { state = 'warn'; txt = `Cahaya tidak merata — sisi ${l < r ? 'kiri' : 'kanan'} lebih gelap`; }
    meter.dataset.state = state;
    meter.querySelector('.txt').textContent = txt;
  }, 400);
}

async function capture() {
  const v = $('#video'), cd = $('#countdown');
  cd.hidden = false;
  for (const n of [3, 2, 1]) { cd.textContent = n; await sleep(700); }
  cd.hidden = true;
  const c = document.createElement('canvas'); c.width = CROP.w; c.height = CROP.h;
  drawCover(c.getContext('2d'), v, v.videoWidth, v.videoHeight, CROP.w, CROP.h, true);
  stopCamera();
  loadAlign(c, c.width, c.height);
}

/* ---------- upload ---------- */
function loadFile(file) {
  if (!file || !file.type.startsWith('image/')) { toast('Pilih file gambar (JPG atau PNG).'); return; }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => { loadAlign(img, img.naturalWidth, img.naturalHeight); URL.revokeObjectURL(url); };
  img.onerror = () => toast('Gambar tidak bisa dibuka. Coba format JPG atau PNG.');
  img.src = url;
}

/* ---------- align ---------- */
function loadAlign(src, w, h) {
  Object.assign(align, { img: src, w, h, base: Math.max(CROP.w / w, CROP.h / h), z: 1 });
  align.x = (CROP.w - w * align.base) / 2;
  align.y = (CROP.h - h * align.base) / 2;
  $('#zoom').value = 1;
  showStep('align');
  drawGuideMarks();
  drawAlign();
}

function drawAlign() {
  const c = $('#alignCanvas'), ctx = c.getContext('2d');
  ctx.fillStyle = '#E9E3DA'; ctx.fillRect(0, 0, CROP.w, CROP.h);
  const s = align.base * align.z;
  ctx.drawImage(align.img, align.x, align.y, align.w * s, align.h * s);
}

function setZoom(z, cx = CROP.cx, cy = CROP.cy) {
  const s0 = align.base * align.z, s1 = align.base * z;
  align.x = cx - ((cx - align.x) * s1) / s0;
  align.y = cy - ((cy - align.y) * s1) / s0;
  align.z = z;
  $('#zoom').value = z;
  drawAlign();
}

function drawGuideMarks() {
  $('#guideMarks').innerHTML = Object.values(REGIONS).map((r) => {
    const q = regionRect(r);
    return `<rect x="${q.x}" y="${q.y}" width="${q.w}" height="${q.h}" rx="6"/>`;
  }).join('');
}

function bindAlign() {
  const stage = $('#alignStage');
  const pts = new Map();
  let pinch0 = 0, z0 = 1;
  const toCanvas = (e) => { const r = stage.getBoundingClientRect(); return [(e.clientX - r.left) * (CROP.w / r.width), (e.clientY - r.top) * (CROP.h / r.height)]; };
  stage.addEventListener('pointerdown', (e) => { stage.setPointerCapture(e.pointerId); pts.set(e.pointerId, toCanvas(e)); if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); z0 = align.z; } });
  stage.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    const p = toCanvas(e), prev = pts.get(e.pointerId);
    pts.set(e.pointerId, p);
    if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      setZoom(Math.min(4, Math.max(0.2, (z0 * Math.hypot(a[0] - b[0], a[1] - b[1])) / pinch0)));
    } else { align.x += p[0] - prev[0]; align.y += p[1] - prev[1]; drawAlign(); }
  });
  const up = (e) => pts.delete(e.pointerId);
  stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
  stage.addEventListener('wheel', (e) => { e.preventDefault(); const [x, y] = toCanvas(e); setZoom(Math.min(4, Math.max(0.2, align.z * (e.deltaY < 0 ? 1.06 : 0.94))), x, y); }, { passive: false });
  $('#zoom').addEventListener('input', (e) => setZoom(+e.target.value));
}

/* ---------- quiz + analyze ---------- */
function renderQuiz() {
  $('#quiz').innerHTML = QUESTIONS.map((q) => `<fieldset><legend>${q.q}</legend><div class="chips">
    ${q.opts.map(([v, l]) => `<label><input type="radio" name="q-${q.key}" value="${v}">${l}</label>`).join('')}</div></fieldset>`).join('');
  $('#quiz').addEventListener('change', (e) => { quiz[e.target.name.slice(2)] = e.target.value; });
}

async function analyze(useQuiz) {
  showStep('analyzing');
  const src = $('#alignCanvas');
  const url = src.toDataURL('image/jpeg', 0.92);
  const stage = $('#scanStage'), log = $('#scanLog');
  stage.innerHTML = `<img src="${url}" alt=""><svg viewBox="0 0 600 750" class="scan-overlay"><ellipse class="oval-line" cx="300" cy="360" rx="185" ry="245"/><g id="scanMarks"></g></svg><div class="scanline"></div>`;
  log.innerHTML = '';
  const steps = ['Mendeteksi area wajah di dalam oval', 'Mengukur kualitas & arah cahaya', 'Sampling warna kulit: dahi, pipi, dagu', 'Membaca kontras mata dan alis', 'Menghitung undertone di ruang warna CIELAB', 'Mencocokkan dengan 4 season'];
  const marks = $('#scanMarks');
  for (let i = 0; i < steps.length; i++) {
    log.insertAdjacentHTML('beforeend', `<li class="on">${steps[i]}</li>`);
    if (i === 2 || i === 3) {
      const keys = i === 2 ? ['forehead', 'cheekL', 'cheekR', 'chin'] : ['eyeL', 'eyeR'];
      marks.insertAdjacentHTML('beforeend', keys.map((k) => { const q = regionRect(REGIONS[k]); return `<rect class="mark" x="${q.x}" y="${q.y}" width="${q.w}" height="${q.h}" rx="6"/>`; }).join(''));
    }
    await sleep(520);
    log.lastElementChild.classList.replace('on', 'done');
  }
  const res = analyzeCanvas(src, useQuiz ? quiz : {});
  if (res.error) { toast(res.error, 6000); showStep('align'); return; }
  setPhoto({ url });
  setProfile(res.profile, recommendedLook(res.profile));
  location.hash = '#/result';
}

export function initScan() {
  renderQuiz();
  bindAlign();
  const fi = $('#fileInput');
  fi.addEventListener('change', () => { loadFile(fi.files[0]); fi.value = ''; });
  const dz = $('#dropzone');
  dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('drag'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('drag'));
  dz.addEventListener('drop', (e) => { e.preventDefault(); dz.classList.remove('drag'); loadFile(e.dataTransfer.files[0]); });
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-action]')?.dataset.action;
    if (!a) return;
    if (a === 'camera') showStep('permission');
    if (a === 'camera-start') startCamera();
    if (a === 'capture') capture();
    if (a === 'scan-back') showStep('choose');
    if (a === 'to-quiz') showStep('quiz');
    if (a === 'analyze') analyze(true);
    if (a === 'analyze-skip') analyze(false);
  });
}
