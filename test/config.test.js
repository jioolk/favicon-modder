import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import FaviconModder, {
  create, fromConfig, normalizeConfig, defaultConfig, registerMod, modSchema, modTypes, registerMigration,
  fadeLevel, configVersion,
} from '../src/favicon-modder.js';

let warn;
beforeEach(() => { warn = spyOn(console, 'warn').mockImplementation(() => {}); });
afterEach(() => warn.mockRestore());

const FULL = {
  version: 1,
  enabled: true,
  size: 48,
  mods: [
    { type: 'recolor', from: '#00b140', to: '#1565c0', tolerance: 10 },
    { type: 'background', color: '#e3f2fd', shape: 'circle', radius: 0.22, padding: 0.14, opacity: 1 },
    {
      type: 'fade', step: 30, after: 600, easing: 'ease-in', target: 'all', keep: ['recolored', '#263238'],
      tolerance: 40, keepStrength: 0.8, keepBackground: 0.5, saturation: 0.1, brightness: 0.5,
    },
  ],
};

describe('fromConfig / toConfig', () => {
  test('a full config round-trips unchanged', () => {
    const fm = fromConfig(FULL);
    expect(fm.mods.map((m) => m.type)).toEqual(['recolor', 'background', 'fade']);
    expect(fm.options.size).toBe(48);
    expect(fm.toConfig()).toEqual(FULL);
    expect(fromConfig(fm.toConfig()).toConfig()).toEqual(FULL);
    expect(warn).not.toHaveBeenCalled();
  });
  test('the config reaches the mods', () => {
    const fm = fromConfig(FULL);
    expect(fm.get('recolor')).toMatchObject({ from: '#00b140', to: '#1565c0' });
    expect(fm.get('background').options).toMatchObject({ shape: 'circle', padding: 0.14 });
    expect(fm.get('fade').options).toMatchObject({ step: 30, after: 600, easing: 'ease-in', keep: ['recolored', '#263238'], keepStrength: 0.8 });
    expect(fm.get('fade').options.to).toEqual({ saturation: 0.1, brightness: 0.5 });
  });
  test('missing options get their defaults; JSON text is accepted', () => {
    const c = fromConfig('{"mods":[{"type":"recolor","to":"#d32f2f"},{"type":"fade"}]}').toConfig();
    expect(c).toEqual({
      version: 1, enabled: true, size: 64,
      mods: [
        { type: 'recolor', from: '#00b140', to: '#d32f2f', tolerance: null },
        {
          type: 'fade', step: 60, after: 900, easing: 'linear', target: 'all', keep: ['recolored'], tolerance: 48,
          keepStrength: 1, keepBackground: 0, saturation: 0, brightness: 0.55,
        },
      ],
    });
  });
  test('a controller built in code serialises too; custom mods without a type are left out', () => {
    const c = create({ size: 32 }).recolor('#00b140', '#d32f2f').background('#ffebee', { shape: 'square' })
      .fade({ keep: false, keepBackground: true }).use({ name: 'badge', canvas() {} }).toConfig();
    expect(c.size).toBe(32);
    expect(c.mods.map((m) => m.type)).toEqual(['recolor', 'background', 'fade']);
    expect(c.mods[1]).toMatchObject({ color: '#ffebee', shape: 'square', padding: 0.1 });
    expect(c.mods[2]).toMatchObject({ keep: [], keepBackground: 1 });
  });
  test('opts.size wins over the config size', () => {
    expect(fromConfig(FULL, { size: 16 }).options.size).toBe(16);
  });
  test('enabled: false builds the controller but start() does nothing', () => {
    const fm = fromConfig({ enabled: false, mods: [{ type: 'fade' }] });
    expect(fm.toConfig().enabled).toBe(false);
    expect(fm.start().running).toBe(false);
  });
  test('setConfig replaces the configured mods and keeps custom ones', () => {
    const badge = { name: 'badge', canvas() {} };
    const fm = fromConfig(FULL).use(badge);
    fm.setConfig({ mods: [{ type: 'fade', after: 60 }] });
    expect(fm.mods.map((m) => m.name)).toEqual(['fade', 'badge']);
    expect(fm.get('fade').options.after).toBe(60);
  });
  test('defaultConfig: on, 64 px, one fade', () => {
    expect(defaultConfig()).toMatchObject({ version: configVersion, enabled: true, size: 64, mods: [{ type: 'fade', after: 900 }] });
  });
});

