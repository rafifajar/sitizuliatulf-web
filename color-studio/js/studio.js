// Studio: stage (illustration / photo / 3D), before-after, compare, and the category panels.
import { SEASONS, SEASON_ORDER, HIJAB_STYLES, CLOTH_TYPES, LENS_COLORS, LENS_SHAPES, METALS, NEUTRAL_GRAY } from './data.js';
import { faceEffect, evaluateColor } from './color.js';
import { renderFigure, hijabThumb, clothThumb, lensThumb } from './render2d.js';
import { renderPhoto, glassesOffset } from './photo.js';
import { recommendedLook } from './analysis.js';
import { getState, setLook, setUI } from './store.js';
import { swatch, toast } from './ui.js';

const $ = (s, r = document) => r.querySelector(s);
let avatar = null, avatarLoading = null, baPos = 50, skipPanel = false, lastPanelKey = '';

const CAT_KEY = { baju: 'clothColor', hijab: 'hijabColor', rambut: 'hairColor' };
const PART_LABEL = { lip: 'Lipstik', blush: 'Blush', shadow: 'Eyeshadow' };

export function colorKey(ui) {
  if (ui.category === 'makeup') return ui.makeupPart;
  return CAT_KEY[ui.category] || null;
}

function paletteFor(key, seasonId) {
  const s = SEASONS[seasonId];
  return { lip: s.lips, blush: s.blush, shadow: s.shadow, hairColor: s.hair }[key] || s.clothes;
}

const drapeColor = (look) => (look.hijabOn && look.hijabStyle !== 'turban' ? look.hijabColor : look.clothColor);
const fxFor = (look, profile) => (profile ? faceEffect(drapeColor(look), profile) : null);

function variant(look, key, hex) {
  const l = { ...look, [key]: hex };
  if (key === 'hijabColor') l.hijabOn = true;
  if (key === 'hairColor') l.hijabOn = false;
  if (['lip', 'blush', 'shadow'].includes(key)) l.makeupOn = true;
  return l;
}

function beforeLook(state) {
  const { look, ui, profile } = state;
  const key = colorKey(ui) || (look.hijabOn ? 'hijabColor' : 'clothColor');
  if (ui.baMode === 'clash' && profile) {
    const pool = SEASON_ORDER.flatMap((id) => paletteFor(key, id));
    const worst = pool.map((hex) => ({ hex, s: evaluateColor(hex, profile).score })).sort((a, b) => a.s - b.s)[0];
    return { ...look, [key]: worst.hex };
  }
  if (['lip', 'blush', 'shadow'].includes(key)) return { ...look, makeupOn: false };
  if (key === 'hairColor') return { ...look, hairColor: '#2E2826' };
  return { ...look, [key]: NEUTRAL_GRAY };
}

function art(state, look, opts = {}) {
  const fx = fxFor(look, state.profile);
  return state.ui.view === 'photo' && state.photo ? renderPhoto(state.photo, look, fx, opts) : renderFigure(look, fx, { bg: false, ...opts });
}

