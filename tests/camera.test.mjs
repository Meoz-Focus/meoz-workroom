// Copyright 2026 Meoz-Focus contributors
// SPDX-License-Identifier: Apache-2.0
// Source: https://github.com/Meoz-Focus/meoz-workroom

import test from 'node:test';
import assert from 'node:assert/strict';
import {Geometry,sub,norm,cross,dot} from '../js/geometry.js';
import {views,cameraFrame,cameraForViewport,constrainViewMotion,resolveView,VIEW_LIMITS,MAX_CAMERA_DISTANCE,DEFAULT_VIEW} from '../js/camera.js';
import {createBackdrop} from '../js/backdrop.js';

const sizes=[[1280,720],[1441,1025],[820,988],[390,523],[390,844],[320,900],[300,1100]];
function project(camera,width,height,p){
  const frame=cameraFrame(camera),q=sub(p,frame.eye),depth=dot(q,frame.forward),tangent=Math.tan(camera.fov*Math.PI/360);
  return [.5+dot(q,frame.right)/(2*depth*tangent*width/height),.5-dot(q,frame.up)/(2*depth*tangent),depth];
}
function* allowedCameras(){
  for(const [name,limits] of Object.entries(VIEW_LIMITS))for(const [width,height] of sizes){
    for(const yaw of [limits.yaw[0],0,limits.yaw[1]])for(const pitch of [limits.pitch[0],0,limits.pitch[1]])for(const zoom of [limits.zoom[0],1,limits.zoom[1]]){
      yield {name,width,height,camera:cameraForViewport(name,width,height,{yaw,pitch,zoom})};
    }
  }
}

function rayDistance(origin,direction,t){
  const e1=sub(t.b,t.a),e2=sub(t.c,t.a),p=cross(direction,e2),det=dot(e1,p);
  if(Math.abs(det)<1e-9)return Infinity;
  const v0=sub(origin,t.a),u=dot(v0,p)/det;
  if(u<0||u>1)return Infinity;
  const q=cross(v0,e1),v=dot(direction,q)/det;
  if(v<0||u+v>1)return Infinity;
  const distance=dot(e2,q)/det;
  return distance>0?distance:Infinity;
}

test('default view keeps both ends of the laptop at the same screen height',()=>{
  // The keyboard rim, hinge and lid top are world-horizontal across the width.
  // An oblique yaw plus a downward pitch made them appear tilted side to side.
  const edges=[[[ -2.3285,.219,1.1],[1.2285,.219,1.1]],
    [[-2.25,.225,-1.16],[1.15,.225,-1.16]],
    [[-2.25,2.31,-1.92],[1.15,2.31,-1.92]]];
  for(const preset of [views[DEFAULT_VIEW]])for(const distance of [preset.distance,preset.distance*.86]){
    const {eye,forward,right,up}=cameraFrame({...preset,distance});
    const screenHeight=p=>dot(sub(p,eye),up)/dot(sub(p,eye),forward);
    for(const [left,right] of edges)assert.ok(Math.abs(screenHeight(left)-screenHeight(right))<1e-12);
    assert.ok(Math.abs(right[1])<1e-12,'Camera must not roll');
    assert.ok(up[1]>0,'World up must remain above the camera horizon');
  }
});

test('seated Workspace view keeps the watch clear of controls and fits the laptop, cat and mug',()=>{
  for(const [width,height] of [[1280,720],[1441,1025],[1024,768],[390,523],[390,844]]){
    const camera=cameraForViewport(DEFAULT_VIEW,width,height),frame=cameraFrame(camera);
    const tangent=Math.tan(camera.fov*Math.PI/360),aspect=width/height;
    const project=p=>{const q=sub(p,frame.eye),depth=dot(q,frame.forward);return [
      .5+dot(q,frame.right)/(2*depth*tangent*aspect),
      .5-dot(q,frame.up)/(2*depth*tangent)
    ];};
    for(const p of [[-4.15,.4,-.4],[3.2,1,.2],[-2.25,2.41,-1.62],[1.15,.28,-1.17]]){
      const [x,y]=project(p);
      assert.ok(x>.025&&x<.95&&y>.10&&y<.85,`Subject clipped at ${width}×${height}: ${x}, ${y}`);
    }
    const [,watchY]=project([-1.58,.75,1.9]);
    assert.ok(watchY<.85,'Left watch must stay above the bottom toolbar');
    assert.equal(camera.yaw,0,'Readable front composition must remain level');
    assert.deepEqual(views.desk.target,[-.12,1,-.2],'Responsive fitting must not mutate the reset preset');
  }
  const {eye}=cameraFrame(views.desk);
  assert.ok(eye[1]>5&&eye[1]<6,'Default camera should sit about half a metre above the desktop');
});

test('room geometry stays behind every allowed camera and its subject',()=>{
  const g=new Geometry();createBackdrop(g);
  for(const {camera} of allowedCameras()){
    const {eye}=cameraFrame(camera),delta=sub(camera.target,eye),direction=norm(delta),limit=Math.hypot(...delta);
    assert.equal(g.triangles.find(t=>rayDistance(eye,direction,t)<limit),undefined);
  }
});

