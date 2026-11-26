/*!
 * favicon-modder 0.2.0 — redraw the page favicon through a pipeline of small mods.
 * MIT licence. Copyright (c) 2026 the favicon-modder authors.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else if (typeof define === 'function' && define.amd) define([], factory);
  else root.FaviconModder = factory();
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';

  const VERSION = '0.2.0';

  /* ------------------------------------------------------------------ colours */

  /** @typedef {{r: number, g: number, b: number, a: number}} RGBA  channels 0–255, alpha 0–1 */

  // The CSS 2 names; in a browser every other CSS name is resolved through a canvas.
  const NAMED = {
    black: '000000', silver: 'c0c0c0', gray: '808080', grey: '808080', white: 'ffffff', maroon: '800000',
    red: 'ff0000', purple: '800080', fuchsia: 'ff00ff', magenta: 'ff00ff', green: '008000', lime: '00ff00',
    olive: '808000', yellow: 'ffff00', navy: '000080', blue: '0000ff', teal: '008080', aqua: '00ffff',
    cyan: '00ffff', orange: 'ffa500',
  };
  const nameCache = new Map();
  let scratch = null;

  function resolveName(name) {
    if (nameCache.has(name)) return nameCache.get(name);
    let value = null;
    if (typeof document !== 'undefined') {
      scratch = scratch || document.createElement('canvas').getContext('2d');
      scratch.fillStyle = '#010203';
      scratch.fillStyle = name; // an unknown name leaves the sentinel in place
      if (scratch.fillStyle !== '#010203') value = scratch.fillStyle;
    }
    nameCache.set(name, value);
    return value;
  }

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const round3 = (v) => Math.round(v * 1000) / 1000;
  const unit = (p, scale) => (p.endsWith('%') ? (parseFloat(p) / 100) * scale : parseFloat(p));

  function hslToRgb(h, s, l) {
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return [f(0), f(8), f(4)].map((v) => Math.round(v * 255));
  }

  /**
   * Parse a CSS colour: `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb()` / `rgba()`, `hsl()` / `hsla()`
   * (comma or space syntax), `transparent` and named colours.
   * @param {string|RGBA} input
   * @returns {RGBA|null} null when it is not a colour
   */
  function parseColor(input) {
    if (input && typeof input === 'object') return input;
    const s = String(input ?? '').trim().toLowerCase();
    let m = /^#([0-9a-f]{3,8})$/.exec(s);
    if (m) {
      let h = m[1];
      if (h.length === 3 || h.length === 4) h = h.replace(/./g, '$&$&');
      if (h.length !== 6 && h.length !== 8) return null;
      const n = (i) => parseInt(h.slice(i, i + 2), 16);
      return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? round3(n(6) / 255) : 1 };
    }
    m = /^(rgb|hsl)a?\(([^)]*)\)$/.exec(s);
    if (m) {
      const p = m[2].split(/[\s,/]+/).filter(Boolean);
      if (p.length < 3 || p.length > 4) return null;
      const a = p[3] === undefined ? 1 : clamp(unit(p[3], 1), 0, 1);
      const rgb = m[1] === 'rgb'
        ? p.slice(0, 3).map((v) => clamp(Math.round(unit(v, 255)), 0, 255))
        : hslToRgb(((parseFloat(p[0]) % 360) + 360) % 360, clamp(unit(p[1], 1), 0, 1), clamp(unit(p[2], 1), 0, 1));
      if ([...rgb, a].some(Number.isNaN)) return null;
      return { r: rgb[0], g: rgb[1], b: rgb[2], a: round3(a) };
    }
    if (!/^[a-z]+$/.test(s)) return null;
    if (s === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
    const known = NAMED[s] ? `#${NAMED[s]}` : resolveName(s);
    return known ? parseColor(known) : null;
  }

  /**
   * Format a colour the way the library writes it back: `#rrggbb` when opaque, else `rgba(r, g, b, a)`.
   * @param {RGBA} c
   */
  function formatColor(c) {
    if (c.a >= 1) return `#${[c.r, c.g, c.b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
    return `rgba(${c.r}, ${c.g}, ${c.b}, ${round3(c.a)})`;
  }

  /**
   * A predicate "is this colour the one we look for": every RGB channel within ±tolerance (0–255).
   * Alpha is ignored, so a half-transparent marker still matches.
   */
  function colorMatcher(from, tolerance = 0) {
    const f = parseColor(from);
    if (!f) throw new Error(`favicon-modder: not a colour: ${from}`);
    return (c) => Math.max(Math.abs(c.r - f.r), Math.abs(c.g - f.g), Math.abs(c.b - f.b)) <= tolerance;
  }

  /* ------------------------------------------------------------ SVG recolour */

  const TOKEN = /url\([^)]*\)|#[0-9a-f]{3,8}\b|(?:rgb|hsl)a?\([^)]*\)|[a-z]+/gi;
  const COLOR_ATTRS = ['fill', 'stroke', 'stop-color', 'flood-color', 'lighting-color', 'color'];

  function replaceColors(text, match, to) {
    return text.replace(TOKEN, (tok, at, all) => {
      if (/^url\(/i.test(tok)) return tok;
      // a word that is part of an id, a class or a longer name (#green, .red, dark-red) is not a colour
      if (/^[a-z]/i.test(tok) && (/[#.\w-]/.test(all[at - 1] || '') || /[\w-]/.test(all[at + tok.length] || ''))) return tok;
      const c = parseColor(tok);
      return c && match(c) ? formatColor({ ...to, a: round3(to.a * c.a) }) : tok;
    });
  }

  const replaceInCss = (css, match, to) => css.replace(/:([^;{}]*)/g, (_, v) => `:${replaceColors(v, match, to)}`);

  function recolorArgs(from, to, tolerance) {
    const target = parseColor(to);
    if (!target) throw new Error(`favicon-modder: not a colour: ${to}`);
    return [colorMatcher(from, tolerance), target];
  }

  /**
   * Recolour CSS text (a `<style>` body or a `style=""` value): colours in declaration values only.
   * @param {string} css @param {string} from @param {string} to @param {number} [tolerance=0]
   */
  function recolorCss(css, from, to, tolerance = 0) {
    return replaceInCss(css, ...recolorArgs(from, to, tolerance));
  }

  /**
   * Recolour SVG source text: the colour attributes (fill, stroke, stop-color, flood-color, lighting-color,
   * color), `style` attributes and `<style>` elements.
   * @param {string} svg @param {string} from @param {string} to @param {number} [tolerance=0]
   */
  function recolorSvgString(svg, from, to, tolerance = 0) {
    const [match, target] = recolorArgs(from, to, tolerance);
    return svg
      .replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi, (_, a, css, b) => a + replaceInCss(css, match, target) + b)
      .replace(
        /(\s(fill|stroke|stop-color|flood-color|lighting-color|color|style)\s*=\s*)(["'])(.*?)\3/gi,
        (_, pre, name, q, v) => pre + q + (name.toLowerCase() === 'style'
          ? replaceInCss(v, match, target) : replaceColors(v, match, target)) + q,
      );
  }

  /**
   * Recolour a parsed SVG document in place (what the recolor mod does in the browser).
   * Needs only `querySelectorAll`, `getAttribute`, `setAttribute`, `localName` and `textContent`.
   * @param {Document|Element} doc @param {string} from @param {string} to @param {number} [tolerance=0]
   */
  function recolorSvgDoc(doc, from, to, tolerance = 0) {
    const [match, target] = recolorArgs(from, to, tolerance);
    for (const el of doc.querySelectorAll('*')) {
      for (const name of COLOR_ATTRS) {
        const v = el.getAttribute(name);
        if (v != null) el.setAttribute(name, replaceColors(v, match, target));
      }
      const style = el.getAttribute('style');
      if (style != null) el.setAttribute('style', replaceInCss(style, match, target));
      if (el.localName === 'style') el.textContent = replaceInCss(el.textContent, match, target);
    }
    return doc;
  }

  /* ------------------------------------------------------------ pixel stages */

  /**
   * Swap one colour for another in RGBA pixel data (an ImageData's `data`), keeping each pixel's alpha.
   * @param {Uint8ClampedArray} data @param {string} from @param {string} to @param {number} [tolerance=32]
   */
  function recolorPixels(data, from, to, tolerance = 32) {
    const [match, t] = recolorArgs(from, to, tolerance);
    const px = { r: 0, g: 0, b: 0, a: 1 };
    for (let i = 0; i < data.length; i += 4) {
      if (!data[i + 3]) continue;
      px.r = data[i]; px.g = data[i + 1]; px.b = data[i + 2];
      if (!match(px)) continue;
      data[i] = t.r; data[i + 1] = t.g; data[i + 2] = t.b; data[i + 3] = Math.round(data[i + 3] * t.a);
    }
    return data;
  }

  // hue (degrees) and chroma (0–255) of an RGB colour
  function hueChroma(r, g, b) {
    const max = Math.max(r, g, b);
    const c = max - Math.min(r, g, b);
    if (!c) return [0, 0];
    const h = max === r ? ((g - b) / c) % 6 : max === g ? (b - r) / c + 2 : (r - g) / c + 4;
    return [(h * 60 + 360) % 360, c];
  }

  const HUE_FULL = 12; // degrees of hue difference that still count as the kept colour …
  const HUE_NONE = 30; // … falling off to nothing here
  const MIN_CHROMA = 24; // a kept colour greyer than this is matched by distance only

  /**
   * Normalise the fade's `keep` option into parsed colours.
   * @param {string|string[]|false|null} keep  colours; `'recolored'` (alone or inside the list) stands for
   *   `accents`; `false`, `null` or `[]` keeps nothing
   * @param {Array<string|RGBA>} [accents]  the `to` colours of the pipeline's recolours (`state.accents`)
   * @returns {Array<RGBA & {h: number, c: number}>}
   */
  function resolveKeep(keep, accents = []) {
    if (keep == null || keep === false) return [];
    const list = (Array.isArray(keep) ? keep : [keep]).flatMap((k) => (k === 'recolored' ? accents : [k]));
    const out = [];
    for (const k of list) {
      const c = parseColor(k);
      if (!c) throw new Error(`favicon-modder: not a colour: ${k}`);
      const [h, ch] = hueChroma(c.r, c.g, c.b);
      if (!out.some((o) => o.r === c.r && o.g === c.g && o.b === c.b)) out.push({ ...c, h, c: ch });
    }
    return out;
  }

  // the best kept colour for a pixel: [weight 0–1, the colour] (see keepWeight)
  function keepMatch(px, keep, tolerance) {
    let best = 0;
    let color = null;
    let hc = null;
    for (const k of keep) {
      const d = Math.max(Math.abs(px.r - k.r), Math.abs(px.g - k.g), Math.abs(px.b - k.b));
      if (d <= tolerance) return [1, k];
      if (!tolerance) continue;
      let w;
      if (k.c >= MIN_CHROMA) {
        hc = hc || hueChroma(px.r, px.g, px.b);
        const dh = Math.abs(((hc[0] - k.h + 540) % 360) - 180);
        const hw = dh <= HUE_FULL ? 1 : dh >= HUE_NONE ? 0 : 1 - (dh - HUE_FULL) / (HUE_NONE - HUE_FULL);
        w = hw * Math.min(1, hc[1] / k.c);
      } else w = d >= 2 * tolerance ? 0 : 1 - (d - tolerance) / tolerance;
      if (w > best) { best = w; color = k; }
    }
    return [best, color];
  }

  /**
   * How much a pixel "is" one of the kept colours, 0–1 — read as the share of that colour in the pixel:
   * - within `tolerance` (the largest RGB channel difference) it is 1;
   * - beyond it, for a kept colour with some chroma: a pixel of nearly the same hue (within 12°, falling to
   *   0 at 30°) counts by its chroma relative to the kept colour's — an anti-aliased edge of the kept colour
   *   over a grey, black or white neighbour has exactly that share of it;
   * - for a near-grey kept colour: a linear falloff from `tolerance` to 2 × `tolerance`.
   * `tolerance: 0` is an exact match only.
   * @param {{r: number, g: number, b: number}} px @param {Array} keep  from `resolveKeep()`
   * @param {number} [tolerance=48]
   */
  function keepWeight(px, keep, tolerance = 48) { return keepMatch(px, keep, tolerance)[0]; }

  // grey and darken one colour by level l, into out[0..2]
  function fadeRgb(r, g, b, l, s0, b0, out) {
    const sat = 1 - l * s0;
    const bright = 1 - l * b0;
    const grey = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    out[0] = (grey + (r - grey) * sat) * bright;
    out[1] = (grey + (g - grey) * sat) * bright;
    out[2] = (grey + (b - grey) * sat) * bright;
    return out;
  }

  /**
   * Grey and darken RGBA pixel data by `level` (0 = untouched, 1 = fully at `to`). With `keep`, the kept
   * colours escape the fade (`strength` 1: entirely; 0.7: they fade by 30 % of `level` at most). A pixel that
   * is only partly a kept colour (`keepWeight()` = w, an anti-aliased edge) is split into w of the kept
   * colour and the rest; only the rest fades fully, so the edge keeps its colour and gets no grey halo.
   * @param {Uint8ClampedArray} data @param {number} level @param {{saturation?: number, brightness?: number}} [to]
   * @param {{colors: Array, tolerance?: number, strength?: number}|null} [keep]  colors from `resolveKeep()`
   */
  function fadePixels(data, level, to = {}, keep = null) {
    const s0 = 1 - (to.saturation ?? 0);
    const b0 = 1 - (to.brightness ?? 0.55);
    const colors = keep && keep.colors && keep.colors.length ? keep.colors : null;
    const kept = level * (1 - clamp(keep?.strength ?? 1, 0, 1)); // the fade level of a kept colour
    const tolerance = keep?.tolerance ?? 48;
    const px = { r: 0, g: 0, b: 0 };
    const a = [0, 0, 0];
    const o = [0, 0, 0];
    for (let i = 0; i < data.length; i += 4) {
      if (!data[i + 3]) continue; // invisible
      const r = data[i]; const g = data[i + 1]; const b = data[i + 2];
      let w = 0;
      let k = null;
      if (colors) {
        px.r = r; px.g = g; px.b = b;
        [w, k] = keepMatch(px, colors, tolerance);
      }
      if (w >= 1) fadeRgb(r, g, b, kept, s0, b0, a); // the kept colour itself (as drawn)
      else if (w > 0) {
        // w of the kept colour k, (1 − w) of some other colour o: fade each by its own level
        const rest = (v, kv) => clamp((v - w * kv) / (1 - w), 0, 255);
        fadeRgb(k.r, k.g, k.b, kept, s0, b0, a);
        fadeRgb(rest(r, k.r), rest(g, k.g), rest(b, k.b), level, s0, b0, o);
        for (let c = 0; c < 3; c++) a[c] = w * a[c] + (1 - w) * o[c];
      } else fadeRgb(r, g, b, level, s0, b0, a);
      data[i] = a[0]; data[i + 1] = a[1]; data[i + 2] = a[2];
    }
    return data;
  }

  /* -------------------------------------------------------------- fade timing */

  const EASINGS = {
    linear: (t) => t,
    'ease-in': (t) => t * t,
    'ease-out': (t) => 1 - (1 - t) * (1 - t),
    'ease-in-out': (t) => t * t * (3 - 2 * t),
  };

  /**
   * Fade level for an idle time: rises once per `step` seconds, from 0 to 1 at `after` seconds.
   * @param {number} idleMs @param {{step?: number, after?: number, easing?: string|function(number):number}} [opts]
   * @returns {number} 0–1
   */
  function fadeLevel(idleMs, { step = 60, after = 900, easing = 'linear' } = {}) {
    if (!(idleMs > 0)) return 0;
    const stepMs = Math.round(step * 1000); // whole ms: 0.3 s steps must add up to exactly 0.9 s
    const stepped = Math.floor(idleMs / stepMs) * stepMs;
    const ease = typeof easing === 'function' ? easing : EASINGS[easing] || EASINGS.linear;
    return clamp(ease(Math.min(1, stepped / Math.round(after * 1000))), 0, 1);
  }

  /**
   * Milliseconds until the fade level next changes, or null once it is full.
   * @param {number} idleMs @param {{step?: number, after?: number}} [opts]
   */
  function nextFadeTick(idleMs, { step = 60, after = 900 } = {}) {
    const stepMs = Math.round(step * 1000);
    const idle = Math.max(0, idleMs);
    if (Math.floor(idle / stepMs) * stepMs >= Math.round(after * 1000)) return null;
    return stepMs - (idle % stepMs);
  }

  // A one-shot timer that background-tab throttling does not stall: runs in a tiny inline worker,
  // falls back to setTimeout when workers are blocked (CSP, sandbox).
  function createTicker(onTick) {
    let worker = null;
    let url = null;
    let timer = null;
    let pending = -1;
    const fallback = (ms) => { clearTimeout(timer); if (ms >= 0) timer = setTimeout(onTick, ms); };
    const dropWorker = () => {
      if (worker) worker.terminate();
      if (url) URL.revokeObjectURL(url);
      worker = url = null;
    };
    try {
      const src = 'let t;onmessage=e=>{clearTimeout(t);if(e.data>=0)t=setTimeout(()=>postMessage(0),e.data)}';
      url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
      worker = new Worker(url);
      worker.onmessage = () => onTick();
      worker.onerror = () => { dropWorker(); fallback(pending); };
    } catch {
      dropWorker();
    }
    return {
      at(ms) { pending = ms; if (worker) worker.postMessage(ms); else fallback(ms); },
      stop() { pending = -1; dropWorker(); clearTimeout(timer); },
    };
  }

  /* ------------------------------------------------------------- built-in mods */

  /**
   * @typedef {object} Mod
   * @property {string} [name]  used by `remove(name)` and the setters
   * @property {function(object): void} [prepare]  before both stages, every render: e.g. add to `state.accents`
   * @property {function(Document, object): void} [svg]  vector stage: change the parsed SVG in place
   * @property {function(CanvasRenderingContext2D, object): void} [canvas]  raster stage: ctx is the icon layer
   * @property {function(Modder): void} [attach]  called on start (or on use() while running)
   * @property {function(): void} [detach]  called on stop / remove
   */

  /**
   * Replace a colour of the logo. SVG sources are recoloured in the SVG (exact by default), raster sources
   * pixel by pixel (tolerance 32 by default).
   * @param {string} from @param {string} to @param {{tolerance?: number}} [opts]
   * @returns {Mod}
   */
  function recolor(from, to, opts = {}) {
    recolorArgs(from, to, 0); // fail early on a bad colour
    return {
      name: 'recolor',
      from,
      to,
      prepare(state) { state.accents.push(to); }, // the fade keeps this colour (keep: 'recolored')
      svg(doc) { recolorSvgDoc(doc, from, to, opts.tolerance ?? 0); },
      canvas(ctx, state) {
        if (state.isSvg) return;
        const img = ctx.getImageData(0, 0, state.size, state.size);
        recolorPixels(img.data, from, to, opts.tolerance ?? 32);
        ctx.putImageData(img, 0, 0);
      },
    };
  }

  function shapePath(ctx, shape, size, radius) {
    ctx.beginPath();
    if (shape === 'circle') ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    else if (shape === 'rounded') {
      const r = Math.min(size / 2, radius * size);
      ctx.moveTo(r, 0);
      ctx.arcTo(size, 0, size, size, r);
      ctx.arcTo(size, size, 0, size, r);
      ctx.arcTo(0, size, 0, 0, r);
      ctx.arcTo(0, 0, size, 0, r);
      ctx.closePath();
    } else ctx.rect(0, 0, size, size);
  }

  /**
   * A shape behind the (transparent) icon; the icon shrinks by `padding` to fit.
   * @param {string} color
   * @param {{shape?: 'square'|'rounded'|'circle', radius?: number, padding?: number, opacity?: number}} [opts]
   *   radius and padding are fractions of the icon size (defaults 0.22 and 0.1), opacity 0–1 (default 1)
   * @returns {Mod & {set: function(string, object=): void}}
   */
  function background(color, opts = {}) {
    const mod = {
      name: 'background',
      color,
      options: {},
      set(c, o = {}) {
        if (!parseColor(c)) throw new Error(`favicon-modder: not a colour: ${c}`);
        mod.color = c;
        mod.options = { shape: 'rounded', radius: 0.22, padding: 0.1, opacity: 1, ...mod.options, ...o };
      },
      canvas(ctx, state) {
        const { size, layers } = state;
        const { shape, radius, padding, opacity } = mod.options;
        const pad = clamp(padding, 0, 0.45) * size;
        if (pad > 0) {
          const copy = makeContext(size);
          copy.drawImage(ctx.canvas, 0, 0);
          ctx.clearRect(0, 0, size, size);
          ctx.drawImage(copy.canvas, pad, pad, size - 2 * pad, size - 2 * pad);
        }
        const bg = layers.background;
        bg.save();
        bg.globalAlpha = clamp(opacity, 0, 1);
        bg.fillStyle = mod.color;
        shapePath(bg, shape, size, radius);
        bg.fill();
        bg.restore();
      },
    };
    mod.set(color, opts);
    return mod;
  }

  /**
   * Progressive idle fading: every `step` seconds the icon gets greyer and darker, reaching `to` at `after`
   * seconds of idle. Coming back to the tab resets it at once. The instance tint survives: by default the
   * colours the pipeline's recolours put in (`keep: 'recolored'`) do not fade.
   * @param {{step?: number, after?: number, easing?: string|function(number):number,
   *   to?: {saturation?: number, brightness?: number}, target?: 'all'|'background'|'icon',
   *   keep?: 'recolored'|string|string[]|false, tolerance?: number, keepStrength?: number,
   *   keepBackground?: boolean|number, level?: number|null, now?: function(): number}} [opts]
   *   `keep`: colours of the icon layer that the fade leaves ('recolored' = every recolor()'s `to`, also
   *   inside a list; false / [] = fade everything); `tolerance`: their match distance (48, soft falloff to
   *   2×); `keepStrength`: 0–1, how much of the fade a kept colour escapes (1 = stays full);
   *   `keepBackground`: true (= keepStrength) or 0–1, the same for the whole background layer;
   *   `level`: a frozen fade level instead of the idle clock (previews); `now`: the clock (ms), for tests
   * @returns {Mod & {set: function(object): void, level: number}}
   */
  function fade(opts = {}) {
    const EVENTS = ['focus', 'pointerdown', 'keydown', 'scroll', 'wheel'];
    let controller = null;
    let ticker = null;
    let last = 0;
    let lastSchedule = 0;
    const mod = {
      name: 'fade',
      level: 0,
      options: {},
      set(o = {}) {
        mod.options = {
          step: 60, after: 900, easing: 'linear', target: 'all', keep: 'recolored', tolerance: 48, keepStrength: 1,
          keepBackground: false, level: null, now: () => Date.now(), ...mod.options, ...o,
        };
        mod.options.to = { saturation: 0, brightness: 0.55, ...mod.options.to };
        resolveKeep(mod.options.keep, []); // fail early on a bad colour
        if (controller) mod.tick();
      },
      /** idle milliseconds */
      idle() { return mod.options.now() - last; },
      tick() {
        if (typeof document !== 'undefined' && document.visibilityState === 'visible' && document.hasFocus?.()) {
          last = mod.options.now(); // the tab in front of the user is never idle
        }
        const fixed = mod.options.level;
        const level = fixed != null ? clamp(Number(fixed) || 0, 0, 1) : fadeLevel(mod.idle(), mod.options);
        if (level !== mod.level) { mod.level = level; controller?.redraw(); }
        const next = fixed != null ? null : nextFadeTick(mod.idle(), mod.options);
        lastSchedule = mod.options.now();
        if (controller && next != null && !ticker) ticker = createTicker(() => mod.tick()); // none for a frozen level
        ticker?.at(next ?? -1);
      },
      active() {
        last = mod.options.now();
        // reschedule at most once a second while scrolling; a faded icon is reset at once
        if (mod.level > 0 || last - lastSchedule > 1000) mod.tick();
      },
      attach(c) {
        controller = c;
        last = mod.options.now();
        document.addEventListener('visibilitychange', mod.active);
        for (const e of EVENTS) window.addEventListener(e, mod.active, { passive: true, capture: true });
        mod.tick();
      },
      detach() {
        ticker?.stop();
        ticker = controller = null;
        mod.level = 0;
        document.removeEventListener('visibilitychange', mod.active);
        for (const e of EVENTS) window.removeEventListener(e, mod.active, { capture: true });
      },
      canvas(ctx, state) {
        if (!mod.level) return;
        const { target, to, keep, tolerance, keepStrength, keepBackground } = mod.options;
        const run = (layer, level, k) => {
          if (!level) return;
          const img = layer.getImageData(0, 0, state.size, state.size);
          fadePixels(img.data, level, to, k);
          layer.putImageData(img, 0, 0);
        };
        if (target !== 'icon') {
          const s = keepBackground === true ? keepStrength : Number(keepBackground) || 0;
          run(state.layers.background, mod.level * (1 - clamp(s, 0, 1)));
        }
        if (target !== 'background') {
          const colors = resolveKeep(keep, state.accents);
          run(ctx, mod.level, colors.length ? { colors, tolerance, strength: keepStrength } : null);
        }
      },
    };
    mod.set(opts);
    return mod;
  }

  /* --------------------------------------------------------------- controller */

  const warned = new Set();
  function warnOnce(msg, err) {
    if (warned.has(msg)) return;
    warned.add(msg);
    console.warn(`favicon-modder: ${msg}`, err || '');
  }

  function makeContext(size) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    return canvas.getContext('2d', { willReadFrequently: true });
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`cannot load ${String(src).slice(0, 80)}`));
      img.src = src;
    });
  }

  const nameOf = (m) => (typeof m === 'string' ? m : m && m.name);

  /** The pipeline for one icon. Create it with `FaviconModder.create()`. */
  class Modder {
    /**
     * @param {{source?: string, size?: number, target?: HTMLLinkElement|HTMLImageElement}} [opts]
     *   source: 'auto' (the page's `<link rel="icon">`) or a URL; size: output pixels (64);
     *   target: where the result goes (default the page's icon link; an `<img>` gets its `src`)
     */
    constructor(opts = {}) {
      this.options = { source: 'auto', size: 64, ...opts };
      /** @type {Mod[]} in pipeline order */
      this.mods = [];
      this.running = false;
      this.condition = true;
      this.state = {
        size: this.options.size, isSvg: false, layers: null, accents: [], controller: this, redraw: () => this.redraw(),
      };
    }

    /** Add a mod at the end of the pipeline. @param {Mod} mod @returns {this} */
    use(mod) {
      this.mods.push(mod);
      if (this.running) mod.attach?.(this);
      this.redraw();
      return this;
    }

    /** Remove a mod object, or every mod with that name. @param {Mod|string} modOrName @returns {this} */
    remove(modOrName) {
      const drop = this.mods.filter((m) => m === modOrName || (typeof modOrName === 'string' && m.name === modOrName));
      this.mods = this.mods.filter((m) => !drop.includes(m));
      if (this.running) drop.forEach((m) => m.detach?.());
      this.redraw();
      return this;
    }

    /** The first mod with that name. @param {string} name @returns {Mod|undefined} */
    get(name) { return this.mods.find((m) => m.name === name); }

    /** Replace colour `from` by `to`; several calls stack. @returns {this} */
    recolor(from, to, opts) { return this.use(recolor(from, to, opts)); }

    /** Set (or change live) the background shape; `background(null)` removes it. @returns {this} */
    background(color, opts) { return this._setter('background', background, color == null || color === false ? null : [color, opts]); }

    /** Set (or change live) idle fading; `fade(false)` removes it. @returns {this} */
    fade(opts = {}) { return this._setter('fade', fade, opts === false ? null : [opts]); }

    _setter(name, factory, args) {
      if (!args) return this.remove(name);
      const existing = this.get(name);
      if (!existing) return this.use(factory(...args));
      existing.set(...args);
      this.redraw();
      return this;
    }

    /** Start only when `cond` (a boolean or a function asked at start()) is true. @returns {this} */
    onlyIf(cond) { this.condition = cond; return this; }

    /** Take over the icon and draw it. A no-op when onlyIf() says no. @returns {this} */
    start() {
      if (this.running || typeof document === 'undefined') return this;
      if (!(typeof this.condition === 'function' ? this.condition() : this.condition)) return this;
      let target = this.options.target;
      let created = false;
      if (!target) {
        target = document.querySelector('link[rel~="icon" i]');
        if (!target) {
          target = Object.assign(document.createElement('link'), { rel: 'icon' });
          document.head.appendChild(target);
          created = true;
        }
      }
      const attr = target.localName === 'img' ? 'src' : 'href';
      this._target = { el: target, attr, created, value: target.getAttribute(attr), type: target.getAttribute('type') };
      const source = this.options.source === 'auto' ? (created ? '/favicon.ico' : target[attr]) : this.options.source;
      this._sourceUrl = new URL(source, document.baseURI).href;
      this._source = null;
      this.running = true;
      this.mods.forEach((m) => m.attach?.(this));
      this.redraw();
      return this;
    }

    /** Detach every mod and restore the original icon. @returns {this} */
    stop() {
      if (!this.running) return this;
      this.running = false;
      this.mods.forEach((m) => m.detach?.());
      const t = this._target;
      if (t.created) t.el.remove();
      else {
        t.value == null ? t.el.removeAttribute(t.attr) : t.el.setAttribute(t.attr, t.value);
        if (t.attr === 'href') t.type == null ? t.el.removeAttribute('type') : t.el.setAttribute('type', t.type);
      }
      this._lastUrl = null;
      return this;
    }

    /** Redraw now (coalesced; mods call it through `state.redraw()`). @returns {Promise<boolean>} */
    redraw() {
      if (!this.running) return Promise.resolve(false);
      this._dirty = true;
      this._queue = this._queue || (async () => {
        await null;
        try {
          while (this._dirty && this.running) {
            this._dirty = false;
            await this._render().catch((e) => warnOnce('cannot redraw the icon; it is left as it was', e));
          }
        } finally {
          this._queue = null;
        }
        return true;
      })();
      return this._queue;
    }

    _load() {
      this._source = this._source || (async () => {
        const url = this._sourceUrl;
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const type = res.headers.get('content-type') || '';
          if (/svg/.test(type) || /\.svg([?#]|$)/i.test(url)) return { svg: await res.text() };
          return { image: await loadImage(URL.createObjectURL(await res.blob())) };
        } catch {
          return { image: await loadImage(url) }; // e.g. cross-origin without CORS: draws, but taints
        }
      })();
      return this._source;
    }

    async _render() {
      const src = await this._load();
      const { size } = this.options;
      const state = Object.assign(this.state, { size, isSvg: src.svg != null, accents: [] });
      this.mods.forEach((m) => m.prepare?.(state));
      let img = src.image;
      if (state.isSvg) {
        const doc = new DOMParser().parseFromString(src.svg, 'image/svg+xml');
        if (doc.querySelector('parsererror')) throw new Error('the SVG does not parse');
        this.mods.forEach((m) => m.svg?.(doc, state));
        const root = doc.documentElement;
        if (root.hasAttribute('viewBox')) { root.setAttribute('width', size); root.setAttribute('height', size); }
        const xml = new XMLSerializer().serializeToString(doc);
        img = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`);
      }
      if (!this.running) return;
      const icon = makeContext(size);
      const back = makeContext(size);
      const w = img.naturalWidth || img.width || size;
      const h = img.naturalHeight || img.height || size;
      const k = Math.min(size / w, size / h);
      icon.imageSmoothingQuality = 'high';
      icon.drawImage(img, (size - w * k) / 2, (size - h * k) / 2, w * k, h * k);
      state.layers = { icon, background: back };
      let url;
      try {
        this.mods.forEach((m) => m.canvas?.(icon, state));
        back.drawImage(icon.canvas, 0, 0); // compose: the icon over the background
        url = back.canvas.toDataURL('image/png');
      } catch (e) {
        if (e && e.name === 'SecurityError') return warnOnce('the icon is cross-origin and taints the canvas; it is left as it was', e);
        throw e;
      } finally {
        state.layers = null;
      }
      if (!this.running || url === this._lastUrl) return;
      this._lastUrl = url;
      const t = this._target;
      if (t.attr === 'href') t.el.setAttribute('type', 'image/png');
      t.el.setAttribute(t.attr, url);
    }
  }

  /* -------------------------------------------------------------- public API */

  /**
   * Create a pipeline for the page's favicon (nothing changes until `start()`).
   * @param {{source?: string, size?: number, target?: HTMLLinkElement|HTMLImageElement}} [opts]
   * @returns {Modder}
   */
  function create(opts) { return new Modder(opts); }

  /**
   * The per-user opt-in switch in localStorage ("1", "true" or "on" means on).
   * @param {string} [key='favicon-modder'] @returns {boolean}
   */
  function enabled(key = 'favicon-modder') {
    try { return ['1', 'true', 'on'].includes(localStorage.getItem(key)); } catch { return false; }
  }

  /**
   * Flip (or set, with `on`) the opt-in switch; returns the new state. For a settings checkbox.
   * @param {string} [key='favicon-modder'] @param {boolean} [on] @returns {boolean}
   */
  function toggle(key = 'favicon-modder', on = undefined) {
    const next = on === undefined ? !enabled(key) : Boolean(on);
    try { next ? localStorage.setItem(key, '1') : localStorage.removeItem(key); } catch { /* storage blocked */ }
    return next;
  }

  const FaviconModder = {
    version: VERSION, create, enabled, toggle, Modder,
    mods: { recolor, background, fade },
    parseColor, formatColor, colorMatcher, recolorCss, recolorSvgString, recolorSvgDoc,
    recolorPixels, fadePixels, resolveKeep, keepWeight, fadeLevel, nextFadeTick,
  };

  return FaviconModder;
});