/* ---------- stage ---------- */
function renderStage(state) {
  const { ui, look } = state;
  const stage = $('#stage');
  let flat = $('#stageFlat', stage), three = $('#stage3d', stage);
  if (!flat) {
    stage.innerHTML = `<div id="stageFlat" class="stage-flat"></div><div id="stage3d" class="stage-3d" hidden><div class="three-host" id="threeHost"></div>
      <div class="three-ui"><button data-cam="front">Depan</button><button data-cam="threeq">¾</button><button data-cam="side">Samping</button><button data-cam="back">Belakang</button><button data-cam="face">Wajah</button></div>
      <p class="three-hint">Drag untuk memutar · scroll / pinch untuk zoom</p></div>`;
    flat = $('#stageFlat', stage); three = $('#stage3d', stage);
  }
  const is3d = ui.view === '3d' && !ui.compareOn && !ui.baOn;
  three.hidden = !is3d; flat.hidden = is3d;
  stage.dataset.mode = ui.compareOn ? 'compare' : ui.baOn ? 'ba' : ui.view;

  if (is3d) { ensureAvatar(state); return; }
  if (ui.compareOn) {
    const key = colorKey(ui);
    if (!key) { flat.innerHTML = `<div class="stage-empty">Pilih kategori Makeup, Baju, Hijab, atau Rambut untuk membandingkan warna.</div>`; return; }
    const cards = ui.compare.map((hex) => {
      const l = variant(look, key, hex);
      const ev = state.profile ? evaluateColor(hex, state.profile) : null;
      return `<figure class="cmp-card ${look[key] === hex ? 'cur' : ''}">${art(state, l, { cls: 'cmp-art' })}
        <figcaption><span class="cmp-dot" style="background:${hex}"></span><code>${hex}</code>${ev ? `<span class="badge b-${ev.effect}">${ev.label} · ${ev.score}%</span>` : ''}
        <span class="cmp-actions"><button data-cmp-use="${hex}">Pakai</button><button data-cmp-del="${hex}" aria-label="Hapus dari perbandingan">×</button></span></figcaption></figure>`;
    });
    while (cards.length < 4) cards.push(`<div class="cmp-card empty"><span>Klik warna di palet untuk menambahkan</span></div>`);
    flat.innerHTML = `<div class="cmp-grid">${cards.join('')}</div>`;
    return;
  }
  if (ui.baOn) {
    const before = beforeLook(state);
    flat.innerHTML = `<div class="ba" style="--pos:${baPos}%">
      <div class="ba-layer after">${art(state, look)}</div>
      <div class="ba-layer before">${art(state, before)}</div>
      <div class="ba-handle" role="slider" tabindex="0" aria-label="Geser pembanding" aria-valuenow="${Math.round(baPos)}" aria-valuemin="0" aria-valuemax="100"><span></span></div>
      <span class="ba-tag l">Sebelum · ${ui.baMode === 'clash' ? 'kurang cocok' : 'netral'}</span><span class="ba-tag r">Sesudah</span>
    </div>
    <div class="ba-mode seg small"><button data-ba-mode="neutral" aria-pressed="${ui.baMode === 'neutral'}">vs Netral</button><button data-ba-mode="clash" aria-pressed="${ui.baMode === 'clash'}" ${state.profile ? '' : 'disabled'}>vs Kurang cocok</button></div>`;
    return;
  }
  flat.innerHTML = art(state, look, { interactive: true, cls: 'main-art' })
    + (ui.view === 'photo' && state.photo ? `<p class="stage-note">${look.glassesOn ? 'Geser kacamata untuk menyesuaikan posisi. ' : ''}Try-on makeup tersedia di Ilustrasi &amp; Avatar 3D.</p>` : '');
}

async function ensureAvatar(state) {
  const host = $('#threeHost');
  if (avatar) { avatar.update(state.look, fxFor(state.look, state.profile)); return; }
  if (avatarLoading) return;
  host.innerHTML = '<div class="three-loading"><span class="spinner"></span>Menyiapkan avatar 3D…</div>';
  avatarLoading = import('./avatar3d.js')
    .then((m) => m.createAvatar(host))
    .then((a) => { host.querySelector('.three-loading')?.remove(); avatar = a; const s = getState(); a.update(s.look, fxFor(s.look, s.profile)); })
    .catch((err) => {
      console.error(err);
      host.innerHTML = '<div class="stage-empty">Avatar 3D tidak bisa dimuat (WebGL atau koneksi ke CDN tidak tersedia). Gunakan mode Ilustrasi atau Fotoku.</div>';
    })
    .finally(() => { avatarLoading = null; });
}

/* ---------- harmony bar ---------- */
function renderHarmony(state) {
  const el = $('#harmony');
  const { profile, look, ui } = state;
  if (!profile) {
    el.innerHTML = `<div class="hm-empty">Lakukan analisis untuk melihat skor kecocokan dan efek warna pada wajahmu. <a href="#/scan">Mulai analisis</a> atau <button class="link" data-action="manual">pilih manual</button>.</div>`;
    return;
  }
  const key = colorKey(ui);
  const active = key ? look[key] : drapeColor(look);
  const ev = evaluateColor(active, profile);
  const drape = drapeColor(look);
  const dEv = evaluateColor(drape, profile);
  const label = key ? (PART_LABEL[key] || { clothColor: 'Baju', hijabColor: 'Hijab', hairColor: 'Rambut' }[key]) : 'Warna dekat wajah';
  el.innerHTML = `<div class="hm-score" style="--v:${ev.score}"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.5"/><circle class="arc" cx="18" cy="18" r="15.5" pathLength="100"/></svg><b>${ev.score}</b></div>
    <div class="hm-text"><div class="hm-top"><span class="hm-dot" style="background:${active}"></span><span>${label}</span><code>${active}</code><span class="badge b-${ev.effect}">${ev.label}</span></div>
    <p>${ev.note}</p>
    ${key !== 'hijabColor' && key !== 'clothColor' ? `<p class="fine">Efek di wajah dihitung dari warna terdekat wajah (${look.hijabOn && look.hijabStyle !== 'turban' ? 'hijab' : 'baju'}): <b>${dEv.label}</b> · ${dEv.score}%.</p>` : ''}</div>`;
}

