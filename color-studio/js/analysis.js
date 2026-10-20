// On-device color analysis. The photo is aligned so the face fills a known oval,
// then skin, features, and background are sampled to estimate undertone, depth and clarity.
// It is an estimate from one photo under one light, and the UI says so.
import { SEASONS, SEASON_ORDER } from './data.js';
import { rgbToLab, labToRgb, rgbToHex, hexToRgb, clamp } from './color.js';

export const CROP = { w: 600, h: 750, cx: 300, cy: 360, rx: 185, ry: 245 };

export const REGIONS = {
  forehead: { dx: 0, dy: -0.55, sw: 0.22, sh: 0.08, label: 'Dahi' },
  cheekL: { dx: -0.45, dy: 0.12, sw: 0.13, sh: 0.1, label: 'Pipi kiri' },
  cheekR: { dx: 0.45, dy: 0.12, sw: 0.13, sh: 0.1, label: 'Pipi kanan' },
  chin: { dx: 0, dy: 0.68, sw: 0.12, sh: 0.06, label: 'Dagu' },
  eyeL: { dx: -0.36, dy: -0.2, sw: 0.17, sh: 0.14, label: 'Mata & alis' },
  eyeR: { dx: 0.36, dy: -0.2, sw: 0.17, sh: 0.14, label: 'Mata & alis' },
};

export const regionRect = (r) => ({
  x: CROP.cx + r.dx * CROP.rx - r.sw * CROP.rx,
  y: CROP.cy + r.dy * CROP.ry - r.sh * CROP.ry,
  w: r.sw * CROP.rx * 2,
  h: r.sh * CROP.ry * 2,
});

