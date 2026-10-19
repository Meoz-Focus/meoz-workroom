// Copyright 2026 Meoz-Focus contributors
// SPDX-License-Identifier: Apache-2.0
// Source: https://github.com/Meoz-Focus/meoz-workroom

// Match display density without independently clipping width and height, which
// would change the camera's aspect ratio. Bound GPU work by total pixel count.
export const FILTER_STEPS=[1,2,4,8];
export const SAMPLE_LIMIT=1024;
// Present at display density even when tracing uses a smaller pixel budget.
// The emissive laptop display can then retain the original texture's detail.
export function presentationSize(width,height,dpr=1){
  const scale=Math.min(Math.max(1,dpr),2,4096/width,3000/height);
  return {width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale))};
}
export function renderSize(width,height,quality='auto',dpr=1,interacting=false){
  const requested=quality==='auto'?Math.min(Math.max(1,dpr),2):Number(quality);
  let scale=Number.isFinite(requested)&&requested>0?requested:1;
  // Keep camera motion inexpensive even on large/Retina windows. Still frames
  // retain the full two-million-pixel budget and native-density presentation.
  if(interacting)scale=Math.min(scale,.5,Math.sqrt(240_000/(width*height)));
  scale=Math.min(scale,2400/width,1800/height,Math.sqrt(2_000_000/(width*height)));
  return {width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale)),scale};
}
