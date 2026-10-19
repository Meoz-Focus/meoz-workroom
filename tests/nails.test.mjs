// Copyright 2026 Meoz-Focus contributors
// SPDX-License-Identifier: Apache-2.0
// Source: https://github.com/Meoz-Focus/meoz-workroom

import test from 'node:test';
import assert from 'node:assert/strict';
import {Geometry,sdCapsule} from '../js/geometry.js';
import {createNail} from '../js/nails.js';

test('nails conform to curved fingertips with a thin surface and embedded cuticle',()=>{
  for(const side of [-1,1])for(const thumb of [false,true]){
    const base=[0,0,0],tip=[side*.025,-.06,-.16],radius=thumb?.083:.070;
    const sdf=p=>sdCapsule(p,base,tip,radius,radius*.76),g=new Geometry();
    g.implicit(sdf,[-.13,-.17,-.25],[.13,.12,.10],.012,6);
    const skin=g.triangles.slice(),start=g.triangles.length;
    assert.equal(createNail(g,skin,{base,tip,halfWidth:thumb?.058:.046,halfLength:.065}),true);
    const nail=g.triangles.slice(start);assert.ok(nail.length>400);
    const distances=[];
    for(const t of nail)for(const [p,n] of [[t.a,t.na],[t.b,t.nb],[t.c,t.nc]]){
      assert.ok(p.every(Number.isFinite)&&n.every(Number.isFinite));
      assert.ok(Math.abs(Math.hypot(...n)-1)<1e-6);
      const distance=sdf(p);distances.push(distance);
      assert.ok(Math.abs(distance)<.003,`Nail floats ${distance} above skin`);
    }
    assert.ok(distances.some(d=>d<-.0003),'Cuticle must enter the skin');
    assert.ok(distances.some(d=>d>.0007),'Nail plate must remain visible');
    assert.ok(nail.some(t=>t.a[2]<tip[2]+.020),'Nail must cover the distal fingertip');
  }
});
