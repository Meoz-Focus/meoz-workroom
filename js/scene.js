// Copyright 2026 Meoz-Focus contributors
// SPDX-License-Identifier: Apache-2.0
// Source: https://github.com/Meoz-Focus/meoz-workroom

import {Geometry,add,sub,mul,norm,mix,random,smoothMin,sdEllipsoid,sdCapsule} from './geometry.js';
import {createCat} from './cat.js';
import {createBackdrop} from './backdrop.js';
import {createNail} from './nails.js';
import {drawScreen} from './screen.js';
import {createLidTransform} from './laptop.js';
import {createWatch} from './watch.js';
import {createMug} from './mug.js';

export const MATERIALS=[
  [.48,.265,.125, 0, .38,0,0,0], // 0 oak
  [.56,.59,.63, 1, .26,1,0,0], // 1 bead blasted aluminum
  [.011,.013,.019, 2, .30,0,0,0], // 2 black enclosure
  [.018,.02,.025, 3, .38,0,0,0], // 3 textured key
  [1,1,1, 4, .38,0,0,0], // 4 atlas keyboard
  [1,1,1, 5, .15,0,1.4,0], // 5 emissive display
  [.57,.285,.18, 6, .49,0,0,.22], // 6 skin
  [.65,.36,.275, 7, .32,0,0,.14], // 7 natural pink keratin
  [.55,.71,.99, 8, .82,0,0,.25], // 8 bright pastel Meoz blue velvet
  [.73,.83,1.0, 8, .86,0,0,.25], // 9 pale mitten paws
  [.84,.47,.56, 10, .72,0,0,.2], // 10 soft rose ears and nose
  [.065,.060,.12, 11, .28,0,0,0], // 11 soft lavender charcoal inset eyes
  [.13,.18,.29, 12, .13,0,0,0], // 12 eye rim
  [.70,.67,.55, 13, .22,0,0,0], // 13 ceramic
  [.042,.015,.007, 14, .13,0,0,0], // 14 coffee
  [.64,.40,.14, 15, .26,.8,0,0], // 15 brass
  [.65,.64,.57, 16, .95,0,0,0], // 16 knitted sleeves
  [.15,.25,.105, 17, .6,0,0,.2], // 17 leaves
  [.56,.50,.41, 18, .9,0,0,0], // 18 wall
  [.14,.21,.19, 19, .8,0,0,0], // 19 book cover
  [.72,.66,.52, 20, .8,0,0,0], // 20 pages
  [.28,.18,.14, 21, .4,0,0,0], // 21 mouth
  [.24,.30,.48, 22, .7,0,0,0], // 22 delicate lavender whiskers
  [.05,.05,.06, 23, .55,0,0,0], // 23 desk mat
  [.90,.94,1.0, 24, .08,0,0,0], // 24 reflected window catchlights
  [.31,.15,.095, 25, .65,0,0,0], // 25 fine skin creases
  [.10,.065,.045, 26, .7,0,0,0], // 26 arm hair
  [.18,.23,.48, 21, .65,0,0,0], // 27 Meoz's clear little lavender w smile
  [.69,.72,.76, 1, .29,1,0,0], // 28 brushed silver watch and outer links
  [.79,.82,.86, 1, .12,1,0,0], // 29 polished steel bezel and centre links
  [.018,.033,.043, 30, .23,.22,0,0], // 30 midnight blue dial
  [.77,.81,.79, 31, .22,.50,0,0], // 31 applied hour markers and hands
  [.10,.24,.36, 32, .18,1,0,0], // 32 blued steel seconds hand
];

