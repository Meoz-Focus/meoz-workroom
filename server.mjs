// Copyright 2026 Meoz-Focus contributors
// SPDX-License-Identifier: Apache-2.0
// Source: https://github.com/Meoz-Focus/meoz-workroom

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.argv[2] || process.env.PORT || 8081);
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.svg':'image/svg+xml', '.ico':'image/x-icon', '.json':'application/json', '.png':'image/png', '.md':'text/plain; charset=utf-8' };
http.createServer((req,res)=>{
  let pathname;
  try { pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname); } catch { res.writeHead(400).end(); return; }
  if(req.method==='POST' && pathname==='/__log') {
    let body='';req.on('data',d=>{if(body.length<12000)body+=d;});req.on('end',()=>{console.log('[browser]',body);res.end('ok');});return;
  }
  const file=path.resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
  if(!file.startsWith(root+path.sep) || file.includes('/.git/') || file.includes('/node_modules/')) {res.writeHead(403).end();return;}
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end('Not found');return;}res.writeHead(200,{'content-type':types[path.extname(file)]||'application/octet-stream','cache-control':'no-store'});res.end(data);});
}).listen(port,'127.0.0.1',()=>console.log(`Meoz workroom: http://localhost:${port}/`));
