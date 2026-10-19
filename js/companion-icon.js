// Copyright 2026 Meoz-Focus contributors
// SPDX-License-Identifier: Apache-2.0
// Source: https://github.com/Meoz-Focus/meoz-workroom

import {CAT_FACE,CAT_EAR_CURVES} from './cat.js';

// Workroom's blue companion identity. SVG favicons, HTML images and the
// laptop's Canvas2D avatar all draw the same shapes and facial proportions.
const scale=160,cx=128,cy=143,round=n=>Number(n.toFixed(3));
const at=([x,y])=>[round(cx+x*scale),round(cy-y*scale)];
const ellipse=(x,y,rx,ry,fill,extra={})=>({type:'ellipse',cx:x,cy:y,rx,ry,fill,...extra});
const path=(d,fill,extra={})=>({type:'path',d,fill,...extra});
const outline={stroke:'#879fd2','stroke-width':1.8};
const shapes=[];
for(const side of [-1,1])for(const inner of [false,true]){
  const size=CAT_FACE.earScale*(inner?.57:1),earY=CAT_FACE.earY-CAT_FACE.center[1];
  const point=p=>at([side*CAT_FACE.earX+(p[0]+side*p[1]*.14)*size,earY+p[1]*size]);
  let d=`M ${point(CAT_EAR_CURVES[0][0]).join(' ')}`;
  for(const [,b,c] of CAT_EAR_CURVES)d+=` Q ${point(b).join(' ')} ${point(c).join(' ')}`;
  shapes.push(path(d+' Z',inner?'#dfb8d0':'#c3d9fb',inner?{}:outline));
}
shapes.push(ellipse(cx,cy,CAT_FACE.radii[0]*scale,CAT_FACE.radii[1]*scale,'face',outline));
shapes.push(ellipse(104,91,43,20,'#ffffff',{opacity:.24}));
for(const side of [-1,1]){
  const [x,y]=at([side*CAT_FACE.cheekX,CAT_FACE.cheekY]);
  shapes.push(ellipse(x,y,.145*scale,.085*scale,'blush'));
  for(let i=0;i<3;i++){
    const a=at([side*.40,CAT_FACE.cheekY+(i-1)*.052]);
    const b=at([side*.64,CAT_FACE.cheekY+(i-1)*(.052+.017)]);
    shapes.push(path(`M ${a} L ${b}`,'none',{stroke:'#6d7fa8','stroke-width':.75,opacity:.65}));
  }
  const [ex,ey]=at([side*CAT_FACE.eyeX,CAT_FACE.eyeY]);
  shapes.push(ellipse(ex,ey,...CAT_FACE.eyeRadii.map(r=>r*scale),'#3d3b59'));
  shapes.push(ellipse(ex+.032*scale,ey-.049*scale,.045*scale,.045*scale,'#f6faff'));
  shapes.push(ellipse(ex-.034*scale,ey+.045*scale,.018*scale,.016*scale,'#f6faff'));
}
shapes.push(path(`M ${at([-.027,-.125])} Q ${at([0,-.116])} ${at([.027,-.125])} Q ${at([.052,-.125])} ${at([0,-.174])} Q ${at([-.052,-.125])} ${at([-.027,-.125])} Z`,'#c396b7'));
shapes.push(path(`M ${at([0,-.169])} L ${at([0,-.204])}`,'none',{stroke:'#6875b4','stroke-width':1.8}));
for(const side of [-1,1]){
  let d='';
  for(let i=0;i<=24;i++){const t=i/24;d+=`${i?' L':'M'} ${at([side*t*.117,-.204-.042*Math.sin(t*Math.PI)])}`;}
  shapes.push(path(d,'none',{stroke:'#6875b4','stroke-width':2.4}));
}
const angle=-CAT_FACE.lean*180/Math.PI;
const paint=fill=>fill==='face'?'url(#blue-face)':fill==='blush'?'url(#pink-blush)':fill;
const attrs=shape=>Object.entries(shape).filter(([k])=>k!=='type').map(([k,v])=>`${k}="${k==='fill'?paint(v):v}"`).join(' ');
export const COMPANION_SVG=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
<defs><linearGradient id="blue-face" x1="128" y1="39" x2="128" y2="247" gradientUnits="userSpaceOnUse"><stop stop-color="#d0e2ff"/><stop offset=".48" stop-color="#bdd3f7"/><stop offset="1" stop-color="#a9c3ef"/></linearGradient><radialGradient id="pink-blush"><stop stop-color="#d492b8" stop-opacity=".65"/><stop offset="1" stop-color="#d492b8" stop-opacity="0"/></radialGradient></defs>
<g transform="rotate(${round(angle)} ${cx} ${cy})" stroke-linecap="round" stroke-linejoin="round">${shapes.map(s=>`<${s.type} ${attrs(s)}/>`).join('')}</g></svg>\n`;

export function drawCompanionIcon(c,x,y,size){
  c.save();c.translate(x,y);c.scale(size/256,size/256);
  c.translate(cx,cy);c.rotate(-CAT_FACE.lean);c.translate(-cx,-cy);
  const face=c.createLinearGradient(128,39,128,247);
  face.addColorStop(0,'#d0e2ff');face.addColorStop(.48,'#bdd3f7');face.addColorStop(1,'#a9c3ef');
  for(const s of shapes){
    c.save();c.globalAlpha=s.opacity??1;c.lineCap=c.lineJoin='round';
    if(s.fill==='blush'){
      c.translate(s.cx,s.cy);c.scale(s.rx,s.ry);
      const blush=c.createRadialGradient(0,0,0,0,0,1);blush.addColorStop(0,'#d492b8a6');blush.addColorStop(1,'#d492b800');
      c.fillStyle=blush;c.beginPath();c.arc(0,0,1,0,Math.PI*2);c.fill();
    }else{
      const p=new Path2D(s.type==='path'?s.d:'');
      if(s.type==='ellipse')p.ellipse(s.cx,s.cy,s.rx,s.ry,0,0,Math.PI*2);
      if(s.fill!=='none'){c.fillStyle=s.fill==='face'?face:s.fill;c.fill(p);}
      if(s.stroke){c.strokeStyle=s.stroke;c.lineWidth=s['stroke-width'];c.stroke(p);}
    }
    c.restore();
  }
  c.restore();
}
