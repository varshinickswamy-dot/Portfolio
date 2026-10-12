import { compile } from '/opt/npm-tools/node_modules/tailwindcss/dist/lib.mjs';
import fs from 'fs';
const TW = '/opt/npm-tools/node_modules/tailwindcss/';
const input = `@layer theme, base, components, utilities;
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/preflight.css" layer(base);
@import "tailwindcss/utilities.css" layer(utilities);
@theme { --color-neon: #00f3ff; --font-sans: 'Geist', 'Inter', ui-sans-serif, system-ui, sans-serif; --font-mono: 'Geist Mono', ui-monospace, Menlo, monospace; }
@layer base { *, ::after, ::before { border-color: rgb(255 255 255 / 0.1); } button { cursor: pointer; } }
`;
const compiler = await compile(input, {
  base: TW,
  loadStylesheet: async (id, base) => {
    const name = id.replace('tailwindcss/', '').replace(/^tailwindcss$/, 'index.css');
    const path = TW + (name.endsWith('.css') ? name : name + '.css');
    return { path, base: TW, content: fs.readFileSync(path, 'utf8') };
  }
});
const src = ['ui.tsx', 'data.ts', 'engine.ts'].map(f => fs.readFileSync(f, 'utf8')).join('\n');
const cand = new Set(src.match(/[^\s"'`<>={}()]+/g) || []);
const css = compiler.build([...cand]);
fs.writeFileSync('tw.css', css);
console.log(css.length);
