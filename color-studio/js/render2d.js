// SVG illustration of the user (face, makeup, hair, clothes, hijab, glasses).
// Every layer is a pure function of `look`, so swapping a color re-renders instantly.
// The hijab, clothes and glasses layers are also reused on top of the user's photo (photo.js).
import { shade, mix } from './color.js';
import { LENS_COLORS, METALS } from './data.js';

let uid = 0;
const metal = (id) => METALS.find((m) => m.id === id) || METALS[0];
const lens = (id) => LENS_COLORS.find((l) => l.id === id) || LENS_COLORS[0];

export const FACE_PATH = 'M200,128 C240,128 266,155 266,200 C266,240 260,268 244,288 C230,304 214,312 200,312 C186,312 170,304 156,288 C140,268 134,240 134,200 C134,155 160,128 200,128 Z';
export const OPENING = 'M200,140 C238,140 262,168 262,212 C262,264 236,316 200,316 C164,316 138,264 138,212 C138,168 162,140 200,140 Z';
// The face oval in the 2D illustration, used to map layers onto the photo oval
export const FACE_OVAL_2D = { cx: 200, cy: 226, rx: 63, ry: 90 };

/* ---------- lens geometry (shared with the 3D avatar) ---------- */
export function lensPoints(shape, n = 56) {
  const pts = [];
  if (shape === 'hexagon') {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      pts.push([Math.cos(a) * 0.5, Math.sin(a) * 0.43]);
    }
    return pts;
  }
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    let c = Math.cos(t), s = Math.sin(t);
    let x, y;
    if (shape === 'round') { x = c * 0.43; y = s * 0.43; }
    else if (shape === 'square') {
      const e = 2 / 5;
      x = Math.sign(c) * Math.abs(c) ** e * 0.5; y = Math.sign(s) * Math.abs(s) ** e * 0.38;
    } else if (shape === 'cateye') {
      x = c * 0.5; y = s * 0.37;
      if (y < 0 && x > 0) y -= 0.16 * (x / 0.5) ** 2 * (-y / 0.37) ** 0.5; // lift outer-top corner
      if (y > 0) y *= 0.92 - 0.12 * (x / 0.5);
    } else { x = c * 0.5; y = s * 0.4; }
    pts.push([x, y]);
  }
  return pts;
}

// outer edge is +x; mirror for the left lens
function lensPath(shape, cx, cy, w, h, mirror) {
  const pts = lensPoints(shape).map(([x, y]) => [cx + (mirror ? -x : x) * w, cy + y * h * 1.25]);
  return 'M' + pts.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' L') + ' Z';
}

/* ---------- layers ---------- */
function hairBack(look) {
  const c = look.hairColor;
  return `<path d="M200,104 C118,104 98,168 102,240 C104,320 94,400 82,478 C130,492 270,492 318,478 C306,400 296,320 298,240 C302,168 282,104 200,104Z" fill="${shade(c, -0.12)}"/>`;
}

function hairFront(look) {
  const c = look.hairColor, hi = shade(c, 0.22);
  return `<g>
    <path d="M200,110 C138,110 120,160 122,206 C120,240 118,290 112,338 L124,338 C128,288 132,236 140,200 C146,162 176,144 206,140 C234,150 258,172 262,206 C268,236 272,288 276,338 L288,338 C282,290 280,240 278,206 C280,160 262,110 200,110Z" fill="${c}"/>
    <path d="M206,140 C190,150 168,166 152,196" stroke="${shade(c, -0.25)}" stroke-width="2" fill="none" opacity=".5"/>
    <path d="M160,134 C176,122 214,118 238,132" stroke="${hi}" stroke-width="4" fill="none" opacity=".45" stroke-linecap="round"/>
    <path d="M132,230 C130,262 134,296 130,330" stroke="${hi}" stroke-width="2" fill="none" opacity=".35"/>
  </g>`;
}

function body(look) {
  return `<path d="M176,334 C150,345 100,352 78,372 C62,388 58,420 56,540 L344,540 C342,420 338,388 322,372 C300,352 250,345 224,334 Z" fill="${look.skin}"/>
    <path d="M96,410 C98,450 98,500 100,540 M304,410 C302,450 302,500 300,540" stroke="${shade(look.skin, -0.18)}" stroke-width="1.5" fill="none" opacity=".6"/>`;
}

