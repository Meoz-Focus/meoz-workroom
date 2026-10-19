// Copyright 2026 Meoz-Focus contributors
// SPDX-License-Identifier: Apache-2.0
// Source: https://github.com/Meoz-Focus/meoz-workroom

import fs from 'node:fs/promises';
import { build } from 'esbuild';
let shell=await fs.readFile(new URL('./index.html',import.meta.url),'utf8');
// Keep license and source attribution inside standalone distributions, even minified.
const notices=await Promise.all(['LICENSE','NOTICE','licenses/web-ocean-MIT.txt'].map(name=>fs.readFile(new URL(name,import.meta.url),'utf8')));
shell=shell.replace('<head>',()=>`<head>\n<!--\n${notices.join('\n\n').replaceAll('--','—')}\n-->`);
for(const [name,type] of [['meoz-app-icon.svg','image/svg+xml'],['meoz-app-32.png','image/png'],['meoz-app-180.png','image/png']]){
  const data=await fs.readFile(new URL(name,import.meta.url));
  shell=shell.replaceAll(name,`data:${type};base64,${data.toString('base64')}`);
}
for(const minify of [false,true]) {
  const result=await build({entryPoints:[new URL('./js/main.js',import.meta.url).pathname],bundle:true,write:false,format:'esm',target:'es2022',minify,legalComments:'none'});
  const code=result.outputFiles[0].text.replace(/<\/script/gi,'<\\/script');
  const out=shell.replace('<script type="module" src="js/main.js"></script>',()=>`<script type="module">${code}</script>`);
  const name=minify?'workroom.min.html':'workroom.html';await fs.writeFile(new URL(name,import.meta.url),out);console.log(`${name}: ${(Buffer.byteLength(out)/1024).toFixed(1)} KB`);
}
