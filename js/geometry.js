// Copyright 2026 Meoz-Focus contributors
// SPDX-License-Identifier: Apache-2.0
// Source: https://github.com/Meoz-Focus/meoz-workroom

// All geometry is generated here. Scene units are decimetres.
export const add=(a,b)=>a.map((v,i)=>v+b[i]);
export const sub=(a,b)=>a.map((v,i)=>v-b[i]);
export const mul=(a,s)=>a.map(v=>v*s);
export const dot=(a,b)=>a.reduce((v,x,i)=>v+x*b[i],0);
export const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const norm=a=>mul(a,1/(Math.hypot(...a)||1));
export const mix=(a,b,t)=>add(mul(a,1-t),mul(b,t));
export function random(seed=42){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}

export class Geometry {
  triangles=[];
  hairCount=0;
  tri(a,b,c,mat,na=null,nb=null,nc=null,uv=[[0,0],[0,0],[0,0]]) {
    if(Math.hypot(...cross(sub(b,a),sub(c,a)))<1e-10)return;
    const n=norm(cross(sub(b,a),sub(c,a)));
    this.triangles.push({a,b,c,na:na||n,nb:nb||n,nc:nc||n,mat,uv});
  }
  quad(a,b,c,d,mat,n=null,uv=[[0,1],[1,1],[1,0],[0,0]]){
    this.tri(a,b,c,mat,n,n,n,[uv[0],uv[1],uv[2]]);this.tri(a,c,d,mat,n,n,n,[uv[0],uv[2],uv[3]]);
  }
  ellipsoid(center,radii,mat,segments=40,rings=24,transform=null){
    const point=(u,v)=>{const n=[Math.sin(v)*Math.cos(u),Math.cos(v),Math.sin(v)*Math.sin(u)];let p=add(center,n.map((x,i)=>x*radii[i]));let nn=norm(n.map((x,i)=>x/radii[i]));if(transform){p=transform(p,false);nn=transform(nn,true);}return {p,n:nn};};
    for(let j=0;j<rings;j++)for(let i=0;i<segments;i++){
      const a=point(i/segments*Math.PI*2,j/rings*Math.PI),b=point((i+1)/segments*Math.PI*2,j/rings*Math.PI),c=point((i+1)/segments*Math.PI*2,(j+1)/rings*Math.PI),d=point(i/segments*Math.PI*2,(j+1)/rings*Math.PI);
      this.tri(a.p,b.p,c.p,mat,a.n,b.n,c.n);this.tri(a.p,c.p,d.p,mat,a.n,c.n,d.n);
    }
  }
  box(center,size,radius,mat,segments=4,transform=null){
    radius=Math.min(radius,...size.map(v=>v*.499));
    const half=size.map(v=>v/2),inner=half.map(v=>Math.max(0,v-radius));
    // Put subdivisions inside the narrow bevel bands as well as the flat face.
    // Uniform face grids left every rounded edge with one long, visible facet.
    const bevel=Math.max(2,Math.min(5,Math.ceil(segments/3))),flat=Math.max(1,Math.floor(segments/3));
    const grids=half.map((h,k)=>{
      const edge=h-inner[k],a=[];
      for(let i=0;i<=bevel;i++)a.push(-h+edge*i/bevel);
      for(let i=1;i<=flat;i++)a.push(-inner[k]+2*inner[k]*i/flat);
      for(let i=1;i<=bevel;i++)a.push(inner[k]+edge*i/bevel);
      return a;
    });
    for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
      const u=(axis+1)%3,v=(axis+2)%3;
      const point=(i,j)=>{const p=[0,0,0];p[axis]=half[axis]*sign;p[u]=grids[u][i];p[v]=grids[v][j];const q=p.map((x,k)=>Math.min(inner[k],Math.max(-inner[k],x)));let n=norm(sub(p,q)),a=add(center,add(q,mul(n,radius)));if(transform){a=transform(a,false);n=transform(n,true);}return {p:a,n};};
      for(let i=0;i<grids[u].length-1;i++)for(let j=0;j<grids[v].length-1;j++){let pts=[point(i,j),point(i+1,j),point(i+1,j+1),point(i,j+1)];if(sign<0)pts=pts.reverse();const [a,b,c,d]=pts;this.tri(a.p,b.p,c.p,mat,a.n,b.n,c.n);this.tri(a.p,c.p,d.p,mat,a.n,c.n,d.n);}
    }
  }
  tube(points,radii,mat,sides=8){
    let previous=null;
    const rings=points.map((p,i)=>{
      const tangent=norm(sub(points[Math.min(i+1,points.length-1)],points[Math.max(0,i-1)]));
      let t=previous?sub(previous,mul(tangent,dot(previous,tangent))):null;
      if(!t||Math.hypot(...t)<.00001)t=cross(tangent,Math.abs(tangent[1])>.95?[1,0,0]:[0,1,0]);
      t=norm(t);previous=t;const b=cross(tangent,t);
      return Array.from({length:sides},(_,j)=>{const n=add(mul(t,Math.cos(j/sides*6.283185)),mul(b,Math.sin(j/sides*6.283185)));return {p:add(p,mul(n,radii[i])),n};});
    });
    for(let i=0;i<rings.length-1;i++)for(let j=0;j<sides;j++){const a=rings[i][j],b=rings[i][(j+1)%sides],c=rings[i+1][(j+1)%sides],d=rings[i+1][j];this.tri(a.p,b.p,c.p,mat,a.n,b.n,c.n);this.tri(a.p,c.p,d.p,mat,a.n,c.n,d.n);}
  }
  lathe(center,profile,mat,segments=64){
    for(let j=0;j<profile.length-1;j++)for(let i=0;i<segments;i++){
      const p=(k,l)=>{const a=l/segments*Math.PI*2,[r,y]=profile[k],prev=profile[Math.max(0,k-1)],next=profile[Math.min(profile.length-1,k+1)],dr=next[0]-prev[0],dy=next[1]-prev[1];return {p:add(center,[r*Math.cos(a),y,r*Math.sin(a)]),n:norm([dy*Math.cos(a),-dr,dy*Math.sin(a)])};};
      const a=p(j,i),b=p(j,i+1),c=p(j+1,i+1),d=p(j+1,i);this.tri(a.p,b.p,c.p,mat,a.n,b.n,c.n);this.tri(a.p,c.p,d.p,mat,a.n,c.n,d.n);
    }
  }
  fur(center,radii,count,length,mat,seed=1,filter=()=>true){
    const rand=random(seed);
    for(let i=0;i<count;i++){
      const y=rand()*2-1,a=rand()*Math.PI*2,n=[Math.sqrt(1-y*y)*Math.cos(a),y,Math.sqrt(1-y*y)*Math.sin(a)],p=add(center,n.map((x,k)=>x*radii[k]));if(!filter(p,n))continue;
      this.hairCount++;
      const normal=norm(n.map((x,k)=>x/radii[k])),t=norm(cross(normal,[.13,1,.07])),side=mul(t,.0018*(.5+rand()));
      const len=length*(.5+rand()),flow=norm(add(mul(normal,.65),[.08,-.48,.2]));
      const mid=add(p,add(mul(normal,len*.5),mul(flow,len*.18))),tip=add(p,add(mul(normal,len*.65),mul(flow,len*.55)));
      const shade=norm(add(normal,mul(t,.15)));
      this.tri(sub(p,side),add(p,side),add(mid,mul(side,.45)),mat,shade,shade,shade);
      this.tri(sub(p,side),add(mid,mul(side,.45)),sub(mid,mul(side,.45)),mat,shade,shade,shade);
      this.tri(sub(mid,mul(side,.45)),add(mid,mul(side,.45)),tip,mat,shade,shade,shade);
    }
  }
  implicit(fn,lo,hi,step,mat){
    const n=lo.map((x,i)=>Math.ceil((hi[i]-x)/step)+1),total=n[0]*n[1]*n[2],field=new Float32Array(total),idx=(x,y,z)=>(z*n[1]+y)*n[0]+x;
    for(let z=0;z<n[2];z++)for(let y=0;y<n[1];y++)for(let x=0;x<n[0];x++)field[idx(x,y,z)]=fn([lo[0]+x*step,lo[1]+y*step,lo[2]+z*step]);
    const corners=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]],tetra=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]];
    const normal=p=>{const e=.001;return norm([fn(add(p,[e,0,0]))-fn(add(p,[-e,0,0])),fn(add(p,[0,e,0]))-fn(add(p,[0,-e,0])),fn(add(p,[0,0,e]))-fn(add(p,[0,0,-e]))]);};
    for(let z=0;z<n[2]-1;z++)for(let y=0;y<n[1]-1;y++)for(let x=0;x<n[0]-1;x++){
      const ds=corners.map(c=>field[idx(x+c[0],y+c[1],z+c[2])]);if(ds.every(v=>v>0)||ds.every(v=>v<0))continue;
      const ps=corners.map(c=>[lo[0]+(x+c[0])*step,lo[1]+(y+c[1])*step,lo[2]+(z+c[2])*step]);
      for(const t of tetra){const inside=t.filter(i=>ds[i]<0),outside=t.filter(i=>ds[i]>=0);if(!inside.length||!outside.length)continue;const edge=(i,j)=>mix(ps[i],ps[j],ds[i]/(ds[i]-ds[j]));let verts;
        if(inside.length===1)verts=outside.map(i=>edge(inside[0],i));else if(inside.length===3)verts=inside.map(i=>edge(outside[0],i));else{const [a,b]=inside,[c,d]=outside;verts=[edge(a,c),edge(a,d),edge(b,d),edge(b,c)];}
        const normals=verts.map(normal);if(dot(cross(sub(verts[1],verts[0]),sub(verts[2],verts[0])),normals[0])<0){verts.reverse();normals.reverse();}
        this.tri(verts[0],verts[1],verts[2],mat,normals[0],normals[1],normals[2]);if(verts.length===4)this.tri(verts[0],verts[2],verts[3],mat,normals[0],normals[2],normals[3]);
      }
    }
  }
}

