// Copyright 2026 Meoz-Focus contributors
// SPDX-License-Identifier: Apache-2.0
// Source: https://github.com/Meoz-Focus/meoz-workroom

// Keep the room behind the entire zoom/orbit envelope. The old wall at -5.05
// passed between a rear-facing camera and the laptop, hiding the whole scene.
export const BACKDROP_Z=-32;
export function createBackdrop(g){
  g.box([0,15,BACKDROP_Z],[96,32,.12],.01,18,1);
  for(let i=0;i<8;i++)g.box([-17+i*1.15,9,BACKDROP_Z+.08],[.15,18,.07],.015,0,2);
}
