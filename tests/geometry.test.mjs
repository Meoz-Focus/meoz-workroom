// Copyright 2026 Meoz-Focus contributors
// SPDX-License-Identifier: Apache-2.0
// Source: https://github.com/Meoz-Focus/meoz-workroom

import test from 'node:test';
import assert from 'node:assert/strict';
import {Geometry,buildBVH,sub,dot,cross,random,norm,sdEllipsoid,smoothMin} from '../js/geometry.js';

test('thin rounded enclosures retain their physical dimensions',()=>{
  const g=new Geometry(),size=[3.557,2.22,.045],center=[0,1.105,0];g.box(center,size,.055,1,12);
  for(const t of g.triangles)for(const p of [t.a,t.b,t.c])for(let k=0;k<3;k++)assert.ok(Math.abs(p[k]-center[k])<=size[k]/2+1e-9);
  assert.ok(g.triangles.length>100);
});

test('implicit anatomy produces finite, outward surface normals',()=>{
  const g=new Geometry(),fn=p=>sdEllipsoid(p,[0,0,0],[.3,.2,.4]);g.implicit(fn,[-.4,-.3,-.5],[.4,.3,.5],.05,6);
  assert.ok(g.triangles.length>100);
  for(const t of g.triangles)for(const [p,n] of [[t.a,t.na],[t.b,t.nb],[t.c,t.nc]]){
    assert.ok(p.every(Number.isFinite));assert.ok(n.every(Number.isFinite));assert.ok(Math.abs(Math.hypot(...n)-1)<1e-6);assert.ok(dot(p,n)>0);assert.ok(Math.abs(fn(p))<.012);
  }
});

function rayTriangle(o,d,t){const p=cross(d,t.e2),det=dot(t.e1,p);if(Math.abs(det)<1e-9)return Infinity;const inv=1/det,v0=sub(o,t.a),u=dot(v0,p)*inv;if(u<0||u>1)return Infinity;const q=cross(v0,t.e1),v=dot(d,q)*inv;if(v<0||u+v>1)return Infinity;const dist=dot(t.e2,q)*inv;return dist>.00025?dist:Infinity;}
test('threaded BVH traversal matches brute force nearest hits',()=>{
  const g=new Geometry();g.ellipsoid([0,0,0],[1,1.4,.8],1,16,12);g.box([2,0,0],[1,1,1],.1,2,4);const bvh=buildBVH(g.triangles),nf=new Float32Array(bvh.nodes),nu=new Uint32Array(bvh.nodes),tf=new Float32Array(bvh.triangles);
  const packed=Array.from({length:bvh.triangleCount},(_,i)=>{const o=i*32;return {a:[...tf.slice(o,o+3)],e1:[...tf.slice(o+4,o+7)],e2:[...tf.slice(o+8,o+11)]};});
  const rand=random(923);
  for(let ray=0;ray<100;ray++){
    const origin=[rand()*8-4,rand()*6-3,4],direction=norm([rand()*4-2,rand()*3-1.5,-4]);let expected=Infinity;for(const t of packed)expected=Math.min(expected,rayTriangle(origin,direction,t));
    let result=Infinity,index=0;
    while(index<bvh.nodeCount){const o=index*12;let near=-Infinity,far=Infinity;for(let k=0;k<3;k++){const a=(nf[o+k]-origin[k])/direction[k],b=(nf[o+4+k]-origin[k])/direction[k];near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b));}
      if(far<Math.max(.00015,near)||near>=result){index=nu[o+3];continue;}
      const count=nu[o+8];if(!count){index++;continue;}for(let j=0;j<count;j++)result=Math.min(result,rayTriangle(origin,direction,packed[nu[o+7]+j]));index=nu[o+3];
    }
    assert.equal(result===Infinity,expected===Infinity);if(Number.isFinite(result))assert.ok(Math.abs(result-expected)<1e-8);
  }
  assert.equal(nu[3],bvh.nodeCount);
});

test('deterministic grooming and bounded smooth unions',()=>{
  const a=new Geometry(),b=new Geometry();a.fur([0,0,0],[1,1,1],100,.05,8,5);b.fur([0,0,0],[1,1,1],100,.05,8,5);assert.deepEqual(a.triangles,b.triangles);assert.equal(a.hairCount,100);
  assert.equal(smoothMin(-1,2,.1),-1);assert.ok(smoothMin(0,0,.1)<0);
});
