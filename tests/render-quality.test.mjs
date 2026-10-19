// Copyright 2026 Meoz-Focus contributors
// SPDX-License-Identifier: Apache-2.0
// Source: https://github.com/Meoz-Focus/meoz-workroom

import test from 'node:test';
import assert from 'node:assert/strict';
import {renderSize,presentationSize} from '../js/render-quality.js';
import {Geometry,dot} from '../js/geometry.js';

test('automatic resolution accounts for Retina display pixels',()=>{
  const css=renderSize(700,700,'auto',1),retina=renderSize(700,700,'auto',2);
  assert.equal(css.width,700);assert.equal(retina.width,1400);
  assert.equal(retina.height,1400);
});

test('large and ultrawide views retain their aspect ratio within the pixel budget',()=>{
  for(const [width,height] of [[1440,900],[3840,900],[774,988],[390,844]]){
    const size=renderSize(width,height,'auto',2);
    assert.ok(size.width*size.height<=2_003_000);
    assert.ok(size.width<=2400&&size.height<=1800);
    assert.ok(Math.abs(size.height-size.width/(width/height))<=1);
  }
});

test('orbit preview returns to full display density after interaction',()=>{
  const preview=renderSize(700,700,'auto',2,true),still=renderSize(700,700,'auto',2,false);
  assert.equal(preview.width,350);assert.equal(still.width,1400);
});

test('scroll preview has a bounded GPU pixel budget across large displays',()=>{
  for(const [w,h] of [[1440,900],[2880,1800],[3840,2160],[7680,2160],[390,844]]){
    const preview=renderSize(w,h,'auto',2,true);
    assert.ok(preview.width*preview.height<=241_000);
    assert.ok(Math.abs(preview.height-preview.width/(w/h))<=1);
    assert.ok(renderSize(w,h,'auto',2,false).width>preview.width);
  }
});

test('Retina presentation keeps screen text at native density at every trace quality',()=>{
  const presentation=presentationSize(1441,1025,2);
  assert.deepEqual(presentation,{width:2882,height:2050});
  const comfort=renderSize(1441,1025,.65,2),auto=renderSize(1441,1025,'auto',2);
  assert.ok(comfort.width<auto.width&&auto.width<presentation.width);
  const wide=presentationSize(7680,2160,2);
  assert.ok(wide.width<=4096&&wide.height<=3000);
  assert.ok(Math.abs(wide.width/wide.height-7680/2160)<.003);
});

test('curved tube frames do not flip or pinch at a vertical tangent',()=>{
  const points=Array.from({length:65},(_,i)=>{const a=i/64*Math.PI*2;return [Math.cos(a),Math.sin(a),0];});
  const g=new Geometry();g.tube(points,points.map(()=>.1),0,16);
  const ringNormals=Array.from({length:64},(_,i)=>g.triangles[i*16*2].na);
  for(let i=1;i<ringNormals.length;i++)assert.ok(dot(ringNormals[i-1],ringNormals[i])>.99,'Tube frame twisted at a tangent');
});
