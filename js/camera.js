// Copyright 2026 Meoz-Focus contributors
// SPDX-License-Identifier: Apache-2.0
// Source: https://github.com/Meoz-Focus/meoz-workroom

import {sub,norm,cross} from './geometry.js';

export const MAX_CAMERA_DISTANCE=25;
export const DEFAULT_VIEW='desk';
export const views={
  desk:{target:[-.12,1.00,-.20],yaw:0,pitch:.56,distance:8.9,fov:34},
  cat:{target:[2.43,1.02,-.10],yaw:.12,pitch:.15,distance:5.15,fov:34},
  cup:{target:[-3.60,.34,-.40],yaw:-.28,pitch:.55,distance:2.25,fov:36},
  detail:{target:[-.64,.53,-.08],yaw:-.20,pitch:.84,distance:5.9,fov:37}
};
// Small offsets around each composition keep the camera in front of the desk.
// Zoom is relative to the responsive fit, which is the furthest-out position
// in every view; the target is always preset-owned.
export const VIEW_LIMITS={
  desk:{yaw:[-.12,.12],pitch:[-.03,.05],zoom:[.92,1]},
  cat:{yaw:[-.32,.32],pitch:[-.06,.12],zoom:[.86,1]},
  cup:{yaw:[-.14,.14],pitch:[-.08,.10],zoom:[.88,1]},
  detail:{yaw:[-.10,.10],pitch:[-.06,.06],zoom:[.90,1]}
};
export const resolveView=name=>Object.hasOwn(views,name)?name:DEFAULT_VIEW;
const bound=(value,[lo,hi],fallback)=>Math.max(lo,Math.min(hi,typeof value==='number'&&!Number.isNaN(value)?value:fallback));
export function constrainViewMotion(name,motion={}){
  const limits=VIEW_LIMITS[resolveView(name)];
  return {yaw:bound(motion.yaw,limits.yaw,0),pitch:bound(motion.pitch,limits.pitch,0),zoom:bound(motion.zoom,limits.zoom,1)};
}

export function cameraForViewport(name,width,height,motion={}){
  name=resolveView(name);
  const camera=structuredClone(views[name]),aspect=width/height;
  if(name==='desk'&&aspect>=1){
    // Keep the tighter seated composition on wide screens while leaving room
    // for the mug and companion on taller desktop windows.
    camera.distance=Math.max(camera.distance,8.8/(2*Math.tan(camera.fov*Math.PI/360)*aspect));
  }
  if(width<650||aspect<1){
    const frameWidth={desk:8.8,cat:2.6,cup:1.7,detail:4.3}[name];
    if(name==='desk'){camera.fov=45;camera.target=[0,.95,0];if(aspect<.55)camera.pitch=.62;}
    camera.distance=Math.max(camera.distance,frameWidth/(2*Math.tan(camera.fov*Math.PI/360)*aspect));
  }
  camera.distance=Math.min(MAX_CAMERA_DISTANCE,camera.distance);
  const offset=constrainViewMotion(name,motion);
  camera.yaw+=offset.yaw;camera.pitch+=offset.pitch;
  camera.distance=Math.min(MAX_CAMERA_DISTANCE,camera.distance*offset.zoom);
  return camera;
}

export function cameraEye({yaw,pitch,distance,target}){
  return [
    target[0]+Math.sin(yaw)*Math.cos(pitch)*distance,
    target[1]+Math.sin(pitch)*distance,
    target[2]+Math.cos(yaw)*Math.cos(pitch)*distance
  ];
}

export function cameraFrame(camera){
  const eye=cameraEye(camera),forward=norm(sub(camera.target,eye));
  // Keep world vertical as the reference: orbit changes yaw/pitch, never roll.
  const right=norm(cross(forward,[0,1,0])),up=cross(right,forward);
  return {eye,forward,right,up};
}