/* ---------- panel ---------- */
function seasonTabs(state) {
  const cur = state.ui.paletteSeason, mine = state.profile?.season;
  return `<div class="season-tabs" role="tablist">${SEASON_ORDER.map((id) => `<button role="tab" data-season="${id}" aria-selected="${cur === id}" style="--a:${SEASONS[id].accent}">
    ${SEASONS[id].name}${mine === id ? '<i class="mine">untukmu</i>' : ''}</button>`).join('')}</div>`;
}

function palette(state, key) {
  const { look, ui, profile } = state;
  const list = paletteFor(key, ui.paletteSeason);
  const inCmp = (h) => ui.compareOn && ui.compare.includes(h);
  return `<div class="pal">
    ${seasonTabs(state)}
    <p class="pal-tag">${SEASONS[ui.paletteSeason].tag}${ui.compareOn ? ' · klik untuk menambah/menghapus dari perbandingan' : ''}</p>
    <div class="sw-row big">${list.map((h) => swatch(h, { selected: ui.compareOn ? inCmp(h) : look[key]?.toUpperCase() === h.toUpperCase(), profile, attrs: `data-color="${h}"`, size: 'lg' })).join('')}
      <label class="sw lg custom" title="Warna kustom"><input type="color" data-custom value="${look[key]}" aria-label="Warna kustom"><span>+</span></label></div>
    ${profile ? '<p class="legend"><i class="tier good"></i>sangat cocok <i class="tier mid"></i>bisa dicoba <i class="tier low"></i>kurang cocok</p>' : ''}
  </div>`;
}

const toggle = (key, on, label) => `<label class="switch"><input type="checkbox" data-toggle="${key}" ${on ? 'checked' : ''}><span class="track"></span>${label}</label>`;

function panelMakeup(state) {
  const { look, ui } = state;
  return `<div class="sub-tabs">${Object.entries(PART_LABEL).map(([k, l]) => `<button data-part="${k}" aria-pressed="${ui.makeupPart === k}"><i style="background:${look[k]}"></i>${l}</button>`).join('')}</div>
    <div class="row between">${toggle('makeupOn', look.makeupOn, 'Makeup aktif')}
    <label class="slider-row compact">Intensitas <input type="range" min="0.15" max="1" step="0.01" value="${look.intensity}" data-range="intensity"></label></div>
    ${palette(state, ui.makeupPart)}`;
}

function panelBaju(state) {
  const { look } = state;
  return `<h4 class="ph">Tipe Baju</h4>
    <div class="thumb-grid five">${CLOTH_TYPES.map((t) => `<button class="thumb ${look.clothType === t.id ? 'sel' : ''}" data-set="clothType" data-val="${t.id}" aria-pressed="${look.clothType === t.id}">${clothThumb(look, t.id)}<span>${t.name}</span></button>`).join('')}</div>
    ${look.hijabOn && ['khimar', 'shawl', 'pashmina'].includes(look.hijabStyle) ? '<p class="fine">Style hijab yang panjang menutupi sebagian besar baju. Coba hijab Instant/Sport atau lepas hijab untuk melihat baju lebih jelas.</p>' : ''}
    <h4 class="ph">Warna Baju</h4>${palette(state, 'clothColor')}`;
}

function panelHijab(state) {
  const { look } = state;
  return `<div class="row between">${toggle('hijabOn', look.hijabOn, 'Pakai hijab')}</div>
    <h4 class="ph">Varian Style Hijab</h4>
    <div class="thumb-grid four">${HIJAB_STYLES.map((h) => `<button class="thumb ${look.hijabOn && look.hijabStyle === h.id ? 'sel' : ''}" data-set="hijabStyle" data-val="${h.id}" aria-pressed="${look.hijabStyle === h.id}">${hijabThumb(look, h.id)}<span>${h.name}</span></button>`).join('')}</div>
    <h4 class="ph">Warna Hijab</h4>${palette(state, 'hijabColor')}`;
}

