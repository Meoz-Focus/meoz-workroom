// Copyright 2026 Meoz-Focus contributors
// SPDX-License-Identifier: Apache-2.0
// Source: https://github.com/Meoz-Focus/meoz-workroom

import {add} from './geometry.js';

export const LID_MIN_DEGREES=95;
export const LID_MAX_DEGREES=110;
export const LID_OPENING_DEGREES=102;

export function createLidTransform(hinge,openingDegrees=LID_OPENING_DEGREES){
  const requested=Number.isFinite(openingDegrees)?openingDegrees:LID_OPENING_DEGREES;
  const angle=Math.max(LID_MIN_DEGREES,Math.min(LID_MAX_DEGREES,requested))*Math.PI/180;
  // Measure from the keyboard's forward (+Z) direction. A vertical lid is 90°.
  return (p,normal=false)=>{
    const v=[p[0],p[1]*Math.sin(angle)-p[2]*Math.cos(angle),p[1]*Math.cos(angle)+p[2]*Math.sin(angle)];
    return normal?v:add(v,hinge);
  };
}
