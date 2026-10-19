// Copyright 2026 Meoz-Focus contributors
// SPDX-License-Identifier: Apache-2.0
// Source: https://github.com/Meoz-Focus/meoz-workroom

import {add,mul,norm,cross,sub,smoothMin,sdEllipsoid,sdCapsule} from './geometry.js';

export const CAT_FACE={center:[2.45,1.31,-.20],radii:[.70,.65,.64],lean:.04,eyeX:.24,eyeY:0,eyeRadii:[.130,.145],cheekX:.38,cheekY:-.155,earX:.42,earY:1.85,earScale:.80};
export const CAT_EAR_CURVES=[
  [[-.235,-.42],[-.245,-.06],[-.105,.16]],
  [[-.105,.16],[0,.34],[.105,.16]],
  [[.105,.16],[.245,-.06],[.235,-.42]],
  [[.235,-.42],[0,-.48],[-.235,-.42]],
];
export const CAT_BODY={center:[2.45,.56,-.24],radii:[.44,.54,.37]};
export const CAT_PAWS={spread:.22,y:.115,z:.225,radii:[.20,.13,.205],toeX:.058,toeZ:.365,toeWidth:.022,toeLength:.025,toeDepth:.0012};

// Chest, short forelegs and wide, low paws share one smooth surface. The leg
// roots are blended into the actual chest instead of intersecting it as caps.
export function createCatBody(g){
  const paws=[-1,1].map(side=>{
    const x=CAT_FACE.center[0]+side*CAT_PAWS.spread;
    return {center:[x,CAT_PAWS.y,CAT_PAWS.z],radii:CAT_PAWS.radii,shoulder:[x,.43,-.015],bend:[x,.28,.055],wrist:[x,.175,.145]};
  });
  const field=p=>{
    let distance=sdEllipsoid(p,CAT_BODY.center,CAT_BODY.radii);
    for(const paw of paws){
      // An upright upper leg turns gently through the wrist before meeting
      // the compact paw, rather than sweeping directly into a long toe.
      const leg=smoothMin(sdCapsule(p,paw.shoulder,paw.bend,.16,.15),sdCapsule(p,paw.bend,paw.wrist,.15,.145),.055);
      const foot=sdEllipsoid(p,paw.center,paw.radii);
      distance=smoothMin(distance,smoothMin(leg,foot,.09),.13);
    }
    // Low, soft haunches sit behind the front legs and make the seated pose
    // legible in profile without adding separate ball-shaped attachments.
    for(const side of [-1,1])distance=smoothMin(distance,sdEllipsoid(p,[CAT_FACE.center[0]+side*.27,.27,-.28],[.18,.255,.31]),.08);
    // A soft lower-belly bridge rounds the top of the paw separation. It stays
    // behind the front of the legs, reducing the deep dark notch without
    // changing either paw's silhouette or merging their toes.
    const lowerBelly=sdEllipsoid(p,[CAT_FACE.center[0],.34,-.005],[.20,.25,.18]);
    distance=smoothMin(distance,lowerBelly,.10);
    // A low rounded arch separates the toes without cutting a deep pointed
    // notch up into the chest. Smooth subtraction rounds its inner edges.
    const separation=sdEllipsoid(p,[CAT_FACE.center[0],-.02,.35],[.042,.135,.50]);
    distance=-smoothMin(-distance,separation,.018);
    // Broad, very shallow folds soften the toes without incised scratch-like
    // channels. Their ends fade out, rather than stopping at sharp tube caps.
    if(p[1]>.10&&p[2]>.30){
      const top=Math.max(0,Math.min(1,(p[1]-.10)/.045));
      const z=(p[2]-CAT_PAWS.toeZ)/CAT_PAWS.toeLength;
      for(const paw of paws)for(const side of [-1,1]){
        const x=(p[0]-paw.center[0]-side*CAT_PAWS.toeX)/CAT_PAWS.toeWidth;
        distance+=CAT_PAWS.toeDepth*Math.exp(-x*x-z**4)*top;
      }
    }
    return Math.max(distance,-p[1]);
  };
  const start=g.triangles.length;
  g.implicit(field,[1.94,-.012,-.66],[2.98,1.16,.58],.016,8);
  return {paws,bodyTriangles:g.triangles.slice(start),field};
}

