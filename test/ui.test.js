import { describe, expect, test } from 'bun:test';
import FaviconModder from '../src/favicon-modder.js';
import FaviconModderUI, {
  addMessages, createTranslator, fieldsFor, addMod, removeMod, moveMod, setOption, addable, localStorageStore, mount,
} from '../src/favicon-modder-ui.js';

describe('i18n', () => {
  test('English built in, Czech built in, region falls back to the language', () => {
    expect(createTranslator('en')('ui.reset')).toBe('Reset to defaults');
    expect(createTranslator('cs')('ui.reset')).toBe('Obnovit výchozí');
    expect(createTranslator('cs-CZ')('mod.fade')).toBe('Blednutí nečinné karty');
    expect(createTranslator('CS_cz')('ui.copy')).toBe('Kopírovat JSON');
  });
  test('missing in the locale → English → the fallback text → the key', () => {
    const de = createTranslator('de');
    expect(de('ui.reset')).toBe('Reset to defaults');
    expect(de('mod.thing.size', 'Size')).toBe('Size');
    expect(de('no.such.key')).toBe('no.such.key');
  });
  test('addMessages, overrides and placeholders', () => {
    addMessages('de', { 'ui.reset': 'Zurücksetzen', 'ui.remove': '{mod} entfernen' });
    const de = createTranslator('de-AT');
    expect(de('ui.reset')).toBe('Zurücksetzen');
    expect(de('ui.remove', '', { mod: 'Hintergrund' })).toBe('Hintergrund entfernen');
    expect(createTranslator('de', { 'ui.reset': 'Standard' })('ui.reset')).toBe('Standard');
    expect(createTranslator('en')('ui.idleValue', '', { percent: 40 })).toBe('40 % of the fade');
  });
});

describe('schema → fields', () => {
  test('labels by key with the English schema text as fallback', () => {
    const entry = FaviconModder.normalizeConfig({ mods: [{ type: 'background', shape: 'circle' }] }).config.mods[0];
    const en = fieldsFor(entry, createTranslator('en'));
    expect(en.map((f) => f.key)).toEqual(['color', 'shape', 'radius', 'padding', 'opacity']);
    expect(en[0]).toMatchObject({ type: 'color', label: 'Colour', value: '#e8f5e9' });
    expect(en[1].choices).toEqual([
      { value: 'square', label: 'Square' }, { value: 'rounded', label: 'Rounded square' }, { value: 'circle', label: 'Circle' },
    ]);
    expect(en.find((f) => f.key === 'radius').hidden).toBe(true); // only for shape: 'rounded'
    expect(en.find((f) => f.key === 'padding')).toMatchObject({ percent: true, min: 0, max: 0.45 });
    const cs = fieldsFor(entry, createTranslator('cs'));
    expect(cs[1].label).toBe('Tvar');
    expect(cs[1].choices[2].label).toBe('Kruh');
  });
  test('groups, tokens and nullable numbers', () => {
    const t = createTranslator('cs');
    const fade = fieldsFor({ type: 'fade' }, t);
    expect(fade.find((f) => f.key === 'step')).toMatchObject({ group: 'timing', groupLabel: 'Časování', unit: 's', value: 60 });
    expect(fade.find((f) => f.key === 'keep').tokens).toEqual([{ value: 'recolored', label: 'Přebarvené barvy' }]);
    expect(fieldsFor({ type: 'recolor' }, t).find((f) => f.key === 'tolerance')).toMatchObject({ nullable: true, value: null });
    expect(fade.filter((f) => f.advanced).map((f) => f.key)).toEqual(['easing', 'saturation', 'brightness', 'tolerance', 'keepStrength']);
  });
  test('a mod registered later shows up with its own labels, no translations needed', () => {
    FaviconModder.registerMod('ring', () => ({ name: 'ring' }), {
      label: 'Ring', options: [{ key: 'width', type: 'number', min: 1, max: 8, default: 2, label: 'Width', help: 'Pixels.' }],
    });
    const f = fieldsFor({ type: 'ring', width: 3 }, createTranslator('cs'));
    expect(f).toEqual([expect.objectContaining({ key: 'width', label: 'Width', help: 'Pixels.', value: 3 })]);
    expect(FaviconModderUI.modLabel('ring', createTranslator('cs'))).toBe('Ring');
    expect(addable({ mods: [] }).map((a) => a.type)).toContain('ring');
  });
});