const median = (arr) => {
  if (!arr.length) return NaN;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

function readRegion(ctx, rect) {
  const x = Math.round(rect.x), y = Math.round(rect.y);
  const w = Math.max(2, Math.round(rect.w)), h = Math.max(2, Math.round(rect.h));
  const d = ctx.getImageData(x, y, w, h).data;
  const labs = [];
  let blown = 0;
  for (let i = 0; i < d.length; i += 8) { // every other pixel is plenty
    if (d[i] > 248 && d[i + 1] > 248 && d[i + 2] > 248) blown++;
    labs.push(rgbToLab([d[i], d[i + 1], d[i + 2]]));
  }
  return { labs, blown: blown / Math.max(1, labs.length) };
}

function skinStats(labs) {
  const skin = labs.filter(([L, a, b]) => {
    const C = Math.hypot(a, b), h = (Math.atan2(b, a) * 180) / Math.PI;
    return L > 18 && L < 96 && C > 4 && C < 55 && h > 10 && h < 95;
  });
  return {
    n: skin.length, ratio: skin.length / Math.max(1, labs.length),
    L: median(skin.map((p) => p[0])), a: median(skin.map((p) => p[1])), b: median(skin.map((p) => p[2])),
  };
}

const QUIZ = {
  veins: { green: 1, blue: -1, mixed: 0 },
  jewelry: { gold: 1, silver: -1, both: 0 },
  sun: { tan: 0.6, burn: -0.6, both: 0 },
};

function quizAxes(quiz = {}) {
  const w = ['veins', 'jewelry', 'sun'].filter((k) => quiz[k]).map((k) => QUIZ[k][quiz[k]]);
  const depth = { light: -0.6, medium: 0, dark: 0.6 }[quiz.features];
  return {
    warmth: w.length ? w.reduce((a, b) => a + b, 0) / w.length : null,
    depth: depth ?? null,
    answered: w.length + (depth != null ? 1 : 0),
  };
}

export function seasonScores(ax) {
  const W = { warmth: 1.7, depth: 0.75, clarity: 1.0 };
  const raw = {};
  let sum = 0;
  for (const id of SEASON_ORDER) {
    const p = SEASONS[id].proto;
    const d2 = Object.keys(W).reduce((s, k) => s + W[k] * (ax[k] - p[k]) ** 2, 0);
    raw[id] = Math.exp(-1.0 * d2);
    sum += raw[id];
  }
  for (const id of SEASON_ORDER) raw[id] /= sum;
  return raw;
}

export function buildProfile(ax, extra = {}) {
  const scores = seasonScores(ax);
  const ranked = [...SEASON_ORDER].sort((a, b) => scores[b] - scores[a]);
  const w = ax.warmth;
  const undertone = w > 0.25 ? 'Hangat' : w < -0.25 ? 'Sejuk' : w >= 0 ? 'Netral-hangat' : 'Netral-sejuk';
  return {
    ...ax,
    scores,
    season: ranked[0],
    secondSeason: ranked[1],
    leastSeason: ranked[3],
    undertone,
    createdAt: Date.now(),
    ...extra,
  };
}

export function recommendedLook(profile) {
  const s = SEASONS[profile.season];
  return {
    hijabColor: s.clothes[2], clothColor: s.clothes[0], lip: s.lips[0], blush: s.blush[0], shadow: s.shadow[0],
    hairColor: s.hair[0], frame: s.metals[0], earrings: s.metals[0], lensColor: s.lenses[0],
  };
}

/** Analyze an aligned CROP-sized canvas. */
export function analyzeCanvas(canvas, quiz) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const reads = Object.fromEntries(Object.entries(REGIONS).map(([k, r]) => [k, readRegion(ctx, regionRect(r))]));
  const skinKeys = ['forehead', 'cheekL', 'cheekR', 'chin'];
  const stats = Object.fromEntries(skinKeys.map((k) => [k, skinStats(reads[k].labs)]));
  const valid = skinKeys.filter((k) => stats[k].n > 20 && stats[k].ratio > 0.35);
  const warnings = [];
  if (valid.length < 2) {
    return { error: 'Area kulit tidak terdeteksi dengan jelas. Pastikan wajah mengisi oval, tanpa masker atau bayangan berat, lalu coba lagi.' };
  }

  // Background (corners) as a rough white-balance reference
  const corners = [[10, 10], [CROP.w - 70, 10], [10, CROP.h - 70], [CROP.w - 70, CROP.h - 70]]
    .flatMap(([x, y]) => readRegion(ctx, { x, y, w: 60, h: 60 }).labs);
  const bg = { L: median(corners.map((p) => p[0])), a: median(corners.map((p) => p[1])), b: median(corners.map((p) => p[2])) };
  const bgC = Math.hypot(bg.a, bg.b);

  let L = median(valid.map((k) => stats[k].L));
  let a = median(valid.map((k) => stats[k].a));
  let b = median(valid.map((k) => stats[k].b));
  let wbCorrected = false;
  if (bg.L > 35 && bgC > 4 && bgC < 20) { // looks like a near-neutral wall with a light cast
    a -= bg.a * 0.6; b -= bg.b * 0.6; wbCorrected = true;
  }

  // Features: darkest pixels in eye/brow zones
  const feat = [...reads.eyeL.labs, ...reads.eyeR.labs].map((p) => p[0]).sort((x, y) => x - y);
  const featureL = feat.length ? feat[Math.floor(feat.length * 0.12)] : L - 40;
  const contrast = L - featureL;

  // Lighting quality
  let lightScore = 100;
  if (L < 38) { warnings.push('Cahaya terlalu redup — wajah tampak lebih gelap dari aslinya.'); lightScore -= 30; }
  if (L > 86) { warnings.push('Cahaya terlalu terang — warna kulit bisa terbaca lebih pucat.'); lightScore -= 25; }
  const blown = Math.max(...skinKeys.map((k) => reads[k].blown));
  if (blown > 0.06) { warnings.push('Ada pantulan cahaya (kilap) di kulit.'); lightScore -= 15; }
  if (stats.cheekL.n > 20 && stats.cheekR.n > 20 && Math.abs(stats.cheekL.L - stats.cheekR.L) > 8) {
    warnings.push(`Cahaya tidak merata — pipi ${stats.cheekL.L < stats.cheekR.L ? 'kiri' : 'kanan'} lebih gelap.`); lightScore -= 15;
  }
  if (bgC > 12) { warnings.push(`Pencahayaan cenderung ${bg.b > 0 ? 'kekuningan' : 'kebiruan'}; hasil undertone bisa bergeser.`); lightScore -= 20; }
  lightScore = clamp(lightScore, 15, 100);

  const C = Math.hypot(a, b);
  const h = (Math.atan2(b, a) * 180) / Math.PI;
  const photo = {
    warmth: clamp((h - 56) / 9),
    depth: clamp((62 - L) / 14),
    clarity: clamp(((C - 22) / 7) * 0.5 + ((contrast - 42) / 16) * 0.5),
  };
  const q = quizAxes(quiz);
  const ax = {
    warmth: q.warmth != null ? clamp(photo.warmth * 0.6 + q.warmth * 0.4) : photo.warmth,
    depth: q.depth != null ? clamp(photo.depth * 0.75 + q.depth * 0.25) : photo.depth,
    clarity: photo.clarity,
    contrast,
  };

  const skin = rgbToHex(labToRgb([L, a, b]));
  const samples = valid.map((k) => ({ key: k, label: REGIONS[k].label, hex: rgbToHex(labToRgb([stats[k].L, stats[k].a, stats[k].b])) }));
  const profile = buildProfile(ax, {
    source: 'photo', skin, samples,
    metrics: { L, a, b, C, h, featureL },
    lighting: { score: Math.round(lightScore), warnings, wbCorrected },
    quizAnswered: q.answered,
  });
  const top = profile.scores[profile.season];
  const conf = clamp(top * 0.6 + (lightScore / 100) * 0.3 + Math.min(q.answered, 4) * 0.025, 0, 0.95);
  profile.confidence = { value: Math.round(conf * 100), label: conf > 0.7 ? 'Tinggi' : conf > 0.5 ? 'Sedang' : 'Rendah' };
  return { profile };
}

/** Profile without a photo: from a chosen skin tone + undertone, or a season picked directly. */
export function manualProfile({ skin, undertone, season }) {
  const [L] = rgbToLab(hexToRgb(skin));
  let ax;
  if (season) {
    const p = SEASONS[season].proto;
    ax = { warmth: p.warmth * 0.85, depth: clamp(p.depth * 0.6 + ((62 - L) / 14) * 0.4), clarity: p.clarity * 0.8, contrast: 45 };
  } else {
    const warmth = { warm: 0.75, cool: -0.75, neutral: 0.05, unknown: 0.2 }[undertone] ?? 0.2;
    const depth = clamp((62 - L) / 14);
    ax = { warmth, depth, clarity: depth > 0.3 ? 0.1 : -0.1, contrast: 45 };
  }
  const profile = buildProfile(ax, { source: 'manual', skin, samples: [], lighting: null, quizAnswered: 0 });
  if (season) { profile.season = season; }
  profile.confidence = { value: null, label: 'Manual' };
  return profile;
}

