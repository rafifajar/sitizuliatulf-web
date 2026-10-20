// Results page: season, axes, confidence, palettes, effect comparison and per-category recommendations.
import { SEASONS, SEASON_ORDER, METALS, LENS_COLORS } from './data.js';
import { faceEffect, evaluateColor } from './color.js';
import { renderFigure } from './render2d.js';
import { renderPhoto } from './photo.js';
import { getState, setLook, setUI } from './store.js';
import { swatch } from './ui.js';

const pct = (v) => Math.round(v * 100);
const meterPos = (v) => ((v + 1) / 2) * 100;

function meter(label, left, right, v, note = '') {
  return `<div class="meter"><div class="meter-top"><span>${label}</span><span class="mono">${note}</span></div>
    <div class="meter-track"><i style="left:${meterPos(v).toFixed(1)}%"></i></div>
    <div class="meter-ends"><span>${left}</span><span>${right}</span></div></div>`;
}

function pickByEffect(profile) {
  const pool = SEASON_ORDER.flatMap((id) => SEASONS[id].clothes);
  const evals = pool.map((hex) => ({ hex, ...evaluateColor(hex, profile) }));
  const best = [...evals].sort((a, b) => b.score - a.score)[0];
  const of = (eff) => evals.filter((e) => e.effect === eff).sort((a, b) => a.score - b.score)[0];
  return [best, of('pucat') || of('mendominasi'), of('kusam')].filter(Boolean);
}

function effectCards(state) {
  const { profile, photo, look } = state;
  return pickByEffect(profile).map((e) => {
    const l = { ...look, hijabOn: true, hijabColor: e.hex, clothColor: e.hex, makeupOn: false, glassesOn: false };
    const fx = faceEffect(e.hex, profile);
    const art = photo ? renderPhoto(photo, l, fx) : renderFigure(l, fx);
    return `<figure class="fx-card fx-${e.effect}"><div class="fx-art">${art}</div>
      <figcaption><span class="badge b-${e.effect}">${e.label}</span><span class="mono">${e.score}%</span>
      <p>${e.note}</p></figcaption></figure>`;
  }).join('');
}

