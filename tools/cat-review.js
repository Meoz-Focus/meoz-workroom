// Copyright 2026 Meoz-Focus contributors
// SPDX-License-Identifier: Apache-2.0
// Source: https://github.com/Meoz-Focus/meoz-workroom

import {Geometry,norm,cross} from '../js/geometry.js';
import {createCat,CAT_FACE,CAT_PAWS} from '../js/cat.js';

// Review the production geometry without velvet strands or painted details.
class ClayGeometry extends Geometry{fur(){}}
const geometry=new ClayGeometry();
createCat(geometry);
const triangles=geometry.triangles.filter(t=>t.mat===8);
const vertices=new Float32Array(triangles.length*18);
let offset=0;
for(const t of triangles)for(const [p,n] of [['a','na'],['b','nb'],['c','nc']]){
  vertices.set(t[p],offset);vertices.set(t[n],offset+3);offset+=6;
}
const canvas=document.querySelector('canvas');
try{
  const adapter=await navigator.gpu.requestAdapter();
  const device=await adapter.requestDevice(),format=navigator.gpu.getPreferredCanvasFormat();
  device.onuncapturederror=event=>{document.getElementById('status').textContent=`Review unavailable: ${event.error.message}`;};
  const context=canvas.getContext('webgpu');context.configure({device,format,alphaMode:'opaque'});
  const shader=device.createShaderModule({code:`
struct Camera{right:vec4f,up:vec4f,forward:vec4f,pivot:vec4f};
@group(0) @binding(0) var<uniform> camera:Camera;
struct Vertex{@builtin(position) position:vec4f,@location(0) normal:vec3f};
@vertex fn vs(@location(0) p:vec3f,@location(1) n:vec3f)->Vertex{
  let q=p-camera.pivot.xyz;var out:Vertex;
  out.position=vec4f(dot(q,camera.right.xyz)/camera.right.w,dot(q,camera.up.xyz)/camera.up.w,.5+dot(q,camera.forward.xyz)/8.,1.);
  out.normal=vec3f(dot(n,camera.right.xyz),dot(n,camera.up.xyz),-dot(n,camera.forward.xyz));return out;
}
@fragment fn fs(in:Vertex)->@location(0) vec4f{
  let n=normalize(in.normal);let key=normalize(vec3f(-.6,.85,1.));
  let light=.36+.52*max(0.,dot(n,key))+.08*pow(1.-abs(n.z),2.);
  return vec4f(vec3f(.72,.73,.70)*light,1.);
}`});
  const compilation=await shader.getCompilationInfo();
  const errors=compilation.messages.filter(message=>message.type==='error');
  if(errors.length)throw new Error(errors.map(message=>message.message).join('; '));
  const pipeline=device.createRenderPipeline({layout:'auto',vertex:{module:shader,entryPoint:'vs',buffers:[{arrayStride:24,attributes:[{shaderLocation:0,offset:0,format:'float32x3'},{shaderLocation:1,offset:12,format:'float32x3'}]}]},fragment:{module:shader,entryPoint:'fs',targets:[{format}]},primitive:{topology:'triangle-list'},depthStencil:{format:'depth24plus',depthWriteEnabled:true,depthCompare:'less'},multisample:{count:4}});
  const buffer=device.createBuffer({size:vertices.byteLength,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST});device.queue.writeBuffer(buffer,0,vertices);
  const cameras=[{yaw:0,pitch:0},{yaw:-Math.PI/2,pitch:0},{yaw:-Math.PI/4,pitch:.10}];
  const uniforms=cameras.map(()=>device.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}));
  const groups=uniforms.map(buffer=>device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer}}]}));
  let depth,color;
  function draw(){
    const density=Math.min(2,devicePixelRatio||1);
    canvas.width=Math.round(canvas.clientWidth*density);canvas.height=Math.round(canvas.clientHeight*density);
    depth?.destroy();color?.destroy();
    depth=device.createTexture({size:[canvas.width,canvas.height],format:'depth24plus',sampleCount:4,usage:GPUTextureUsage.RENDER_ATTACHMENT});
    color=device.createTexture({size:[canvas.width,canvas.height],format,sampleCount:4,usage:GPUTextureUsage.RENDER_ATTACHMENT});
    const encoder=device.createCommandEncoder(),pass=encoder.beginRenderPass({colorAttachments:[{view:color.createView(),resolveTarget:context.getCurrentTexture().createView(),clearValue:{r:.79,g:.78,b:.75,a:1},loadOp:'clear',storeOp:'discard'}],depthStencilAttachment:{view:depth.createView(),depthClearValue:1,depthLoadOp:'clear',depthStoreOp:'discard'}});
    pass.setPipeline(pipeline);pass.setVertexBuffer(0,buffer);
    cameras.forEach(({yaw,pitch},i)=>{
      const forward=[-Math.sin(yaw)*Math.cos(pitch),-Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch)];
      const right=norm(cross(forward,[0,1,0])),up=cross(right,forward);
      const width=canvas.width/3,halfHeight=Math.max(1.27,.85*canvas.height/width),halfWidth=halfHeight*width/canvas.height;
      device.queue.writeBuffer(uniforms[i],0,new Float32Array([...right,halfWidth,...up,halfHeight,...forward,0,2.45,1.10,-.10,0]));
      pass.setViewport(i*width,0,width,canvas.height,0,1);pass.setBindGroup(0,groups[i]);pass.draw(vertices.length/6);
    });
    pass.end();device.queue.submit([encoder.finish()]);
  }
  addEventListener('resize',draw);draw();
  document.getElementById('status').textContent=`Ready · head width ${(CAT_FACE.radii[0]*2).toFixed(2)} / depth ${(CAT_FACE.radii[2]*2).toFixed(2)} · paw depth ${(CAT_PAWS.radii[2]*2).toFixed(2)}`;
}catch(error){document.getElementById('status').textContent=`Review unavailable: ${error.message}`;throw error;}
