// Copyright 2026 Meoz-Focus contributors
// SPDX-License-Identifier: Apache-2.0
// Source: https://github.com/Meoz-Focus/meoz-workroom

import test from 'node:test';
import assert from 'node:assert/strict';
import {Geometry,add,sub,mul,dot,cross,sdEllipsoid} from '../js/geometry.js';
import {createCat,createCatTail,createCatBody,CAT_FACE,CAT_BODY,CAT_PAWS} from '../js/cat.js';
import {cameraFrame,views} from '../js/camera.js';

// These fixtures are read-only: build the same production meshes once for
// the independent surface/projection checks instead of sculpting each again.
let catFixture,bodyFixture;
function catMesh(){if(!catFixture){const g=new Geometry();catFixture={g,...createCat(g)};}return catFixture;}
function bodyMesh(){if(!bodyFixture){const g=new Geometry();bodyFixture={g,...createCatBody(g)};}return bodyFixture;}

function hit(o,d,t){
  const e1=sub(t.b,t.a),e2=sub(t.c,t.a),p=cross(d,e2),det=dot(e1,p);
  if(Math.abs(det)<1e-9)return Infinity;
  // Orthographic probes can land exactly on a shared mesh edge; tolerate
  // rounding there instead of skipping both adjoining triangles.
  const epsilon=1e-9,v0=sub(o,t.a),u=dot(v0,p)/det;if(u< -epsilon||u>1+epsilon)return Infinity;
  const q=cross(v0,e1),v=dot(d,q)/det;if(v< -epsilon||u+v>1+epsilon)return Infinity;
  const distance=dot(e2,q)/det;return distance>0?distance:Infinity;
}

test('curled tail has a rounded, closed tip instead of an open tube end',()=>{
  const g=new Geometry(),{tip,radius,direction}=createCatTail(g);
  const origin=add(tip,mul(direction,radius*3)),ray=mul(direction,-1);
  const nearest=Math.min(...g.triangles.map(t=>hit(origin,ray,t)));
  assert.ok(Math.abs(nearest-radius*2)<.003,'Ray must meet the near surface of the rounded tip');
  for(const t of g.triangles)for(const p of [t.a,t.b,t.c])assert.ok(p.every(Number.isFinite));
});

test('refined eyes, whiskers and smile stay fitted to the round tilted head',()=>{
  const {g,faceTriangles}=catMesh(),{center,radii,lean}=CAT_FACE;
  const c=Math.cos(lean),s=Math.sin(lean);
  for(const t of g.triangles)for(const key of ['a','b','c','na','nb','nc'])assert.ok(t[key].every(Number.isFinite));
  for(const t of faceTriangles)for(const p of [t.a,t.b,t.c]){
    const d=sub(p,center),x=d[0]*c+d[1]*s,y=-d[0]*s+d[1]*c;
    const q=1-(x/radii[0])**2-(y/radii[1])**2;
    assert.ok(q>0,'Facial details must stay within the curved head silhouette');
    const separation=d[2]-radii[2]*Math.sqrt(q);
    assert.ok(separation>-.003&&separation<.025,`A facial detail floats off the coat: ${separation}`);
  }
});

test('both rounded ear roots are fully buried in the head instead of leaving corner gaps',()=>{
  const {earTriangles}=catMesh(),{center,radii,lean}=CAT_FACE;
  const c=Math.cos(lean),s=Math.sin(lean);
  const vertices=earTriangles.flatMap(t=>[t.a,t.b,t.c]).map(p=>{
    const d=sub(p,center);return add(center,[d[0]*c+d[1]*s,-d[0]*s+d[1]*c,d[2]]);
  });
  for(const side of [-1,1]){
    const ear=vertices.filter(p=>(p[0]-center[0])*side>0);
    const lo=Math.min(...ear.map(p=>p[1])),hi=Math.max(...ear.map(p=>p[1]));
    const roots=ear.filter(p=>p[1]<lo+(hi-lo)*.20);
    assert.ok(roots.length>100,'The ear has a substantial, closed root');
    for(const p of roots)assert.ok(sdEllipsoid(p,center,radii)<-.008,'Every bottom corner must enter the head');
    assert.ok(hi<center[1]+radii[1]+.11,'The visible tip stays short and softly rounded');
  }
});

