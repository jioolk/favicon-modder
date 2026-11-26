# Changelog

0.x releases make no compatibility promise; any of them may change the API.

## 0.2.0 — 2026-11-26

The fade keeps the instance tint: a fully faded icon still shows which instance it is.

- `fade({ keep })`: colours of the logo the fade leaves. The default `'recolored'` keeps the `to` colour
  of every `recolor()` in the pipeline, so `.recolor('#00b140', '#d32f2f').fade()` keeps the red tail with
  no option. A colour or a list (which may contain `'recolored'`); `false` / `[]` fades everything — the
  0.1 behaviour. **Changed default.**
- `fade({ tolerance })` (48): the match distance; beyond it a coloured kept colour is matched by hue and
  chroma share, so anti-aliased edges are split into the kept colour and the rest and get no grey halo.
- `fade({ keepStrength })` (0–1, default 1): how much of the fade a kept colour escapes.
- `fade({ keepBackground })` (`true` or 0–1): keep the background shape's colour, wholly or partly.
- `fade({ level })`: a frozen fade level instead of the idle clock (previews); no timer is started.
- `state.accents`: the colours that mark the instance, emptied every render; filled by the new mod hook
  `prepare(state)`, which runs before the SVG and raster stages. `recolor()` adds its `to` colour there.
- `fadePixels(data, level, to, keep)` takes a `keep` argument; new pure helpers `resolveKeep()` and
  `keepWeight()`. `fadePixels` now skips fully transparent pixels.
- The fade's step timer (a Worker) is created only when the idle clock needs one.
- Demo: the idle card and the live panel keep the tail colour (a "Fade keeps" row); a fade strip shows
  0–15 minutes idle for local, production and test at 32 and 16 px.

## 0.1.0 — 2026-11-26

First release.

- `create()` controller: chainable pipeline of mods, `start()` / `stop()` (restores the original icon),
  `redraw()` (coalesced), `use()`, `remove()`, `get()`, `onlyIf()`; output to the page's
  `<link rel="icon">` (created when absent) or any `<img>` via `target`.
- `recolor(from, to, { tolerance })`: SVG recolour on the SVG (attributes, `style`, `<style>`; hex, rgb,
  hsl and named colours normalised; exact by default); pixel swap for raster sources.
- `background(color, { shape, radius, padding, opacity })`: square, rounded or circle behind the icon;
  a live setter.
- `fade({ step, after, easing, to, target })`: stepped idle fading to grey and dark, reset on return;
  timer in an inline Web Worker with a `setTimeout` fallback.
- `enabled()` / `toggle()`: a per-user localStorage opt-in switch.
- Cross-origin icons that taint the canvas fail soft with one console warning.
- ES module (`src/`), UMD and minified builds (`dist/`), demo page, unit tests.