export function createCatTail(g){
  const root=[2.28,.20,-.37];
  const points=Array.from({length:65},(_,i)=>{
    const t=i/64,a=(1-t)*4.3,curve=[2.66+Math.sin(a)*.52,.13+.025*Math.sin(t*Math.PI),-.26+Math.cos(a)*.55];
    const u=Math.min(1,t/.18),blend=u*u*(3-2*u);
    return root.map((v,k)=>v+(curve[k]-v)*blend);
  });
  const radii=points.map((_,i)=>.16-.11*i/64);
  g.tube(points,radii,8,24);
  for(const i of [0,points.length-1])g.ellipsoid(points[i],[radii[i],radii[i],radii[i]],8,32,20);
  return {tip:points.at(-1),radius:radii.at(-1),direction:norm(sub(points.at(-1),points.at(-2)))};
}

// The face follows the supplied Meoz avatar: a round cheeky head, inset dark
// eyes, tiny nose and :3 smile. Facial patches follow the head's curved surface
// rather than sitting on top as protruding spheres.
export function createCat(g){
  const head=CAT_FACE.center,hr=CAT_FACE.radii;
  const body=CAT_BODY.center,br=CAT_BODY.radii;
  const facePoint=(x,y,offset=.003)=>{
    const q=Math.max(.015,1-(x/hr[0])**2-(y/hr[1])**2);
    return [head[0]+x,head[1]+y,head[2]+hr[2]*Math.sqrt(q)+offset];
  };
  const faceNormal=(x,y)=>{const p=facePoint(x,y,0);return norm([(p[0]-head[0])/hr[0]**2,(p[1]-head[1])/hr[1]**2,(p[2]-head[2])/hr[2]**2]);};
  const patch=(cx,cy,rx,ry,mat,offset=.004)=>{
    const sectors=48,rings=6;
    for(let j=0;j<rings;j++)for(let i=0;i<sectors;i++){
      const at=(r,a)=>{const x=cx+Math.cos(a)*rx*r,y=cy+Math.sin(a)*ry*r;return {p:facePoint(x,y,offset),n:faceNormal(x,y)};};
      const a=at(j/rings,i/sectors*Math.PI*2),b=at((j+1)/rings,i/sectors*Math.PI*2),c=at((j+1)/rings,(i+1)/sectors*Math.PI*2),d=at(j/rings,(i+1)/sectors*Math.PI*2);
      g.tri(a.p,b.p,c.p,mat,a.n,b.n,c.n);g.tri(a.p,c.p,d.p,mat,a.n,c.n,d.n);
    }
  };

  const {paws,bodyTriangles,field:bodyField}=createCatBody(g);
  createCatTail(g);
  g.fur(body,br,7000,.019,8,981,p=>bodyField(p)>-.006);
  const headStart=g.triangles.length;

  // Broad rounded tips and long hidden roots keep the ears soft and securely
  // embedded in the curved head, including at their outer bottom corners.
  const earStart=g.triangles.length;
  for(const s of [-1,1]){
    const center=[head[0]+s*CAT_FACE.earX,CAT_FACE.earY,head[2]-.01],outline=[];
    const curves=CAT_EAR_CURVES;
    for(const [a,b,c] of curves)for(let i=0;i<16;i++){const t=i/16;outline.push([a[0]*(1-t)**2+2*b[0]*t*(1-t)+c[0]*t*t,a[1]*(1-t)**2+2*b[1]*t*(1-t)+c[1]*t*t]);}
    const point=(r,i,side,scale=1,extra=0)=>{
      const o=outline[(i+outline.length)%outline.length],x=o[0]*r*scale*CAT_FACE.earScale,y=o[1]*r*scale*CAT_FACE.earScale;
      return [center[0]+x+s*y*.14,center[1]+y,center[2]+side*.10*Math.sqrt(Math.max(0,1-(r*scale)**2))+extra];
    };
    const normal=(r,i,side,scale=1)=>{
      const rr=Math.max(.015,Math.min(.995,r)),along=sub(point(rr,i+1,side,scale),point(rr,i-1,side,scale)),outward=sub(point(Math.min(.999,rr+.004),i,side,scale),point(Math.max(.001,rr-.004),i,side,scale));
      let n=norm(cross(outward,along));if(n[2]*side<0)n=mul(n,-1);return n;
    };
    const surface=(side,scale,mat,extra)=>{
      // Concentrate rings near the rounded rim so the side profile remains
      // smooth instead of ending in a flat, angular last strip.
      const rings=16;
      for(let r=0;r<rings;r++)for(let i=0;i<outline.length;i++){
        const r0=Math.sin(r/rings*Math.PI/2),r1=Math.sin((r+1)/rings*Math.PI/2),a=point(r0,i,side,scale,extra),b=point(r1,i,side,scale,extra),c=point(r1,i+1,side,scale,extra),d=point(r0,i+1,side,scale,extra),na=normal(r0,i,side,scale),nb=normal(r1,i,side,scale),nc=normal(r1,i+1,side,scale),nd=normal(r0,i+1,side,scale);
        g.tri(a,b,c,mat,na,nb,nc);g.tri(a,c,d,mat,na,nc,nd);
      }
    };
    surface(-1,1,8,0);surface(1,1,8,0);surface(1,.57,10,.0025);
  }
  const earTriangles=g.triangles.slice(earStart);

  const skullStart=g.triangles.length;
  g.ellipsoid(head,hr,8,80,56);
  const skullTriangles=g.triangles.slice(skullStart);
  const faceStart=g.triangles.length;
  // Smaller, softly glossy eyes are painted into the curved face. The large
  // and small highlights retain Meoz's familiar friendly expression.
  for(const s of [-1,1]){
    const x=s*CAT_FACE.eyeX,y=CAT_FACE.eyeY;
    patch(x,y,...CAT_FACE.eyeRadii,11,.0045);
    patch(x+.032,y+.049,.045,.045,24,.0065);
    patch(x-.034,y-.045,.018,.016,24,.0065);
    // Three short, fine whiskers sit close to the cheeks.
    for(let i=0;i<3;i++){
      const pts=Array.from({length:16},(_,j)=>{const t=j/15;return facePoint(s*(.40+t*.24),CAT_FACE.cheekY+(i-1)*.052+(i-1)*t*.017,.009);});
      g.tube(pts,pts.map((_,j)=>.0024*(1-j/30)),22,6);
    }
  }
  // A tiny rounded triangular pink nose, with a small lavender :3 smile.
  const noseOutline=[];
  const noseCurves=[[[0,-.174],[-.052,-.125],[-.027,-.125]],[[-.027,-.125],[0,-.116],[.027,-.125]],[[.027,-.125],[.052,-.125],[0,-.174]]];
  for(const [a,b,c] of noseCurves)for(let i=0;i<10;i++){const t=i/10;noseOutline.push([a[0]*(1-t)**2+2*b[0]*t*(1-t)+c[0]*t*t,a[1]*(1-t)**2+2*b[1]*t*(1-t)+c[1]*t*t]);}
  for(let i=0;i<noseOutline.length;i++){const a=noseOutline[i],b=noseOutline[(i+1)%noseOutline.length];g.tri(facePoint(0,-.143,.007),facePoint(...a,.007),facePoint(...b,.007),10,faceNormal(0,-.143),faceNormal(...a),faceNormal(...b));}
  g.tube([facePoint(0,-.169,.010),facePoint(0,-.204,.010)],[.0055,.0055],27,8);
  for(const s of [-1,1]){
    const pts=Array.from({length:25},(_,i)=>{const t=i/24;return facePoint(s*t*.117,-.204-.042*Math.sin(t*Math.PI),.010);});
    g.tube(pts,pts.map(()=>.0075),27,10);
    for(const p of [pts[0],pts.at(-1)])g.ellipsoid(p,[.0075,.0075,.0075],27,12,8);
  }
  const faceTriangles=g.triangles.slice(faceStart);
  // Dense, very short velvet fuzz avoids the prickly, unkempt old silhouette.
  g.fur(head,hr,13000,.011,8,582,(_,n)=>n[2]<.50);
  // A small curious lean toward the laptop; all facial patches, ears and fuzz
  // share the same rigid transform, preserving the existing face proportions.
  const angle=CAT_FACE.lean,c=Math.cos(angle),s=Math.sin(angle);
  const tilt=(p,normal=false)=>{
    const x=p[0]-(normal?0:head[0]),y=p[1]-(normal?0:head[1]);
    return [x*c-y*s+(normal?0:head[0]),x*s+y*c+(normal?0:head[1]),p[2]];
  };
  for(let i=headStart;i<g.triangles.length;i++){
    const t=g.triangles[i];for(const key of ['a','b','c'])t[key]=tilt(t[key]);
    for(const key of ['na','nb','nc'])t[key]=tilt(t[key],true);
  }
  return {faceTriangles,earTriangles,skullTriangles,paws,bodyTriangles};
}