function neck(look) {
  const s = look.skin;
  return `<path d="M174,282 L174,344 Q200,362 226,344 L226,282 Z" fill="${shade(s, -0.06)}"/>
    <path d="M174,300 Q200,330 226,300 L226,282 L174,282Z" fill="${shade(s, -0.2)}" opacity=".55"/>`;
}

const SHOULDERS_L = 'M58,540 C58,430 62,392 80,374 C104,352 150,346 176,336';
const SHOULDERS_R = 'C250,346 296,352 320,374 C338,392 342,430 342,540 Z';

function neckline(kind) {
  switch (kind) {
    case 'v': return 'L200,396 L224,336';
    case 'deepv': return 'L200,420 L224,336';
    case 'square': return 'L170,352 L170,384 L230,384 L230,352 L224,336';
    case 'scoop': return 'Q200,398 224,336';
    default: return 'Q200,370 224,336';
  }
}

function clothes(look) {
  const c = look.clothColor, sh = shade(c, -0.22), hi = shade(c, 0.2), skin = look.skin;
  const full = (nk) => `<path d="${SHOULDERS_L} ${neckline(nk)} ${SHOULDERS_R}" fill="${c}"/>`;
  const folds = `<path d="M96,410 C98,450 98,500 100,540 M304,410 C302,450 302,500 300,540" stroke="${sh}" stroke-width="2" fill="none" opacity=".55"/>
    <path d="M140,430 C150,470 146,510 150,540 M262,440 C252,480 256,510 252,540" stroke="${sh}" stroke-width="1.5" fill="none" opacity=".3"/>`;
  const shortSleeves = (y = 432) => `
    <path d="M56,${y} L96,${y} L100,540 L56,540Z M304,${y} L344,${y} L344,540 L300,540Z" fill="${skin}"/>
    <path d="M56,${y} L96,${y} M304,${y} L344,${y}" stroke="${sh}" stroke-width="3"/>`;
  const inner = (nk = 'crew', col = '#F2EEE6') => `<path d="M150,346 C170,342 176,338 176,336 ${neckline(nk)} C224,338 230,342 250,346 L250,540 L150,540Z" fill="${col}"/>`;
  const lapels = (col, opening = 196) => `
    <path d="${SHOULDERS_L} L184,352 L166,394 L184,404 L${opening},540 Z" fill="${col}"/>
    <path d="M${400 - opening},540 L216,404 L234,394 L216,352 L224,336 C250,346 296,352 320,374 C338,392 342,430 342,540 Z" fill="${col}"/>
    <path d="M184,352 L166,394 L184,404 L${opening},540 M216,352 L234,394 L216,404 L${400 - opening},540" stroke="${shade(col, -0.3)}" stroke-width="2" fill="none"/>
    <path d="M176,336 L184,352 M224,336 L216,352" stroke="${shade(col, -0.3)}" stroke-width="2"/>`;

  switch (look.clothType) {
    case 'blouse': return full('v') + folds + `
      <path d="M176,336 Q182,346 180,356 Q188,364 186,374 Q194,382 192,392 L200,396 L208,392 Q206,382 214,374 Q212,364 220,356 Q218,346 224,336" stroke="${hi}" stroke-width="5" fill="none" stroke-linejoin="round"/>
      <ellipse cx="86" cy="392" rx="30" ry="26" fill="${hi}" opacity=".55"/><ellipse cx="314" cy="392" rx="30" ry="26" fill="${hi}" opacity=".55"/>`;
    case 'kemeja': return full('v') + folds + `
      <path d="M176,334 L160,372 L194,384 L200,396 Z" fill="${hi}" stroke="${sh}" stroke-width="1.5"/>
      <path d="M224,334 L240,372 L206,384 L200,396 Z" fill="${hi}" stroke="${sh}" stroke-width="1.5"/>
      <path d="M200,396 L200,540" stroke="${sh}" stroke-width="2"/>
      ${[420, 452, 484, 516].map((y) => `<circle cx="206" cy="${y}" r="3" fill="${shade(c, 0.45)}" stroke="${sh}"/>`).join('')}`;
    case 'sweater': return full('crew') + `
      <defs><pattern id="knit${uid}" width="10" height="12" patternUnits="userSpaceOnUse"><path d="M5,0 L5,12" stroke="${sh}" stroke-width="2" opacity=".18"/></pattern></defs>
      <path d="${SHOULDERS_L} ${neckline('crew')} ${SHOULDERS_R}" fill="url(#knit${uid})"/>
      <path d="M176,336 Q200,370 224,336" stroke="${sh}" stroke-width="9" fill="none"/>
      <path d="M176,336 Q200,370 224,336" stroke="${hi}" stroke-width="2" fill="none" stroke-dasharray="2 4" opacity=".6"/>` + folds;
    case 'tshirt': return full('crew') + folds + shortSleeves(430) + `<path d="M176,336 Q200,370 224,336" stroke="${sh}" stroke-width="4" fill="none"/>`;
    case 'outer': return inner('crew') + lapels(c) + `
      <path d="M118,470 L150,470" stroke="${shade(c, -0.3)}" stroke-width="2"/><circle cx="196" cy="470" r="4" fill="${shade(c, -0.35)}"/>`;
    case 'setelan': return inner('v', shade(c, 0.3)) + lapels(c, 194) + `
      <circle cx="194" cy="470" r="4" fill="${shade(c, -0.35)}"/><circle cx="194" cy="504" r="4" fill="${shade(c, -0.35)}"/>
      <path d="M262,446 L292,446" stroke="${shade(c, -0.3)}" stroke-width="2"/>`;
    case 'kardigan': return inner('crew', '#F4F1EA') + `
      <path d="${SHOULDERS_L} L190,360 L188,540 Z" fill="${c}"/>
      <path d="M212,540 L210,360 L224,336 C250,346 296,352 320,374 C338,392 342,430 342,540 Z" fill="${c}"/>
      <path d="M176,336 L190,360 L188,540 M224,336 L210,360 L212,540" stroke="${sh}" stroke-width="6" fill="none"/>
      ${[400, 440, 480, 520].map((y) => `<circle cx="190" cy="${y}" r="3.5" fill="${shade(c, 0.4)}"/>`).join('')}` + folds;
    case 'dress': return full('square') + `
      <path d="M100,500 Q200,512 300,500" stroke="${sh}" stroke-width="3" fill="none"/>
      ${[130, 160, 200, 240, 270].map((x) => `<path d="M${x},506 L${x + (x - 200) * 0.15},540" stroke="${sh}" stroke-width="1.5" opacity=".5"/>`).join('')}
      <ellipse cx="80" cy="388" rx="28" ry="22" fill="${hi}" opacity=".6"/><ellipse cx="320" cy="388" rx="28" ry="22" fill="${hi}" opacity=".6"/>` + shortSleeves(418);
    case 'tanktop': return `<path d="M100,540 L100,412 C102,386 122,376 150,366 L160,342 L172,342 C172,380 188,400 200,400 C212,400 228,380 228,342 L240,342 L250,366 C278,376 298,386 300,412 L300,540Z" fill="${c}"/>
      <path d="M140,440 C150,480 146,510 150,540 M262,450 C252,480 256,510 252,540" stroke="${sh}" stroke-width="1.5" fill="none" opacity=".3"/>`;
    case 'croptop': return full('square') + shortSleeves(426) + `
      <path d="M100,492 L300,492 L300,540 L100,540Z" fill="${skin}"/>
      <path d="M100,492 L300,492" stroke="${sh}" stroke-width="4"/>
      <ellipse cx="200" cy="526" rx="2.5" ry="4" fill="${shade(skin, -0.3)}"/>`;
    default: return full('crew') + folds;
  }
}

