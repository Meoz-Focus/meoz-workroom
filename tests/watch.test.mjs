// Copyright 2026 Meoz-Focus contributors
// SPDX-License-Identifier: Apache-2.0
// Source: https://github.com/Meoz-Focus/meoz-workroom

import test from 'node:test';
import assert from 'node:assert/strict';
import {Geometry,sdCapsule,smoothMin,add,mul} from '../js/geometry.js';
import {createWatch,WATCH_MATERIALS} from '../js/watch.js';

test('silver watch follows the left forearm taper without cutting the skin',()=>{
  const skin=p=>smoothMin(sdCapsule(p,[-1.38,.405,.98],[-1.54,.37,1.72],.205,.265),sdCapsule(p,[-1.54,.37,1.68],[-1.75,.30,2.85],.265,.355),.12);
  const g=new Geometry(),fit=createWatch(g,{center:[-1.58,.358,1.90],axis:[-.21,-.07,1.17],skin});
  let least=Infinity;
  for(const t of g.triangles){
    for(const p of [t.a,t.b,t.c,add(mul(add(t.a,t.b),1/3),mul(t.c,1/3))]){
      assert.ok(p.every(Number.isFinite));
      assert.ok(p[0]<-1.1,'Every part stays on the left wrist');
      assert.ok(p[2]<2.14,'Watch must end before the nearer linen cuff');
      least=Math.min(least,skin(p));
    }
    for(const n of [t.na,t.nb,t.nc])assert.ok(Math.abs(Math.hypot(...n)-1)<1e-6);
  }
  assert.ok(least>-.001,`Steel must not penetrate the skin (${least})`);
  for(const p of fit.bandInner)assert.ok(skin(p)>.003&&skin(p)<.005,'Bracelet follows the actual wrist within half a millimetre');
  assert.ok(g.triangles.some(t=>t.mat===WATCH_MATERIALS.dial));
  assert.ok(g.triangles.some(t=>t.mat===WATCH_MATERIALS.polished));
  assert.ok(g.triangles.length<30000,'Watch detail stays within a bounded mesh budget');
});