// Preorder, threaded BVH. A missed node jumps directly past its entire subtree.
export function buildBVH(triangles){
  const items=triangles.map((t,i)=>({i,lo:[0,1,2].map(k=>Math.min(t.a[k],t.b[k],t.c[k])-.00005),hi:[0,1,2].map(k=>Math.max(t.a[k],t.b[k],t.c[k])+.00005),center:[0,1,2].map(k=>(t.a[k]+t.b[k]+t.c[k])/3)}));
  const nodes=[],ordered=[];
  function build(list){const index=nodes.length,lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];for(const t of list)for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],t.lo[k]);hi[k]=Math.max(hi[k],t.hi[k]);}const node={lo,hi,start:0,count:0,next:0};nodes.push(node);
    if(list.length<=6){node.start=ordered.length;node.count=list.length;for(const item of list)ordered.push(triangles[item.i]);}
    else{const ext=sub(hi,lo),axis=ext.indexOf(Math.max(...ext));list.sort((a,b)=>a.center[axis]-b.center[axis]);const mid=list.length>>>1;build(list.slice(0,mid));build(list.slice(mid));}node.next=nodes.length;return index;
  }
  build(items);
  const nodeData=new ArrayBuffer(nodes.length*48),nf=new Float32Array(nodeData),nu=new Uint32Array(nodeData);
  nodes.forEach((n,i)=>{const o=i*12;nf.set(n.lo,o);nu[o+3]=n.next;nf.set(n.hi,o+4);nu[o+7]=n.start;nu[o+8]=n.count;});
  const triData=new ArrayBuffer(ordered.length*128),f=new Float32Array(triData),u=new Uint32Array(triData);
  ordered.forEach((t,i)=>{const o=i*32;f.set(t.a,o);u[o+3]=t.mat;f.set(sub(t.b,t.a),o+4);f.set(sub(t.c,t.a),o+8);f.set(t.na,o+12);f.set(t.nb,o+16);f.set(t.nc,o+20);f.set([...t.uv[0],...t.uv[1]],o+24);f.set(t.uv[2],o+28);});
  return {nodes:nodeData,triangles:triData,nodeCount:nodes.length,triangleCount:ordered.length};
}

export function smoothMin(a,b,k){const h=Math.max(0,Math.min(1,.5+.5*(b-a)/k));return b*(1-h)+a*h-k*h*(1-h);}
export function sdEllipsoid(p,c,r){const q=sub(p,c),k0=Math.hypot(...q.map((x,i)=>x/r[i])),k1=Math.hypot(...q.map((x,i)=>x/(r[i]*r[i])));return k0*(k0-1)/Math.max(k1,.000001);}
export function sdCapsule(p,a,b,r1,r2=r1){const ab=sub(b,a),h=Math.max(0,Math.min(1,dot(sub(p,a),ab)/dot(ab,ab)));return Math.hypot(...sub(p,add(a,mul(ab,h))))-(r1*(1-h)+r2*h);}
