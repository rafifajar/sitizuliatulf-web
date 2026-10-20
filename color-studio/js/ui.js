// Small shared UI helpers.
import { evaluateColor, readableOn } from './color.js';

let toastTimer = 0;
export function toast(msg, ms = 3200) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}

export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// A clickable color swatch; score dot shows fit with the profile when one exists
export function swatch(hex, { selected = false, profile = null, attrs = '', size = '', label = '' } = {}) {
  const ev = profile ? evaluateColor(hex, profile) : null;
  const tier = ev ? (ev.score >= 72 ? 'good' : ev.score >= 58 ? 'mid' : 'low') : '';
  return `<button class="sw ${size} ${selected ? 'sel' : ''}" style="--c:${hex};--on:${readableOn(hex)}" ${attrs}
    aria-label="${label || hex}${ev ? `, kecocokan ${ev.score}%` : ''}" aria-pressed="${selected}" title="${label || hex}${ev ? ` · ${ev.score}%` : ''}">
    ${tier ? `<i class="tier ${tier}"></i>` : ''}</button>`;
}