describe('config edits', () => {
  const base = { mods: [{ type: 'recolor' }, { type: 'fade' }] };
  test('add puts a mod before the fade; a single type cannot be added twice', () => {
    const c = addMod(base, 'background');
    expect(c.mods.map((m) => m.type)).toEqual(['recolor', 'background', 'fade']);
    expect(addable(c, ['background', 'fade', 'recolor'])).toEqual([
      { type: 'recolor', disabled: false }, { type: 'background', disabled: true }, { type: 'fade', disabled: true },
    ]);
    expect(addable(c, ['recolor']).map((a) => a.type)).toEqual(['recolor']);
  });
  test('move and remove', () => {
    expect(moveMod(base, 1, -1).mods.map((m) => m.type)).toEqual(['fade', 'recolor']);
    expect(moveMod(base, 0, -1).mods.map((m) => m.type)).toEqual(['recolor', 'fade']);
    expect(removeMod(base, 0).mods.map((m) => m.type)).toEqual(['fade']);
  });
  test('setOption checks the value against the schema', () => {
    expect(setOption(base, 0, 'to', '#1565c0').mods[0].to).toBe('#1565c0');
    expect(setOption(base, 0, 'to', 'nope').mods[0].to).toBe('#d32f2f');
    expect(setOption(base, 1, 'keepStrength', 7).mods[1].keepStrength).toBe(1);
    expect(base.mods[0].to).toBeUndefined(); // the input is not changed
  });
});

describe('localStorageStore', () => {
  test('save / load / clear, soft when storage is blocked', () => {
    const map = new Map();
    globalThis.localStorage = { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, v), removeItem: (k) => map.delete(k) };
    const store = localStorageStore('fm-test');
    expect(store.load()).toBeNull();
    const { save } = store;
    save({ enabled: true, mods: [] });
    expect(store.load()).toEqual({ enabled: true, mods: [] });
    store.clear();
    expect(map.size).toBe(0);
    globalThis.localStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
    expect(store.load()).toBeNull();
    expect(() => store.save({})).not.toThrow();
    delete globalThis.localStorage;
  });
});

/* ---- a tiny DOM: enough for mount() without the preview */
class Node {
  constructor(doc) { this.ownerDocument = doc; this.childNodes = []; this.parentNode = null; }
  append(...nodes) { for (const n of nodes) { n.parentNode = this; this.childNodes.push(n); } }
  replaceChildren(...nodes) { this.childNodes = []; this.append(...nodes); }
  get textContent() { return this.childNodes.map((c) => c.textContent).join(''); }
  set textContent(v) { this.childNodes = [new Text(this.ownerDocument, v)]; }
}
class Text extends Node {
  constructor(doc, data) { super(doc); this.data = String(data); }
  get textContent() { return this.data; }
}
class Element extends Node {
  constructor(doc, tag) {
    super(doc);
    this.localName = tag; this.attributes = {}; this.listeners = {}; this.className = '';
    this.value = ''; this.checked = false; this.hidden = false; this.disabled = false; this.selected = false;
  }
  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return k in this.attributes ? this.attributes[k] : null; }
  removeAttribute(k) { delete this.attributes[k]; }
  addEventListener(e, fn) { (this.listeners[e] ||= []).push(fn); }
  fire(e) { (this.listeners[e] || []).forEach((fn) => fn({ target: this })); }
  attachShadow() { this.shadowRoot = new Element(this.ownerDocument, '#shadow'); return this.shadowRoot; }
  *walk() { for (const c of this.childNodes) if (c instanceof Element) { yield c; yield* c.walk(); } }
  find(fn) { for (const el of this.walk()) if (fn(el)) return el; return null; }
  findAll(fn) { return [...this.walk()].filter(fn); }
}
const shimDoc = { createElement: (tag) => new Element(shimDoc, tag), createTextNode: (s) => new Text(shimDoc, s) };

