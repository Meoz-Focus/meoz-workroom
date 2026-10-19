// Copyright 2026 Meoz-Focus contributors
// SPDX-License-Identifier: Apache-2.0
// Source: https://github.com/Meoz-Focus/meoz-workroom

import {createScene} from './scene.js';
import {buildBVH,mul} from './geometry.js';
import {TRACE} from './wgsl/trace.js';
import {POST} from './wgsl/post.js';
import {DENOISE} from './wgsl/denoise.js';
import {renderSize,presentationSize,FILTER_STEPS,SAMPLE_LIMIT} from './render-quality.js';
import {views,cameraFrame,cameraForViewport,constrainViewMotion,resolveView,DEFAULT_VIEW} from './camera.js';

const $=id=>document.getElementById(id),canvas=$('scene');
const qs=new URLSearchParams(location.search);
const state={samples:0,frame:0,width:0,height:0,displayWidth:0,displayHeight:0,quality:qs.has('scale')?Number(qs.get('scale')):'auto',exposure:1,warmth:.78,aperture:0,motion:false,interacting:false,ready:false,error:null};
$('quality').value=String(state.quality);
let activeView=resolveView(qs.get('view')),viewMotion=constrainViewMotion(activeView);
let camera=structuredClone(views[activeView]),device,context,tracePipeline,postPipeline,denoisePipeline,uniform,postUniform,sceneBuffers,atlas,sampler,accum=[],filtered=[],denoiseUniforms=[],denoiseGroups=[],guide,albedo,traceGroups=[],postGroups=[],sampleLimit=SAMPLE_LIMIT,rendering=false,pendingCapture=false;
window.workroom={state,views,camera,get stats(){return sceneBuffers?.stats;}};
function log(message){console.log(message);}
function progress(message,value){$('load-message').textContent=message;$('progress').style.width=`${value*100}%`;}
function fail(error){state.error=String(error?.message||error);$('error').hidden=false;$('error-message').textContent=state.error;log(state.error);}
function reset(){state.samples=0;$('samples').textContent='REFINING';requestRender();}
function requestRender(){if(state.ready&&!rendering){rendering=true;requestAnimationFrame(render);}}
function buffer(data,label){const b=device.createBuffer({size:Math.max(16,data.byteLength),usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,label});device.queue.writeBuffer(b,0,data);return b;}
async function module(code,label){const m=device.createShaderModule({code,label});const info=await m.getCompilationInfo();const errors=info.messages.filter(m=>m.type==='error');if(errors.length)throw new Error(`${label}: ${errors.map(m=>`${m.lineNum}:${m.linePos} ${m.message}`).join('\n')}`);return m;}

