// Copyright 2026 Meoz-Focus contributors
// SPDX-License-Identifier: Apache-2.0
// Source: https://github.com/Meoz-Focus/meoz-workroom

import {CAT_FACE,CAT_PAWS} from '../cat.js';

export const TRACE=/* wgsl */`
struct Frame {
  eye:vec4f, right:vec4f, up:vec4f, forward:vec4f,
  size:vec4f, settings:vec4f, light:vec4f,
};
struct Node { lo:vec3f, next:u32, hi:vec3f, start:u32, count:u32, p0:u32,p1:u32,p2:u32 };
struct Triangle { a:vec3f, material:u32, e1:vec3f,p0:f32,e2:vec3f,p1:f32,na:vec3f,p2:f32,nb:vec3f,p3:f32,nc:vec3f,p4:f32,uv01:vec4f,uv2:vec4f };
struct Material { color:vec4f, p:vec4f };
struct Hit { t:f32, id:u32, u:f32,v:f32 };
struct Surface { color:vec3f, rough:f32, n:vec3f, metal:f32, emission:vec3f, subsurface:f32, geometric:vec3f };
@group(0) @binding(0) var<uniform> U:Frame;
@group(0) @binding(1) var<storage,read> nodes:array<Node>;
@group(0) @binding(2) var<storage,read> triangles:array<Triangle>;
@group(0) @binding(3) var<storage,read> materials:array<Material>;
@group(0) @binding(4) var atlas:texture_2d<f32>;
@group(0) @binding(5) var samp:sampler;
@group(0) @binding(6) var previous:texture_2d<f32>;
@group(0) @binding(7) var output:texture_storage_2d<rgba32float,write>;
@group(0) @binding(8) var guide:texture_storage_2d<rgba16float,write>;
@group(0) @binding(9) var albedo:texture_storage_2d<rgba16float,write>;

// A rotated R2 sequence stratifies subpixel coverage. The remaining path
// dimensions use the inexpensive PCG sampler, keeping shader cost bounded.
var<private> pixelSeed:u32;
var<private> sampleIndex:u32;
var<private> rngDimension:u32;
var<private> seed:u32;
fn integerHash(v:u32)->u32 {var x=v;x=(x^(x>>16u))*0x7feb352du;x=(x^(x>>15u))*0x846ca68bu;return x^(x>>16u);}
fn rng()->f32 {
  let dimension=rngDimension;rngDimension++;
  if(dimension<2u){
    let alpha=select(.7548776662466927,.5698402909980532,dimension==1u);
    let rotation=f32(integerHash(pixelSeed+dimension*0x9e3779b9u))/4294967296.;
    return fract((f32(sampleIndex)+.5)*alpha+rotation);
  }
  seed=seed*747796405u+2891336453u;var word=((seed>>((seed>>28u)+4u))^seed)*277803737u;word=(word>>22u)^word;return f32(word)/4294967296.;
}
fn hash(p:vec3f)->f32 {var q=fract(p*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
fn noise(p:vec3f)->f32 {let i=floor(p);var f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3f(1,0,0)),f.x),mix(hash(i+vec3f(0,1,0)),hash(i+vec3f(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3f(0,0,1)),hash(i+vec3f(1,0,1)),f.x),mix(hash(i+vec3f(0,1,1)),hash(i+vec3f(1,1,1)),f.x),f.y),f.z);}
fn fbm(p:vec3f)->f32 {return .57*noise(p)+.28*noise(p*2.03)+.15*noise(p*4.11);}
fn deform(p:vec3f,material:u32)->vec3f {
  if(U.light.z<.5){return p;}
  var q=p;
  if(material==6u || material==7u || material==25u){
    let influence=1.-smoothstep(-.28,.62,p.z);
    q.y+=.018*sin(U.eye.w*8.5+p.x*21.)*influence;
  }
  if(material==8u || material==9u){
    let belly=smoothstep(0.,.25,p.y)*(1.-smoothstep(.58,.79,p.y));
    q.y+=.009*sin(U.eye.w*1.5)*belly;
  }
  return q;
}

fn boxHit(ro:vec3f,inv:vec3f,n:Node,limit:f32)->bool {
  let margin=U.light.z*.025;
  let a=(n.lo-margin-ro)*inv;let b=(n.hi+margin-ro)*inv;
  let near=max(max(min(a.x,b.x),min(a.y,b.y)),min(a.z,b.z));
  let far=min(min(max(a.x,b.x),max(a.y,b.y)),max(a.z,b.z));
  return far>=max(.00015,near) && near<limit;
}
fn intersect(ro:vec3f,rd:vec3f,limit:f32,any:bool)->Hit {
  var hit=Hit(limit,0xffffffffu,0,0);var index=0u;let inv=1.0/(rd+vec3f(1e-20));
  loop {
    if(index>=arrayLength(&nodes)){break;}
    let n=nodes[index];
    if(!boxHit(ro,inv,n,hit.t)){index=n.next;continue;}
    if(n.count==0u){index++;continue;}
    for(var j=0u;j<n.count;j++){
      let id=n.start+j;var tri=triangles[id];
      if(U.light.z>.5){let a=deform(tri.a,tri.material);tri.e1=deform(tri.a+tri.e1,tri.material)-a;tri.e2=deform(tri.a+tri.e2,tri.material)-a;tri.a=a;}
      let p=cross(rd,tri.e2);let det=dot(tri.e1,p);
      if(abs(det)<1e-9){continue;}
      let invDet=1.0/det;let t=ro-tri.a;let u=dot(t,p)*invDet;
      if(u<0.0 || u>1.0){continue;}
      let q=cross(t,tri.e1);let v=dot(rd,q)*invDet;
      if(v<0.0 || u+v>1.0){continue;}
      let dist=dot(tri.e2,q)*invDet;
      if(dist>.00025 && dist<hit.t){hit=Hit(dist,id,u,v);if(any){return hit;}}
    }
    index=n.next;
  }
  return hit;
}
fn materialAt(hit:Hit,p:vec3f,rd:vec3f)->Surface {
  let tri=triangles[hit.id];let mat=materials[tri.material];let kind=u32(mat.color.a);
  var s:Surface;s.color=mat.color.rgb;s.rough=mat.p.x;s.metal=mat.p.y;s.emission=vec3f(0);s.subsurface=mat.p.w;
  s.n=normalize(tri.na*(1.-hit.u-hit.v)+tri.nb*hit.u+tri.nc*hit.v);
  if(dot(s.n,rd)>0.){s.n=-s.n;}
  s.geometric=s.n;
  if(kind==0u){
    let warp=fbm(vec3f(p.x*.9,0,p.z*.25))*7.;let grain=sin(p.x*62.+warp+sin(p.z*.9)*2.);
    let fine=noise(vec3f(p.x*240.,p.y*35.,p.z*6.));let pores=pow(noise(vec3f(p.x*550.,p.y*30.,p.z*18.)),8.);
    let plank=floor((p.x+7.)/1.75);let edge=smoothstep(.009,.019,abs(fract((p.x+7.)/1.75)-.5));
    let growth=fbm(vec3f(p.x*5.,p.y,p.z*.35));
    s.color*=.79+.027*grain+.14*fine-.10*pores+.08*hash(vec3f(plank))+.18*growth;
    s.n=normalize(s.n+vec3f(.004*cos(p.x*62.+warp),0,.003*grain));s.rough=.39+.10*fine;
  }
  if(kind==1u){let n=noise(p*1400.);s.rough+=n*.045;s.color*=.94+n*.1;}
  if(kind==3u){s.color*=.9+noise(p*1800.)*.2;}
  if(kind==4u || kind==5u){
    let uv=tri.uv01.xy*(1.-hit.u-hit.v)+tri.uv01.zw*hit.u+tri.uv2.xy*hit.v;
    let density=max(length(tri.uv01.zw-tri.uv01.xy)/length(tri.e1),length(tri.uv2.xy-tri.uv01.xy)/length(tri.e2));
    let footprint=hit.t*length(U.up.xyz)*2./U.size.y;
    let lod=clamp(log2(max(1.,footprint*density*2048./sqrt(max(.08,abs(dot(s.geometric,rd)))))),0.,11.);
    let tex=textureSampleLevel(atlas,samp,uv,lod).rgb;
    if(kind==5u){s.color=vec3f(.02);s.emission=tex*.66;}else{s.color=tex;}
  }
  if(kind==6u){
    let n=fbm(p*25.);let pores=noise(p*1400.);let freckle=smoothstep(.76,.91,noise(p*200.));
    s.color*=vec3f(1.03,.97,.94)*(.92+.16*n-.07*freckle);
    let vein=pow(.5+.5*sin(p.z*16.+p.x*48.+noise(p*10.)*12.),20.);
    s.color=mix(s.color,s.color*vec3f(.82,.94,1.02),vein*.14);
    let side=select(-1.,1.,p.x>-.55);let cx=-.55+side*.79;let local=vec3f((p.x-cx)*side,p.y,p.z);
    var joints=0.;
    let jointCenters=array<vec3f,4>(vec3f(-.277,.595,.144),vec3f(-.094,.615,.038),vec3f(.099,.605,.093),vec3f(.277,.565,.246));
    for(var i=0;i<4;i++){joints=max(joints,exp(-dot(local-jointCenters[i],local-jointCenters[i])*150.));}
    s.color=mix(s.color,s.color*vec3f(1.08,.84,.81),joints*.32);
    let wrinkles=cos(p.z*530.+sin(p.x*90.)*1.5)*joints;
    s.n=normalize(s.n+vec3f(noise(p*1300.)-.5,noise(p*1300.+40.)-.5,noise(p*1300.+80.)-.5)*.095+vec3f(0,0,wrinkles*.10));
    s.rough=.47+pores*.10;
  }
  if(kind==7u){
    let uv=tri.uv01.xy*(1.-hit.u-hit.v)+tri.uv01.zw*hit.u+tri.uv2.xy*hit.v;
    s.color*=.98+.035*noise(vec3f(p.x*700.,p.y*90.,p.z*20.));
    s.color=mix(s.color,vec3f(.74,.63,.53),smoothstep(.93,.985,uv.y)*.55);
  }
  if(kind==8u){
    let strand=noise(p*vec3f(950.,170.,950.));s.color*=.95+.08*strand;
    s.n=normalize(s.n+(vec3f(noise(p*1000.),noise(p*1000.+15.),noise(p*1000.+35.))-.5)*.035);
    // Pale belly fur belongs to the coat, rather than a raised oval stuck on
    // the front. Its side boundary fades into the same continuous body mesh.
    let belly=vec2f((p.x-2.46)/.285,(p.y-.49)/.36);
    let bellyWeight=(1.-smoothstep(.88,1.03,dot(belly,belly)))*smoothstep(-.025,.085,p.z);
    s.color=mix(s.color,vec3f(.65,.76,.94)*(.96+.06*strand),bellyWeight);
    // Low pale paws blend softly through the same blue chest/leg surface.
    let pawX=abs(abs(p.x-${CAT_FACE.center[0]})-${CAT_PAWS.spread});
    let sock=(1.-smoothstep(.17,.30,p.y))*smoothstep(.10,.27,p.z)*(1.-smoothstep(.20,.24,pawX));
    s.color=mix(s.color,vec3f(.73,.83,1.)*(.96+.06*strand),sock);
    // Facial color follows the same head frame as eyes, mouth and whiskers.
    // Blend blush into the coat rather than adding raised cheek discs.
    let headDelta=p-vec3f(${CAT_FACE.center.join(',')});
    let headLocal=vec3f(headDelta.x*${Math.cos(CAT_FACE.lean)}+headDelta.y*${Math.sin(CAT_FACE.lean)},-headDelta.x*${Math.sin(CAT_FACE.lean)}+headDelta.y*${Math.cos(CAT_FACE.lean)},headDelta.z);
    if(headLocal.z>.30){
      let cheek=vec2f((abs(headLocal.x)-${CAT_FACE.cheekX})/.145,(headLocal.y-(${CAT_FACE.cheekY}))/.085);
      let blush=exp(-dot(cheek,cheek)*.9)*.72;
      s.color=mix(s.color,vec3f(.94,.49,.66),blush);
    }
  }
  if(kind==13u){let n=noise(p*150.);s.color*=.90+.15*n;s.rough+=n*.06;}
  if(kind==14u){let r=length(p.xz-vec2f(-3.52,-.40));s.color=mix(s.color,vec3f(.23,.10,.028),smoothstep(.27,.315,r)*.65);}
  if(kind==16u){
    let weave=sin(p.x*330.+sin(p.z*170.))*sin(p.z*260.);s.color*=.85+.16*weave+.1*noise(p*400.);
    s.n=normalize(s.n+vec3f(cos(p.x*330.)*.035,0,cos(p.z*260.)*.035));
  }
  if(kind==23u){s.color*=.90+.15*noise(p*750.);s.rough=.98;}
  if(kind==24u){s.emission=s.color*.15;}
  return s;
}
const PI=3.14159265359;
fn tangent(n:vec3f)->vec3f{return normalize(cross(select(vec3f(0,1,0),vec3f(1,0,0),abs(n.y)>.95),n));}
fn cosineHemisphere(n:vec3f)->vec3f{let r=sqrt(rng());let a=2.*PI*rng();let t=tangent(n);return normalize(t*(r*cos(a))+cross(n,t)*(r*sin(a))+n*sqrt(max(0.,1.-r*r)));}
fn fresnel(f0:vec3f,c:f32)->vec3f{return f0+(1.-f0)*pow(clamp(1.-c,0.,1.),5.);}
fn specularProbability(s:Surface,v:vec3f)->f32{let f=fresnel(mix(vec3f(.04),s.color,s.metal),max(0.,dot(s.n,v)));return clamp(max(max(f.x,f.y),f.z),.1,.95);}
fn bsdfPdf(s:Surface,v:vec3f,l:vec3f)->f32 {
  let h=normalize(v+l);let nh=max(0.,dot(s.n,h));let vh=max(.00001,dot(v,h));let nl=max(0.,dot(s.n,l));
  let a=max(.025,s.rough*s.rough);let a2=a*a;let den=nh*nh*(a2-1.)+1.;let D=a2/(PI*den*den);
  let probability=specularProbability(s,v);return probability*D*nh/(4.*vh)+(1.-probability)*nl/PI;
}
fn sampleGGX(n:vec3f,rough:f32)->vec3f {
  let a=max(.025,rough*rough);let r=rng();let phi=2.*PI*rng();let ct=sqrt((1.-r)/(1.+(a*a-1.)*r));let st=sqrt(max(0.,1.-ct*ct));let t=tangent(n);
  return normalize(t*(st*cos(phi))+cross(n,t)*(st*sin(phi))+n*ct);
}
fn brdf(s:Surface,v:vec3f,l:vec3f)->vec3f{
  let nl=max(.0,dot(s.n,l));let nv=max(.0001,dot(s.n,v));let h=normalize(v+l);let nh=max(0.,dot(s.n,h));let vh=max(0.,dot(v,h));
  let alpha=max(.025,s.rough*s.rough);let a2=alpha*alpha;let den=nh*nh*(a2-1.)+1.;let D=a2/(PI*den*den);
  let k=(s.rough+1.)*(s.rough+1.)/8.;let G=nl/(nl*(1.-k)+k)*nv/(nv*(1.-k)+k);
  let F=fresnel(mix(vec3f(.04),s.color,s.metal),vh);
  let diffuse=s.color*(1.-s.metal)/PI;
  return diffuse*(1.-F)+F*(D*G/max(.0001,4.*nl*nv));
}
fn lightColor(i:u32)->vec3f {
  if(i==0u){return mix(vec3f(2.65,3.1,3.8),vec3f(5.5,3.75,2.15),U.light.x)*U.light.y;}
  if(i==1u){return vec3f(.75,1.00,1.35)*U.light.y;}
  return vec3f(1.5,1.9,2.5)*U.light.y;
}
fn environment(rd:vec3f)->vec3f {
  return mix(vec3f(.075,.082,.105),vec3f(.24,.27,.31),clamp(rd.y*.5+.5,0.,1.))*U.light.y;
}
fn lightIntersection(ro:vec3f,rd:vec3f,limit:f32)->vec4f {
  if(rd.y>0.0001){let t=(5.5-ro.y)/rd.y;let p=ro+rd*t;if(t>0. && t<limit && abs(p.x+3.)<1.7 && abs(p.z-.5)<1.5){return vec4f(lightColor(0u),t*t/(rd.y*10.2));}}
  if(rd.x<-.0001){let t=(-6.-ro.x)/rd.x;let p=ro+rd*t;if(t>0. && t<limit && abs(p.y-3.)<1.8 && abs(p.z+.4)<1.7){return vec4f(lightColor(1u),t*t/(-rd.x*12.24));}}
  if(rd.z>.0001){let t=(4.3-ro.z)/rd.z;let p=ro+rd*t;if(t>0. && t<limit && abs(p.x-3.)<1.7 && abs(p.y-2.6)<1.6){return vec4f(lightColor(2u),t*t/(rd.z*10.88));}}
  return vec4f(0);
}
fn directLight(s:Surface,p:vec3f,v:vec3f)->vec3f {
  var result=vec3f(0);
  for(var i=0u;i<3u;i++){
    var pos:vec3f;var ln:vec3f;var area:f32;
    if(i==0u){pos=vec3f(-3.+(rng()-.5)*3.4,5.5,.5+(rng()-.5)*3.);ln=vec3f(0,-1,0);area=10.2;}
    else if(i==1u){pos=vec3f(-6.,3.+(rng()-.5)*3.6,-.4+(rng()-.5)*3.4);ln=vec3f(1,0,0);area=12.24;}
    else{pos=vec3f(3.+(rng()-.5)*3.4,2.6+(rng()-.5)*3.2,4.3);ln=vec3f(0,0,-1);area=10.88;}
    let d=pos-p;let dist=length(d);let l=d/dist;let nl=max(0.,dot(s.n,l));let lc=max(0.,dot(ln,-l));
    if(nl>0. && lc>0.){
      let shadow=intersect(p+s.n*.001,l,dist-.002,true);
      if(shadow.id==0xffffffffu){let pdfLight=dist*dist/(lc*area);let pdfBsdf=bsdfPdf(s,v,l);let mis=pdfLight*pdfLight/(pdfLight*pdfLight+pdfBsdf*pdfBsdf);result+=brdf(s,v,l)*lightColor(i)*nl*mis/pdfLight;}
    }
    // A broad low-frequency transmission term gives thin fur/skin warm rims.
    if(s.subsurface>0.){result+=s.color*lightColor(i)*max(0.,dot(-s.n,l))*.008*s.subsurface;}
  }
  return result;
}
@compute @workgroup_size(8,8)
fn main(@builtin(global_invocation_id) gid:vec3u){
  if(gid.x>=u32(U.size.x)||gid.y>=u32(U.size.y)){return;}
  let px=vec2i(gid.xy);let frame=u32(U.size.z);pixelSeed=gid.x*1973u+gid.y*9277u+911u;sampleIndex=select(frame,u32(U.size.w),U.light.z>.5);rngDimension=0u;seed=pixelSeed+u32(U.size.w)*26699u;
  // Start the exposure at the pixel centre and retain its unperturbed geometry
  // guides. This avoids a second intersection/material path in the GPU kernel.
  let randomOffset=vec2f(rng(),rng());let offset=select(randomOffset,vec2f(.5),frame==0u);
  let uv=(vec2f(gid.xy)+offset)/U.size.xy*2.-1.;
  var ro=U.eye.xyz;var rd=normalize(U.forward.xyz+U.right.xyz*uv.x-U.up.xyz*uv.y);
  if(U.settings.y>0. && frame>0u){
    let focus=ro+rd*(U.settings.z/dot(rd,U.forward.xyz));let radius=sqrt(rng())*U.settings.y;let a=rng()*PI*2.;ro+=normalize(U.right.xyz)*cos(a)*radius+normalize(U.up.xyz)*sin(a)*radius;rd=normalize(focus-ro);
  }
  var radiance=vec3f(0);var throughput=vec3f(1);var lastPdf=0.;
  for(var bounce=0u;bounce<3u;bounce++){
    let hit=intersect(ro,rd,100.,false);
    if(bounce>0u){let le=lightIntersection(ro,rd,hit.t);if(le.w>0.){let mis=lastPdf*lastPdf/(lastPdf*lastPdf+le.w*le.w);radiance+=throughput*le.rgb*mis;break;}}
    if(hit.id==0xffffffffu){
      if(bounce==0u && (frame==0u || U.light.z>.5)){textureStore(guide,px,vec4f(0,0,0,100));textureStore(albedo,px,vec4f(0));}
      radiance+=throughput*environment(rd);break;
    }
    let p=ro+rd*hit.t;let s=materialAt(hit,p,rd);
    if(bounce==0u && (frame==0u || U.light.z>.5)){textureStore(guide,px,vec4f(s.geometric,hit.t));textureStore(albedo,px,vec4f(s.color+s.emission,select(1.,2.,triangles[hit.id].material==5u)));}
    radiance+=throughput*(s.emission+directLight(s,p,-rd));
    if(bounce==2u){break;}
    let v=-rd;let probability=specularProbability(s,v);
    if(rng()<probability){
      rd=reflect(-v,sampleGGX(s.n,s.rough));
    }else{
      rd=cosineHemisphere(s.n);
    }
    if(dot(rd,s.n)<=0.){break;}lastPdf=max(.00001,bsdfPdf(s,v,rd));throughput*=brdf(s,v,rd)*dot(s.n,rd)/lastPdf;ro=p+s.n*.001;
  }
  radiance=min(radiance,vec3f(12.));
  let old=textureLoad(previous,px,0);let weight=1./(select(f32(frame),min(f32(frame),31.),U.light.z>.5)+1.);
  let color=select(mix(old.rgb,radiance,weight),radiance,frame==0u);
  let luminance=dot(radiance,vec3f(.2126,.7152,.0722));
  let secondMoment=select(mix(old.a,luminance*luminance,weight),luminance*luminance,frame==0u);
  textureStore(output,px,vec4f(color,secondMoment));
}
`;