function face(look, fx) {
  const s = look.skin, id = uid;
  const k = look.makeupOn ? look.intensity : 0;
  const naturalLip = mix(s, '#B4615E', 0.45);
  const lipCol = mix(naturalLip, look.lip, Math.min(1, k * 1.15));
  const brow = shade(look.hijabOn ? '#3A2A22' : mix(look.hairColor, '#2A1E19', 0.4), 0);
  const sat = 1 + (fx?.glow || 0) * 0.12 - (fx?.pale || 0) * 0.3 - (fx?.dull || 0) * 0.18;
  const bright = 1 + (fx?.glow || 0) * 0.05 + (fx?.pale || 0) * 0.07 - (fx?.dull || 0) * 0.04 - (fx?.heavy || 0) * 0.03;
  return `<defs>
      <clipPath id="fc${id}"><path d="${FACE_PATH}"/></clipPath>
      <radialGradient id="fs${id}" cx="50%" cy="42%" r="62%"><stop offset="58%" stop-color="${s}" stop-opacity="0"/><stop offset="100%" stop-color="${shade(s, -0.32)}" stop-opacity=".75"/></radialGradient>
      <radialGradient id="bl${id}"><stop offset="0%" stop-color="${look.blush}" stop-opacity="${0.62 * k}"/><stop offset="100%" stop-color="${look.blush}" stop-opacity="0"/></radialGradient>
      <linearGradient id="es${id}" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stop-color="${look.shadow}" stop-opacity="${0.85 * k}"/><stop offset="100%" stop-color="${look.shadow}" stop-opacity="0"/></linearGradient>
      <radialGradient id="gl${id}" cx="50%" cy="48%" r="50%"><stop offset="0%" stop-color="#FFF8F0" stop-opacity="${(fx?.glow || 0) * 0.32}"/><stop offset="100%" stop-color="#FFF8F0" stop-opacity="0"/></radialGradient>
      <radialGradient id="rf${id}" cx="50%" cy="100%" r="70%"><stop offset="0%" stop-color="${fx?.tint || s}" stop-opacity=".22"/><stop offset="100%" stop-color="${fx?.tint || s}" stop-opacity="0"/></radialGradient>
      <filter id="ff${id}" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="${sat.toFixed(3)}"/><feComponentTransfer><feFuncR type="linear" slope="${bright.toFixed(3)}"/><feFuncG type="linear" slope="${bright.toFixed(3)}"/><feFuncB type="linear" slope="${bright.toFixed(3)}"/></feComponentTransfer></filter>
    </defs>
    ${!look.hijabOn || look.hijabStyle === 'turban' ? earsLayer(look) : ''}
    <g filter="url(#ff${id})">
      <path d="${FACE_PATH}" fill="${s}"/>
      <g clip-path="url(#fc${id})">
        <path d="${FACE_PATH}" fill="url(#fs${id})"/>
        <ellipse cx="200" cy="176" rx="26" ry="12" fill="#fff" opacity=".07"/>
        <rect x="120" y="200" width="160" height="130" fill="url(#rf${id})"/>
        <ellipse cx="200" cy="230" rx="80" ry="100" fill="url(#gl${id})"/>
        ${fx?.dull ? `<path d="${FACE_PATH}" fill="${fx.sallow}" opacity="${(fx.dull * 0.2).toFixed(3)}" style="mix-blend-mode:multiply"/>
          <ellipse cx="172" cy="240" rx="18" ry="8" fill="${fx.sallow}" opacity="${(fx.dull * 0.35).toFixed(3)}"/><ellipse cx="228" cy="240" rx="18" ry="8" fill="${fx.sallow}" opacity="${(fx.dull * 0.35).toFixed(3)}"/>` : ''}
        ${fx?.pale ? `<path d="${FACE_PATH}" fill="#F3F1EE" opacity="${(fx.pale * 0.2).toFixed(3)}"/>` : ''}
        ${fx?.heavy ? `<path d="${FACE_PATH}" fill="${shade(s, -0.5)}" opacity="${(fx.heavy * 0.12).toFixed(3)}"/>` : ''}
      </g>
      <ellipse cx="158" cy="258" rx="24" ry="14" fill="url(#bl${id})"/>
      <ellipse cx="242" cy="258" rx="24" ry="14" fill="url(#bl${id})"/>
      <path d="M152,221 Q172,198 192,219 Q172,208 152,221Z" fill="url(#es${id})"/>
      <path d="M248,221 Q228,198 208,219 Q228,208 248,221Z" fill="url(#es${id})"/>
      ${eye(172)}${eye(228)}
      <path d="M151,205 Q164,191 189,197 Q166,196 151,205Z" fill="${brow}"/>
      <path d="M249,205 Q236,191 211,197 Q234,196 249,205Z" fill="${brow}"/>
      <path d="M204,234 Q207,248 208,254" stroke="${shade(s, -0.22)}" stroke-width="1.4" fill="none" opacity=".45"/>
      <path d="M192,256 Q196,260 200,259 Q204,260 208,256" stroke="${shade(s, -0.32)}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      <ellipse cx="200" cy="250" rx="4" ry="6" fill="#fff" opacity=".1"/>
      <path d="M181,282 Q189,271 200,276 Q211,271 219,282 Q200,286 181,282Z" fill="${shade(lipCol, -0.08)}"/>
      <path d="M181,282 Q200,301 219,282 Q200,287 181,282Z" fill="${lipCol}"/>
      <path d="M183,282 Q200,285.5 217,282" stroke="${shade(lipCol, -0.4)}" stroke-width="1.2" fill="none"/>
      <ellipse cx="203" cy="289" rx="6" ry="2" fill="#fff" opacity=".22"/>
    </g>`;
}