test('compact plump paws keep short forelegs, gentle toe folds and flattened soles',()=>{
  const {paws,bodyTriangles}=bodyMesh();
  for(const t of bodyTriangles){
    for(const p of [t.a,t.b,t.c])assert.ok(p.every(Number.isFinite));
    for(const n of [t.na,t.nb,t.nc])assert.ok(Math.abs(Math.hypot(...n)-1)<1e-6);
  }
  const vertices=bodyTriangles.flatMap(t=>[t.a,t.b,t.c]);
  const sole=vertices.reduce((lowest,p)=>Math.min(lowest,p[1]),Infinity);
  assert.ok(sole>-.002&&sole<.003,'Paws rest directly on the desktop');
  for(const paw of paws){
    assert.ok(paw.shoulder[1]<.46,'Leg roots must stay low in the chest instead of extending to the neck');
    assert.ok(paw.radii[0]>=.195&&paw.radii[1]<=.135,'Keep the paws plump and low');
    assert.ok(sdEllipsoid(paw.shoulder,CAT_BODY.center,CAT_BODY.radii)<-.01,'Foreleg root stays inside the pear body');
    const height=(dx,z)=>1-bodyTriangles.reduce((nearest,t)=>Math.min(nearest,hit([paw.center[0]+dx,1,z],[0,-1,0],t)),Infinity);
    assert.ok(height(0,.39)>.17,'Compact toes retain a soft rounded upper surface');
    for(const dx of [-CAT_PAWS.toeX,CAT_PAWS.toeX]){
      const z=CAT_PAWS.toeZ,expected=paw.center[1]+paw.radii[1]*Math.sqrt(1-(dx/paw.radii[0])**2-((z-paw.center[2])/paw.radii[2])**2);
      const depression=expected-height(dx,z);
      assert.ok(depression>0&&depression<.0045,`Toe folds must remain soft, shallow impressions: ${depression}`);
    }
    for(const dx of [-.07,.07])for(const dz of [-.055,.055]){
      const sole=-.1+bodyTriangles.reduce((nearest,t)=>Math.min(nearest,hit([paw.center[0]+dx,-.1,paw.center[2]+dz],[0,1,0],t)),Infinity);
      assert.ok(Math.abs(sole)<.002,'Each sole needs a broad contact patch, rather than a single tangent point');
    }
  }
});

test('chest and forelegs form one joined surface without separate rounded shoulder caps',()=>{
  const {bodyTriangles}=bodyMesh();
  // A single edge-connected component checks the actual generated mesh, rather
  // than merely proving that separate leg roots intersect an ellipsoid.
  const parent=bodyTriangles.map((_,i)=>i),vertices=new Map();
  const root=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
  for(const [i,t] of bodyTriangles.entries())for(const p of [t.a,t.b,t.c]){
    const key=p.map(v=>v.toFixed(7)).join(',');
    if(vertices.has(key))parent[root(i)]=root(vertices.get(key));else vertices.set(key,i);
  }
  assert.equal(new Set(parent.map((_,i)=>root(i))).size,1,'Paws must be part of the chest mesh');
});

test('the paw separation is shallow and rounded while both toes remain distinct',()=>{
  const {bodyTriangles,paws}=bodyMesh();
  const front=(x,y)=>2-bodyTriangles.reduce((nearest,t)=>Math.min(nearest,hit([x,y,2],[0,0,-1],t)),Infinity);
  const center=CAT_FACE.center[0];
  for(const y of [.20,.24,.28]){
    const middle=front(center,y);
    assert.ok(middle>.17&&middle<.25,'The lower belly fills the deep notch but remains recessed behind the legs');
    for(const dx of [-.025,.025])assert.ok(Math.abs(front(center+dx,y)-middle)<.016,'The recess has a broad rounded centre instead of a narrow point');
  }
  const underside=bodyTriangles.reduce((nearest,t)=>Math.min(nearest,hit([center,.02,.22],[0,1,0],t)),Infinity)+.02;
  assert.ok(underside>.09&&underside<.21,'Keep a low, softly rounded opening between the paws');
  assert.ok(front(center,.09)<.14,'The lower opening must stay separate from the front toes');
  for(const paw of paws){
    assert.ok(front(paw.center[0],.11)>.42,'Keep compact toes plump rather than shrinking them into the leg');
    const maxZ=bodyTriangles.reduce((farthest,t)=>Math.max(farthest,t.a[2],t.b[2],t.c[2]),-Infinity);
    assert.ok(maxZ<.445,'Paws must sit under the chest instead of projecting into long feet');
  }
});

