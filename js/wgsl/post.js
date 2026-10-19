// Copyright 2026 Meoz-Focus contributors
// SPDX-License-Identifier: Apache-2.0
// Source: https://github.com/Meoz-Focus/meoz-workroom

export const POST=/* wgsl */`
struct UBO { size:vec4f, look:vec4f,screenOrigin:vec4f,screenRight:vec4f,screenUp:vec4f };
struct Frame {eye:vec4f,right:vec4f,up:vec4f,forward:vec4f,size:vec4f,settings:vec4f,light:vec4f};
@group(0) @binding(0) var hdr:texture_2d<f32>;
@group(0) @binding(1) var guide:texture_2d<f32>;
@group(0) @binding(2) var<uniform> U:UBO;
@group(0) @binding(3) var<uniform> camera:Frame;
@group(0) @binding(4) var atlas:texture_2d<f32>;
@group(0) @binding(5) var samp:sampler;
@group(0) @binding(6) var albedo:texture_2d<f32>;
struct V { @builtin(position) pos:vec4f,@location(0) uv:vec2f };
@vertex fn vs(@builtin(vertex_index) i:u32)->V {let p=vec2f(f32((i<<1u)&2u),f32(i&2u));var o:V;o.pos=vec4f(p*2.-1.,0,1);o.uv=vec2f(p.x,1.-p.y);return o;}
fn aces(v:vec3f)->vec3f {return clamp((v*(2.51*v+.03))/(v*(2.43*v+.59)+.14),vec3f(0),vec3f(1));}
fn srgb(v:vec3f)->vec3f{return select(v*12.92,1.055*pow(max(v,vec3f(0)),vec3f(1./2.4))-.055,v>vec3f(.0031308));}
@fragment fn fs(v:V)->@location(0) vec4f {
  let dims=vec2i(textureDimensions(hdr));let p=clamp(vec2i(v.uv*vec2f(dims)),vec2i(0),dims-1);
  let coord=v.uv*vec2f(dims)-.5;let origin=vec2i(floor(coord));let f=fract(coord);
  let c00=textureLoad(hdr,clamp(origin,vec2i(0),dims-1),0).rgb;let c10=textureLoad(hdr,clamp(origin+vec2i(1,0),vec2i(0),dims-1),0).rgb;
  let c01=textureLoad(hdr,clamp(origin+vec2i(0,1),vec2i(0),dims-1),0).rgb;let c11=textureLoad(hdr,clamp(origin+vec2i(1,1),vec2i(0),dims-1),0).rgb;
  var color=mix(mix(c00,c10,f.x),mix(c01,c11,f.x),f.y);
  // Resolve the actual 3D display plane at presentation density. Visibility
  // comes from the traced first hit, so the lid, bezel and foreground objects
  // still occlude it. Perspective-correct derivatives preserve fine UI text.
  let ray=normalize(camera.forward.xyz+camera.right.xyz*(v.uv.x*2.-1.)-camera.up.xyz*(v.uv.y*2.-1.));
  let n=normalize(cross(U.screenRight.xyz,U.screenUp.xyz));let facing=dot(ray,n);
  let denominator=select(1e-6,facing,abs(facing)>1e-6);
  let distance=dot(U.screenOrigin.xyz-camera.eye.xyz,n)/denominator;
  let delta=camera.eye.xyz+ray*distance-U.screenOrigin.xyz;
  let xy=vec2f(dot(delta,U.screenRight.xyz)/dot(U.screenRight.xyz,U.screenRight.xyz),dot(delta,U.screenUp.xyz)/dot(U.screenUp.xyz,U.screenUp.xyz));
  let screenUV=vec2f(xy.x,(1.-xy.y)*.625);
  let screenColor=textureSampleGrad(atlas,samp,screenUV,dpdx(screenUV),dpdy(screenUV)).rgb;
  let depthTolerance=max(.02,fwidth(distance)*2.);
  let surface=textureLoad(albedo,p,0);let geometry=textureLoad(guide,p,0);
  if(camera.settings.y<.0001 && surface.a>1.5 && facing<0. && distance>0. && all(xy>=vec2f(0)) && all(xy<=vec2f(1)) && distance<=geometry.w+depthTolerance){color=screenColor*.66;}
  color*=U.look.x;
  let vignette=1.-.16*dot((v.uv-.5)*vec2f(1.3,1.),(v.uv-.5)*vec2f(1.3,1.));color*=vignette;
  return vec4f(srgb(aces(color)),1);
}
`;