function eye(cx) {
  return `<path d="M${cx - 16},222 Q${cx},211 ${cx + 16},222 Q${cx},230 ${cx - 16},222Z" fill="#FBF8F4"/>
    <circle cx="${cx}" cy="221.5" r="6.6" fill="#3B2A22"/><circle cx="${cx}" cy="221.5" r="3" fill="#120C0A"/>
    <circle cx="${cx + 2}" cy="219.5" r="1.6" fill="#fff"/>
    <path d="M${cx - 17},222 Q${cx},208 ${cx + 17},221" stroke="#21160F" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M${cx + (cx < 200 ? -17 : 17)},222 l${cx < 200 ? -5 : 5},-4" stroke="#21160F" stroke-width="2" stroke-linecap="round"/>
    <path d="M${cx - 13},226 Q${cx},231 ${cx + 13},226" stroke="#6B5048" stroke-width=".8" fill="none" opacity=".5"/>`;
}

function earsLayer(look) {
  const s = look.skin;
  return `<ellipse cx="134" cy="228" rx="9" ry="18" fill="${shade(s, -0.08)}"/><ellipse cx="266" cy="228" rx="9" ry="18" fill="${shade(s, -0.08)}"/>`;
}

function earrings(look) {
  if (look.earrings === 'none' || (look.hijabOn && look.hijabStyle !== 'turban')) return '';
  const m = metal(look.earrings);
  return `<g fill="${m.hex}" stroke="${shade(m.hex, -0.35)}" stroke-width=".8">
      <circle cx="133" cy="248" r="3"/><path d="M133,251 L133,262"/><circle cx="133" cy="266" r="5"/>
      <circle cx="267" cy="248" r="3"/><path d="M267,251 L267,262"/><circle cx="267" cy="266" r="5"/></g>`;
}

