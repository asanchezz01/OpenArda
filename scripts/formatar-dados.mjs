// Formata data/terreno.json com uma feição por linha (mais fácil de revisar em diffs).
import { readFileSync, writeFileSync } from 'node:fs';
const p = new URL('../data/terreno.json', import.meta.url);
const d = JSON.parse(readFileSync(p, 'utf8'));
const linha = (o) => JSON.stringify(o).replace(/,"/g, ', "').replace(/":/g, '": ').replace(/\],\[/g, '], [');
let out = '{\n';
out += `  "versao": ${JSON.stringify(d.versao)},\n`;
out += `  "grade": ${JSON.stringify(d.grade, null, 2).replace(/\n/g, '\n  ')},\n`;
out += `  "limites": ${JSON.stringify(d.limites)},\n`;
out += `  "marcos": [\n${d.marcos.map((m) => '    ' + linha(m)).join(',\n')}\n  ],\n`;
out += `  "cadeias": {\n${Object.entries(d.cadeias).map(([k, v]) => `    ${JSON.stringify(k)}: ${linha(v)}`).join(',\n')}\n  },\n`;
out += `  "feicoes": [\n${d.feicoes.map((f) => '    ' + linha(f)).join(',\n')}\n  ]\n}\n`;
JSON.parse(out);
writeFileSync(p, out);
console.log('terreno.json formatado:', d.feicoes.length, 'feições');