export function renderResult() {
  const root = document.getElementById('resultRoot');
  const state = getState();
  const p = state.profile;
  if (!p) {
    root.innerHTML = `<div class="empty"><h2 class="title">Belum ada hasil analisis</h2><p class="muted">Pindai wajahmu atau pilih warna kulit secara manual untuk melihat hasil.</p>
      <div class="row gap center"><a class="btn btn-primary" href="#/scan">Mulai analisis</a><button class="btn btn-ghost" data-action="manual">Tanpa foto</button></div></div>`;
    return;
  }
  const S = SEASONS[p.season], S2 = SEASONS[p.secondSeason], SL = SEASONS[p.leastSeason];
  const m = p.metrics;
  const conf = p.confidence;
  const art = state.photo ? `<img src="${state.photo.url}" alt="Foto yang dianalisis">` : renderFigure({ ...state.look }, null);
  const lensRec = S.lenses.map((id) => LENS_COLORS.find((l) => l.id === id));
  const metalRec = S.metals.map((id) => METALS.find((x) => x.id === id));
  const tryBtn = (key, hex, cat, extra = '') => swatch(hex, { profile: p, attrs: `data-try="${key}" data-hex="${hex}" data-cat="${cat}" ${extra}` });

  root.innerHTML = `
  <div class="result">
    <div class="result-hero" style="--accent:${S.accent}">
      <div class="result-portrait">${art}<span class="season-stamp">${S.name}</span></div>
      <div class="result-summary">
        <p class="eyebrow">Hasil analisismu ${p.source === 'manual' ? '· profil manual' : ''}</p>
        <h1 class="season-title">${S.name} <em>${S.tag}</em></h1>
        <p class="lead">${S.blurb}</p>
        <div class="kv">
          <div><span>Undertone</span><b>${p.undertone}</b></div>
          <div><span>Season terdekat kedua</span><b>${S2.name}</b></div>
          <div><span>Keyakinan</span><b>${conf.value != null ? conf.value + '% · ' : ''}${conf.label}</b></div>
        </div>
        <div class="prob">${SEASON_ORDER.map((id) => `<div class="prob-row ${id === p.season ? 'top' : ''}"><span>${SEASONS[id].name}</span><div class="bar"><i style="width:${pct(p.scores[id])}%;background:${SEASONS[id].accent}"></i></div><span class="mono">${pct(p.scores[id])}%</span></div>`).join('')}</div>
        <div class="row gap"><a class="btn btn-primary" href="#/studio">Coba di Studio</a><a class="btn btn-ghost" href="#/scan">Pindai ulang</a></div>
      </div>
    </div>

    <div class="result-grid">
      <section class="card">
        <h3>Karakter warnamu</h3>
        ${meter('Undertone', 'Sejuk', 'Hangat', p.warmth, m ? `h° ${m.h.toFixed(1)}` : '')}
        ${meter('Kedalaman', 'Terang', 'Gelap', p.depth, m ? `L* ${m.L.toFixed(1)}` : '')}
        ${meter('Kejernihan', 'Lembut', 'Cerah', p.clarity, m ? `C* ${m.C.toFixed(1)}` : '')}
        ${p.samples.length ? `<div class="samples">${p.samples.map((s) => `<div><i style="background:${s.hex}"></i><span>${s.label}</span><code>${s.hex}</code></div>`).join('')}
          <div><i style="background:${p.skin}"></i><span><b>Rata-rata kulit</b></span><code>${p.skin}</code></div></div>` : `<div class="samples"><div><i style="background:${p.skin}"></i><span>Warna kulit dipilih</span><code>${p.skin}</code></div></div>`}
      </section>
      <section class="card">
        <h3>Kualitas foto &amp; keterbatasan</h3>
        ${p.lighting ? `<div class="light-score"><b>${p.lighting.score}</b><span>/100 skor cahaya</span></div>
          ${p.lighting.warnings.length ? `<ul class="warns">${p.lighting.warnings.map((w) => `<li>${w}</li>`).join('')}</ul>` : '<p class="ok-line">Cahaya cukup merata. Hasil lebih bisa diandalkan.</p>'}
          ${p.lighting.wbCorrected ? '<p class="fine">Koreksi white balance ringan diterapkan berdasarkan warna latar.</p>' : ''}` : '<p class="muted">Profil dibuat dari pilihan manualmu, tanpa pengukuran foto.</p>'}
        <p class="fine">Ini perkiraan dari satu foto di satu kondisi cahaya. Karena itu, uji juga warna dari season <b>${S2.name}</b> di bawah, dan bandingkan langsung di depan cermin dengan cahaya alami.</p>
      </section>
    </div>

    <section class="card">
      <div class="card-head"><h3>Bagaimana warna memengaruhi wajahmu</h3><p class="muted">Simulasi warna yang paling cocok, terlalu lembut atau terlalu pekat, dan berlawanan undertone, di dekat wajahmu.</p></div>
      <div class="fx-grid">${effectCards(state)}</div>
    </section>

    <section class="card">
      <h3>Palet warnamu</h3>
      <div class="pal-block"><div class="pal-label"><b>Warna terbaik</b><span>${S.name} · paling sejalan dengan profilmu</span></div><div class="sw-row">${S.clothes.map((h) => tryBtn('clothColor', h, 'baju')).join('')}</div></div>
      <div class="pal-block"><div class="pal-label"><b>Perlu diuji lebih lanjut</b><span>${S2.name} · season terdekat kedua</span></div><div class="sw-row">${S2.clothes.slice(0, 8).map((h) => tryBtn('clothColor', h, 'baju')).join('')}</div></div>
      <div class="pal-block"><div class="pal-label"><b>Cenderung kurang cocok</b><span>${SL.name} · paling jauh dari profilmu</span></div><div class="sw-row dim">${SL.clothes.slice(0, 8).map((h) => tryBtn('clothColor', h, 'baju')).join('')}</div></div>
      <p class="fine">Klik warna mana pun untuk mencobanya di Studio.</p>
    </section>

    <section class="card">
      <h3>Rekomendasi per kategori</h3>
      <div class="rec-grid">
        <div class="rec"><h4>Makeup</h4>
          <div class="rec-line"><span>Lipstik</span><div class="sw-row">${S.lips.slice(0, 5).map((h) => tryBtn('lip', h, 'makeup', 'data-part="lip"')).join('')}</div></div>
          <div class="rec-line"><span>Blush</span><div class="sw-row">${S.blush.map((h) => tryBtn('blush', h, 'makeup', 'data-part="blush"')).join('')}</div></div>
          <div class="rec-line"><span>Eyeshadow</span><div class="sw-row">${S.shadow.slice(0, 4).map((h) => tryBtn('shadow', h, 'makeup', 'data-part="shadow"')).join('')}</div></div>
        </div>
        <div class="rec"><h4>Hijab</h4><div class="sw-row">${S.clothes.slice(0, 8).map((h) => tryBtn('hijabColor', h, 'hijab')).join('')}</div></div>
        <div class="rec"><h4>Baju</h4><div class="sw-row">${S.clothes.slice(4, 12).map((h) => tryBtn('clothColor', h, 'baju')).join('')}</div></div>
        <div class="rec"><h4>Warna rambut</h4><div class="sw-row">${S.hair.map((h) => tryBtn('hairColor', h, 'rambut')).join('')}</div></div>
        <div class="rec"><h4>Aksesori</h4>
          <div class="rec-line"><span>Logam</span><div class="chips static">${metalRec.map((x) => `<button class="chip" data-try="earrings" data-val="${x.id}" data-cat="aksesori"><i style="background:${x.hex}"></i>${x.name}</button>`).join('')}</div></div>
          <div class="rec-line"><span>Lensa</span><div class="chips static">${lensRec.map((x) => `<button class="chip" data-try="lensColor" data-val="${x.id}" data-cat="aksesori"><i style="background:${x.hex}"></i>${x.name}</button>`).join('')}</div></div>
        </div>
      </div>
    </section>
  </div>`;
}

export function initResult() {
  document.getElementById('resultRoot').addEventListener('click', (e) => {
    const b = e.target.closest('[data-try]');
    if (!b) return;
    const key = b.dataset.try;
    const patch = { [key]: b.dataset.hex || b.dataset.val };
    if (key === 'hijabColor') patch.hijabOn = true;
    if (key === 'hairColor') patch.hijabOn = false;
    if (key === 'lensColor') patch.glassesOn = true;
    if (['lip', 'blush', 'shadow'].includes(key)) patch.makeupOn = true;
    setLook(patch);
    setUI({ category: b.dataset.cat, ...(b.dataset.part ? { makeupPart: b.dataset.part } : {}), compareOn: false, baOn: false });
    location.hash = '#/studio';
  });
}