function necklace(look) {
  if (!look.necklace || (look.hijabOn && look.hijabStyle !== 'turban' && look.hijabStyle !== 'sport')) return '';
  const m = metal(look.earrings);
  return `<path d="M172,344 Q200,392 228,344" stroke="${m.hex}" stroke-width="2" fill="none"/>
    <path d="M200,370 L194,380 L200,392 L206,380Z" fill="${m.hex}" stroke="${shade(m.hex, -0.35)}" stroke-width=".8"/>`;
}

const HIJAB_OUTER = {
  instant: 'M200,106 C138,106 118,156 120,215 C112,262 120,300 132,322 C100,340 72,360 64,398 C60,420 62,440 72,452 C120,470 170,476 200,476 C230,476 280,470 328,452 C338,440 340,420 336,398 C328,360 300,340 268,322 C280,300 288,262 280,215 C282,156 262,106 200,106Z',
  bergo: 'M200,106 C138,106 118,156 120,215 C112,262 120,300 132,322 C104,336 82,350 76,372 C74,390 82,404 98,412 C140,426 172,430 200,430 C228,430 260,426 302,412 C318,404 326,390 324,372 C318,350 296,336 268,322 C280,300 288,262 280,215 C282,156 262,106 200,106Z',
  khimar: 'M200,104 C136,104 116,156 118,215 C110,262 118,300 130,322 C92,342 56,370 48,420 L40,540 L360,540 L352,420 C344,370 308,342 270,322 C282,300 290,262 282,215 C284,156 264,104 200,104Z',
  'segi-empat': 'M200,106 C138,106 118,156 120,215 C112,262 120,300 132,322 C102,340 72,360 64,398 C64,428 90,444 122,452 L200,508 L278,452 C310,444 336,428 336,398 C328,360 298,340 268,322 C280,300 288,262 280,215 C282,156 262,106 200,106Z',
  pashmina: 'M200,106 C138,106 118,156 120,215 C112,262 118,298 128,320 C98,345 82,382 80,432 L84,540 L142,540 C144,476 152,444 172,424 C220,404 280,394 320,412 C334,400 336,380 326,360 C312,338 292,328 272,318 C282,295 290,260 280,215 C282,156 262,106 200,106Z',
  shawl: 'M200,104 C136,104 116,156 118,215 C110,262 116,298 126,320 C94,346 76,386 74,436 L76,540 L140,540 C142,480 150,446 172,424 C220,402 260,404 290,420 L296,540 L330,540 C330,470 334,420 334,388 C330,358 304,334 274,318 C284,295 292,260 282,215 C284,156 264,104 200,104Z',
  sport: 'M200,108 C140,108 122,154 124,212 C118,268 128,306 140,328 L136,376 L264,376 L260,328 C272,306 282,268 276,212 C278,154 260,108 200,108Z',
};

