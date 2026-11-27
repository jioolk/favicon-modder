# Changelog

0.x releases make no compatibility promise; any of them may change the API.

## 0.3.0 — 2026-11-27

A JSON config per user, and a configurator that is drawn from the mods themselves.

- **Configs.** `FaviconModder.fromConfig(json, opts)` builds a controller from
  `{ version, enabled, size, mods: [{ type, ...options }] }`; `controller.toConfig()` writes one back (also
  for a pipeline built in code); `controller.setConfig(json)` applies one live (stops on `enabled: false`,
  starts again on true). `normalizeConfig()` checks one (defaults for missing or invalid values) and
  `defaultConfig()` gives a starting point.
- Unknown mod types and options are not applied, reported in one `console.warn`, and **kept** by
  `toConfig()`, so an older app does not erase what a newer one stored. A newer config version is read as far
  as understood.
- Config `version` (`FaviconModder.configVersion` = 1) with a migration hook: `registerMigration(from, fn)`.
- **Mod registry.** `registerMod(type, factory, schema)`, `modSchema(type)`, `modTypes()`. Each option has a
  self-describing schema (type `color` | `number` | `select` | `boolean` | `colorList` | `text`, default,
  limits, label / help with message keys, group, `when`, `advanced`). `recolor`, `background` and `fade` are
  registered the same way; their mods now carry `type` and `toConfig()`.
- `controller.preview(time)` and the mod hook `preview(time)`: freeze the fade at 0–1 of its course, stepped
  like the real one (previews, the configurator).
- A running controller marks the original icon on the `<link>` (`data-favicon-modder-source`); a second
  controller and the configurator draw from that, not from the already drawn icon.
- **New file `favicon-modder-ui.js`** (`dist/favicon-modder-ui.js` / `.min.js`, `favicon-modder/ui`): the
  configurator. `FaviconModderUI.mount(el, { config, onChange, locale, messages, preview, source,
  allowedMods, defaults, theme })` → `{ getConfig, setConfig, setLocale, destroy }`. Renders only from the
  registry: enable switch, size, mods with add / remove / reorder and "More options", live preview with an
  idle slider and a fade strip, reset to defaults, copy JSON. Shadow DOM, themable with `--fmui-*` custom
  properties, light / dark / auto. English and Czech built in; `addMessages(locale, messages)`,
  `createTranslator()`; `localStorageStore(key)`. The core does not depend on it.
- `demo/` is now a playground on the configurator: preset cards with their JSON, the configurator driving
  the tab's icon, the fade strip; `?preset=` and `?lang=`.
- README rewritten with pictures (`docs/img/`); file headers and `package.json` name the author (jioolk)
  and the repository.
- The build makes both bundles and prints their gzip sizes.

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