function resize(){
  const viewport=sceneViewport();
  const {width:w,height:h}=renderSize(viewport.width,viewport.height,state.quality,devicePixelRatio||1,state.interacting);
  const display=presentationSize(viewport.width,viewport.height,devicePixelRatio||1);
  if(w===state.width&&h===state.height&&display.width===state.displayWidth&&display.height===state.displayHeight)return;
  state.width=w;state.height=h;state.displayWidth=display.width;state.displayHeight=display.height;
  canvas.width=display.width;canvas.height=display.height;
  fitCamera();
  for(const t of [...accum,...filtered])t.destroy();guide?.destroy();albedo?.destroy();
  const usage=GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.STORAGE_BINDING;
  accum=[0,1].map(i=>device.createTexture({label:`progressive HDR ${i}`,size:[w,h],format:'rgba32float',usage}));
  guide=device.createTexture({label:'normal and depth guide',size:[w,h],format:'rgba16float',usage});
  albedo=device.createTexture({label:'surface albedo guide',size:[w,h],format:'rgba16float',usage});
  filtered=FILTER_STEPS.map(i=>device.createTexture({label:`a-trous filter ${i}`,size:[w,h],format:'rgba16float',usage}));
  traceGroups=accum.map((t,i)=>device.createBindGroup({layout:tracePipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniform}},{binding:1,resource:{buffer:sceneBuffers.nodes}},{binding:2,resource:{buffer:sceneBuffers.triangles}},{binding:3,resource:{buffer:sceneBuffers.materials}},{binding:4,resource:atlas.createView()},{binding:5,resource:sampler},{binding:6,resource:accum[1-i].createView()},{binding:7,resource:t.createView()},{binding:8,resource:guide.createView()},{binding:9,resource:albedo.createView()}]}));
  denoiseGroups=accum.map(t=>FILTER_STEPS.map((_,i)=>device.createBindGroup({layout:denoisePipeline.getBindGroupLayout(0),entries:[{binding:0,resource:(i===0?t:filtered[i-1]).createView()},{binding:1,resource:guide.createView()},{binding:2,resource:filtered[i].createView()},{binding:3,resource:{buffer:denoiseUniforms[i]}},{binding:4,resource:albedo.createView()}]})));
  postGroups=[device.createBindGroup({layout:postPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:filtered.at(-1).createView()},{binding:1,resource:guide.createView()},{binding:2,resource:{buffer:postUniform}},{binding:3,resource:{buffer:uniform}},{binding:4,resource:atlas.createView()},{binding:5,resource:sampler},{binding:6,resource:albedo.createView()}]})];
  reset();
}
function updateUniforms(){
  const {distance,fov}=camera,{eye,forward,right,up}=cameraFrame(camera);
  const tan=Math.tan(fov*Math.PI/360),aspect=state.width/state.height;
  const u=new Float32Array(28);u.set([...eye,(performance.now()-startTime)/1000],0);u.set([...mul(right,tan*aspect),0],4);u.set([...mul(up,tan),0],8);u.set([...forward,0],12);u.set([state.width,state.height,state.samples,state.frame],16);u.set([state.exposure,state.aperture,distance,0],20);u.set([state.warmth,1,Number(state.motion),0],24);device.queue.writeBuffer(uniform,0,u);
  const display=sceneBuffers.display;
  device.queue.writeBuffer(postUniform,0,new Float32Array([state.width,state.height,state.samples,0,state.exposure,0,0,0,...display.origin,0,...display.right,0,...display.up,0]));
  denoiseUniforms.forEach((b,i)=>device.queue.writeBuffer(b,0,new Float32Array([FILTER_STEPS[i],state.motion?Math.min(state.samples+1,32):state.samples+1,Number(i===0),0])));
}
let lastStats=0,startTime=performance.now();
async function render(now){
  if(!state.ready){rendering=false;return;}
  updateUniforms();const index=state.samples%2,encoder=device.createCommandEncoder({label:'workroom frame'});
  if(state.samples<sampleLimit||state.motion){const cp=encoder.beginComputePass();cp.setPipeline(tracePipeline);cp.setBindGroup(0,traceGroups[index]);cp.dispatchWorkgroups(Math.ceil(state.width/8),Math.ceil(state.height/8));cp.end();}
  for(let i=0;i<FILTER_STEPS.length;i++){const filter=encoder.beginComputePass();filter.setPipeline(denoisePipeline);filter.setBindGroup(0,denoiseGroups[index][i]);filter.dispatchWorkgroups(Math.ceil(state.width/8),Math.ceil(state.height/8));filter.end();}
  const presentation=context.getCurrentTexture();
  const rp=encoder.beginRenderPass({colorAttachments:[{view:presentation.createView(),loadOp:'clear',storeOp:'store',clearValue:{r:.1,g:.1,b:.08,a:1}}]});rp.setPipeline(postPipeline);rp.setBindGroup(0,postGroups[0]);rp.draw(3);rp.end();
  let readback=null,bytesPerRow=0;const captureWidth=canvas.width,captureHeight=canvas.height;
  if(pendingCapture){pendingCapture=false;bytesPerRow=Math.ceil(captureWidth*4/256)*256;readback=device.createBuffer({size:bytesPerRow*captureHeight,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});encoder.copyTextureToBuffer({texture:presentation},{buffer:readback,bytesPerRow},[captureWidth,captureHeight]);}
  device.queue.submit([encoder.finish()]);
  state.frame++;state.samples++;
  if(state.samples===1){$('loading').classList.add('done');$('loading').setAttribute('aria-hidden','true');}
  if(now-lastStats>600){$('samples').textContent=state.motion?'LIVE · TYPING':`${Math.min(state.samples,sampleLimit)} SPP`;$('scene-stats').textContent=`${sceneBuffers.stats.triangles.toLocaleString()} triangles · ${sceneBuffers.stats.hairs.toLocaleString()} hairs\n${state.width} × ${state.height} · ${state.samples} samples`;lastStats=now;}
  if(readback){saveCapture(readback,bytesPerRow,captureWidth,captureHeight).catch(error=>{toast('Capture failed. Please try again.');log(error);});}
  if(state.samples<sampleLimit||state.motion){
    // Bound the command queue: no more than one frame's tracing work in flight.
    await device.queue.onSubmittedWorkDone();requestAnimationFrame(render);
  }else{rendering=false;$('samples').textContent=`${sampleLimit} SPP · RESOLVED`;}
}
function toast(message){$('toast').textContent=message;$('toast').hidden=false;setTimeout(()=>$('toast').hidden=true,2700);}
async function saveCapture(readback,stride,width,height){
  await readback.mapAsync(GPUMapMode.READ);const source=new Uint8Array(readback.getMappedRange()),rgba=new Uint8ClampedArray(width*height*4),bgra=navigator.gpu.getPreferredCanvasFormat().startsWith('bgra');
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){const from=y*stride+x*4,to=(y*width+x)*4;rgba[to]=source[from+(bgra?2:0)];rgba[to+1]=source[from+1];rgba[to+2]=source[from+(bgra?0:2)];rgba[to+3]=255;}
  readback.unmap();readback.destroy();const picture=document.createElement('canvas');picture.width=width;picture.height=height;picture.getContext('2d').putImageData(new ImageData(rgba,width,height),0,0);
  picture.toBlob(blob=>{if(!blob){toast('Capture unavailable. Please try again.');return;}const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='meoz-a-little-company.png';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast('A little moment, saved.');});
}
function sceneViewport(){return {width:Number(qs.get('w'))||canvas.clientWidth,height:Number(qs.get('h'))||canvas.clientHeight};}
function fitCamera(){const {width,height}=sceneViewport();camera=cameraForViewport(activeView,width,height,viewMotion);window.workroom.camera=camera;}
function setView(name){activeView=resolveView(name);viewMotion=constrainViewMotion(activeView);fitCamera();document.body.classList.toggle('closeup',activeView!==DEFAULT_VIEW);document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.view===activeView));reset();}
function moveView({yaw=0,pitch=0,zoom=1}){
  const next=constrainViewMotion(activeView,{yaw:viewMotion.yaw+yaw,pitch:viewMotion.pitch+pitch,zoom:viewMotion.zoom*zoom});
  if(next.yaw===viewMotion.yaw&&next.pitch===viewMotion.pitch&&next.zoom===viewMotion.zoom)return false;
  viewMotion=next;fitCamera();document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed','false'));return true;
}
let drag=null,pointers=new Map(),pinch=0;
canvas.addEventListener('pointerdown',e=>{if(!state.ready||e.button!==0)return;state.interacting=true;resize();canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);drag={x:e.clientX,y:e.clientY};if(pointers.size===2){const p=[...pointers.values()];pinch=Math.max(1,Math.hypot(p[0][0]-p[1][0],p[0][1]-p[1][1]));}});
canvas.addEventListener('pointermove',e=>{
  if(!pointers.has(e.pointerId)||!drag)return;pointers.set(e.pointerId,[e.clientX,e.clientY]);const dx=e.clientX-drag.x,dy=e.clientY-drag.y;let changed;
  if(pointers.size===2){const p=[...pointers.values()],d=Math.max(1,Math.hypot(p[0][0]-p[1][0],p[0][1]-p[1][1]));changed=moveView({zoom:pinch/d});pinch=d;}
  else{changed=moveView({yaw:-dx*.005,pitch:dy*.004});}
  drag.x=e.clientX;drag.y=e.clientY;if(changed)reset();
});
const endPointer=e=>{pointers.delete(e.pointerId);if(pointers.size===0){drag=null;state.interacting=false;resize();}else{const [x,y]=pointers.values().next().value;drag={x,y};}};canvas.addEventListener('pointerup',endPointer);canvas.addEventListener('pointercancel',endPointer);canvas.addEventListener('contextmenu',e=>e.preventDefault());
let wheelEnd;
canvas.addEventListener('wheel',e=>{e.preventDefault();if(!state.ready||!moveView({zoom:Math.exp(e.deltaY*.001)}))return;state.interacting=true;resize();reset();clearTimeout(wheelEnd);wheelEnd=setTimeout(()=>{state.interacting=false;resize();},200);},{passive:false});
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
function resetView(){
  if(!state.ready)return;
  for(const id of pointers.keys())if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);
  pointers.clear();drag=null;pinch=0;clearTimeout(wheelEnd);state.interacting=false;
  setView(DEFAULT_VIEW);resize();toast('Default view restored.');
}
$('reset-view').onclick=resetView;
function toggleSettings(show=$('panel').hidden){$('panel').hidden=!show;$('settings').setAttribute('aria-expanded',String(show));}
$('settings').onclick=()=>toggleSettings();$('close-settings').onclick=()=>{toggleSettings(false);$('settings').focus();};
const hideUI=()=>{document.body.classList.toggle('clean');if(state.ready)resize();};$('hide').onclick=hideUI;$('restore').onclick=hideUI;
$('capture').onclick=()=>{pendingCapture=true;if(!state.motion)state.samples=Math.min(state.samples,sampleLimit-1);requestRender();};
$('warmth').oninput=e=>{state.warmth=e.target.value/100;$('warmth-value').value=e.target.value+'%';reset();};
$('exposure').oninput=e=>{state.exposure=e.target.value/100;$('exposure-value').value=state.exposure.toFixed(2);reset();};
$('aperture').oninput=e=>{state.aperture=e.target.value*.001;$('aperture-value').value=e.target.value==='0'?'Off':e.target.value<35?'Subtle':'Dreamy';reset();};
$('quality').onchange=e=>{state.quality=e.target.value==='auto'?'auto':Number(e.target.value);resize();};
$('motion').onchange=e=>{state.motion=e.target.checked;reset();};
addEventListener('resize',()=>{if(state.ready)resize();});
addEventListener('keydown',e=>{if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;if(e.key.toLowerCase()==='h')hideUI();if(e.key.toLowerCase()==='r'&&!e.metaKey&&!e.ctrlKey&&!e.altKey){e.preventDefault();resetView();}if(e.key==='Escape')toggleSettings(false);if(['1','2','3'].includes(e.key))setView(['desk','cat','detail'][Number(e.key)-1]);});