export function makeAtlas(){
  const c=document.createElement('canvas');c.width=c.height=2048;const x=c.getContext('2d');
  drawScreen(x);
  // Six rows of keyboard legends. Each is an actual texture-mapped key.
  const rows=[['esc','☀','☀','▣','⌕','♩','◀','▶','▶','◖','◖','◗','⌁','◉'],['~','1','2','3','4','5','6','7','8','9','0','−','=','delete'],['tab','Q','W','E','R','T','Y','U','I','O','P','[',']','\\'],['caps lock','A','S','D','F','G','H','J','K','L',';',"'",'return'],['shift','Z','X','C','V','B','N','M',',','.','/','shift'],['fn','control','option','command','','command','option','◀','▲','▼','▶']];
  x.fillStyle='#17191f';x.fillRect(0,1280,2048,768);rows.forEach((row,r)=>row.forEach((key,i)=>{x.fillStyle='#e3e0d8';x.textAlign='center';x.font=`${key.length>2?15:29}px -apple-system,sans-serif`;x.fillText(key,i*128+64,1280+r*128+75);if(r===1&&i>0&&i<11){x.font='16px sans-serif';x.fillText(['!','@','#','$','%','^','&','*','(',')'][i-1],i*128+64,1280+r*128+35);}}));
  return {canvas:c,rows};
}

