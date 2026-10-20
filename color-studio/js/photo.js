// Draping on the user's own photo. The aligned crop puts the face in a known oval,
// so the hijab and glasses layers from render2d are mapped onto it with one transform,
// and a consultant-style cape carries the clothing color under the chin.
import { CROP } from './analysis.js';
import { layers, FACE_OVAL_2D } from './render2d.js';
import { shade } from './color.js';

let uid = 0;
const S = (CROP.rx / FACE_OVAL_2D.rx + CROP.ry / FACE_OVAL_2D.ry) / 2;
const TX = CROP.cx - FACE_OVAL_2D.cx * S;
const TY = CROP.cy - FACE_OVAL_2D.cy * S;
export const MAP_2D = `translate(${TX.toFixed(2)},${TY.toFixed(2)}) scale(${S.toFixed(4)})`;

export const glassesOffset = { x: 0, y: 0 };

export function renderPhoto(photo, look, fx, { cls = '', interactive = false } = {}) {
  uid++;
  const L = layers(look, null);
  const id = uid;
  const sat = 1 + (fx?.glow || 0) * 0.1 - (fx?.pale || 0) * 0.28 - (fx?.dull || 0) * 0.16;
  const br = 1 + (fx?.glow || 0) * 0.05 + (fx?.pale || 0) * 0.07 - (fx?.dull || 0) * 0.03;
  const c = look.clothColor;
  const capeY = CROP.cy + CROP.ry * 0.98;
  const cape = `<path d="M${CROP.cx - 120},${capeY} C${CROP.cx - 70},${capeY + 30} ${CROP.cx + 70},${capeY + 30} ${CROP.cx + 120},${capeY}
      C${CROP.cx + 200},${capeY + 10} ${CROP.w},${capeY + 40} ${CROP.w + 10},${CROP.h + 10} L-10,${CROP.h + 10} C0,${capeY + 40} ${CROP.cx - 200},${capeY + 10} ${CROP.cx - 120},${capeY}Z" fill="${c}"/>
    <path d="M${CROP.cx - 120},${capeY} C${CROP.cx - 70},${capeY + 30} ${CROP.cx + 70},${capeY + 30} ${CROP.cx + 120},${capeY}" stroke="${shade(c, -0.25)}" stroke-width="6" fill="none"/>`;
  const showCape = !look.hijabOn || ['turban', 'sport'].includes(look.hijabStyle);
  const ox = glassesOffset.x, oy = glassesOffset.y;
  return `<svg class="${cls}" viewBox="0 0 ${CROP.w} ${CROP.h}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Simulasi warna pada foto">
    <defs>
      <filter id="pf${id}" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="${sat.toFixed(3)}"/>
        <feComponentTransfer><feFuncR type="linear" slope="${br.toFixed(3)}"/><feFuncG type="linear" slope="${br.toFixed(3)}"/><feFuncB type="linear" slope="${br.toFixed(3)}"/></feComponentTransfer></filter>
      <radialGradient id="pm${id}"><stop offset=".7" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
      <mask id="pk${id}"><ellipse cx="${CROP.cx}" cy="${CROP.cy}" rx="${CROP.rx}" ry="${CROP.ry}" fill="url(#pm${id})"/></mask>
      <radialGradient id="pr${id}" cx="50%" cy="100%" r="65%"><stop offset="0" stop-color="${fx?.tint || c}" stop-opacity=".2"/><stop offset="1" stop-color="${fx?.tint || c}" stop-opacity="0"/></radialGradient>
    </defs>
    <image href="${photo.url}" width="${CROP.w}" height="${CROP.h}" filter="url(#pf${id})"/>
    <g mask="url(#pk${id})">
      <rect x="0" y="${CROP.cy}" width="${CROP.w}" height="${CROP.ry}" fill="url(#pr${id})"/>
      ${fx?.glow ? `<ellipse cx="${CROP.cx}" cy="${CROP.cy}" rx="${CROP.rx}" ry="${CROP.ry}" fill="#FFF6EC" opacity="${(fx.glow * 0.08).toFixed(3)}" style="mix-blend-mode:screen"/>` : ''}
      ${fx?.dull ? `<ellipse cx="${CROP.cx}" cy="${CROP.cy}" rx="${CROP.rx}" ry="${CROP.ry}" fill="${fx.sallow}" opacity="${(fx.dull * 0.18).toFixed(3)}" style="mix-blend-mode:multiply"/>` : ''}
      ${fx?.pale ? `<ellipse cx="${CROP.cx}" cy="${CROP.cy}" rx="${CROP.rx}" ry="${CROP.ry}" fill="#F4F2EF" opacity="${(fx.pale * 0.16).toFixed(3)}"/>` : ''}
      ${fx?.heavy ? `<ellipse cx="${CROP.cx}" cy="${CROP.cy}" rx="${CROP.rx}" ry="${CROP.ry}" fill="#000" opacity="${(fx.heavy * 0.07).toFixed(3)}"/>` : ''}
    </g>
    ${showCape ? cape : ''}
    <g transform="${MAP_2D}">${L.hijab}</g>
    <g class="photo-glasses" transform="translate(${ox},${oy}) ${MAP_2D}" ${interactive ? 'style="cursor:grab"' : ''}>${L.glasses}</g>
  </svg>`;
}
