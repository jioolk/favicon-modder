/*!
 * favicon-modder-ui 0.3.0 — a configurator for favicon-modder configs, drawn from the mod registry.
 * MIT licence. Copyright (c) 2026 jioolk. https://github.com/jioolk/favicon-modder
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./favicon-modder.js'));
  else if (typeof define === 'function' && define.amd) define(["./favicon-modder"], factory);
  else root.FaviconModderUI = factory(root.FaviconModder);
})(typeof self !== 'undefined' ? self : globalThis, function (FaviconModder) {
  'use strict';

  const VERSION = '0.3.0';

  /* -------------------------------------------------------------------- i18n */

  // Built-in mods carry English labels in their schemas, so `en` holds the configurator's own texts only.
  const MESSAGES = {
    en: {
      'ui.title': 'Tab icon',
      'ui.enabled': 'On',
      'ui.disabled': 'Off — the page keeps its own icon.',
      'ui.size': 'Icon size',
      'ui.preview': 'Preview',
      'ui.tab': 'This tab',
      'ui.idle': 'Idle preview',
      'ui.idleValue': '{percent} % of the fade',
      'ui.idleTime': '{time} idle',
      'ui.strip': 'The fade, step by step',
      'ui.mods': 'Mods',
      'ui.empty': 'No mods — the icon stays as it is.',
      'ui.add': 'Add',
      'ui.addMod': 'Mod to add',
      'ui.moveUp': 'Move {mod} up',
      'ui.moveDown': 'Move {mod} down',
      'ui.remove': 'Remove {mod}',
      'ui.reset': 'Reset to defaults',
      'ui.copy': 'Copy JSON',
      'ui.copied': 'The JSON is in the clipboard.',
      'ui.copyFailed': 'Copying failed — select the JSON below.',
      'ui.json': 'JSON configuration',
      'ui.unknown': 'Unknown mod “{type}”',
      'ui.unknownHelp': 'Kept in the JSON for a newer version; not applied here.',
      'ui.auto': 'auto',
      'ui.more': 'More options',
      'ui.addColor': 'Add a colour',
      'ui.color': 'Colour {n}',
      'ui.removeColor': 'Remove colour {n}',
      'ui.min': '{n} min',
      'ui.sec': '{n} s',
    },
    cs: {
      'ui.title': 'Ikona karty',
      'ui.enabled': 'Zapnuto',
      'ui.disabled': 'Vypnuto — stránka má svou vlastní ikonu.',
      'ui.size': 'Velikost ikony',
      'ui.preview': 'Náhled',
      'ui.tab': 'Tato karta',
      'ui.idle': 'Náhled nečinnosti',
      'ui.idleValue': '{percent} % blednutí',
      'ui.idleTime': '{time} nečinnosti',
      'ui.strip': 'Blednutí krok za krokem',
      'ui.mods': 'Úpravy',
      'ui.empty': 'Žádné úpravy — ikona zůstane, jak je.',
      'ui.add': 'Přidat',
      'ui.addMod': 'Úprava k přidání',
      'ui.moveUp': 'Posunout {mod} nahoru',
      'ui.moveDown': 'Posunout {mod} dolů',
      'ui.remove': 'Odebrat {mod}',
      'ui.reset': 'Obnovit výchozí',
      'ui.copy': 'Kopírovat JSON',
      'ui.copied': 'JSON je ve schránce.',
      'ui.copyFailed': 'Kopírování selhalo — označte JSON níže.',
      'ui.json': 'Konfigurace v JSON',
      'ui.unknown': 'Neznámá úprava „{type}“',
      'ui.unknownHelp': 'Zůstává v JSON pro novější verzi; tady se nepoužije.',
      'ui.auto': 'auto',
      'ui.more': 'Další volby',
      'ui.addColor': 'Přidat barvu',
      'ui.color': 'Barva {n}',
      'ui.removeColor': 'Odebrat barvu {n}',
      'ui.min': '{n} min',
      'ui.sec': '{n} s',

      'mod.recolor': 'Přebarvení',
      'mod.recolor.help': 'Nahradí jednu barvu loga — část, která se mění, nakreslete značkovací barvou, jež se jinde nevyskytuje.',
      'mod.recolor.from': 'Barva v logu',
      'mod.recolor.to': 'Nová barva',
      'mod.recolor.tolerance': 'Tolerance',
      'mod.recolor.tolerance.help': 'Na kanál RGB, 0–255. Prázdné = automaticky: přesně u SVG, 32 u rastrových ikon.',

      'mod.background': 'Pozadí',
      'mod.background.help': 'Tvar za průhlednou ikonou; ikona se zmenší, aby se vešla.',
      'mod.background.color': 'Barva',
      'mod.background.shape': 'Tvar',
      'mod.background.shape.square': 'Čtverec',
      'mod.background.shape.rounded': 'Zaoblený čtverec',
      'mod.background.shape.circle': 'Kruh',
      'mod.background.radius': 'Zaoblení rohů',
      'mod.background.padding': 'Okraj',
      'mod.background.padding.help': 'Místo kolem ikony, podíl její velikosti.',
      'mod.background.opacity': 'Krytí',

      'mod.fade': 'Blednutí nečinné karty',
      'mod.fade.help': 'Karta, na kterou se nedíváte, krok za krokem šedne a tmavne; po návratu je hned zpět v plných barvách.',
      'mod.fade.group.timing': 'Časování',
      'mod.fade.group.look': 'Plně vybledlá',
      'mod.fade.group.keep': 'Co zůstane',
      'mod.fade.step': 'Krok',
      'mod.fade.step.help': 'Sekundy mezi dvěma kroky blednutí.',
      'mod.fade.after': 'Plně vybledlá po',
      'mod.fade.easing': 'Průběh',
      'mod.fade.easing.linear': 'Rovnoměrně',
      'mod.fade.easing.ease-in': 'Zpočátku pomalu',
      'mod.fade.easing.ease-out': 'Zpočátku rychle',
      'mod.fade.easing.ease-in-out': 'Pomalu – rychle – pomalu',
      'mod.fade.target': 'Co bledne',
      'mod.fade.target.all': 'Všechno',
      'mod.fade.target.icon': 'Jen logo',
      'mod.fade.target.background': 'Jen pozadí',
      'mod.fade.saturation': 'Sytost',
      'mod.fade.brightness': 'Jas',
      'mod.fade.keep': 'Barvy, které zůstanou',
      'mod.fade.keep.help': 'Nevyblednou, takže i nečinná karta ukáže barvu své instance.',
      'mod.fade.keep.recolored': 'Přebarvené barvy',
      'mod.fade.tolerance': 'Tolerance shody',
      'mod.fade.keepStrength': 'Jak moc zůstanou',
      'mod.fade.keepBackground': 'Pozadí zůstane',
      'mod.fade.keepBackground.help': 'Zachová i barvu pozadí, úplně (100 %) nebo zčásti.',
    },
  };

  const normLocale = (l) => String(l || '').trim().toLowerCase().replace(/_/g, '-');

  /**
   * Add or override messages of a language: `addMessages('de', { 'ui.reset': 'Zurücksetzen' })`.
   * @param {string} locale @param {Object<string, string>} messages
   */
  function addMessages(locale, messages) {
    const l = normLocale(locale);
    MESSAGES[l] = { ...MESSAGES[l], ...messages };
  }

  /** The page language, else the browser's, else English. */
  function defaultLocale() {
    const doc = typeof document !== 'undefined' ? document.documentElement?.lang : '';
    const nav = typeof navigator !== 'undefined' ? navigator.language : '';
    return normLocale(doc || nav || 'en');
  }

  /**
   * A message lookup: the overrides, the locale (`cs-CZ`), its base language (`cs`), English, the fallback
   * text, the key. `{name}` placeholders are filled from `vars`.
   * @param {string} [locale] @param {Object<string, string>} [overrides]
   * @returns {function(string, string=, object=): string}
   */
  function createTranslator(locale = defaultLocale(), overrides = {}) {
    const l = normLocale(locale) || 'en';
    const t = (key, fallback, vars) => {
      const dicts = [overrides, MESSAGES[l], MESSAGES[l.split('-')[0]], MESSAGES.en];
      let s = null;
      for (const d of dicts) if (d && typeof d[key] === 'string') { s = d[key]; break; }
      if (s == null) s = fallback ?? key;
      return vars ? s.replace(/\{(\w+)\}/g, (m, n) => (n in vars ? String(vars[n]) : m)) : s;
    };
    t.locale = l;
    return t;
  }

  /* ------------------------------------------------------- schema → fields */

  /** The label of a mod type. */
  function modLabel(type, t) {
    const s = FaviconModder.modSchema(type);
    return t(s?.labelKey || `mod.${type}`, s?.label || type);
  }

  /** The help text of a mod type ('' when none). */
  function modHelp(type, t) {
    const s = FaviconModder.modSchema(type);
    return t(s?.helpKey || `mod.${type}.help`, s?.help || '');
  }

  const shows = (field, values) => !field.when || Object.entries(field.when)
    .every(([k, v]) => (Array.isArray(v) ? v.includes(values[k]) : values[k] === v));

  /**
   * The fields the configurator draws for one config entry: the schema, translated, with the current values.
   * @param {object} entry  a mod of a config (`{ type, ...options }`)
   * @param {function} t  from createTranslator()
   * @returns {Array<object>}  per option: key, type, label, help, value, group, groupLabel, hidden, choices,
   *   tokens, advanced and the number limits
   */
  function fieldsFor(entry, t) {
    const schema = FaviconModder.modSchema(entry.type);
    if (!schema) return [];
    const base = `mod.${entry.type}`;
    return schema.options.map((f) => ({
      key: f.key,
      type: f.type,
      label: t(f.labelKey || `${base}.${f.key}`, f.label || f.key),
      help: t(f.helpKey || `${base}.${f.key}.help`, f.help || ''),
      value: entry[f.key] === undefined ? f.default : entry[f.key],
      group: f.group || '',
      groupLabel: f.group ? t(`${base}.group.${f.group}`, schema.groups?.[f.group] || f.group) : '',
      hidden: !shows(f, entry),
      advanced: Boolean(f.advanced),
      min: f.min, max: f.max, step: f.step, unit: f.unit || '', percent: Boolean(f.percent), nullable: Boolean(f.nullable),
      choices: (f.options || []).map((o) => ({ value: o.value, label: t(`${base}.${f.key}.${o.value}`, o.label || String(o.value)) })),
      tokens: (f.tokens || []).map((o) => ({ value: o.value, label: t(`${base}.${f.key}.${o.value}`, o.label || o.value) })),
    }));
  }

  /* ------------------------------------------------------------ config edits */

  const normal = (c) => FaviconModder.normalizeConfig(c).config;

  /** The default options of a mod type, as a config entry. */
  function newEntry(type) { return normal({ mods: [{ type }] }).mods[0]; }

  /** Add a mod of `type`: at the end, but before a mod whose schema wants to be last (the fade). */
  function addMod(config, type) {
    const c = normal(config);
    const at = c.mods.findIndex((m) => FaviconModder.modSchema(m.type)?.position === 'last');
    const entry = newEntry(type);
    if (at < 0 || FaviconModder.modSchema(type)?.position === 'last') c.mods.push(entry);
    else c.mods.splice(at, 0, entry);
    return normal(c);
  }

  /** Remove the mod at `index`. */
  function removeMod(config, index) {
    const c = normal(config);
    c.mods.splice(index, 1);
    return c;
  }

  /** Move the mod at `index` by `delta` places (−1 up, +1 down); out of range changes nothing. */
  function moveMod(config, index, delta) {
    const c = normal(config);
    const to = index + delta;
    if (index < 0 || index >= c.mods.length || to < 0 || to >= c.mods.length) return c;
    const [m] = c.mods.splice(index, 1);
    c.mods.splice(to, 0, m);
    return c;
  }

  /** Set one option of the mod at `index` (checked against its schema; an invalid value leaves the default). */
  function setOption(config, index, key, value) {
    const c = normal(config);
    if (!c.mods[index]) return c;
    c.mods[index] = { ...c.mods[index], [key]: value };
    return normal(c);
  }

  /** Set a top-level option (`enabled`, `size`). */
  function setTop(config, key, value) { return normal({ ...normal(config), [key]: value }); }

  /** The mod types the "add" menu offers: registered, allowed, and not a `single` type already present. */
  function addable(config, allowed) {
    return FaviconModder.modTypes()
      .filter((type) => !allowed || allowed.includes(type))
      .map((type) => ({ type, disabled: Boolean(FaviconModder.modSchema(type).single && config.mods.some((m) => m.type === type)) }));
  }

  /* --------------------------------------------------------------- storage */

  /**
   * A config store in localStorage: `{ load(), save(config), clear() }`; `save` can be passed as `onChange`.
   * Blocked storage fails soft (load returns null).
   * @param {string} [key='favicon-modder-config']
   */
  function localStorageStore(key = 'favicon-modder-config') {
    return {
      key,
      load() {
        try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; }
      },
      save: (config) => {
        try { localStorage.setItem(key, JSON.stringify(config)); } catch { /* storage blocked or full */ }
      },
      clear() { try { localStorage.removeItem(key); } catch { /* storage blocked */ } },
    };
  }

  /* -------------------------------------------------------------------- style */

  const CSS = `
  :host { display: block; }
  .fmui {
    --_accent: var(--fmui-accent, #1565c0); --_bg: var(--fmui-bg, #ffffff); --_fg: var(--fmui-fg, #1d2329);
    --_muted: var(--fmui-muted, #5f6b76); --_border: var(--fmui-border, #d5dbe1); --_panel: var(--fmui-panel, #f4f6f8);
    --_check: #0000000d; --_radius: var(--fmui-radius, 10px);
    container-type: inline-size; box-sizing: border-box; color: var(--_fg); background: var(--_bg);
    border: 1px solid var(--_border); border-radius: var(--_radius); padding: 16px;
    font: var(--fmui-font, 14px/1.45 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif); color-scheme: light;
  }
  .fmui[data-theme="dark"] {
    --_accent: var(--fmui-accent, #7cb4f5); --_bg: var(--fmui-bg, #1c2227); --_fg: var(--fmui-fg, #e6eaee);
    --_muted: var(--fmui-muted, #9aa6b1); --_border: var(--fmui-border, #36424c); --_panel: var(--fmui-panel, #232b31);
    --_check: #ffffff12; color-scheme: dark;
  }
  @media (prefers-color-scheme: dark) {
    .fmui[data-theme="auto"] {
      --_accent: var(--fmui-accent, #7cb4f5); --_bg: var(--fmui-bg, #1c2227); --_fg: var(--fmui-fg, #e6eaee);
      --_muted: var(--fmui-muted, #9aa6b1); --_border: var(--fmui-border, #36424c); --_panel: var(--fmui-panel, #232b31);
      --_check: #ffffff12; color-scheme: dark;
    }
  }
  .fmui *, .fmui *::before, .fmui *::after { box-sizing: border-box; }
  .head { display: flex; align-items: center; gap: 12px; margin: 0 0 14px; flex-wrap: wrap; }
  .head h2 { font-size: 16px; margin: 0; flex: 1; }
  .top { display: flex; align-items: center; gap: 8px; color: var(--_muted); font-size: 13px; }
  .switch { display: inline-flex; align-items: center; gap: 8px; border: 0; background: none; color: inherit; font: inherit; padding: 2px; cursor: pointer; border-radius: 999px; }
  .switch .track { width: 36px; height: 20px; border-radius: 999px; background: var(--_border); position: relative; transition: background .15s; }
  .switch .track::after { content: ""; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: #fff; box-shadow: 0 1px 2px #0004; transition: transform .15s; }
  .switch[aria-checked="true"] .track { background: var(--_accent); }
  .switch[aria-checked="true"] .track::after { transform: translateX(16px); }
  .body { display: grid; grid-template-columns: 200px minmax(0, 1fr); gap: 16px; align-items: start; }
  @container (max-width: 600px) { .body { grid-template-columns: minmax(0, 1fr); } }
  .preview { background: var(--_panel); border: 1px solid var(--_border); border-radius: 8px; padding: 12px; display: grid; gap: 10px; justify-items: center; }
  .big { width: 96px; height: 96px; display: block; border-radius: 8px; background: repeating-conic-gradient(var(--_check) 0 25%, transparent 0 50%) 0 0 / 12px 12px; }
  .tabmock { display: flex; align-items: center; gap: 6px; width: 100%; padding: 6px 8px; border-radius: 8px 8px 0 0; background: var(--_bg); border: 1px solid var(--_border); border-bottom: 0; font-size: 12px; white-space: nowrap; overflow: hidden; }
  .tabmock img { width: 16px; height: 16px; flex: none; }
  .tabmock span { overflow: hidden; text-overflow: ellipsis; }
  .scrub { width: 100%; display: grid; gap: 2px; font-size: 12px; color: var(--_muted); }
  .scrub input { width: 100%; accent-color: var(--_accent); margin: 0; }
  .strip { display: grid; grid-template-columns: repeat(6, 1fr); gap: 2px; width: 100%; }
  .strip img { width: 100%; max-width: 28px; aspect-ratio: 1; justify-self: center; }
  .small { font-size: 12px; color: var(--_muted); text-align: center; }
  .mods { display: grid; gap: 10px; min-width: 0; }
  .mods > h3 { font-size: 13px; text-transform: uppercase; letter-spacing: .04em; color: var(--_muted); margin: 0; }
  .empty { color: var(--_muted); margin: 0; }
  .off .mods .mod { opacity: .6; }
  .mod { border: 1px solid var(--_border); border-radius: 8px; padding: 10px 12px; min-width: 0; }
  .mod-head { display: flex; gap: 8px; align-items: flex-start; }
  .mod-head > div:first-child { flex: 1; min-width: 0; }
  .mod-head h4 { margin: 0; font-size: 14px; }
  .mod-head p, .help { margin: 2px 0 0; color: var(--_muted); font-size: 12px; }
  .tools { display: flex; gap: 2px; }
  .icon-btn { width: 28px; height: 28px; padding: 0; display: inline-grid; place-items: center; font-size: 14px; line-height: 1; }
  button { font: inherit; font-size: 13px; color: var(--_fg); background: var(--_bg); border: 1px solid var(--_border); border-radius: 6px; padding: 5px 10px; cursor: pointer; }
  button:hover:not(:disabled) { border-color: var(--_accent); }
  button:disabled { opacity: .4; cursor: default; }
  button.primary { background: var(--_accent); border-color: var(--_accent); color: var(--_bg); font-weight: 600; }
  :focus-visible { outline: 2px solid var(--_accent); outline-offset: 2px; }
  .group { margin: 10px 0 0; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--_muted); }
  .field { display: grid; grid-template-columns: 130px minmax(0, 1fr); gap: 2px 10px; align-items: center; margin: 8px 0 0; }
  .field[hidden] { display: none; }
  .field > label, .field > .label { font-size: 13px; }
  .field .help { grid-column: 2; }
  @container (max-width: 420px) { .field { grid-template-columns: minmax(0, 1fr); } .field .help { grid-column: 1; } }
  .ctl { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; min-width: 0; }
  input, select { font: inherit; font-size: 13px; color: var(--_fg); background: var(--_bg); border: 1px solid var(--_border); border-radius: 6px; padding: 4px 6px; min-width: 0; }
  select { max-width: 260px; justify-self: start; }
  input[type="range"] { flex: 1; min-width: 80px; padding: 0; border: 0; background: none; accent-color: var(--_accent); }
  input[type="number"] { width: 72px; }
  input[type="color"] { width: 32px; height: 28px; padding: 2px; flex: none; cursor: pointer; }
  input.hex { width: 96px; font-family: ui-monospace, monospace; }
  input[aria-invalid="true"] { border-color: #d32f2f; }
  input[type="checkbox"] { accent-color: var(--_accent); width: 16px; height: 16px; margin: 0; }
  .unit { color: var(--_muted); font-size: 12px; min-width: 1.2em; }
  .chip { display: inline-flex; align-items: center; gap: 4px; }
  .token { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; margin-right: 4px; }
  .add { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
  .foot { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin: 14px 0 0; padding: 12px 0 0; border-top: 1px solid var(--_border); }
  .status { color: var(--_muted); font-size: 12px; flex: 1; min-width: 120px; }
  details { margin: 10px 0 0; }
  details.more { margin: 8px 0 0; }
  details.more > summary { font-size: 12px; }
  details.more[open] > summary { margin-bottom: -2px; }
  summary { cursor: pointer; color: var(--_muted); font-size: 13px; }
  pre { margin: 6px 0 0; padding: 10px; background: var(--_panel); border: 1px solid var(--_border); border-radius: 6px; font: 12px/1.45 ui-monospace, monospace; overflow: auto; max-height: 320px; white-space: pre; }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  `;

  /* --------------------------------------------------------------------- DOM */

  let uid = 0;

  /** Minimal element builder: props `class`, `text`, `on` ({event: fn}), DOM properties, else attributes. */
  function h(doc, tag, props = {}, ...children) {
    const el = doc.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'on') for (const [e, fn] of Object.entries(v)) el.addEventListener(e, fn);
      else if (k === 'value' || k === 'checked' || k === 'hidden' || k === 'disabled' || k === 'selected' || k === 'open') el[k] = v;
      else el.setAttribute(k, v === true ? '' : String(v));
    }
    for (const c of children.flat()) if (c != null && c !== false) el.append(typeof c === 'string' ? doc.createTextNode(c) : c);
    return el;
  }

  const hex = (c) => {
    const p = FaviconModder.parseColor(c);
    return p ? FaviconModder.formatColor({ ...p, a: 1 }) : '#000000';
  };

  function formatTime(sec, t) {
    const s = Math.round(sec);
    if (s < 60) return t('ui.sec', '{n} s', { n: s });
    const m = Math.floor(s / 60);
    const r = s % 60;
    return r ? `${t('ui.min', '{n} min', { n: m })} ${t('ui.sec', '{n} s', { n: r })}` : t('ui.min', '{n} min', { n: m });
  }

  // the original icon of the page: what a running controller marked, else the icon link, else /favicon.ico
  function pageIcon(doc) {
    const link = doc.querySelector?.('link[rel~="icon" i]');
    return link?.getAttribute('data-favicon-modder-source') || link?.href || '/favicon.ico';
  }

  /**
   * Mount the configurator into `element` (in a Shadow DOM).
   * @param {Element} element
   * @param {{config?: object, onChange?: function(object): void, locale?: string, messages?: Object<string, string>,
   *   preview?: boolean, source?: string, allowedMods?: string[], defaults?: object, theme?: 'auto'|'light'|'dark',
   *   title?: string, tabTitle?: string}} [options]
   * @returns {{getConfig: function(): object, setConfig: function(object): void, setLocale: function(string): void,
   *   destroy: function(): void, root: ShadowRoot|Element}}
   */
  function mount(element, options = {}) {
    const doc = element.ownerDocument || document;
    const opts = { preview: true, theme: 'auto', ...options };
    const defaults = () => normal(opts.defaults || FaviconModder.defaultConfig());
    let config = normal(opts.config || defaults());
    let t = createTranslator(opts.locale || defaultLocale(), opts.messages);
    let time = 0;
    const root = element.attachShadow ? (element.shadowRoot || element.attachShadow({ mode: 'open' })) : element;
    const previews = [];
    const openMore = new Set(); // "More options" left open, per mod
    let refs = {};

    const emit = () => { if (opts.onChange) opts.onChange(normal(config)); };
    const id = (s) => `fmui${++uid}-${s}`;

    /* ---- preview: controllers drawing the config into <img>s */
    const source = () => opts.source || pageIcon(doc);
    function previewCtl(img, size, at) {
      const c = FaviconModder.fromConfig(config, { target: img, source: source(), size });
      if (at != null) c.preview(at);
      previews.push({ c, at });
      c.start();
      return c;
    }
    function updatePreviews() {
      for (const p of previews) { p.c.setConfig(config); if (p.at == null) p.c.preview(time); }
      const fade = previews[0]?.c.mods.some((m) => m.preview);
      if (refs.scrub) refs.scrub.hidden = !fade;
      if (refs.strip) refs.strip.hidden = !fade;
      if (refs.stripLabel) refs.stripLabel.hidden = !fade;
      updateScrubLabel();
    }
    function updateScrubLabel() {
      if (!refs.scrubOut) return;
      const after = config.mods.find((m) => m.type === 'fade')?.after;
      const pct = t('ui.idleValue', '{percent} % of the fade', { percent: Math.round(time * 100) });
      refs.scrubOut.textContent = after ? `${pct} · ${t('ui.idleTime', '{time} idle', { time: formatTime(time * after, t) })}` : pct;
    }
    function stopPreviews() { previews.splice(0).forEach((p) => p.c.stop()); }

    /* ---- after an edit */
    function changed({ rerender = false } = {}) {
      if (rerender) render();
      else {
        refs.json && (refs.json.textContent = JSON.stringify(config, null, 2));
        refs.frame?.classList?.toggle('off', !config.enabled);
        refs.whens?.forEach((fn) => fn());
        updatePreviews();
      }
      emit();
    }

    /* ---- one field */
    function fieldEl(index, f) {
      const fid = id(f.key);
      const helpId = f.help ? id(`${f.key}-help`) : null;
      const set = (v, rerender) => { config = setOption(config, index, f.key, v); changed({ rerender }); };
      const aria = { 'aria-describedby': helpId };
      let control;
      let labelFor = fid;
      if (f.type === 'color') {
        const text = h(doc, 'input', { class: 'hex', type: 'text', id: fid, value: f.value, spellcheck: 'false', autocomplete: 'off', ...aria });
        const pick = h(doc, 'input', { type: 'color', value: hex(f.value), 'aria-label': f.label, tabindex: '-1' });
        pick.addEventListener('input', () => { text.value = pick.value; text.removeAttribute('aria-invalid'); set(pick.value); });
        text.addEventListener('input', () => {
          const ok = FaviconModder.parseColor(text.value.trim());
          if (!ok) { text.setAttribute('aria-invalid', 'true'); return; }
          text.removeAttribute('aria-invalid');
          pick.value = hex(text.value);
          set(text.value.trim());
        });
        control = h(doc, 'div', { class: 'ctl' }, pick, text);
      } else if (f.type === 'number') {
        const k = f.percent ? 100 : 1;
        const show = (v) => (v == null ? '' : String(Math.round(v * k * 1000) / 1000));
        const num = h(doc, 'input', {
          type: 'number', id: fid, value: show(f.value), min: f.min != null ? f.min * k : null, max: f.max != null ? f.max * k : null,
          step: f.step != null ? Math.round(f.step * k * 1000) / 1000 : 'any', placeholder: f.nullable ? t('ui.auto', 'auto') : null, ...aria,
        });
        let range = null;
        if (f.min != null && f.max != null && !f.nullable) { // a nullable number has no slider position for "auto"
          range = h(doc, 'input', {
            type: 'range', min: f.min * k, max: f.max * k, step: num.getAttribute('step'), value: show(f.value ?? f.min),
            'aria-label': f.label, tabindex: '-1',
          });
          range.addEventListener('input', () => { num.value = range.value; set(Number(range.value) / k); });
        }
        num.addEventListener('input', () => {
          if (num.value === '' && f.nullable) { set(null); return; }
          const v = Number(num.value);
          if (num.value === '' || !Number.isFinite(v)) return;
          if (range) range.value = num.value;
          set(v / k);
        });
        control = h(doc, 'div', { class: 'ctl' }, range, num, h(doc, 'span', { class: 'unit', text: f.percent ? '%' : f.unit }));
      } else if (f.type === 'select') {
        const sel = h(doc, 'select', { id: fid, ...aria }, f.choices.map((c) => h(doc, 'option', { value: String(c.value), text: c.label, selected: c.value === f.value })));
        sel.value = String(f.value);
        sel.addEventListener('change', () => set(f.choices.find((c) => String(c.value) === sel.value)?.value));
        control = sel;
      } else if (f.type === 'boolean') {
        const box = h(doc, 'input', { type: 'checkbox', id: fid, checked: Boolean(f.value), ...aria });
        box.addEventListener('change', () => set(box.checked));
        control = h(doc, 'div', { class: 'ctl' }, box);
      } else if (f.type === 'colorList') {
        labelFor = null;
        const list = Array.isArray(f.value) ? f.value : [];
        const tokens = f.tokens.map((tok) => {
          const box = h(doc, 'input', { type: 'checkbox', checked: list.includes(tok.value) });
          box.addEventListener('change', () => set(box.checked ? [tok.value, ...list] : list.filter((v) => v !== tok.value), true));
          return h(doc, 'label', { class: 'token' }, box, tok.label);
        });
        const colors = list.filter((v) => !f.tokens.some((tok) => tok.value === v));
        const chips = colors.map((c, i) => {
          const n = i + 1;
          const pick = h(doc, 'input', { type: 'color', value: hex(c), 'aria-label': t('ui.color', 'Colour {n}', { n }) });
          pick.addEventListener('change', () => set(list.map((v) => (v === c ? pick.value : v)), true));
          const del = h(doc, 'button', { type: 'button', class: 'icon-btn', 'aria-label': t('ui.removeColor', 'Remove colour {n}', { n }), text: '×' });
          del.addEventListener('click', () => set(list.filter((v) => v !== c), true));
          return h(doc, 'span', { class: 'chip' }, pick, del);
        });
        const add = h(doc, 'button', { type: 'button', text: `+ ${t('ui.addColor', 'Add a colour')}` });
        add.addEventListener('click', () => {
          const next = ['#00b140', '#d32f2f', '#1565c0', '#f9a825', '#000000'].find((c) => !list.includes(c)) || '#888888';
          set([...list, next], true);
        });
        control = h(doc, 'div', { class: 'ctl', role: 'group', 'aria-label': f.label, ...aria }, tokens, chips, add);
      } else {
        const text = h(doc, 'input', { type: 'text', id: fid, value: f.value ?? '', ...aria });
        text.addEventListener('input', () => set(text.value));
        control = text;
      }
      const label = labelFor ? h(doc, 'label', { for: labelFor, text: f.label }) : h(doc, 'span', { class: 'label', text: f.label });
      const row = h(doc, 'div', { class: 'field', hidden: f.hidden, 'data-key': f.key }, label, control, f.help ? h(doc, 'p', { class: 'help', id: helpId, text: f.help }) : null);
      return row;
    }

    /* ---- one mod */
    function modEl(entry, index) {
      const n = config.mods.length;
      const known = Boolean(FaviconModder.modSchema(entry.type));
      const name = known ? modLabel(entry.type, t) : t('ui.unknown', 'Unknown mod “{type}”', { type: entry.type });
      const help = known ? modHelp(entry.type, t) : t('ui.unknownHelp', 'Kept in the JSON for a newer version; not applied here.');
      const hid = id('mod');
      const btn = (text, label, disabled, fn) => h(doc, 'button', { type: 'button', class: 'icon-btn', text, 'aria-label': label, title: label, disabled, on: { click: fn } });
      const tools = h(doc, 'div', { class: 'tools' },
        btn('↑', t('ui.moveUp', 'Move {mod} up', { mod: name }), index === 0, () => { config = moveMod(config, index, -1); changed({ rerender: true }); }),
        btn('↓', t('ui.moveDown', 'Move {mod} down', { mod: name }), index === n - 1, () => { config = moveMod(config, index, 1); changed({ rerender: true }); }),
        btn('×', t('ui.remove', 'Remove {mod}', { mod: name }), false, () => { config = removeMod(config, index); changed({ rerender: true }); }));
      const fields = known ? fieldsFor(entry, t) : [];
      // the plain fields first, the advanced ones under "More options"; each list keeps the schema's groups
      const list = (subset) => {
        const out = [];
        let group = '';
        for (const f of subset) {
          if (f.group !== group) { group = f.group; if (group) out.push(h(doc, 'div', { class: 'group', text: f.groupLabel })); }
          const row = fieldEl(index, f);
          if (FaviconModder.modSchema(entry.type).options.find((o) => o.key === f.key).when) {
            refs.whens.push(() => { row.hidden = Boolean(fieldsFor(config.mods[index] || entry, t).find((x) => x.key === f.key)?.hidden); });
          }
          out.push(row);
        }
        return out;
      };
      const advanced = fields.filter((f) => f.advanced);
      let more = null;
      if (advanced.length) {
        const key = `${index}:${entry.type}`;
        more = h(doc, 'details', { class: 'more', open: openMore.has(key) }, h(doc, 'summary', { text: t('ui.more', 'More options') }), list(advanced));
        more.addEventListener('toggle', () => { if (more.open) openMore.add(key); else openMore.delete(key); });
      }
      return h(doc, 'section', { class: 'mod', 'aria-labelledby': hid, 'data-type': entry.type },
        h(doc, 'div', { class: 'mod-head' }, h(doc, 'div', {}, h(doc, 'h4', { id: hid, text: name }), help ? h(doc, 'p', { text: help }) : null), tools),
        list(fields.filter((f) => !f.advanced)), more);
    }

    /* ---- the whole thing */
    function render() {
      stopPreviews();
      refs = { whens: [] };
      const frame = h(doc, 'div', { class: `fmui${config.enabled ? '' : ' off'}`, 'data-theme': opts.theme, lang: t.locale });
      refs.frame = frame;
      const sw = h(doc, 'button', { type: 'button', class: 'switch', role: 'switch', 'aria-checked': String(config.enabled) },
        h(doc, 'span', { class: 'track', 'aria-hidden': 'true' }), h(doc, 'span', { text: t('ui.enabled', 'On') }));
      sw.addEventListener('click', () => { config = setTop(config, 'enabled', !config.enabled); changed({ rerender: true }); });
      const sizeId = id('size');
      const sizes = [...new Set([16, 32, 48, 64, 96, 128, config.size])].sort((a, b) => a - b);
      const size = h(doc, 'select', { id: sizeId }, sizes.map((s) => h(doc, 'option', { value: String(s), text: `${s} px`, selected: s === config.size })));
      size.value = String(config.size);
      size.addEventListener('change', () => { config = setTop(config, 'size', Number(size.value)); changed(); });
      frame.append(h(doc, 'div', { class: 'head' },
        h(doc, 'h2', { text: opts.title || t('ui.title', 'Tab icon') }),
        h(doc, 'div', { class: 'top' }, h(doc, 'label', { for: sizeId, text: t('ui.size', 'Icon size') }), size),
        sw));

      const modsCol = h(doc, 'div', { class: 'mods' }, h(doc, 'h3', { text: t('ui.mods', 'Mods') }));
      if (!config.enabled) modsCol.append(h(doc, 'p', { class: 'empty', text: t('ui.disabled', 'Off — the page keeps its own icon.') }));
      if (!config.mods.length) modsCol.append(h(doc, 'p', { class: 'empty', text: t('ui.empty', 'No mods — the icon stays as it is.') }));
      config.mods.forEach((m, i) => modsCol.append(modEl(m, i)));
      const choices = addable(config, opts.allowedMods);
      if (choices.length) {
        const addId = id('add');
        const pick = h(doc, 'select', { id: addId }, choices.map((c) => h(doc, 'option', { value: c.type, text: modLabel(c.type, t), disabled: c.disabled })));
        const first = choices.find((c) => !c.disabled);
        if (first) pick.value = first.type;
        const add = h(doc, 'button', { type: 'button', text: `+ ${t('ui.add', 'Add')}`, disabled: !first });
        add.addEventListener('click', () => { if (pick.value) { config = addMod(config, pick.value); changed({ rerender: true }); } });
        modsCol.append(h(doc, 'div', { class: 'add' }, h(doc, 'label', { class: 'sr', for: addId, text: t('ui.addMod', 'Mod to add') }), pick, add));
      }

      const body = h(doc, 'div', { class: 'body' });
      if (opts.preview) {
        const big = h(doc, 'img', { class: 'big', alt: t('ui.preview', 'Preview'), src: source() });
        const tabIcon = h(doc, 'img', { alt: '', src: source() });
        const scrubId = id('scrub');
        const scrubIn = h(doc, 'input', { type: 'range', id: scrubId, min: '0', max: '100', step: '1', value: String(Math.round(time * 100)) });
        refs.scrubOut = h(doc, 'span', { 'aria-live': 'polite' });
        scrubIn.addEventListener('input', () => {
          time = Number(scrubIn.value) / 100;
          previews.filter((p) => p.at == null).forEach((p) => p.c.preview(time));
          updateScrubLabel();
        });
        refs.scrub = h(doc, 'div', { class: 'scrub' }, h(doc, 'label', { for: scrubId, text: t('ui.idle', 'Idle preview') }), scrubIn, refs.scrubOut);
        const stripImgs = [0, 0.2, 0.4, 0.6, 0.8, 1].map((at) => [at, h(doc, 'img', { alt: `${Math.round(at * 100)} %`, src: source() })]);
        refs.strip = h(doc, 'div', { class: 'strip' }, stripImgs.map(([, img]) => img));
        refs.stripLabel = h(doc, 'div', { class: 'small', text: t('ui.strip', 'The fade, step by step') });
        body.append(h(doc, 'div', { class: 'preview', role: 'group', 'aria-label': t('ui.preview', 'Preview') },
          big,
          h(doc, 'div', { class: 'tabmock', 'aria-hidden': 'true' }, tabIcon, h(doc, 'span', { text: opts.tabTitle || t('ui.tab', 'This tab') })),
          refs.scrub, refs.stripLabel, refs.strip));
        previewCtl(big, 64);
        previewCtl(tabIcon, 32);
        for (const [at, img] of stripImgs) previewCtl(img, 32, at);
      }
      body.append(modsCol);
      frame.append(body);

      refs.json = h(doc, 'pre', { tabindex: '0', text: JSON.stringify(config, null, 2) });
      const status = h(doc, 'span', { class: 'status', role: 'status', 'aria-live': 'polite' });
      const reset = h(doc, 'button', { type: 'button', text: t('ui.reset', 'Reset to defaults') });
      reset.addEventListener('click', () => { config = defaults(); changed({ rerender: true }); });
      const copy = h(doc, 'button', { type: 'button', class: 'primary', text: t('ui.copy', 'Copy JSON') });
      copy.addEventListener('click', async () => {
        const text = JSON.stringify(config, null, 2);
        try {
          await navigator.clipboard.writeText(text);
          status.textContent = t('ui.copied', 'The JSON is in the clipboard.');
        } catch {
          status.textContent = t('ui.copyFailed', 'Copying failed — select the JSON below.');
          refs.details.open = true;
        }
      });
      refs.details = h(doc, 'details', {}, h(doc, 'summary', { text: t('ui.json', 'JSON configuration') }), refs.json);
      frame.append(h(doc, 'div', { class: 'foot' }, reset, copy, status), refs.details);

      const style = h(doc, 'style', { text: CSS });
      root.replaceChildren(style, frame);
      updatePreviews();
    }

    render();

    return {
      root,
      /** The current config (a copy). */
      getConfig: () => normal(config),
      /** Show another config (does not call onChange). */
      setConfig(c) { config = normal(c); render(); },
      /** Switch the language; texts come from addMessages() / `messages`. */
      setLocale(l) { t = createTranslator(l, opts.messages); render(); },
      /** Stop the previews and empty the element. */
      destroy() { stopPreviews(); root.replaceChildren(); },
    };
  }

  const FaviconModderUI = {
    version: VERSION, mount, addMessages, createTranslator, defaultLocale, localStorageStore,
    fieldsFor, modLabel, modHelp, addMod, removeMod, moveMod, setOption, addable, messages: MESSAGES,
  };

  return FaviconModderUI;
});