function hijab(look) {
  const c = look.hijabColor, sh = shade(c, -0.24), hi = shade(c, 0.18), id = uid, style = look.hijabStyle;
  const grad = `<defs><linearGradient id="hg${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hi}"/><stop offset=".45" stop-color="${c}"/><stop offset="1" stop-color="${shade(c, -0.12)}"/></linearGradient></defs>`;
  if (style === 'turban') {
    return grad + `<path d="M200,84 C120,84 106,150 114,206 C118,224 130,228 138,214 C140,170 168,150 200,150 C232,150 260,170 262,214 C270,228 282,224 286,206 C294,150 280,84 200,84Z" fill="url(#hg${id})"/>
      <path d="M150,156 C170,120 196,112 214,150 M250,156 C230,120 204,112 186,150" stroke="${sh}" stroke-width="10" fill="none" stroke-linecap="round"/>
      <path d="M150,156 C170,120 196,112 214,150 M250,156 C230,120 204,112 186,150" stroke="${hi}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>
      <path d="M124,190 C140,120 260,120 276,190" stroke="${sh}" stroke-width="2" fill="none" opacity=".4"/>`;
  }
  const outer = HIJAB_OUTER[style] || HIJAB_OUTER.instant;
  let extra = '';
  if (style === 'segi-empat') extra = `<path d="M132,322 C160,344 182,352 200,354 C218,352 240,344 268,322" stroke="${sh}" stroke-width="2" fill="none" opacity=".6"/>
    <path d="M150,380 L200,500 M250,380 L200,500 M120,420 L196,470" stroke="${sh}" stroke-width="1.6" opacity=".35"/>
    <circle cx="200" cy="326" r="4" fill="${shade(c, 0.5)}" stroke="${sh}"/>`;
  if (style === 'pashmina' || style === 'shawl') extra = `<path d="M128,320 C170,346 240,350 302,330 C314,350 320,372 322,410 C272,392 212,400 170,424 C150,400 136,362 128,320Z" fill="${hi}" opacity=".55"/>
    <path d="M136,346 C180,368 250,366 306,350 M150,384 C200,380 260,372 316,386 M100,400 C102,450 104,500 108,540" stroke="${sh}" stroke-width="1.8" fill="none" opacity=".45"/>`;
  if (style === 'instant' || style === 'khimar' || style === 'bergo') extra = `<path d="M132,322 C160,346 240,346 268,322" stroke="${sh}" stroke-width="2" fill="none" opacity=".5"/>
    <path d="M120,360 C130,400 136,430 140,${style === 'bergo' ? 420 : 470} M280,360 C270,400 264,430 260,${style === 'bergo' ? 420 : 470}" stroke="${sh}" stroke-width="1.6" fill="none" opacity=".35"/>`;
  if (style === 'bergo') extra += `<path d="M144,152 Q200,112 256,152 Q200,138 144,152Z" fill="${sh}"/><path d="M144,152 Q200,112 256,152" stroke="${hi}" stroke-width="1.5" fill="none"/>`;
  if (style === 'sport') extra = `<path d="M140,328 L260,328" stroke="${sh}" stroke-width="2.5" opacity=".6"/><path d="M128,212 C128,150 272,150 272,212" stroke="${hi}" stroke-width="3" fill="none" opacity=".5"/>`;
  return grad + `<path d="${outer} ${OPENING}" fill="url(#hg${id})" fill-rule="evenodd"/>
    <path d="${OPENING}" stroke="${sh}" stroke-width="5" fill="none" opacity=".45"/>
    <path d="M166,120 C142,140 128,180 128,228 M234,120 C258,140 272,180 272,228" stroke="${sh}" stroke-width="1.6" fill="none" opacity=".3"/>
    ${extra}`;
}

