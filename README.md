# favicon-modder

Redraw a page's favicon through a short pipeline of small, optional **mods**: recolour part of the logo,
put a shape behind it, fade the icon while the tab sits idle. No dependencies; one file.

> **Version 0.x — no compatibility promise.** The API may change in any 0.x release. Pin the exact version.

## Why

Orientation with many tabs open. The same app runs locally, on a test server and in production, and all
the tabs look alike. With favicon-modder each instance draws its own icon from the one logo:

- **local** green, **test** blue, **production** red — by recolouring a marker colour in the logo;
- a coloured square, rounded square or circle behind a transparent logo;
- **idle tabs fade** — a tab you have not looked at for a while turns grey and dark, step by step, and
  is back in full colour the moment you return to it.

It is meant as a per-user opt-in (developers, operators, managers who keep many tabs open), not something
every visitor gets: when nothing is called, the page's favicon is left untouched.

## Install

A script tag (a global `FaviconModder`):

```html
<script src="https://cdn.jsdelivr.net/npm/favicon-modder@0.1.0/dist/favicon-modder.min.js"></script>
```

or an ES module:

```js
import FaviconModder from 'favicon-modder';               // via a bundler / npm
import FaviconModder from './vendor/favicon-modder.js';   // or copy src/favicon-modder.js
```

`dist/favicon-modder.js` is a UMD build (global, CommonJS or AMD); `src/favicon-modder.js` is the ES module.

## Quick start

```js
const fm = FaviconModder.create({ source: 'auto', size: 64 })
  .recolor('#00b140', '#d32f2f')                            // the green marker becomes red
  .background('#ffebee', { shape: 'rounded', padding: 0.12 })
  .fade({ step: 60, after: 900 })                           // greyer every minute, fully faded at 15 min
  .start();

fm.redraw();          // draw again (mods call this themselves when they change)
fm.remove('fade');    // drop a mod, by name or by the mod object
fm.stop();            // detach everything and put the original icon back
```

Mods run in the order they were added. Put `fade()` last so it fades what the others drew.

## The API

### `FaviconModder.create(options)` → controller

| option | default | |
|---|---|---|
| `source` | `'auto'` | `'auto'` = the href of the page's `<link rel="icon">` (or `/favicon.ico` when there is none); or any URL, data URL included |
| `size` | `64` | output size in pixels (square) |
| `target` | the page's icon link | where the result goes: a `<link>` gets its `href`, an `<img>` its `src` |

Nothing changes until `start()`. The result is written as a PNG data URL on the first `<link rel~="icon">`
(one is created when the page has none). `stop()` restores its original `href` and `type` (or removes the
link it created).

Controller methods (all chainable except `get` and `redraw`):

| method | |
|---|---|
| `recolor(from, to, opts)` | add a recolour; several calls stack |
| `background(color, opts)` | set the background; calling it again changes it live; `background(null)` removes it |
| `fade(opts)` | set idle fading; calling it again changes it live; `fade(false)` removes it |
| `use(mod)` | add any mod at the end of the pipeline |
| `remove(modOrName)` | remove that mod object, or every mod with that name |
| `get(name)` | the first mod with that name |
| `onlyIf(boolOrFn)` | `start()` does nothing unless this is true (a function is asked at `start()`) |
| `start()` / `stop()` | take over / give back the icon |
| `redraw()` | draw again; coalesced, returns a promise |

### recolor — replace a colour of the logo

```js
fm.recolor('#00b140', '#1565c0');                    // exact match (SVG)
fm.recolor('rgb(0 177 64)', 'navy', { tolerance: 10 });
fm.recolor('#00b140', '#d32f2f').recolor('#263238', '#000');   // stacked
```

- **SVG sources** are recoloured in the SVG itself, before it is rasterised: the `fill`, `stroke`,
  `stop-color`, `flood-color`, `lighting-color` and `color` attributes, `style="…"` attributes and the
  CSS inside `<style>`. Every notation is understood and compared as a colour — `#rgb`, `#rgba`,
  `#rrggbb`, `#rrggbbaa`, `rgb()`/`rgba()`, `hsl()`/`hsla()`, named colours. The match is **exact by
  default**; `tolerance` (0–255) allows that much difference per RGB channel. The source alpha is kept.
- **Raster sources** (PNG, ICO, …) get a pixel swap on the canvas, with `tolerance` 32 by default.

Tip: draw the part you want to vary in a fixed marker colour that appears nowhere else in the logo —
chroma green `#00b140` is a good choice — and recolour that per instance.

### background — a shape behind a transparent icon

```js
fm.background('#2e7d32', { shape: 'rounded', radius: 0.22, padding: 0.1, opacity: 1 });
fm.background('#b71c1c');                 // later: the colour changes live, the options stay
fm.background(null);                      // gone
```

| option | default | |
|---|---|---|
| `shape` | `'rounded'` | `'square'`, `'rounded'` or `'circle'` |
| `radius` | `0.22` | corner radius of `'rounded'`, as a fraction of the size |
| `padding` | `0.1` | the icon shrinks by this fraction on every side to fit inside the shape |
| `opacity` | `1` | of the shape only |

### fade — idle tabs turn grey and dark

```js
fm.fade({ step: 60, after: 900, easing: 'linear', to: { saturation: 0, brightness: 0.55 }, target: 'all' });
```