function panelRambut(state) {
  const { look } = state;
  return `${look.hijabOn ? `<div class="notice">Rambut tertutup hijab. <button class="link" data-toggle-btn="hijabOn">Lepas hijab untuk melihat warna rambut</button></div>` : ''}
    <h4 class="ph">Warna Rambut</h4>${palette(state, 'hairColor')}
    <p class="fine">Warna rambut cenderung paling harmonis bila sejalan dengan undertone kulit dan tidak lebih dari 2–3 tingkat dari warna alami.</p>`;
}

function panelAksesori(state) {
  const { look, profile } = state;
  const S = profile ? SEASONS[profile.season] : null;
  const rec = (list, id) => (S && list.includes(id) ? '<i class="rec-star" title="Cocok untuk season-mu">✦</i>' : '');
  const showEars = !look.hijabOn || look.hijabStyle === 'turban';
  return `<div class="row between">${toggle('glassesOn', look.glassesOn, 'Kacamata tanpa bingkai')}</div>
    <h4 class="ph">Warna Lensa</h4>
    <div class="thumb-grid five">${LENS_COLORS.map((l) => `<button class="thumb lens ${look.lensColor === l.id ? 'sel' : ''}" data-set="lensColor" data-val="${l.id}" aria-pressed="${look.lensColor === l.id}">${rec(S?.lenses || [], l.id)}${lensThumb('oval', l.id, look.frame)}<span>${l.name}</span></button>`).join('')}</div>
    <h4 class="ph">Bentuk Lensa</h4>
    <div class="thumb-grid five">${LENS_SHAPES.map((s) => `<button class="thumb lens ${look.lensShape === s.id ? 'sel' : ''}" data-set="lensShape" data-val="${s.id}" aria-pressed="${look.lensShape === s.id}">${lensThumb(s.id, 'clear', look.frame)}<span>${s.name}</span></button>`).join('')}</div>
    <h4 class="ph">Warna Frame &amp; Bridge</h4>
    <div class="chips static">${METALS.map((m) => `<button class="chip ${look.frame === m.id ? 'sel' : ''}" data-set="frame" data-val="${m.id}" aria-pressed="${look.frame === m.id}"><i style="background:${m.hex}"></i>${m.name}${rec(S?.metals || [], m.id)}</button>`).join('')}</div>
    <h4 class="ph">Perhiasan</h4>
    <div class="chips static">${METALS.filter((m) => !['black', 'clear'].includes(m.id)).map((m) => `<button class="chip ${look.earrings === m.id ? 'sel' : ''}" data-set="earrings" data-val="${m.id}" aria-pressed="${look.earrings === m.id}"><i style="background:${m.hex}"></i>${m.name}${rec(S?.metals || [], m.id)}</button>`).join('')}
      <button class="chip ${look.earrings === 'none' ? 'sel' : ''}" data-set="earrings" data-val="none">Tanpa</button></div>
    <div class="row between">${toggle('necklace', look.necklace, 'Kalung')}</div>
    ${!showEars ? '<p class="fine">Anting dan kalung terlihat saat tanpa hijab atau dengan turban/sport hijab.</p>' : ''}
    ${S ? `<p class="fine">✦ = direkomendasikan untuk ${S.name}. Logam ${S.metals.map((id) => METALS.find((m) => m.id === id).name).join(' & ')} sejalan dengan undertone ${profile.undertone.toLowerCase()}.</p>` : ''}`;
}

function renderPanel(state) {
  const { ui } = state;
  document.querySelectorAll('#catTabs [data-cat]').forEach((b) => b.setAttribute('aria-selected', b.dataset.cat === ui.category));
  const fn = { makeup: panelMakeup, baju: panelBaju, hijab: panelHijab, rambut: panelRambut, aksesori: panelAksesori }[ui.category];
  const panel = $('#panel');
  const key = ui.category + ui.makeupPart;
  panel.innerHTML = fn(state);
  if (key !== lastPanelKey) { panel.scrollTop = 0; lastPanelKey = key; }
}