test('rear, side and unknown URLs resolve to the default front view',()=>{
  for(const name of ['rear','side','__proto__','constructor','',null,undefined]){
    assert.equal(resolveView(name),DEFAULT_VIEW);
    assert.deepEqual(cameraForViewport(name,1280,720),cameraForViewport(DEFAULT_VIEW,1280,720));
  }
  assert.deepEqual(Object.keys(views).sort(),['cat','cup','desk','detail']);
});

test('drag, wheel and pinch offsets saturate without wrapping or accumulating overshoot',()=>{
  for(const [name,limits] of Object.entries(VIEW_LIMITS)){
    const high=constrainViewMotion(name,{yaw:1e9,pitch:1e9,zoom:Infinity});
    assert.deepEqual(high,{yaw:limits.yaw[1],pitch:limits.pitch[1],zoom:limits.zoom[1]});
    assert.deepEqual(constrainViewMotion(name,{yaw:-1e9,pitch:-1e9,zoom:0}),{yaw:limits.yaw[0],pitch:limits.pitch[0],zoom:limits.zoom[0]});
    for(let i=0;i<100;i++)assert.deepEqual(constrainViewMotion(name,{yaw:high.yaw+10,pitch:high.pitch+10,zoom:high.zoom*100}),high);
    const reverse=constrainViewMotion(name,{yaw:high.yaw-.01,pitch:high.pitch-.01,zoom:high.zoom*.99});
    assert.ok(reverse.yaw<high.yaw&&reverse.pitch<high.pitch&&reverse.zoom<high.zoom,'The first reverse gesture must leave the boundary');
    assert.deepEqual(constrainViewMotion(name,{yaw:NaN,pitch:NaN,zoom:NaN}),{yaw:0,pitch:0,zoom:1});
  }
});

test('every allowed angle stays in front with a locked target through responsive refitting',()=>{
  for(const {name,width,height,camera} of allowedCameras()){
    const baseline=cameraForViewport(name,width,height),frame=cameraFrame(camera);
    assert.ok(frame.eye[2]>.4,'Stay on the front side of the laptop');
    assert.ok(Math.abs(camera.yaw)<.5,'Avoid oblique views that stretch one hand');
    assert.ok(camera.distance<=MAX_CAMERA_DISTANCE);
    assert.deepEqual(camera.target,baseline.target,'Panning cannot shift the view away from its subject');
    assert.equal(camera.fov,baseline.fov);
    assert.ok(Math.abs(frame.right[1])<1e-12&&frame.up[1]>0,'Keep the camera upright');
  }
  assert.deepEqual(views.desk.target,[-.12,1,-.2]);
  assert.deepEqual(constrainViewMotion('desk'),{yaw:0,pitch:0,zoom:1});
});

test('outward zoom cannot shrink a subject beyond its default framing in any view or viewport',()=>{
  const anchors={
    desk:[[-2.25,.3,0],[1.15,.3,0]],
    cat:[[1.7,1.7,.2],[3.2,1.7,.2]],
    cup:[[-3.95,.5,-.4],[-3.25,.5,-.4]],
    detail:[[-1.7,.3,.3],[.7,.3,.3]]
  };
  for(const {name,width,height,camera} of allowedCameras()){
    const motion={yaw:camera.yaw-cameraForViewport(name,width,height).yaw,pitch:camera.pitch-cameraForViewport(name,width,height).pitch};
    const baseline=cameraForViewport(name,width,height,motion);
    const outward=cameraForViewport(name,width,height,{...motion,zoom:Infinity});
    const span=view=>{
      const [a,b]=anchors[name].map(p=>project(view,width,height,p));
      return Math.hypot((a[0]-b[0])*width,(a[1]-b[1])*height);
    };
    assert.ok(outward.distance<=baseline.distance,`${name} pulled back past its composed view`);
    assert.ok(span(outward)>=span(baseline)-1e-9,`${name} became smaller after outward zoom at ${width}×${height}`);
  }
});

test('sleeve ends stay outside the frame at orbit and zoom boundaries, including portrait clean view',()=>{
  // Conservative boxes enclosing the actual open sleeve rings at Z=12.
  for(const {name,width,height,camera} of allowedCameras())for(const cx of [-3.29,2.19]){
    for(const dx of [-.5,.5])for(const dy of [-.5,.5])for(const dz of [-.5,.5]){
      const [x,y,depth]=project(camera,width,height,[cx+dx,.18+dy,12+dz]);
      assert.ok(depth<=0||x<=0||x>=1||y>=1||y<=0,`Sleeve end visible in ${name} at ${width}×${height}`);
    }
  }
});

test('Workspace orbit keeps projected left and right hand lengths within a natural proportion',()=>{
  for(const {name,width,height,camera} of allowedCameras())if(name==='desk'){
    const length=(a,b)=>{const x=project(camera,width,height,a),y=project(camera,width,height,b);return Math.hypot((x[0]-y[0])*width/height,x[1]-y[1]);};
    const left=length([-1.34,.30,-.2],[-1.65,.32,2.2]),right=length([.24,.30,-.2],[.55,.32,2.2]);
    assert.ok(Math.max(left/right,right/left)<1.18,'One hand must not become substantially longer than the other');
  }
});