function glasses(look) {
  if (!look.glassesOn) return '';
  const L = lens(look.lensColor), f = metal(look.frame), id = uid;
  const w = 52, h = 38;
  const left = lensPath(look.lensShape, 171, 223, w, h, true);
  const right = lensPath(look.lensShape, 229, 223, w, h, false);
  return `<defs><linearGradient id="lg${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${L.hex}" stop-opacity="${Math.min(0.92, L.alpha + 0.2)}"/><stop offset="1" stop-color="${L.hex}" stop-opacity="${L.alpha * 0.55}"/></linearGradient></defs>
    <g>
      <path d="${left}" fill="url(#lg${id})" stroke="#fff" stroke-opacity=".7" stroke-width="1"/>
      <path d="${right}" fill="url(#lg${id})" stroke="#fff" stroke-opacity=".7" stroke-width="1"/>
      <path d="M156,206 L170,200 M214,206 L228,200" stroke="#fff" stroke-width="2.5" opacity=".45" stroke-linecap="round"/>
      <path d="M192,214 Q200,208 208,214" stroke="${f.hex}" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M144,214 L132,212 M256,214 L268,212" stroke="${f.hex}" stroke-width="3" stroke-linecap="round"/>
      <circle cx="144" cy="214" r="2.4" fill="${f.hex}"/><circle cx="256" cy="214" r="2.4" fill="${f.hex}"/>
    </g>`;
}

/* ---------- public API ---------- */
export function layers(look, fx) {
  uid++;
  const showHair = !look.hijabOn;
  return {
    hairBack: showHair ? hairBack(look) : '',
    body: body(look),
    clothes: clothes(look),
    neck: neck(look),
    face: face(look, fx),
    hairFront: showHair ? hairFront(look) : '',
    hijab: look.hijabOn ? hijab(look) : '',
    necklace: necklace(look),
    earrings: earrings(look),
    glasses: glasses(look),
  };
}

export function renderFigure(look, fx, { bg = true, viewBox = '0 0 400 540', cls = '' } = {}) {
  const L = layers(look, fx);
  const bgId = 'bg' + uid;
  return `<svg class="${cls}" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Simulasi tampilan">
    ${bg ? `<defs><radialGradient id="${bgId}" cx="50%" cy="38%" r="75%"><stop offset="0" stop-color="#FBF8F3"/><stop offset="1" stop-color="#ECE6DD"/></radialGradient></defs><rect width="400" height="540" fill="url(#${bgId})"/>` : ''}
    ${L.hairBack}${L.body}${L.clothes}${L.necklace}${L.neck}${L.face}${L.hairFront}${L.hijab}${L.earrings}${L.glasses}
  </svg>`;
}

// Thumbnails for the item pickers
export function hijabThumb(look, style) {
  const l = { ...look, hijabOn: true, hijabStyle: style, glassesOn: false, makeupOn: false };
  return renderFigure(l, null, { viewBox: '40 70 320 400', cls: 'thumb-svg' });
}
export function clothThumb(look, type) {
  const l = { ...look, clothType: type, hijabOn: false, glassesOn: false, necklace: false };
  const L = layers(l, null);
  return `<svg class="thumb-svg" viewBox="40 300 320 240" xmlns="http://www.w3.org/2000/svg">${L.body}${L.clothes}${L.neck}</svg>`;
}
export function lensThumb(shape, lensId, frameId) {
  const L = lens(lensId), f = metal(frameId);
  const l = lensPath(shape, 30, 25, 34, 26, true), r = lensPath(shape, 70, 25, 34, 26, false);
  return `<svg class="thumb-svg" viewBox="0 0 100 50" xmlns="http://www.w3.org/2000/svg">
    <path d="${l}" fill="${L.hex}" fill-opacity="${Math.max(0.3, L.alpha)}" stroke="#9aa" stroke-opacity=".6"/>
    <path d="${r}" fill="${L.hex}" fill-opacity="${Math.max(0.3, L.alpha)}" stroke="#9aa" stroke-opacity=".6"/>
    <path d="M44,20 Q50,16 56,20" stroke="${f.hex}" stroke-width="2" fill="none"/>
    <path d="M13,20 L4,18 M87,20 L96,18" stroke="${f.hex}" stroke-width="2"/></svg>`;
}
