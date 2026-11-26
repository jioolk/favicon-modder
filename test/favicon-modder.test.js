import { describe, expect, test } from 'bun:test';
import FaviconModder, {
  create, parseColor, formatColor, recolorCss, recolorSvgString, recolorSvgDoc, recolorPixels, fadePixels,
  fadeLevel, nextFadeTick, recolor, background, fade,
} from '../src/favicon-modder.js';

describe('parseColor', () => {
  test('hex notations', () => {
    expect(parseColor('#00b140')).toEqual({ r: 0, g: 177, b: 64, a: 1 });
    expect(parseColor('#0B4')).toEqual({ r: 0, g: 187, b: 68, a: 1 });
    expect(parseColor('#00b14080')).toEqual({ r: 0, g: 177, b: 64, a: 0.502 });
    expect(parseColor('#0b48')).toEqual({ r: 0, g: 187, b: 68, a: 0.533 });
    expect(parseColor('#12345')).toBeNull();
  });
  test('rgb() and hsl(), comma and space syntax', () => {
    expect(parseColor('rgb(0, 177, 64)')).toEqual({ r: 0, g: 177, b: 64, a: 1 });
    expect(parseColor('rgba(0,177,64,0.5)')).toEqual({ r: 0, g: 177, b: 64, a: 0.5 });
    expect(parseColor('rgb(0 177 64 / 50%)')).toEqual({ r: 0, g: 177, b: 64, a: 0.5 });
    expect(parseColor('rgb(100%, 0%, 0%)')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(parseColor('hsl(120, 100%, 25%)')).toEqual({ r: 0, g: 128, b: 0, a: 1 });
    expect(parseColor('rgb(1, 2)')).toBeNull();
  });
  test('names', () => {
    expect(parseColor('Red')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(parseColor('transparent')).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    expect(parseColor('none')).toBeNull();
    expect(parseColor('url(#a)')).toBeNull();
  });
  test('formatColor', () => {
    expect(formatColor({ r: 211, g: 47, b: 47, a: 1 })).toBe('#d32f2f');
    expect(formatColor({ r: 1, g: 2, b: 3, a: 0.5 })).toBe('rgba(1, 2, 3, 0.5)');
  });
});

describe('SVG recolor on strings', () => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<style>.tail { fill: #00B140; } #green { stroke: rgb(0,177,64) } .red{fill:blue}</style>
<linearGradient id="g"><stop offset="0" stop-color="#00b140"/><stop offset="1" stop-color="#00b14080"/></linearGradient>
<circle id="green" fill='#0b4' stroke="url(#green)"/>
<path class="tail" style="fill:rgb(0 177 64);stroke:#333" fill="#00b140"/>
<text>#00b140 green</text></svg>`;
  const out = recolorSvgString(svg, '#00b140', '#d32f2f');

  test('every notation in style, attributes and stops', () => {
    expect(out).toContain('.tail { fill: #d32f2f; }');
    expect(out).toContain('#green { stroke: #d32f2f }');
    expect(out).toContain('stop-color="#d32f2f"');
    expect(out).toContain('stop-color="rgba(211, 47, 47, 0.502)"'); // keeps the source alpha
    expect(out).toContain('style="fill:#d32f2f;stroke:#333" fill="#d32f2f"');
  });
  test('exact by default, tolerance optional', () => {
    expect(out).toContain(`fill='#0b4'`); // #00bb44 is not #00b140
    expect(recolorSvgString(svg, '#00b140', '#d32f2f', 12)).toContain(`fill='#d32f2f'`);
  });
  test('leaves ids, urls, text and other colours alone', () => {
    expect(out).toContain('id="green"');
    expect(out).toContain('stroke="url(#green)"');
    expect(out).toContain('<text>#00b140 green</text>');
    expect(out).toContain('.red{fill:blue}');
  });
  test('named colours both ways', () => {
    expect(recolorSvgString('<svg><path fill="green"/></svg>', 'green', 'blue')).toBe('<svg><path fill="#0000ff"/></svg>');
    expect(recolorSvgString('<svg><path fill="#008000"/></svg>', 'green', 'red')).toBe('<svg><path fill="#ff0000"/></svg>');
  });
  test('recolorCss and stacking', () => {
    const once = recolorCss('a{fill:#00b140;stroke:#2e7d32}', '#00b140', '#d32f2f');
    expect(recolorCss(once, '#2e7d32', 'navy')).toBe('a{fill:#d32f2f;stroke:#000080}');
  });
  test('bad colours throw early', () => {
    expect(() => recolor('nope', '#fff')).toThrow();
    expect(() => background('nope')).toThrow();
  });
});

describe('SVG recolor on a DOM', () => {
  // the smallest DOM the recolor needs
  const el = (localName, attrs = {}, textContent = '') => ({
    localName, attrs, textContent,
    getAttribute(n) { return n in this.attrs ? this.attrs[n] : null; },
    setAttribute(n, v) { this.attrs[n] = String(v); },
  });
  test('attributes, style attributes and <style> elements', () => {
    const style = el('style', {}, '.t{fill:#00b140}');
    const path = el('path', { fill: '#00b140', style: 'stroke:#00b140', d: 'M0 0' });
    const stop = el('stop', { 'stop-color': 'rgb(0,177,64)' });
    recolorSvgDoc({ querySelectorAll: () => [style, path, stop] }, '#00b140', '#1565c0');
    expect(style.textContent).toBe('.t{fill:#1565c0}');
    expect(path.attrs).toEqual({ fill: '#1565c0', style: 'stroke:#1565c0', d: 'M0 0' });
    expect(stop.attrs['stop-color']).toBe('#1565c0');
  });
});

describe('pixels', () => {
  test('recolorPixels swaps within tolerance, keeps alpha, skips transparent', () => {
    const d = new Uint8ClampedArray([0, 177, 64, 255, 10, 170, 70, 128, 0, 177, 64, 0, 200, 200, 200, 255]);
    recolorPixels(d, '#00b140', '#d32f2f', 16);
    expect([...d]).toEqual([211, 47, 47, 255, 211, 47, 47, 128, 0, 177, 64, 0, 200, 200, 200, 255]);
  });
  test('fadePixels: level 0 untouched, level 1 grey and darker', () => {
    const d = new Uint8ClampedArray([255, 0, 0, 255]);
    expect([...fadePixels(d.slice(), 0)]).toEqual([255, 0, 0, 255]);
    const full = fadePixels(d.slice(), 1, { saturation: 0, brightness: 0.5 });
    expect(full[0]).toBe(full[1]);
    expect(full[0]).toBe(Math.round(0.2126 * 255 * 0.5));
    expect(full[3]).toBe(255);
  });
});

describe('fade timing', () => {
  const o = { step: 60, after: 900 };
  test('level rises per step, linearly, and stops at 1', () => {
    expect(fadeLevel(0, o)).toBe(0);
    expect(fadeLevel(59_999, o)).toBe(0);
    expect(fadeLevel(60_000, o)).toBeCloseTo(1 / 15);
    expect(fadeLevel(450_000, o)).toBeCloseTo(7 / 15); // 7.5 steps: still the 7th
    expect(fadeLevel(899_999, o)).toBeCloseTo(14 / 15);
    expect(fadeLevel(900_000, o)).toBe(1);
    expect(fadeLevel(5_000_000, o)).toBe(1);
    expect(fadeLevel(900, { step: 0.3, after: 0.9 })).toBe(1); // fractional steps land exactly
  });
  test('easing', () => {
    expect(fadeLevel(450_000, { ...o, easing: 'ease-in' })).toBeCloseTo((7 / 15) ** 2);
    expect(fadeLevel(450_000, { ...o, easing: (t) => Math.sqrt(t) })).toBeCloseTo(Math.sqrt(7 / 15));
  });
  test('next tick lands on the next step boundary, none once full', () => {
    expect(nextFadeTick(0, o)).toBe(60_000);
    expect(nextFadeTick(61_000, o)).toBe(59_000);
    expect(nextFadeTick(899_000, o)).toBe(1_000);
    expect(nextFadeTick(900_000, o)).toBeNull();
    expect(nextFadeTick(10_000, { step: 2, after: 30 })).toBe(2_000);
    expect(nextFadeTick(5_000, { step: 2, after: 5 })).toBe(1_000); // full at 6 s, the first step past `after`
    expect(nextFadeTick(6_000, { step: 2, after: 5 })).toBeNull();
  });
});

describe('mod registry', () => {
  test('call order is pipeline order; recolor stacks', () => {
    const fm = create().recolor('#00b140', 'red').background('#2e7d32').recolor('#fff', '#000').fade();
    expect(fm.mods.map((m) => m.name)).toEqual(['recolor', 'background', 'recolor', 'fade']);
  });
  test('background() and fade() are setters, null/false removes', () => {
    const fm = create().background('#2e7d32', { shape: 'circle' }).fade({ step: 2 });
    const bg = fm.get('background');
    fm.background('#b71c1c', { padding: 0.2 });
    expect(fm.mods.filter((m) => m.name === 'background')).toHaveLength(1);
    expect(bg.color).toBe('#b71c1c');
    expect(bg.options).toMatchObject({ shape: 'circle', padding: 0.2, radius: 0.22, opacity: 1 });
    fm.fade({ after: 30 });
    expect(fm.get('fade').options).toMatchObject({ step: 2, after: 30 });
    fm.background(null).fade(false);
    expect(fm.mods).toEqual([]);
  });
  test('remove by object or by name; custom mods via use()', () => {
    const mine = { name: 'badge', canvas() {} };
    const fm = create().recolor('#00b140', 'red').use(mine).recolor('#111', '#222');
    fm.remove(mine);
    expect(fm.mods.map((m) => m.name)).toEqual(['recolor', 'recolor']);
    fm.remove('recolor');
    expect(fm.mods).toEqual([]);
  });
  test('start() without a DOM or when onlyIf says no is a no-op', () => {
    expect(create().recolor('#0f0', '#f00').start().running).toBe(false);
    expect(create().onlyIf(() => false).start().running).toBe(false);
  });
  test('the default export carries the API', () => {
    expect(Object.keys(FaviconModder)).toEqual(expect.arrayContaining(['create', 'enabled', 'toggle', 'mods', 'version']));
    expect(typeof fade().attach).toBe('function');
  });
});

describe('opt-in switch', () => {
  test('enabled/toggle use localStorage, fail soft without it', () => {
    const store = new Map();
    globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) };
    expect(FaviconModder.enabled()).toBe(false);
    expect(FaviconModder.toggle()).toBe(true);
    expect(FaviconModder.enabled('favicon-modder')).toBe(true);
    expect(FaviconModder.toggle('favicon-modder', false)).toBe(false);
    expect(store.size).toBe(0);
    globalThis.localStorage = { getItem() { throw new Error('blocked'); } };
    expect(FaviconModder.enabled()).toBe(false);
    delete globalThis.localStorage;
  });
});
