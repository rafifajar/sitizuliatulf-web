// Entry: hash router, home page, manual-profile dialog, and wiring the modules together.
import { SEASONS, SEASON_ORDER, SKIN_PRESETS } from './data.js';
import { renderFigure } from './render2d.js';
import { manualProfile, recommendedLook } from './analysis.js';
import { getState, subscribe, setProfile, setUI, setLook } from './store.js';
import { initScan, enterScan, leaveScan } from './scan.js';
import { initResult, renderResult } from './results.js';
import { initStudio, renderStudio, leaveStudio } from './studio.js';
import { toast } from './ui.js';

const $ = (s, r = document) => r.querySelector(s);
let route = '';

/* ---------- home ---------- */
const heroColors = SEASON_ORDER.flatMap((id) => [SEASONS[id].clothes[2], SEASONS[id].clothes[1]].map((hex) => ({ hex, id })));
let heroIdx = 0, heroTimer = 0;
const heroLook = { skin: '#D9A882', hijabOn: true, hijabStyle: 'segi-empat', clothType: 'blouse', clothColor: '#F1E4EA', hairColor: '#3B3433', lip: '#D88AA0', blush: '#E8A6B8', shadow: '#B7A3C8', makeupOn: true, intensity: 0.65, glassesOn: false, lensColor: 'pink', lensShape: 'oval', frame: 'silver', earrings: 'none', necklace: false };

function paintHero(i) {
  heroIdx = i;
  const { hex, id } = heroColors[i];
  const S = SEASONS[id];
  const look = { ...heroLook, hijabColor: hex, clothColor: S.clothes[6], lip: S.lips[0], blush: S.blush[0], shadow: S.shadow[0] };
  $('#heroFigure').innerHTML = renderFigure(look, null) + '<div class="hero-scan"></div>';
  $('#heroReadout').innerHTML = `<span>${S.name}</span><span>${S.tag}</span><code>${hex}</code>`;
  document.querySelectorAll('#heroSwatches .sw').forEach((b, j) => b.classList.toggle('sel', j === i));
}

function initHome() {
  $('#heroSwatches').innerHTML = heroColors.map((c, i) => `<button class="sw" style="--c:${c.hex}" data-hero="${i}" aria-label="${SEASONS[c.id].name} ${c.hex}"></button>`).join('');
  $('#heroSwatches').addEventListener('click', (e) => {
    const b = e.target.closest('[data-hero]');
    if (!b) return;
    clearInterval(heroTimer);
    paintHero(+b.dataset.hero);
  });
  $('#seasonGrid').innerHTML = SEASON_ORDER.map((id) => {
    const S = SEASONS[id];
    const look = { ...heroLook, hijabColor: S.clothes[2], clothColor: S.clothes[0], lip: S.lips[0], blush: S.blush[0], shadow: S.shadow[0] };
    return `<button class="season-card" data-open-season="${id}" style="--a:${S.accent}">
      <div class="sc-art">${renderFigure(look, null, { viewBox: '60 80 280 300' })}</div>
      <div class="sc-body"><h3>${S.name}</h3><p>${S.tag}</p><div class="dots">${S.clothes.slice(0, 6).map((h) => `<i style="background:${h}"></i>`).join('')}</div></div></button>`;
  }).join('');
  $('#seasonGrid').addEventListener('click', (e) => {
    const b = e.target.closest('[data-open-season]');
    if (!b) return;
    setUI({ paletteSeason: b.dataset.openSeason, category: 'hijab' });
    location.hash = '#/studio';
  });
  paintHero(0);
}

function startHeroCycle() {
  clearInterval(heroTimer);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  heroTimer = setInterval(() => paintHero((heroIdx + 1) % heroColors.length), 2400);
}

/* ---------- manual profile ---------- */
function initManual() {
  const dlg = $('#manualModal');
  $('#skinRow').innerHTML = SKIN_PRESETS.map((s, i) => `<label class="skin" title="${s.name}"><input type="radio" name="skin" value="${s.hex}" ${i === 3 ? 'checked' : ''}><i style="background:${s.hex}"></i><span>${s.name}</span></label>`).join('');
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-action="manual"]')) { e.preventDefault(); dlg.showModal(); }
  });
  dlg.addEventListener('close', () => {
    if (dlg.returnValue !== 'ok') return;
    const f = new FormData($('#manualForm'));
    const profile = manualProfile({ skin: f.get('skin'), undertone: f.get('ut'), season: f.get('season') || null });
    setProfile(profile, recommendedLook(profile));
    toast(`Profil manual: ${SEASONS[profile.season].name}. Kamu bisa memindai kapan saja untuk hasil yang lebih personal.`, 4500);
    location.hash = '#/studio';
  });
}

/* ---------- router ---------- */
function renderTopProfile(state) {
  const p = state.profile;
  $('#topProfile').innerHTML = p ? `<a href="#/result" class="tp-chip" style="--a:${SEASONS[p.season].accent}"><i></i>${SEASONS[p.season].name}</a>` : `<a href="#/scan" class="btn btn-sm btn-primary">Mulai analisis</a>`;
}

function go() {
  const r = (location.hash.replace(/^#\/?/, '') || 'home').split('?')[0];
  const next = ['home', 'scan', 'result', 'studio'].includes(r) ? r : 'home';
  if (route === 'scan' && next !== 'scan') leaveScan();
  if (route === 'studio' && next !== 'studio') leaveStudio();
  if (route === 'home' && next !== 'home') clearInterval(heroTimer);
  document.querySelectorAll('.view').forEach((v) => { v.hidden = v.dataset.view !== next; });
  document.querySelectorAll('.flow a').forEach((a) => a.classList.toggle('active', a.dataset.step === next));
  document.body.dataset.route = next;
  const changed = route !== next;
  route = next;
  if (next === 'home') startHeroCycle();
  if (next === 'scan' && changed) enterScan();
  if (next === 'result') renderResult();
  if (next === 'studio') renderStudio();
  if (changed && next !== 'scan') window.scrollTo(0, 0);
}

initHome();
initManual();
initScan();
initResult();
initStudio();
subscribe((state) => {
  renderTopProfile(state);
  if (route === 'studio') renderStudio(state);
  if (route === 'result') renderResult();
});
renderTopProfile(getState());
window.addEventListener('hashchange', go);
go();

// expose for quick debugging in the console
window.rona = { getState, setLook, setUI };
