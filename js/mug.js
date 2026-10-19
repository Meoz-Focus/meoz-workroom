// Copyright 2026 Meoz-Focus contributors
// SPDX-License-Identifier: Apache-2.0
// Source: https://github.com/Meoz-Focus/meoz-workroom

import {add,mix} from './geometry.js';

export function createMug(g){
  const center=[-3.52,.03,-.40],ceramic=13,coffee=14;
  const coffeeHeight=center[1]+.541,coffeeRadius=.315;
  const start=g.triangles.length;
  // Continuous outer wall, rolled lip, inner wall and solid ceramic base.
  g.lathe(center,[[0,0],[.28,0],[.33,.04],[.365,.55],[.355,.62],[.335,.635],[.315,.61],[.32,.11],[.25,.07],[0,.07]],ceramic,128);
  const wallTriangles=g.triangles.slice(start);
  g.lathe(center,[[0,.541],[coffeeRadius,.541]],coffee,128);

  // Only the exterior C-shaped arc belongs to the handle. A full ellipse
  // would return through the cup's cavity and appear above the coffee.
  const top=[-.380,.510,0],middle=[-.640,.320,0],bottom=[-.370,.145,0];
  const bezier=(a,b,c,d,t)=>mix(mix(mix(a,b,t),mix(b,c,t),t),mix(mix(b,c,t),mix(c,d,t),t),t);
  const points=[];
  for(let i=0;i<=32;i++)points.push(add(center,bezier(top,[-.51,.55,0],[-.64,.48,0],middle,i/32)));
  for(let i=1;i<=32;i++)points.push(add(center,bezier(middle,[-.64,.17,0],[-.50,.09,0],bottom,i/32)));
  const handleStart=g.triangles.length,radius=.045;
  g.tube(points,points.map(()=>radius),ceramic,24);
  // Rounded attachment ends enter the outer ceramic only, stopping before
  // the inner wall. They also close the tube ends inside the joined material.
  for(const p of [points[0],points.at(-1)])g.ellipsoid(p,[radius,radius,radius],ceramic,24,14);
  const handleTriangles=g.triangles.slice(handleStart);
  g.lathe([-3.52,.012,-.40],[[0,0],[.49,0],[.57,.035],[.57,.055],[.45,.066],[0,.026]],ceramic,128);
  return {center,coffeeHeight,coffeeRadius,wallTriangles,handleTriangles,attachments:[points[0],points.at(-1)],attachmentRadius:radius};
}