describe('mount (DOM shim, no preview)', () => {
  const host = () => { const el = new Element(shimDoc, 'div'); return el; };
  const config = { mods: [{ type: 'recolor', to: '#1565c0' }, { type: 'background' }, { type: 'fade' }] };

  test('renders one card per mod from the schema, in the locale', () => {
    const el = host();
    mount(el, { config, preview: false, locale: 'cs' });
    const root = el.shadowRoot;
    expect(root.childNodes[0].localName).toBe('style');
    const cards = root.findAll((n) => n.localName === 'section');
    expect(cards.map((c) => c.getAttribute('data-type'))).toEqual(['recolor', 'background', 'fade']);
    expect(cards[0].find((n) => n.localName === 'h4').textContent).toBe('Přebarvení');
    expect(root.find((n) => n.getAttribute('role') === 'switch').getAttribute('aria-checked')).toBe('true');
    const radius = cards[1].find((n) => n.getAttribute('data-key') === 'radius');
    expect(radius.hidden).toBe(false); // the default shape is rounded
  });

  test('an edit calls onChange with the new JSON; structure edits re-render', () => {
    const el = host();
    const seen = [];
    const ui = mount(el, { config, preview: false, locale: 'en', onChange: (c) => seen.push(c) });
    const root = el.shadowRoot;
    const toField = root.find((n) => n.getAttribute('data-key') === 'to');
    const hexInput = toField.find((n) => n.className === 'hex');
    hexInput.value = '#d3'; hexInput.fire('input'); // not a colour yet: nothing happens
    expect(seen).toHaveLength(0);
    expect(hexInput.getAttribute('aria-invalid')).toBe('true');
    hexInput.value = '#ff6f00'; hexInput.fire('input');
    expect(seen.at(-1).mods[0].to).toBe('#ff6f00');
    expect(root.find((n) => n.localName === 'pre').textContent).toContain('"to": "#ff6f00"');

    const shape = root.find((n) => n.localName === 'select' && n.parentNode.getAttribute('data-key') === 'shape');
    shape.value = 'circle'; shape.fire('change');
    expect(seen.at(-1).mods[1].shape).toBe('circle');
    expect(root.find((n) => n.getAttribute('data-key') === 'radius').hidden).toBe(true);

    const padding = root.find((n) => n.getAttribute('data-key') === 'padding').find((n) => n.getAttribute('type') === 'number');
    padding.value = '20'; padding.fire('input'); // shown in %, stored as a fraction
    expect(seen.at(-1).mods[1].padding).toBe(0.2);

    const remove = root.find((n) => n.getAttribute('aria-label') === 'Remove Recolour');
    remove.fire('click');
    expect(seen.at(-1).mods.map((m) => m.type)).toEqual(['background', 'fade']);
    expect(el.shadowRoot.findAll((n) => n.localName === 'section')).toHaveLength(2);

    el.shadowRoot.find((n) => n.getAttribute('role') === 'switch').fire('click');
    expect(seen.at(-1).enabled).toBe(false);
    expect(ui.getConfig().enabled).toBe(false);

    el.shadowRoot.find((n) => n.localName === 'button' && n.textContent === 'Reset to defaults').fire('click');
    expect(seen.at(-1)).toEqual(FaviconModder.defaultConfig());
  });

  test('setLocale re-renders; setConfig shows another config without onChange; allowedMods limits the add menu', () => {
    const el = host();
    let calls = 0;
    const ui = mount(el, { config, preview: false, locale: 'en', allowedMods: ['recolor'], onChange: () => { calls++; } });
    ui.setLocale('cs');
    expect(el.shadowRoot.find((n) => n.localName === 'h4').textContent).toBe('Přebarvení');
    ui.setConfig({ mods: [{ type: 'sparkle' }] });
    const card = el.shadowRoot.find((n) => n.localName === 'section');
    expect(card.find((n) => n.localName === 'h4').textContent).toBe('Neznámá úprava „sparkle“');
    const addSelect = el.shadowRoot.find((n) => n.localName === 'select' && n.parentNode.className === 'add');
    expect(addSelect.childNodes.map((o) => o.value)).toEqual(['recolor']);
    expect(calls).toBe(0);
    ui.destroy();
    expect(el.shadowRoot.childNodes).toHaveLength(0);
  });
});