async function main(){
  if(!navigator.gpu)throw new Error('This scene needs WebGPU. Open it in a recent Chrome, Edge, or Safari with WebGPU enabled, then return to the workroom.');
  progress('Opening the workroom…',.04);const adapter=await navigator.gpu.requestAdapter({powerPreference:'high-performance'});if(!adapter)throw new Error('No WebGPU adapter was found. Enable hardware acceleration in your browser and reopen this page.');
  device=await adapter.requestDevice();device.lost.then(info=>{state.ready=false;fail(`The graphics device was interrupted: ${info.message}. Reload to rebuild the scene.`);});device.onuncapturederror=e=>fail(e.error);
  context=canvas.getContext('webgpu');context.configure({device,format:navigator.gpu.getPreferredCanvasFormat(),alphaMode:'opaque',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC});
  const scene=await createScene(progress);progress('Putting everything in its place…',.80);await new Promise(r=>setTimeout(r,30));const bvh=buildBVH(scene.geometry.triangles);
  sceneBuffers={nodes:buffer(bvh.nodes,'threaded BVH'),triangles:buffer(bvh.triangles,'handcrafted triangles'),materials:buffer(scene.materials,'PBR materials'),display:scene.display,stats:{triangles:bvh.triangleCount,nodes:bvh.nodeCount,...scene.stats}};
  log(`Scene: ${bvh.triangleCount} triangles; ${bvh.nodeCount} BVH nodes; ${(bvh.triangles.byteLength/1048576).toFixed(1)} MiB triangles`);
  atlas=device.createTexture({label:'mipmapped procedural display and key legends',size:[2048,2048],mipLevelCount:12,format:'rgba8unorm-srgb',usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT});
  let mip=scene.atlas;
  for(let level=0;level<12;level++){
    device.queue.copyExternalImageToTexture({source:mip},{texture:atlas,mipLevel:level},[mip.width,mip.height]);
    if(level<11){const next=document.createElement('canvas');next.width=next.height=Math.max(1,mip.width/2);const ctx=next.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(mip,0,0,next.width,next.height);mip=next;}
  }
  sampler=device.createSampler({magFilter:'linear',minFilter:'linear',mipmapFilter:'linear',maxAnisotropy:8});uniform=device.createBuffer({size:112,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});postUniform=device.createBuffer({size:80,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
  progress('Warming up the workroom…',.91);
  const traceLayout=device.createBindGroupLayout({entries:[
    {binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:'uniform'}},
    ...[1,2,3].map(binding=>({binding,visibility:GPUShaderStage.COMPUTE,buffer:{type:'read-only-storage'}})),
    {binding:4,visibility:GPUShaderStage.COMPUTE,texture:{sampleType:'float'}},{binding:5,visibility:GPUShaderStage.COMPUTE,sampler:{type:'filtering'}},
    {binding:6,visibility:GPUShaderStage.COMPUTE,texture:{sampleType:'unfilterable-float'}},{binding:7,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:'write-only',format:'rgba32float'}},{binding:8,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:'write-only',format:'rgba16float'}},{binding:9,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:'write-only',format:'rgba16float'}}]});
  const postLayout=device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:'unfilterable-float'}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:'float'}},{binding:2,visibility:GPUShaderStage.FRAGMENT,buffer:{type:'uniform'}},{binding:3,visibility:GPUShaderStage.FRAGMENT,buffer:{type:'uniform'}},{binding:4,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:'float'}},{binding:5,visibility:GPUShaderStage.FRAGMENT,sampler:{type:'filtering'}},{binding:6,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:'float'}}]});
  const denoiseLayout=device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,texture:{sampleType:'unfilterable-float'}},{binding:1,visibility:GPUShaderStage.COMPUTE,texture:{sampleType:'float'}},{binding:2,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:'write-only',format:'rgba16float'}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:'uniform'}},{binding:4,visibility:GPUShaderStage.COMPUTE,texture:{sampleType:'float'}}]});
  denoiseUniforms=FILTER_STEPS.map(i=>device.createBuffer({label:`filter step ${i}`,size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}));
  const [traceModule,postModule,denoiseModule]=await Promise.all([module(TRACE,'Path tracer'),module(POST,'Film and denoise'),module(DENOISE,'A-trous filter')]);
  [tracePipeline,postPipeline,denoisePipeline]=await Promise.all([device.createComputePipelineAsync({label:'three-bounce path tracer',layout:device.createPipelineLayout({bindGroupLayouts:[traceLayout]}),compute:{module:traceModule,entryPoint:'main'}}),device.createRenderPipelineAsync({label:'edge-aware reconstruction and film',layout:device.createPipelineLayout({bindGroupLayouts:[postLayout]}),vertex:{module:postModule,entryPoint:'vs'},fragment:{module:postModule,entryPoint:'fs',targets:[{format:navigator.gpu.getPreferredCanvasFormat()}]},primitive:{topology:'triangle-list'}}),device.createComputePipelineAsync({label:'a-trous wavelet denoise',layout:device.createPipelineLayout({bindGroupLayouts:[denoiseLayout]}),compute:{module:denoiseModule,entryPoint:'main'}})]);
  state.ready=true;resize();setView(activeView);if(qs.get('ui')==='0')document.body.classList.add('clean');progress('Make yourself at home.',1);startTime=performance.now();log(`Ready in ${(startTime/1000).toFixed(1)}s`);
}
main().catch(fail);
