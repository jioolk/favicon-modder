// Builds dist/favicon-modder.js (UMD: a global `FaviconModder`, or module.exports) and its .min.js
// from the ES module in src/. Run with Bun: `bun run build`.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/favicon-modder.js', import.meta.url), 'utf8');
const exportsAt = src.indexOf('\nexport default FaviconModder;');
if (exportsAt < 0) throw new Error('build: the export block was not found');
const banner = src.slice(0, src.indexOf('*/') + 2);
const body = src.slice(banner.length, exportsAt).trim();

const umd = `${banner}
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else if (typeof define === 'function' && define.amd) define([], factory);
  else root.FaviconModder = factory();
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';

${body.replace(/^/gm, '  ').replace(/^ +$/gm, '')}

  return FaviconModder;
});
`;

mkdirSync('dist', { recursive: true });
writeFileSync('dist/favicon-modder.js', umd);

// minify the module body, then wrap the result the same way (Bun would turn a bare UMD file into CJS)
const tmp = 'dist/.min-entry.js';
writeFileSync(tmp, `${body}\nexport default FaviconModder;\n`);
const out = await Bun.build({ entrypoints: [tmp], minify: true, format: 'esm', target: 'browser' });
rmSync(tmp);
if (!out.success) throw new AggregateError(out.logs, 'build: minify failed');
const code = (await out.outputs[0].text()).trim();
const m = /export\s*\{\s*([\w$]+) as default\s*\};?$/.exec(code);
if (!m) throw new Error('build: unexpected minifier output');
const min = code.slice(0, m.index).replace(/\/\*![\s\S]*?\*\//, '').trim();
writeFileSync('dist/favicon-modder.min.js', `${banner}
(function(r,f){typeof module=="object"&&module.exports?module.exports=f():typeof define=="function"&&define.amd?define([],f):r.FaviconModder=f()})(typeof self<"u"?self:globalThis,function(){"use strict";${min}return ${m[1]}});
`);

for (const f of ['dist/favicon-modder.js', 'dist/favicon-modder.min.js']) {
  console.log(`${f}  ${readFileSync(f).length} bytes`);
}