function renderProfileStrip(state) {
  const p = state.profile, el = $('#profileStrip');
  if (!p) { el.innerHTML = `<div class="ps-empty"><b>Belum ada profil warna</b><span>Skor kecocokan muncul setelah analisis.</span><a class="btn btn-sm btn-primary" href="#/scan">Analisis</a></div>`; return; }
  const S = SEASONS[p.season];
  el.innerHTML = `<span class="ps-chip" style="--a:${S.accent}"><i></i>${S.name}</span><span class="ps-meta">${S.tag} · undertone ${p.undertone.toLowerCase()}</span>
    <span class="ps-actions"><button class="btn btn-sm btn-ghost" data-action="apply-rec">Terapkan rekomendasi</button><a class="btn btn-sm btn-ghost" href="#/result">Hasil</a></span>`;
}

function renderBar(state) {
  const { ui } = state;
  document.querySelectorAll('#viewSeg [data-view-mode]').forEach((b) => {
    b.setAttribute('aria-selected', b.dataset.viewMode === ui.view);
    if (b.dataset.viewMode === 'photo') { b.disabled = !state.photo; b.title = state.photo ? '' : 'Pindai atau unggah foto untuk memakai mode ini'; }
  });
  $('[data-tool="ba"]').setAttribute('aria-pressed', ui.baOn);
  $('[data-tool="compare"]').setAttribute('aria-pressed', ui.compareOn);
}

export function renderStudio(state = getState()) {
  renderBar(state);
  renderStage(state);
  renderHarmony(state);
  renderProfileStrip(state);
  if (!skipPanel) renderPanel(state);
  skipPanel = false;
}

function seedCompare(state) {
  const key = colorKey(state.ui);
  if (!key) return [];
  const cur = state.look[key];
  const pool = SEASON_ORDER.flatMap((id) => paletteFor(key, id));
  let picks;
  if (state.profile) {
    const ranked = pool.map((h) => ({ h, s: evaluateColor(h, state.profile).score })).sort((a, b) => b.s - a.s);
    picks = [ranked[0].h, ranked[Math.floor(ranked.length / 2)].h, ranked.at(-1).h];
  } else picks = SEASON_ORDER.map((id) => paletteFor(key, id)[1]);
  return [...new Set([cur, ...picks])].slice(0, 4);
}

