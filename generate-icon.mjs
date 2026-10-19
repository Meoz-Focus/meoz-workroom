// Copyright 2026 Meoz-Focus contributors
// SPDX-License-Identifier: Apache-2.0
// Source: https://github.com/Meoz-Focus/meoz-workroom

import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {COMPANION_SVG} from './js/companion-icon.js';

const root=new URL('./',import.meta.url);
await fs.writeFile(new URL('meoz-companion-blue.svg',root),COMPANION_SVG);
const appSvg=await fs.readFile(new URL('meoz-app-icon.svg',root));
const sha=createHash('sha256').update(appSvg).digest('hex');
const rendererIndex=process.argv.indexOf('--sharp');
if(rendererIndex>=0){
  const renderer=createRequire(import.meta.url).resolve(process.argv[rendererIndex+1]);
  const sharp=(await import(pathToFileURL(renderer).href)).default;
  const pngs=await Promise.all([16,32,48,180].map(size=>sharp(appSvg).resize(size,size).png().toBuffer()));
  for(const [i,size] of [16,32,48,180].entries())await fs.writeFile(new URL(`meoz-app-${size}.png`,root),pngs[i]);
  // Standard ICO directory containing the exact 16/32/48px PNG frames.
  const directory=Buffer.alloc(6+3*16);directory.writeUInt16LE(1,2);directory.writeUInt16LE(3,4);let offset=directory.length;
  for(let i=0;i<3;i++){const n=6+i*16,size=[16,32,48][i];directory[n]=directory[n+1]=size;directory.writeUInt16LE(1,n+4);directory.writeUInt16LE(32,n+6);directory.writeUInt32LE(pngs[i].length,n+8);directory.writeUInt32LE(offset,n+12);offset+=pngs[i].length;}
  await fs.writeFile(new URL('favicon.ico',root),Buffer.concat([directory,...pngs.slice(0,3)]));
  await fs.writeFile(new URL('icon-assets.json',root),JSON.stringify({source:'meoz-app-icon.svg',sourceSha256:sha,sizes:[16,32,48,180]},null,2)+'\n');
}else{
  const manifest=JSON.parse(await fs.readFile(new URL('icon-assets.json',root),'utf8'));
  if(manifest.source!=='meoz-app-icon.svg'||manifest.sourceSha256!==sha)throw new Error('Meoz app icon changed. Regenerate its PNG/ICO files with node generate-icon.mjs --sharp /absolute/path/to/sharp');
}
