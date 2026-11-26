# Changelog

0.x releases make no compatibility promise; any of them may change the API.

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
