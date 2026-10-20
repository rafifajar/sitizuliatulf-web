// Tiny shared store. The profile and look persist in localStorage; the photo stays in memory only.
const KEY = 'pcs-studio-v1';

const defaultLook = {
  skin: '#D4A27C',
  hijabOn: true,
  hijabStyle: 'segi-empat',
  hijabColor: '#CC93AE',
  clothType: 'blouse',
  clothColor: '#F1E4EA',
  hairColor: '#3B3433',
  lip: '#D88AA0',
  blush: '#E8A6B8',
  shadow: '#B7A3C8',
  makeupOn: true,
  intensity: 0.7,
  glassesOn: false,
  lensColor: 'pink',
  lensShape: 'oval',
  frame: 'silver',
  earrings: 'silver',
  necklace: false,
};

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}

const saved = load();
const state = {
  profile: saved.profile || null,
  look: { ...defaultLook, ...(saved.look || {}) },
  photo: null, // { url, width, height } of the aligned crop — never persisted
  ui: { view: '2d', category: 'hijab', makeupPart: 'lip', paletteSeason: saved.profile?.season || 'summer', compare: [], compareOn: false, baOn: false, baMode: 'neutral' },
};

const subs = new Set();
let queued = false;

export const getState = () => state;
export const subscribe = (fn) => { subs.add(fn); return () => subs.delete(fn); };

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify({ profile: state.profile, look: state.look })); } catch { /* storage unavailable: keep working in memory */ }
}

function emit() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => { queued = false; persist(); subs.forEach((fn) => fn(state)); });
}

export function setLook(patch) { Object.assign(state.look, patch); emit(); }
export function setUI(patch) { Object.assign(state.ui, patch); emit(); }
export function setPhoto(photo) { state.photo = photo; emit(); }
export function setProfile(profile, lookPatch = {}) {
  state.profile = profile;
  state.ui.paletteSeason = profile.season;
  Object.assign(state.look, { skin: profile.skin }, lookPatch);
  emit();
}
export function resetAll() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  state.profile = null; state.photo = null;
  state.look = { ...defaultLook };
  emit();
}