/* ---------- events ---------- */
export function initStudio() {
  $('#viewSeg').addEventListener('click', (e) => {
    const b = e.target.closest('[data-view-mode]');
    if (!b || b.disabled) return;
    setUI({ view: b.dataset.viewMode, ...(b.dataset.viewMode === '3d' ? { compareOn: false, baOn: false } : {}) });
  });
  document.querySelector('.stage-tools').addEventListener('click', (e) => {
    const t = e.target.closest('[data-tool]')?.dataset.tool;
    const s = getState();
    const flatView = s.ui.view === '3d' ? (s.photo ? 'photo' : '2d') : s.ui.view;
    if (t === 'ba') setUI({ baOn: !s.ui.baOn, compareOn: false, view: flatView });
    if (t === 'compare') {
      if (!colorKey(s.ui)) { toast('Perbandingan tersedia untuk Makeup, Baju, Hijab, dan Rambut.'); return; }
      setUI({ compareOn: !s.ui.compareOn, baOn: false, view: flatView, compare: s.ui.compareOn ? [] : seedCompare(s) });
    }
  });
  $('#catTabs').addEventListener('click', (e) => {
    const c = e.target.closest('[data-cat]')?.dataset.cat;
    if (!c) return;
    const s = getState();
    setUI({ category: c });
    if (s.ui.compareOn) setUI({ compare: seedCompare(getState()), compareOn: !!colorKey(getState().ui) });
  });

  const panel = $('#panel');
  panel.addEventListener('click', (e) => {
    const s = getState();
    const t = e.target;
    const season = t.closest('[data-season]');
    if (season) { setUI({ paletteSeason: season.dataset.season }); return; }
    const part = t.closest('[data-part]');
    if (part) { setUI({ makeupPart: part.dataset.part, ...(s.ui.compareOn ? {} : {}) }); if (s.ui.compareOn) setUI({ compare: seedCompare({ ...s, ui: { ...s.ui, makeupPart: part.dataset.part } }) }); return; }
    const col = t.closest('[data-color]');
    if (col) {
      const hex = col.dataset.color, key = colorKey(s.ui);
      if (s.ui.compareOn) {
        const list = s.ui.compare.includes(hex) ? s.ui.compare.filter((h) => h !== hex) : [...s.ui.compare, hex].slice(-4);
        setUI({ compare: list });
      } else setLook(variant({}, key, hex));
      return;
    }
    const set = t.closest('[data-set]');
    if (set) {
      const patch = { [set.dataset.set]: set.dataset.val };
      if (set.dataset.set === 'hijabStyle') patch.hijabOn = true;
      if (['lensColor', 'lensShape', 'frame'].includes(set.dataset.set)) patch.glassesOn = true;
      setLook(patch);
      return;
    }
    const tb = t.closest('[data-toggle-btn]');
    if (tb) setLook({ [tb.dataset.toggleBtn]: !s.look[tb.dataset.toggleBtn] });
  });
  panel.addEventListener('change', (e) => {
    const tg = e.target.dataset.toggle;
    if (tg) setLook({ [tg]: e.target.checked });
  });
  panel.addEventListener('input', (e) => {
    const s = getState();
    if (e.target.dataset.range) { skipPanel = true; setLook({ [e.target.dataset.range]: +e.target.value }); }
    if ('custom' in e.target.dataset) {
      const hex = e.target.value.toUpperCase(), key = colorKey(s.ui);
      skipPanel = true;
      if (s.ui.compareOn) setUI({ compare: [...s.ui.compare.filter((h) => h !== hex), hex].slice(-4) });
      else setLook(variant({}, key, hex));
    }
  });

  $('#profileStrip').addEventListener('click', (e) => {
    if (e.target.closest('[data-action="apply-rec"]')) { setLook(recommendedLook(getState().profile)); toast('Rekomendasi warna untuk season-mu diterapkan.'); }
  });

  // stage interactions: compare buttons, before/after drag, glasses drag, 3D camera
  const stage = $('#stage');
  stage.addEventListener('click', (e) => {
    const s = getState();
    const use = e.target.closest('[data-cmp-use]');
    if (use) { setLook(variant({}, colorKey(s.ui), use.dataset.cmpUse)); setUI({ compareOn: false }); return; }
    const del = e.target.closest('[data-cmp-del]');
    if (del) { setUI({ compare: s.ui.compare.filter((h) => h !== del.dataset.cmpDel) }); return; }
    const m = e.target.closest('[data-ba-mode]');
    if (m && !m.disabled) { setUI({ baMode: m.dataset.baMode }); return; }
    const cam = e.target.closest('[data-cam]');
    if (cam && avatar) avatar.setView(cam.dataset.cam);
  });

  let drag = null;
  stage.addEventListener('pointerdown', (e) => {
    const ba = e.target.closest('.ba');
    if (ba) { drag = { type: 'ba', el: ba }; ba.setPointerCapture(e.pointerId); moveBA(e, ba); return; }
    const g = e.target.closest('.photo-glasses');
    if (g) { const svg = g.ownerSVGElement; drag = { type: 'gl', svg, x: e.clientX, y: e.clientY, ox: glassesOffset.x, oy: glassesOffset.y }; svg.setPointerCapture(e.pointerId); e.preventDefault(); }
  });
  stage.addEventListener('pointermove', (e) => {
    if (!drag) return;
    if (drag.type === 'ba') moveBA(e, drag.el);
    if (drag.type === 'gl') {
      const k = 600 / drag.svg.getBoundingClientRect().width;
      glassesOffset.x = drag.ox + (e.clientX - drag.x) * k;
      glassesOffset.y = drag.oy + (e.clientY - drag.y) * k;
      drag.svg.querySelector('.photo-glasses').setAttribute('transform', drag.svg.querySelector('.photo-glasses').getAttribute('transform').replace(/^translate\([^)]*\)/, `translate(${glassesOffset.x},${glassesOffset.y})`));
    }
  });
  const end = () => { drag = null; };
  stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end);
  stage.addEventListener('keydown', (e) => {
    const h = e.target.closest('.ba-handle');
    if (!h || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    baPos = Math.min(100, Math.max(0, baPos + (e.key === 'ArrowLeft' ? -5 : 5)));
    h.closest('.ba').style.setProperty('--pos', baPos + '%');
    h.setAttribute('aria-valuenow', Math.round(baPos));
  });
}

function moveBA(e, el) {
  const r = el.getBoundingClientRect();
  baPos = Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100));
  el.style.setProperty('--pos', baPos + '%');
}

export function leaveStudio() {
  if (avatar) { avatar.dispose(); avatar = null; }
  const host = document.getElementById('threeHost');
  if (host) host.innerHTML = '';
}