describe('forward and backward tolerance', () => {
  test('unknown types and options are kept, not applied, with one warning', () => {
    const input = {
      version: 1, theme: 'x',
      mods: [
        { type: 'sparkle', speed: 3 },
        { type: 'recolor', from: '#00b140', to: '#d32f2f', glow: true },
      ],
    };
    const fm = fromConfig(input);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('unknown mod type "sparkle"');
    expect(String(warn.mock.calls[0][0])).toContain('recolor.glow');
    expect(fm.mods[0]).toMatchObject({ type: 'sparkle', unknown: true });
    expect(fm.mods[0].svg).toBeUndefined(); // inert
    const out = fm.toConfig();
    expect(out.mods[0]).toEqual({ type: 'sparkle', speed: 3 });
    expect(out.mods[1]).toEqual({ type: 'recolor', from: '#00b140', to: '#d32f2f', tolerance: null, glow: true });
    expect(out.theme).toBe('x');
  });
  test('invalid values fall back to the default', () => {
    const { config, warnings } = normalizeConfig({
      size: 'huge',
      mods: [
        { type: 'background', color: 'nope', shape: 'star', padding: 9, opacity: '0.5' },
        { type: 'fade', keep: ['#00b140', 'nope'], step: 'x' },
        { notype: 1 },
      ],
    });
    expect(config.size).toBe(64);
    expect(config.mods[0]).toMatchObject({ color: '#e8f5e9', shape: 'rounded', padding: 0.45, opacity: 0.5 });
    expect(config.mods[1]).toMatchObject({ keep: ['recolored'], step: 60 });
    expect(config.mods).toHaveLength(2);
    expect(warnings.length).toBeGreaterThanOrEqual(4);
  });
  test('not an object, bad JSON: the default config, a warning', () => {
    expect(normalizeConfig('{oops').config.mods[0].type).toBe('fade');
    expect(normalizeConfig('{oops').warnings[0]).toContain('not valid JSON');
    expect(normalizeConfig(null).warnings).toEqual([]);
  });
  test('a newer config version is read as far as understood and keeps its version', () => {
    const { config, warnings } = normalizeConfig({ version: configVersion + 1, mods: [{ type: 'fade' }] });
    expect(warnings[0]).toContain('newer');
    expect(fromConfig(config).toConfig().version).toBe(configVersion + 1);
  });
});

describe('migrations', () => {
  test('a config of an older version passes through the registered migrations', () => {
    // version 0 stored the fade's end time in minutes as `minutes`
    registerMigration(0, (c) => ({
      ...c, mods: c.mods.map((m) => (m.type === 'fade' && 'minutes' in m ? { type: 'fade', after: m.minutes * 60 } : m)),
    }));
    const c = fromConfig({ version: 0, mods: [{ type: 'fade', minutes: 5 }] }).toConfig();
    expect(c.version).toBe(configVersion);
    expect(c.mods[0].after).toBe(300);
    expect(c.mods[0].minutes).toBeUndefined();
  });
  test('a config without a version is taken as the current one', () => {
    expect(normalizeConfig({ mods: [] }).config.version).toBe(configVersion);
  });
});

describe('mod registry', () => {
  test('built-ins are registered with a schema', () => {
    expect(modTypes()).toEqual(expect.arrayContaining(['recolor', 'background', 'fade']));
    const s = modSchema('background');
    expect(s.single).toBe(true);
    expect(s.options.map((o) => o.key)).toEqual(['color', 'shape', 'radius', 'padding', 'opacity']);
    expect(s.options.find((o) => o.key === 'radius').when).toEqual({ shape: 'rounded' });
    expect(modSchema('fade').position).toBe('last');
    for (const type of modTypes()) {
      for (const o of modSchema(type).options) expect(o.label).toBeTruthy();
    }
  });
  test('a mod of your own: registered once, built from a config, serialised from its config', () => {
    const seen = [];
    registerMod('dot', (o) => ({ name: 'dot', canvas() { seen.push(o.color); } }), {
      label: 'Dot',
      options: [
        { key: 'color', type: 'color', default: '#e53935', label: 'Colour' },
        { key: 'size', type: 'number', min: 0.1, max: 0.5, step: 0.05, default: 0.2, label: 'Size' },
        { key: 'corner', type: 'select', default: 'top-right', options: [{ value: 'top-right' }, { value: 'top-left' }] },
        { key: 'pulse', type: 'boolean', default: false },
      ],
    });
    expect(modTypes()).toContain('dot');
    const fm = fromConfig({ mods: [{ type: 'dot', size: 2, pulse: 'on' }] });
    fm.mods[0].canvas();
    expect(seen).toEqual(['#e53935']);
    expect(fm.toConfig().mods[0]).toEqual({ type: 'dot', color: '#e53935', size: 0.5, corner: 'top-right', pulse: true });
    expect(FaviconModder.modSchema('dot').label).toBe('Dot');
  });
  test('bad registrations throw', () => {
    expect(() => registerMod('', () => ({}))).toThrow();
    expect(() => registerMod('x', null)).toThrow();
    expect(() => registerMod('x', () => ({}), { options: [{ key: 'a', type: 'weird' }] })).toThrow();
  });
  test('a factory that throws leaves an inert mod that keeps its entry', () => {
    registerMod('boom', () => { throw new Error('no'); }, { options: [{ key: 'a', type: 'text', default: 'x' }] });
    const fm = fromConfig({ mods: [{ type: 'boom', a: 'y' }] });
    expect(fm.mods[0].unknown).toBe(true);
    expect(fm.toConfig().mods[0]).toEqual({ type: 'boom', a: 'y' });
    expect(warn).toHaveBeenCalledTimes(1);
  });
});

describe('preview', () => {
  test('preview(time) freezes the fade at that share of `after`, stepped like the real one', () => {
    const fm = fromConfig({ mods: [{ type: 'fade', step: 60, after: 900 }] });
    fm.preview(0.5);
    expect(fm.get('fade').options.level).toBeCloseTo(fadeLevel(450_000, { step: 60, after: 900 }));
    expect(fm.get('fade').options.level).toBeCloseTo(7 / 15);
    fm.setConfig({ mods: [{ type: 'fade', step: 60, after: 600 }] }); // a rebuilt mod gets the preview too
    expect(fm.get('fade').options.level).toBeCloseTo(5 / 10);
    fm.preview(null);
    expect(fm.get('fade').options.level).toBeNull();
    expect(fm.toConfig().mods[0].level).toBeUndefined();
  });
});
