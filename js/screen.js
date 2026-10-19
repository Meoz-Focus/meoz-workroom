// Copyright 2026 Meoz-Focus contributors
// SPDX-License-Identifier: Apache-2.0
// Source: https://github.com/Meoz-Focus/meoz-workroom

import {drawCompanionIcon as meozIcon} from './companion-icon.js';

const sans='-apple-system, BlinkMacSystemFont, sans-serif';
function panel(c,x,y,w,h,r,fill){c.fillStyle=fill;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
function label(c,text,x,y,size,color='#383545',weight='400',family=sans){c.fillStyle=color;c.font=`${weight} ${size}px ${family}`;c.fillText(text,x,y);}

export function drawScreen(c){
  c.save();c.beginPath();c.rect(0,0,2048,1280);c.clip();
  const wallpaper=c.createLinearGradient(0,0,2000,1280);wallpaper.addColorStop(0,'#d7d9ec');wallpaper.addColorStop(.55,'#e3d8de');wallpaper.addColorStop(1,'#e9d7b9');c.fillStyle=wallpaper;c.fillRect(0,0,2048,1280);
  c.fillStyle='#bac6c240';c.beginPath();c.moveTo(0,920);c.bezierCurveTo(550,460,1100,1370,2048,650);c.lineTo(2048,1280);c.lineTo(0,1280);c.fill();
  c.fillStyle='#ffffff50';c.fillRect(0,0,2048,46);
  label(c,'●   Notes    File    Edit    View    Window    Help',30,31,21,'#49434f','500');
  c.textAlign='right';label(c,'Mon  10:24     ◉  ▰',2008,31,21,'#49434f');c.textAlign='left';

  // A piece of work in progress, with the companion beside it.
  c.save();c.shadowColor='#4b3d622b';c.shadowBlur=60;c.shadowOffsetY=20;panel(c,112,150,1290,940,28,'#fffaf1');c.restore();
  panel(c,112,150,1290,70,[28,28,0,0],'#f3ede4');
  for(let i=0;i<3;i++){c.fillStyle=['#e68b80','#e4bf75','#a7bc96'][i];c.beginPath();c.arc(154+i*32,184,10,0,Math.PI*2);c.fill();}
  c.textAlign='center';label(c,'Untitled. (For now.)',757,194,25,'#8b8184');c.textAlign='left';
  label(c,'NOTES TO MYSELF',210,310,26,'#9a8a92','500');
  label(c,'The thing I said',204,430,91,'#393444','400','Georgia, serif');
  label(c,'I’d finish today.',204,539,91,'#393444','400','Georgia, serif');
  c.strokeStyle='#ded5df';c.lineWidth=2;c.beginPath();c.moveTo(210,590);c.lineTo(1300,590);c.stroke();
  const items=[['Get the idea out.',690,true],['Make it make sense.',805,false],['Send it into the world.',920,false]];
  items.forEach(([text,y,done],i)=>{
    c.strokeStyle=i===1?'#8c7bb7':'#d3cbd3';c.lineWidth=3;c.fillStyle=done?'#a8b9a0':'#fffaf1';c.beginPath();c.arc(236,y-14,20,0,Math.PI*2);c.fill();c.stroke();
    if(done){c.strokeStyle='#fffaf1';c.lineWidth=4;c.lineCap='round';c.lineJoin='round';c.beginPath();c.moveTo(226,y-14);c.lineTo(233,y-7);c.lineTo(247,y-23);c.stroke();}
    if(i===1){c.fillStyle='#8c7bb7';c.beginPath();c.arc(236,y-14,7,0,Math.PI*2);c.fill();}
    label(c,text,287,y,43,done?'#aaa1a7':i===1?'#605076':'#9d929c',i===1?'500':'400');
  });
  label(c,'Messy first drafts are allowed.',210,1031,30,'#a18e9b','italic','Georgia, serif');
  c.strokeStyle='#c7acd0';c.lineWidth=3;c.beginPath();c.moveTo(211,1045);c.quadraticCurveTo(411,1037,605,1045);c.stroke();

  // Meoz's familiar avatar → Goal → Status stack, with a small coworker joke.
  c.save();c.shadowColor='#54466c18';c.shadowBlur=32;c.shadowOffsetY=8;panel(c,1450,180,505,148,25,'#fffaff');c.restore();
  c.fillStyle='#fffaff';c.beginPath();c.moveTo(1678,325);c.lineTo(1710,353);c.lineTo(1740,325);c.closePath();c.fill();
  label(c,'You write.',1493,238,36,'#625170','500');label(c,'I’ll watch the tabs.',1493,288,36,'#625170','500');
  meozIcon(c,1545,376,320);
  c.textAlign='center';label(c,'meoz',1705,754,61,'#665373','600');c.textAlign='left';
  panel(c,1450,800,505,103,22,'#fcf9ffef');
  label(c,'Goal: Finish the first draft',1480,861,31,'#5f516d','500');
  panel(c,1450,924,505,160,22,'#fcf9ffef');
  c.fillStyle='#9aac89';c.beginPath();c.arc(1488,966,6,0,Math.PI*2);c.fill();
  label(c,'Flex Session · Focus',1508,976,28,'#7e7486');
  label(c,'24:38',1480,1052,65,'#655274','500');label(c,'until a little break',1675,1048,23,'#a294a9');

  // Dock: the app is simply part of an ordinary desktop.
  panel(c,631,1169,787,82,24,'#fffaff60');
  for(let i=0;i<11;i++){
    if(i===7)meozIcon(c,650+i*68,1180,58);
    else panel(c,654+i*68,1184,50,50,12,['#88a8bb','#e7bb87','#b5c4a5','#c6cbd5','#b8a0c8','#e5cfa5'][i%6]);
  }
  c.restore();
}
