// Copyright 2026 Meoz-Focus contributors
// SPDX-License-Identifier: Apache-2.0
// Source: https://github.com/Meoz-Focus/meoz-workroom

import test from 'node:test';
import assert from 'node:assert/strict';
import {Geometry,sub,dot,cross} from '../js/geometry.js';
import {createMug} from '../js/mug.js';

function rayDistance(o,d,t){
  const a=sub(t.b,t.a),b=sub(t.c,t.a),p=cross(d,b),det=dot(a,p);
  if(Math.abs(det)<1e-10)return Infinity;
  const q=sub(o,t.a),u=dot(q,p)/det;if(u<0||u>1)return Infinity;
  const r=cross(q,a),v=dot(d,r)/det;if(v<0||u+v>1)return Infinity;
  const distance=dot(b,r)/det;return distance>1e-6?distance:Infinity;
}

test('mug handle stays outside the cavity and joins only the exterior wall',()=>{
  const g=new Geometry(),mug=createMug(g);
  for(const t of mug.handleTriangles)for(const p of [t.a,t.b,t.c]){
    assert.ok(p.every(Number.isFinite));
    const radius=Math.hypot(p[0]-mug.center[0],p[2]-mug.center[2]);
    assert.ok(radius>.322,'No part of the handle may pass through the inner wall');
  }
  for(const attachment of mug.attachments){
    const hits=mug.wallTriangles.map(t=>rayDistance(attachment,[1,0,0],t)).filter(Number.isFinite).sort((a,b)=>a-b);
    const distinct=hits.filter((h,i)=>!i||h-hits[i-1]>1e-6);
    assert.ok(distinct[0]<mug.attachmentRadius,'Rounded end must enter the exterior ceramic');
    assert.ok(distinct[1]>mug.attachmentRadius,'Rounded end must stop before the inner wall');
  }
});

test('coffee remains unobstructed by white ceramic across its visible surface',()=>{
  const g=new Geometry(),mug=createMug(g);
  for(const radius of [0,.15,.30])for(let i=0;i<24;i++){
    const a=i*Math.PI/12,origin=[mug.center[0]+Math.cos(a)*radius,1,mug.center[2]+Math.sin(a)*radius];
    let distance=Infinity,material;
    for(const t of g.triangles){const hit=rayDistance(origin,[0,-1,0],t);if(hit<distance){distance=hit;material=t.mat;}}
    assert.equal(material,14,'The first visible surface inside the rim must be coffee');
    assert.ok(Math.abs(distance-(1-mug.coffeeHeight))<1e-7);
  }
});
