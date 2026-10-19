// Copyright 2026 Meoz-Focus contributors
// SPDX-License-Identifier: Apache-2.0
// Source: https://github.com/Meoz-Focus/meoz-workroom

import {add,sub,mul,norm,cross,dot} from './geometry.js';

const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
const signedPower=(x,p)=>Math.sign(x)*Math.abs(x)**p;

// Fit keratin to the rendered skin triangles, rather than balancing a flat
// ellipsoid on an SDF sample. This keeps the edges attached at grazing angles.
export function createNail(g,skin,{base,tip,halfWidth,halfLength}){
  const axis=norm(sub(base,tip)),dorsal=norm(sub([0,1,0],mul(axis,axis[1])));
  const across=norm(cross(dorsal,axis)),center=add(tip,mul(axis,halfLength*1.15));
  const reach=halfWidth+halfLength+.15;
  const candidates=skin.filter(t=>[0,1,2].every(k=>
    Math.min(t.a[k],t.b[k],t.c[k])<center[k]+reach&&
    Math.max(t.a[k],t.b[k],t.c[k])>center[k]-reach
  )).map(t=>({...t,e1:sub(t.b,t.a),e2:sub(t.c,t.a)}));
  const direction=mul(dorsal,-1);
  function project(point){
    const origin=add(point,mul(dorsal,.30));let hit=null,closest=.60;
    for(const t of candidates){
      const p=cross(direction,t.e2),det=dot(t.e1,p);if(Math.abs(det)<1e-9)continue;
      const v0=sub(origin,t.a),u=dot(v0,p)/det;if(u<0||u>1)continue;
      const q=cross(v0,t.e1),v=dot(direction,q)/det;if(v<0||u+v>1)continue;
      const distance=dot(t.e2,q)/det;if(distance<=0||distance>=closest)continue;
      closest=distance;
      hit={p:add(origin,mul(direction,distance)),n:norm(add(add(mul(t.na,1-u-v),mul(t.nb,u)),mul(t.nc,v)))};
    }
    return hit;
  }
  const segments=48,rings=10,rows=[];
  for(let j=0;j<=rings;j++){
    const r=j/rings,row=[];
    for(let i=0;i<segments;i++){
      const theta=i/segments*Math.PI*2,s=Math.sin(theta),c=Math.cos(theta);
      // A round cuticle and gently squared free edge, tapered at the corners.
      const power=s>=0?2.2:3.6,z=r*halfLength*signedPower(s,2/power);
      const x=r*halfWidth*signedPower(c,2/power)*(1-.16*Math.abs(z/halfLength));
      let surface=null;
      for(let attempt=0;attempt<5&&!surface;attempt++){
        const scale=.90**attempt;
        surface=project(add(center,add(mul(across,x*scale),mul(axis,z*scale))));
      }
      if(!surface)return false;
      const v=(1-z/halfLength)/2,contact=smooth(.72,1,r)*(1-smooth(.65,.92,v));
      const lift=.0014+.0005*smooth(.93,1,v),offset=lift*(1-contact)-.0010*contact;
      row.push({p:add(surface.p,mul(surface.n,offset)),n:surface.n,skin:surface.p,uv:[r,v]});
    }
    rows.push(row);
  }
  const tri=(a,b,c)=>g.tri(a.p,b.p,c.p,7,a.n,b.n,c.n,[a.uv,b.uv,c.uv]);
  for(let j=1;j<=rings;j++)for(let i=0;i<segments;i++){
    const next=(i+1)%segments,a=rows[j-1][i],b=rows[j-1][next],c=rows[j][next],d=rows[j][i];
    tri(a,c,d);if(j>1)tri(a,b,c);
  }
  // Close the thin free edge down into the skin; no floating rim underneath.
  const boundary=rows[rings];
  for(let i=0;i<segments;i++){
    const a=boundary[i],b=boundary[(i+1)%segments];
    const under=v=>({...v,p:sub(v.skin,mul(v.n,.0012))});
    tri(a,under(b),under(a));tri(a,b,under(b));
  }
  return true;
}
