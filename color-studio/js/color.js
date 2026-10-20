// Color math: conversions, mixing, CIELAB, and how well a color suits a profile.
import { SEASONS, SEASON_ORDER } from './data.js';

export const clamp = (v, a = -1, b = 1) => Math.min(b, Math.max(a, v));

export function hexToRgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('').toUpperCase();
}

export function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex(A.map((v, i) => v + (B[i] - v) * t));
}

// amt > 0 lightens toward white, amt < 0 darkens toward a warm-neutral shadow
export const shade = (hex, amt) => (amt >= 0 ? mix(hex, '#FFFFFF', amt) : mix(hex, '#1A1412', -amt));

const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };

export function rgbToLab([r, g, b]) {
  const R = lin(r), G = lin(g), B = lin(b);
  let x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  let y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  let z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  x = f(x); y = f(y); z = f(z);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

export function labToRgb([L, a, b]) {
  let y = (L + 16) / 116, x = a / 500 + y, z = y - b / 200;
  const f = (t) => (t ** 3 > 0.008856 ? t ** 3 : (t - 16 / 116) / 7.787);
  x = f(x) * 0.95047; y = f(y); z = f(z) * 1.08883;
  let R = x * 3.2406 + y * -1.5372 + z * -0.4986;
  let G = x * -0.9689 + y * 1.8758 + z * 0.0415;
  let B = x * 0.0557 + y * -0.204 + z * 1.057;
  const g = (c) => 255 * (c > 0.0031308 ? 1.055 * c ** (1 / 2.4) - 0.055 : 12.92 * c);
  return [g(R), g(G), g(B)];
}

export const hexToLab = (hex) => rgbToLab(hexToRgb(hex));
export const deltaE = (A, B) => Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]);
export const luminance = (hex) => hexToLab(hex)[0];
export const readableOn = (hex) => (luminance(hex) > 62 ? '#1d1a17' : '#ffffff');

// Where a single color sits on the same three axes the profile uses.
export function colorAxes(hex) {
  const [L, a, b] = hexToLab(hex);
  const C = Math.hypot(a, b);
  const h = (Math.atan2(b, a) * 180) / Math.PI;
  const weight = Math.min(1, C / 22);
  const warmth = clamp((0.55 * Math.cos(((h - 75) * Math.PI) / 180) + 0.45 * clamp(b / 28)) * weight);
  return { warmth, depth: clamp((58 - L) / 32), clarity: clamp((C - 28) / 26), L, C, h };
}

const PALETTE_LABS = Object.fromEntries(
  SEASON_ORDER.map((id) => {
    const s = SEASONS[id];
    return [id, [...s.clothes, ...s.lips, ...s.blush, ...s.shadow, ...s.hair].map(hexToLab)];
  })
);

// How strongly a color belongs to each season's palette (sums to 1)
export function seasonAffinity(hex) {
  const lab = hexToLab(hex);
  const raw = {};
  let sum = 0;
  for (const id of SEASON_ORDER) {
    const d = Math.min(...PALETTE_LABS[id].map((p) => deltaE(p, lab)));
    raw[id] = Math.exp(-(d * d) / (2 * 16 * 16)) + 0.02;
    sum += raw[id];
  }
  for (const id of SEASON_ORDER) raw[id] /= sum;
  return raw;
}

/**
 * Score a color against a profile and describe the likely effect on the face.
 * Returns { score 0-100, effect: 'segar'|'pucat'|'kusam'|'mendominasi', label, note }
 */
export function evaluateColor(hex, profile) {
  if (!profile) return { score: 50, effect: 'netral', label: 'Belum dianalisis', note: '' };
  const aff = seasonAffinity(hex);
  const fromPalette = SEASON_ORDER.reduce((s, id) => s + aff[id] * (profile.scores[id] ?? 0), 0);
  const c = colorAxes(hex);
  const pw = profile.warmth, pc = profile.clarity, pd = profile.depth;
  const tempGap = Math.abs(c.warmth - pw) * (Math.abs(c.warmth) > 0.15 ? 1 : 0.4);
  const clarGap = Math.abs(c.clarity - pc);
  const axisScore = 1 - clamp((tempGap * 0.6 + clarGap * 0.4) / 1.6, 0, 1);
  const score = Math.round(clamp(fromPalette * 0.55 + axisScore * 0.45 + 0.18, 0, 1) * 100);

  let effect = 'segar';
  if (score < 62) {
    if (tempGap > 0.7) effect = 'kusam';
    else if (c.clarity - pc > 0.6 || c.depth - pd > 0.9) effect = 'mendominasi';
    else if (pc - c.clarity > 0.5 || pd - c.depth > 0.8) effect = 'pucat';
    else effect = 'kusam';
  }
  const warmUser = pw > 0;
  const notes = {
    segar: 'Warna ini memantulkan cahaya yang sejalan dengan undertone-mu: kulit tampak lebih rata, mata lebih jernih.',
    kusam: warmUser
      ? 'Undertone warna ini berlawanan dengan kulitmu yang hangat. Area bawah mata & sudut bibir bisa tampak keabuan.'
      : 'Warna berdasar kuning ini berlawanan dengan undertone sejukmu. Kulit bisa tampak kekuningan atau kusam.',
    pucat: 'Warna ini terlalu lembut/terang dibanding karakter wajahmu, sehingga wajah bisa tampak pucat dan kurang tegas.',
    mendominasi: 'Warna ini lebih pekat dari karakter alami wajahmu. Perhatian lebih tertuju pada warnanya daripada wajahmu.',
  };
  const labels = { segar: 'Segar', kusam: 'Kusam', pucat: 'Pucat', mendominasi: 'Mendominasi' };
  return { score, effect, label: labels[effect], note: notes[effect] };
}

// Visual parameters the renderers use to simulate a drape's effect on skin
export function faceEffect(hex, profile) {
  const ev = evaluateColor(hex, profile);
  const t = profile ? clamp((ev.score - 50) / 40, -1, 1) : 0;
  return {
    ...ev,
    glow: Math.max(0, t) * 0.9,
    dull: ev.effect === 'kusam' ? 0.35 + Math.max(0, -t) * 0.65 : 0,
    pale: ev.effect === 'pucat' ? 0.35 + Math.max(0, -t) * 0.65 : 0,
    heavy: ev.effect === 'mendominasi' ? 0.35 + Math.max(0, -t) * 0.65 : 0,
    tint: hex,
    sallow: profile && profile.warmth > 0 ? '#7E8796' : '#A39A5E',
  };
}