export async function createScene(onProgress=()=>{}){
  const g=new Geometry(),rand=random(72),yieldUI=()=>new Promise(r=>setTimeout(r,0));
  onProgress('Getting your desk ready…',.12);
  // A large oak tabletop, with real thickness, not an infinite ground.
  g.box([0,-.20,0],[80,.40,80],.07,0,8);
  g.box([-.35,.018,.23],[5.15,.035,3.8],.14,23,8);
  // MacBook Pro 16: physical 35.57 × 24.81 × 1.68 cm proportions.
  const lx=-.55;
  g.box([lx,.135,0],[3.557,.168,2.481],.065,1,12);
  g.box([lx,.223,-.46],[2.97,.012,1.38],.065,2,8);
  // Trackpad: separate glass surface and a hairline machined rim.
  g.box([lx,.223,.722],[1.61,.008,.77],.045,2,8);
  g.box([lx,.227,.722],[1.594,.009,.754],.041,1,8);
  // Finger notch at front lip, rubber feet, and charging connector.
  g.box([lx,.19,1.23],[.45,.028,.025],.01,2,4);
  for(const x of [-1.52,1.52])for(const z of [-1.02,1.02])g.ellipsoid([lx+x,.045,z],[.10,.028,.10],2,20,10);
  for(let i=0;i<3;i++)g.box([lx-1.779,.13,-.83+i*.18],[.008,.044,.115],.015,2,4);
  g.box([lx+1.779,.13,-.85],[.009,.037,.17],.008,2,4);
  const atlas=makeAtlas();
  const keyWidths=[null,null,null,null,null,[.19,.24,.24,.32,1.12,.32,.24,.16,.16,.16,.16]];
  atlas.rows.forEach((row,r)=>{
    const gap=.026,available=2.84,rowWidth=keyWidths[r]||row.map((_,i)=>r===0?.177:(i===0||i===row.length-1?(r===4?.36:.255):.177));
    let widths=Array.isArray(rowWidth)?rowWidth:[];const total=widths.reduce((a,b)=>a+b,0)+gap*(row.length-1),scale=available/total;let xpos=lx-available/2;
    row.forEach((_,i)=>{const w=widths[i]*scale,z=-.995+r*.208,h=r===0?.14:.177;g.box([xpos+w/2,.245,z],[w,.035,h],.018,3,4);
      const yy=.264;g.quad([xpos+.014,yy,z+h/2-.012],[xpos+w-.014,yy,z+h/2-.012],[xpos+w-.014,yy,z-h/2+.012],[xpos+.014,yy,z-h/2+.012],4,[0,1,0],[[i/16,(1280+(r+1)*128)/2048],[(i+1)/16,(1280+(r+1)*128)/2048],[(i+1)/16,(1280+r*128)/2048],[i/16,(1280+r*128)/2048]]);xpos+=w+gap*scale;});
  });
  // Perforated speaker grilles, individually machined holes.
  for(const side of [-1,1])for(let i=0;i<6;i++)for(let j=0;j<42;j++)g.ellipsoid([lx+side*(1.523+i*.023),.224,-1.02+j*.031],[.005,.0016,.005],2,5,3);
  // A 102° opening, constrained to 95–110° for every attached lid component.
  const lid=createLidTransform([lx,.225,-1.16]);
  g.box([0,1.105,0],[3.557,2.22,.045],.055,1,12,lid);
  g.box([0,1.105,.026],[3.48,2.145,.014],.035,2,8,lid);
  const a=lid([-1.70,.065,.036]),b=lid([1.70,.065,.036]),c=lid([1.70,2.14,.036]),d=lid([-1.70,2.14,.036]);
  g.quad(a,b,c,d,5,lid([0,0,1],true),[[0,1280/2048],[1,1280/2048],[1,0],[0,0]]);
  g.box([0,2.105,.042],[.37,.081,.009],.019,2,5,lid);g.ellipsoid([0,2.102,.049],[.012,.012,.006],11,16,8,lid);
  // Keyboard hinge barrel.
  g.tube([[lx-1.45,.21,-1.16],[lx+1.45,.21,-1.16]],[.045,.045],2,16);
  await yieldUI();onProgress('Making room for a good idea…',.28);

  // Blended implicit anatomy: metacarpal volume, thenar eminence, wrist,
  // tapered phalanges and joint bulges. Nails are separate keratin shells.
  for(const side of [-1,1]){
    const cx=lx+side*.79,origin=[cx,.46,.70],mirror=p=>[cx+side*p[0],p[1],p[2]];
    const fingers=[];
    const bases=[[-.25,.49,.40],[-.085,.51,.34],[.09,.50,.37],[.25,.46,.46]];
    const lengths=[.61,.72,.66,.51];
    for(let i=0;i<4;i++){
      const [x,y,z]=bases[i],len=lengths[i],a=[x,y,z],b=[x+(i-1.5)*.018,y+.105,z-len*.42],c=[x+(i-1.5)*.026,y-.035,z-len*.76],d=[x+(i-1.5)*.03,.301,z-len];fingers.push([a,b,c,d]);
    }
    const thumb=[[-.29,.42,.72],[-.43,.39,.54],[-.51,.33,.30],[-.52,.30,.18]];fingers.push(thumb);
    const sdfWorld=p=>{
      const q=[(p[0]-cx)*side,p[1],p[2]];
      let d=sdEllipsoid(q,[0,.445,.70],[.345,.153,.40]);
      d=smoothMin(d,sdEllipsoid(q,[-.19,.40,.78],[.23,.16,.30]),.10);
      d=smoothMin(d,sdCapsule(q,[.04,.405,.98],[.20,.37,1.72],.205,.265),.12);
      d=smoothMin(d,sdCapsule(q,[.20,.37,1.68],[.41,.30,2.85],.265,.355),.10);
      for(let i=0;i<fingers.length;i++){const f=fingers[i],r=i===4?.099:.077-i*.004;let fd=sdCapsule(q,f[0],f[1],r*1.04,r);fd=smoothMin(fd,sdCapsule(q,f[1],f[2],r,r*.84),.035);fd=smoothMin(fd,sdCapsule(q,f[2],f[3],r*.84,r*.72),.026);d=smoothMin(d,fd,.055);}
      return d;
    };
    const handStart=g.triangles.length;
    g.implicit(sdfWorld,[cx-.74,.08,-.48],[cx+.74,.8,2.91],.028,6);
    const handSkin=g.triangles.slice(handStart);
    const projectSkin=p=>{const e=.001,n=norm([sdfWorld(add(p,[e,0,0]))-sdfWorld(add(p,[-e,0,0])),sdfWorld(add(p,[0,e,0]))-sdfWorld(add(p,[0,-e,0])),sdfWorld(add(p,[0,0,e]))-sdfWorld(add(p,[0,0,-e]))]);return {p:sub(p,mul(n,sdfWorld(p)-.0015)),n};};
    fingers.forEach((f,i)=>{
      if(!createNail(g,handSkin,{base:mirror(f[2]),tip:mirror(f[3]),
        halfWidth:i===4?.058:.046-i*.003,halfLength:[.065,.070,.066,.055,.063][i]}))
        throw new Error('Could not fit a fingernail to the hand.');
    });
    fingers.slice(0,4).forEach((f,i)=>{const r=.077-i*.004;
      for(const j of [1,2])for(let k=0;k<2;k++){
        const joint=f[j],points=Array.from({length:9},(_,a)=>{const t=(a/8-.5)*1.55;return projectSkin(mirror([joint[0]+Math.sin(t)*r*.82,joint[1]+Math.cos(t)*r*1.2,joint[2]+k*.014-.007])).p;});
        g.tube(points,points.map(()=>.0009),25,4);
      }
    });
    // Fine dorsal tendons are low-relief under the skin, gently blended in light.
    for(let i=0;i<3;i++){const x=cx+side*(-.13+i*.11);g.tube([[x,.585,.65],[x+side*.03,.552,.88],[x+side*.06,.49,1.10]],[.009,.011,.005],6,6);}
    for(let i=0;i<230;i++){
      const z=1.15+rand()*1.15,t=(z-.98)/1.87,a=rand()*Math.PI,r=.205+.15*t;
      let p=mirror([.04+.37*t+Math.cos(a)*r,.405-.105*t+Math.sin(a)*r,z]);
      const normal=norm([sdfWorld(add(p,[.001,0,0]))-sdfWorld(add(p,[-.001,0,0])),sdfWorld(add(p,[0,.001,0]))-sdfWorld(add(p,[0,-.001,0])),sdfWorld(add(p,[0,0,.001]))-sdfWorld(add(p,[0,0,-.001]))]);
      p=sub(p,mul(normal,sdfWorld(p)-.0006));
      g.tube([p,add(p,[side*.003,.006,.016]),add(p,[side*.005,.008,.030])],[.0007,.0005,.0001],26,3);
    }
    if(side===-1)createWatch(g,{center:mirror([.24,.358,1.90]),axis:[side*.21,-.07,1.17],skin:sdfWorld});
    // Loose linen cuffs and forearms enter the composition naturally.
    const armA=mirror([.31,.32,2.20]),armB=mirror([1.95,.18,12.0]);
    g.tube([armA,mix(armA,armB,.10),armB],[.355,.39,.46],16,40);
    await yieldUI();
  }
  onProgress('Waking your little companion…',.50);
  createCat(g);
  await yieldUI();onProgress('Letting the afternoon in…',.72);
  createMug(g);
  // A notebook with a brass pen.
  const notebook=p=>{const a=-.15;return [p[0]*Math.cos(a)-p[2]*Math.sin(a)-3.15,p[1],p[0]*Math.sin(a)+p[2]*Math.cos(a)-2.15];};
  g.box([0,.07,0],[1.25,.11,1.75],.035,19,5,(p,n)=>n?p:notebook(p));g.box([0,.09,0],[1.20,.065,1.68],.015,20,4,(p,n)=>n?p:notebook(p));
  g.tube([[-3.52,.164,-2.70],[-3.0,.164,-1.88]],[.029,.029],15,10);
  // A distant plant and books add depth without competing with the subject.
  g.lathe([3.9,.02,-3.45],[[0,0],[.32,0],[.43,.62],[.43,.66],[.39,.67],[.36,.10],[0,.10]],13,48);
  for(let i=0;i<13;i++){const a=i*2.399,len=.7+rand()*.6,start=[3.9,.53,-3.45],end=add(start,[Math.cos(a)*.5,len,Math.sin(a)*.5]);g.tube([start,mix(start,end,.5),end],[.014,.012,.003],17,6);
    const side=[Math.sin(a)*.15,0,-Math.cos(a)*.15],mid=mix(start,end,.75);g.tri(add(mid,side),end,sub(mid,side),17,[0,1,0],[0,1,0],[0,1,0]);g.tri(add(mid,side),sub(mid,side),mix(start,end,.35),17,[0,1,0],[0,1,0],[0,1,0]);}
  createBackdrop(g);
  return {geometry:g,atlas:atlas.canvas,display:{origin:a,right:sub(b,a),up:sub(d,a)},materials:new Float32Array(MATERIALS.flat()),stats:{hairs:g.hairCount,keys:atlas.rows.reduce((s,r)=>s+r.length,0)}};
}
