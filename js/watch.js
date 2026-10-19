// Copyright 2026 Meoz-Focus contributors
// SPDX-License-Identifier: Apache-2.0
// Source: https://github.com/Meoz-Focus/meoz-workroom

import {Geometry,add,sub,mul,dot,cross,norm} from './geometry.js';

export const WATCH_MATERIALS={brushed:28,polished:29,dial:30,ivory:31,hand:32};

// A 40 mm steel watch. Fit each bracelet row to the actual forearm field,
// including its taper, rather than slipping a circular cuff over the mesh.
export function createWatch(g,{center,axis,skin}){
  axis=norm(axis);
  const up=norm(sub([0,1,0],mul(axis,dot(axis,[0,1,0])))),across=norm(cross(up,axis));
  const vector=p=>add(add(mul(across,p[0]),mul(up,p[1])),mul(axis,p[2]));
  const world=(p,isNormal=false)=>isNormal?vector(p):add(center,vector(p));
  const radius=(angle,z)=>{
    const direction=[Math.sin(angle),Math.cos(angle),0];
    let lo=0,hi=.7;
    for(let i=0;i<28;i++){
      const r=(lo+hi)/2;
      if(skin(world([direction[0]*r,direction[1]*r,z]))<0)lo=r;else hi=r;
    }
    return (lo+hi)/2;
  };
  const m=WATCH_MATERIALS,bandInner=[],start=g.triangles.length;
  const contact=radius(0,0),caseBottom=contact+.003;
  // A three-piece bracelet, with staggered polished centre links. The top
  // opening is occupied by the watch case; every other angle stays closed.
  const opening=.69,rows=25,step=(Math.PI*2-opening*2)/rows;
  function link(a0,a1,z0,z1,material){
    const sections=4,vertices=[];
    for(let i=0;i<=sections;i++){
      const a=a0+(a1-a0)*i/sections,ring=[];
      for(const z of [z0,z1]){
        const r=radius(a,z)+.004,n=vector([Math.sin(a),Math.cos(a),0]);
        const p=world([Math.sin(a)*r,Math.cos(a)*r,z]);bandInner.push(p);
        ring.push({inner:p,outer:add(p,mul(n,.024)),n});
      }
      vertices.push(ring);
    }
    for(let i=0;i<sections;i++){
      const [a,b]=vertices[i],[c,d]=vertices[i+1];
      g.tri(a.outer,b.outer,d.outer,material,a.n,b.n,d.n);g.tri(a.outer,d.outer,c.outer,material,a.n,d.n,c.n);
      g.quad(a.inner,c.inner,d.inner,b.inner,material);
      g.quad(a.inner,a.outer,c.outer,c.inner,material);g.quad(b.inner,d.inner,d.outer,b.outer,material);
    }
    for(const i of [0,sections]){const [a,b]=vertices[i];g.quad(a.inner,b.inner,b.outer,a.outer,material);}
  }
  for(let i=0;i<rows;i++){
    const a=opening+i*step+.007,b=opening+(i+1)*step-.007;
    link(a,b,-.108,-.040,m.brushed);link(a,b,.040,.108,m.brushed);
    // Half-pitch stagger keeps the polished central strip articulated.
    const offset=(i>0&&i<rows-1)?step*.27:0;
    link(a+offset,b+offset,-.037,.037,m.polished);
  }
  const watch=new Geometry(),y=caseBottom;
  // Caseback, rounded case, sloping polished bezel and recessed chapter ring.
  watch.lathe([0,y,0],[[0,0],[.14,0],[.18,.008],[.200,.026],[.201,.058],[.194,.073],[.178,.078],[.176,.060],[0,.060]],m.brushed,96);
  watch.lathe([0,y,0],[[.177,.061],[.180,.068],[.197,.071],[.195,.079],[.181,.089],[.174,.086],[.173,.071],[.177,.061]],m.polished,96);
  watch.lathe([0,y,0],[[0,.068],[.174,.068]],m.dial,96);
  watch.lathe([0,y,0],[[.162,.069],[.163,.070],[.171,.070],[.172,.069]],m.brushed,96);
  // Solid end links and split lugs connect the bracelet to the case.
  for(const side of [-1,1]){
    for(const z of [-.09,.09])watch.box([side*.201,y+.016,z],[.106,.054,.041],.014,m.brushed,5);
    watch.box([side*.221,y-.009,0],[.061,.048,.141],.012,m.polished,5);
  }
  // Applied hour batons and fine minute marks are real geometry.
  for(let i=0;i<60;i++){
    const a=i*Math.PI/30,major=i%5===0,r=major?.143:.153;
    const rotate=(p,n)=>{const q=[p[0]*Math.cos(a)+p[2]*Math.sin(a),p[1],-p[0]*Math.sin(a)+p[2]*Math.cos(a)];return n?q:add(q,[0,y+.071,0]);};
    watch.box([0,0,-r],[major?.010:.0035,.004,major?.024:.008],.0015,major?m.ivory:m.brushed,3,rotate);
  }
  function hand(angle,length,width,height,material,tail=.025){
    const a=angle*Math.PI/180,transform=(p,n)=>{
      const q=[p[0]*Math.cos(a)-p[2]*Math.sin(a),p[1],p[0]*Math.sin(a)+p[2]*Math.cos(a)];
      return n?q:add(q,[0,y+height,0]);
    };
    watch.box([0,0,(-length+tail)/2],[width,.004,length+tail],.002,material,3,transform);
  }
  // Quiet 10:10 composition, with a fine blue-steel seconds hand.
  hand(-55,.095,.014,.077,m.ivory);hand(60,.133,.009,.083,m.ivory);
  hand(180,.142,.003,.089,m.hand,.037);
  watch.ellipsoid([0,y+.091,0],[.012,.004,.012],m.polished,24,12);
  // Knurled crown faces toward the hand. No branding or decorative text.
  const crown=p=>[p[0],-p[2]+y+.042,p[1]-.215];
  const normal=p=>[p[0],-p[2],p[1]];
  const crownMesh=new Geometry();
  crownMesh.lathe([0,0,0],[[0,-.009],[.022,-.009],[.027,-.004],[.027,.025],[.022,.030],[0,.030]],m.polished,40);
  for(const t of crownMesh.triangles)watch.tri(crown(t.a),crown(t.b),crown(t.c),t.mat,normal(t.na),normal(t.nb),normal(t.nc));
  for(let i=0;i<18;i++){
    const a=i*Math.PI/9;watch.tube([[Math.sin(a)*.027,y+.042+Math.cos(a)*.027,-.218],[Math.sin(a)*.027,y+.042+Math.cos(a)*.027,-.190]],[.0018,.0018],m.brushed,4);
  }
  // The blended wrist has a small anatomical bulge. Seat the caseback on its
  // highest contact point so neither its flat underside nor lugs cut the skin.
  let lift=0;
  for(let pass=0;pass<4;pass++){
    let clearance=Infinity;
    for(const t of watch.triangles)for(const p of [t.a,t.b,t.c])clearance=Math.min(clearance,skin(world(add(p,[0,lift,0]))));
    if(clearance>=.001)break;
    lift+=.0015-clearance;
  }
  const seated=p=>world(add(p,[0,lift,0]));
  for(const t of watch.triangles)g.tri(seated(t.a),seated(t.b),seated(t.c),t.mat,world(t.na,true),world(t.nb,true),world(t.nc,true));
  return {center,axis,up,across,bandInner,caseBottom:caseBottom+lift,triangleCount:g.triangles.length-start};
}
