// Builds the UMD files in dist/ from the ES modules in src/, each with a minified twin:
//   favicon-modder.js     a global `FaviconModder` (or module.exports / AMD)
//   favicon-modder-ui.js  a global `FaviconModderUI`; needs the core (the global, or require('./favicon-modder.js'))
// Run with Bun: `bun run build`.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const BUNDLES = [
  { file: 'favicon-modder', global: 'FaviconModder', deps: [] },
  { file: 'favicon-modder-ui', global: 'FaviconModderUI', deps: [{ name: 'FaviconModder', path: './favicon-modder.js' }] },
];

mkdirSync('dist', { recursive: true });

for (const { file, global, deps } of BUNDLES) {
  const src = readFileSync(new URL(`../src/${file}.js`, import.meta.url), 'utf8');
  const exportsAt = src.indexOf(`\nexport default ${global};`);
  if (exportsAt < 0) throw new Error(`build: the export block of ${file} was not found`);
  const banner = src.slice(0, src.indexOf('*/') + 2);
  // the body without the banner and without the imports of the dependencies (they become factory arguments)
  const body = src.slice(banner.length, exportsAt).replace(/^import [^;]+;\n/gm, '').trim();
  const params = deps.map((d) => d.name).join(', ');
  const cjs = deps.map((d) => `require('${d.path}')`).join(', ');
  const amd = JSON.stringify(deps.map((d) => d.path.replace(/\.js$/, '')));
  const globals = deps.map((d) => `root.${d.name}`).join(', ');

  const umd = `${banner}
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(${cjs});
  else if (typeof define === 'function' && define.amd) define(${amd}, factory);
  else root.${global} = factory(${globals});
})(typeof self !== 'undefined' ? self : globalThis, function (${params}) {
  'use strict';

${body.replace(/^/gm, '  ').replace(/^ +$/gm, '')}

  return ${global};
});
`;
  writeFileSync(`dist/${file}.js`, umd);

  // minify the module body, then wrap the result the same way (Bun would turn a bare UMD file into CJS);
  // a dependency stays a free name in the minified code and is bound by the wrapper's parameter
  const tmp = `dist/.min-entry-${file}.js`;
  writeFileSync(tmp, `${body}\nexport default ${global};\n`);
  const out = await Bun.build({ entrypoints: [tmp], minify: true, format: 'esm', target: 'browser' });
  rmSync(tmp);
  if (!out.success) throw new AggregateError(out.logs, `build: minify of ${file} failed`);
  const code = (await out.outputs[0].text()).trim();
  const m = /export\s*\{\s*([\w$]+) as default\s*\};?$/.exec(code);
  if (!m) throw new Error(`build: unexpected minifier output for ${file}`);
  const min = code.slice(0, m.index).replace(/\/\*![\s\S]*?\*\//, '').trim();
  const r = deps.length ? `(${deps.map((d) => `require("${d.path}")`).join(',')})` : '()';
  const g = deps.length ? `(${deps.map((d) => `r.${d.name}`).join(',')})` : '()';
  writeFileSync(`dist/${file}.min.js`, `${banner}
(function(r,f){typeof module=="object"&&module.exports?module.exports=f${r}:typeof define=="function"&&define.amd?define(${amd},f):r.${global}=f${g}})(typeof self<"u"?self:globalThis,function(${params}){"use strict";${min}return ${m[1]}});
`);
}

for (const { file } of BUNDLES) {
  for (const f of [`dist/${file}.js`, `dist/${file}.min.js`]) {
    const bytes = readFileSync(f);
    const gz = Bun.gzipSync(bytes).length;
    console.log(`${f.padEnd(30)} ${String(bytes.length).padStart(6)} bytes  ${String(gz).padStart(5)} gzip`);
  }
}