| option | default | |
|---|---|---|
| `step` | `60` | seconds between two fade steps |
| `after` | `900` | seconds of idle until the fade is complete |
| `easing` | `'linear'` | `'linear'`, `'ease-in'`, `'ease-out'`, `'ease-in-out'` or a function `t → level` (0–1) |
| `to` | `{ saturation: 0, brightness: 0.55 }` | the look at full fade |
| `target` | `'all'` | `'all'`, `'icon'` (the logo only) or `'background'` (the shape only) |

**Idle** is the time since the tab was last in front of the user — visible and focused — or since the
user last clicked, typed or scrolled in it (`visibilitychange`, `focus`, `pointerdown`, `keydown`,
`scroll`, `wheel`; passive listeners). The tab in front of you never fades. Coming back resets the icon to
full colour at once.

The step timer runs in a tiny inline Web Worker (a Blob URL) so that background-tab timer throttling does
not stall it. Where workers are blocked (a CSP without `worker-src blob:`, sandboxed frames) it falls back
to `setTimeout`, which browsers throttle in background tabs — the fade then moves in coarser steps.

The fade mod exposes `level` (0–1) and `idle()` (ms) for a status display, and takes a `now` option (a
clock in ms) for tests and demos.

### Opt-in per user

```js
FaviconModder.create()
  .recolor('#00b140', '#d32f2f')
  .fade()
  .onlyIf(FaviconModder.enabled())     // a localStorage switch, key 'favicon-modder'
  .start();

// a settings checkbox
checkbox.checked = FaviconModder.enabled();
checkbox.addEventListener('change', () => { FaviconModder.toggle('favicon-modder', checkbox.checked); location.reload(); });
```

- `FaviconModder.enabled(key = 'favicon-modder')` — true when localStorage holds `1`, `true` or `on`
  under that key; false when storage is blocked.
- `FaviconModder.toggle(key = 'favicon-modder', on?)` — flips the switch (or sets it to `on`) and
  returns the new state.
- `onlyIf(fn | boolean)` — combine it with anything else: a role, an environment, a query parameter.

## Writing your own mod

A mod is a plain object with any of these optional members:

```js
const mod = {
  name: 'badge',                         // for remove('badge') / get('badge')
  svg(doc, state) {},                    // vector stage: change the parsed SVG Document in place
  canvas(ctx, state) {},                 // raster stage: ctx is the icon layer (2D context, size × size)
  attach(controller) {},                 // start(): set up timers, listeners
  detach() {},                           // stop() / remove(): tear them down
};
fm.use(mod);
```

`state` carries `size`, `isSvg` (whether the source was an SVG), `controller`, `redraw()` and, during the
raster stage, `layers: { icon, background }` — two 2D contexts that are composed at the end, the icon over
the background. The built-in `recolor`, `background` and `fade` are mods of exactly this shape
(`FaviconModder.mods.*`).

A dot for unread messages:

```js
const unread = {
  name: 'unread',
  count: 0,
  canvas(ctx, { size }) {
    if (!this.count) return;
    ctx.fillStyle = '#e53935';
    ctx.beginPath();
    ctx.arc(size * 0.78, size * 0.22, size * 0.2, 0, Math.PI * 2);
    ctx.fill();
  },
};
fm.use(unread);
unread.count = 3; fm.redraw();
```

A mod that changes itself over time asks for a redraw through `state.redraw()` (or the controller it got
in `attach`). Redraws are coalesced.

The pure helpers the built-in mods use are exported too: `parseColor`, `formatColor`, `colorMatcher`,
`recolorCss`, `recolorSvgString`, `recolorSvgDoc`, `recolorPixels`, `fadePixels`, `fadeLevel`,
`nextFadeTick`.

## Browser notes and limits

- **Cross-origin icons.** An icon from another origin without CORS headers taints the canvas; the
  library then leaves the icon as it is and logs one `console.warn`. Serve the icon from the page's
  origin (or with `Access-Control-Allow-Origin`).
- **Frozen and discarded tabs** do not run any script, so their icon does not update until they wake up.
  Chrome freezes long-hidden tabs under memory pressure, mobile browsers often.
- **Several icon links.** The first `<link rel~="icon">` is the one rewritten. When a page offers several
  (sizes, `mask-icon`, `apple-touch-icon`), the browser may prefer another one; keep a single
  `rel="icon"` link on pages that use this library.
- **SVG without a `viewBox`** is drawn at its own `width`/`height`; with a `viewBox` it is scaled to `size`.
- Safari shows favicons only in some places (tab bar, bookmarks) and may cache them; Firefox and
  Chromium-based browsers update the tab icon at once.
- The pipeline runs on a regular `<canvas>`; at 64 px a redraw is well under a millisecond of pixel work.

## Develop

No Node or Bun is needed on the host — run everything in a container:

```bash
docker run --rm -v "$PWD":/w -w /w oven/bun bun test              # unit tests
docker run --rm -v "$PWD":/w -w /w oven/bun bun scripts/build.js  # dist/ (UMD + minified)
```

`demo/index.html` shows every mod with live controls; serve the project folder over HTTP (ES modules do not
load from `file://`) and open `/demo/`.

## Licence

MIT — see [LICENSE](LICENSE).