test('the skull retains a full rounded rear arc and substantial front-to-back volume',()=>{
  const {skullTriangles}=catMesh(),vertices=skullTriangles.flatMap(t=>[t.a,t.b,t.c]);
  const lo=[0,1,2].map(axis=>Math.min(...vertices.map(p=>p[axis])));
  const hi=[0,1,2].map(axis=>Math.max(...vertices.map(p=>p[axis])));
  const size=hi.map((v,i)=>v-lo[i]);
  assert.ok(size[2]/size[0]>.88,'The side silhouette must not be compressed relative to the front');
  assert.ok(size[2]/size[1]>.94&&size[2]/size[1]<1.05,'The profile should read as a full, near-round skull');
  const rear=y=>-2+skullTriangles.reduce((nearest,t)=>Math.min(nearest,hit([CAT_FACE.center[0],y,-2],[0,0,1],t)),Infinity);
  const middle=rear(CAT_FACE.center[1]);
  assert.ok(middle<-.82,'The back of the skull needs generous volume behind the neck');
  const samples=[-.45,-.30,-.15,0,.15,.30,.45].map(dy=>rear(CAT_FACE.center[1]+dy));
  for(let i=1;i<samples.length-1;i++)assert.ok(samples[i-1]+samples[i+1]-2*samples[i]>0,'The rear profile must follow one continuous convex arc');
  const {bodyTriangles}=bodyMesh();
  const front=(triangles,y)=>2-triangles.reduce((nearest,t)=>Math.min(nearest,hit([CAT_FACE.center[0],y,2],[0,0,-1],t)),Infinity);
  let chin;
  for(let y=.65;y<.95;y+=.01)if(front(skullTriangles,y)>front(bodyTriangles,y)){chin=y;break;}
  assert.ok(chin/(hi[1]-chin)<.64,'The visible torso must stay small beneath the oversized head');
});

test('side silhouette has a gentle wrist turn, short toe reach and a rounded seated haunch',()=>{
  const {bodyTriangles,paws}=bodyMesh();
  const reach=(x,y,back=false)=>(back?-2:2)+(back?1:-1)*bodyTriangles.reduce((nearest,t)=>Math.min(nearest,hit([x,y,back?-2:2],[0,0,back?1:-1],t)),Infinity);
  for(const paw of paws){
    const toe=reach(paw.center[0],.11),wrist=reach(paw.center[0],.25),leg=reach(paw.center[0],.4);
    assert.ok(toe-wrist>.09&&toe-wrist<.15,'The wrist needs a small rounded turn into the paw');
    assert.ok(toe-leg<.26,'The toe must project only a little beyond the leg');
    assert.ok(wrist>leg&&wrist-leg<.15,'Retain subtle leg definition without a long sloping foot');
    const haunch=reach(paw.center[0],.27,true);
    assert.ok(haunch<-.56&&haunch>-.65,`A soft haunch must sit behind the front leg: ${haunch}`);
  }
});

test('Companion view includes the smaller ears, both paws and curled tail above its controls',()=>{
  const {g}=catMesh();
  const frame=cameraFrame(views.cat),tangent=Math.tan(views.cat.fov*Math.PI/360);
  let top=Infinity,bottom=-Infinity;
  for(const t of g.triangles)for(const p of [t.a,t.b,t.c]){
    const q=sub(p,frame.eye),y=.5-dot(q,frame.up)/(2*dot(q,frame.forward)*tangent);
    top=Math.min(top,y);bottom=Math.max(bottom,y);
  }
  assert.ok(top>.075,'Ears must sit below the header');
  assert.ok(bottom<.88,'Paws and tail must remain above the toolbar');
});
