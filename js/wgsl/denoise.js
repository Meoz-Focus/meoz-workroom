// Copyright 2026 Meoz-Focus contributors
// SPDX-License-Identifier: Apache-2.0
// Source: https://github.com/Meoz-Focus/meoz-workroom

export const DENOISE=/* wgsl */`
struct Params{size:vec4f}; // stride, sample count, first pass
@group(0) @binding(0) var source:texture_2d<f32>;
@group(0) @binding(1) var guide:texture_2d<f32>;
@group(0) @binding(2) var dest:texture_storage_2d<rgba16float,write>;
@group(0) @binding(3) var<uniform> U:Params;
@group(0) @binding(4) var albedo:texture_2d<f32>;
fn luma(c:vec3f)->f32{return dot(c,vec3f(.2126,.7152,.0722));}
fn variance(c:vec4f)->f32{
  if(U.size.z>.5){let l=luma(c.rgb);return max(0.,c.a-l*l)/max(1.,U.size.y);}
  return c.a;
}
@compute @workgroup_size(8,8) fn main(@builtin(global_invocation_id) id:vec3u){
  let dims=vec2i(textureDimensions(source));let p=vec2i(id.xy);if(any(p>=dims)){return;}
  let g=textureLoad(guide,p,0);let center=textureLoad(source,p,0);let surface=textureLoad(albedo,p,0);let a=surface.rgb;
  // Screen UI is self-lit and largely deterministic. Room-sized smoothing
  // kernels erase thin glyph strokes even after the path noise has converged.
  if(surface.a>1.5){textureStore(dest,p,vec4f(center.rgb,0));return;}
  var centerVariance=variance(center);
  // Bootstrap uncertainty spatially before enough temporal samples exist.
  if(U.size.z>.5 && U.size.y<8.){
    var m1=0.;var m2=0.;
    for(var y=-1;y<=1;y++){for(var x=-1;x<=1;x++){
      let l=luma(textureLoad(source,clamp(p+vec2i(x,y),vec2i(0),dims-1),0).rgb);m1+=l;m2+=l*l;
    }}
    centerVariance=max(centerVariance,(m2/9.-(m1/9.)*(m1/9.))/max(1.,U.size.y));
  }
  centerVariance=max(centerVariance,.000004);
  var sum=vec3f(0);var weightSum=0.;var varianceSum=0.;let step=i32(U.size.x);
  for(var y=-2;y<=2;y++){for(var x=-2;x<=2;x++){
    let q=clamp(p+vec2i(x,y)*step,vec2i(0),dims-1);
    let ng=textureLoad(guide,q,0);let c=textureLoad(source,q,0);let neighbor=textureLoad(albedo,q,0);let aq=neighbor.rgb;
    let nv=max(variance(c),.000004);let delta=a-aq;
    let normals=select(pow(max(0.,dot(g.xyz,ng.xyz)),40.),1.,g.w>99. && ng.w>99.);
    let geometry=normals*exp(-abs(g.w-ng.w)*55./f32(step));
    let colorWeight=exp(-abs(luma(center.rgb)-luma(c.rgb))/(4.*sqrt(centerVariance+nv)+.006));
    let sameSurface=select(0.,1.,abs(surface.a-neighbor.a)<.25);
    let w=exp(-f32(x*x+y*y)*.45)*geometry*exp(-dot(delta,delta)*64.)*colorWeight*sameSurface;
    sum+=c.rgb*w;weightSum+=w;varianceSum+=nv*w*w;
  }}
  let color=select(center.rgb,sum/max(weightSum,.00001),weightSum>.00001);
  textureStore(dest,p,vec4f(color,max(varianceSum/max(weightSum*weightSum,.00001),.000004)));
}
`;
