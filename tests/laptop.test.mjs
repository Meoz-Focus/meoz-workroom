// Copyright 2026 Meoz-Focus contributors
// SPDX-License-Identifier: Apache-2.0
// Source: https://github.com/Meoz-Focus/meoz-workroom

import test from 'node:test';
import assert from 'node:assert/strict';
import {sub,norm,dot} from '../js/geometry.js';
import {createLidTransform,LID_OPENING_DEGREES} from '../js/laptop.js';

const hinge=[-.55,.225,-1.16];
function measuredOpening(transform){
  const axis=norm(sub(transform([0,1,0]),transform([0,0,0])));
  return Math.acos(Math.max(-1,Math.min(1,dot(axis,[0,0,1]))))*180/Math.PI;
}

test('the actual lid geometry opens 102° and stays within 95–110°',()=>{
  assert.ok(Math.abs(measuredOpening(createLidTransform(hinge))-102)<1e-10);
  assert.equal(LID_OPENING_DEGREES,102);
  for(const [requested,expected] of [[0,95],[95,95],[102,102],[110,110],[180,110],[NaN,102]]){
    const transform=createLidTransform(hinge,requested),angle=measuredOpening(transform);
    assert.ok(Math.abs(angle-expected)<1e-10);
    assert.ok(angle>=95-1e-10&&angle<=110+1e-10);
    assert.ok(transform([0,2.22,0])[2]<hinge[2],'Lid top must lean behind the hinge');
  }
});

test('lid panels and normals use one rigid transform without side-to-side tilt',()=>{
  const transform=createLidTransform(hinge),a=transform([-1.7785,2.22,0]),b=transform([1.7785,2.22,0]);
  assert.equal(a[1],b[1]);assert.equal(a[2],b[2]);
  assert.ok(Math.abs(Math.hypot(...sub(a,b))-3.557)<1e-12);
  const up=transform([0,1,0],true),front=transform([0,0,1],true);
  assert.ok(Math.abs(dot(up,front))<1e-12);
  assert.ok(Math.abs(Math.hypot(...front)-1)<1e-12);
});
