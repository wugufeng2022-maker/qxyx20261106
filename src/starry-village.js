import * as THREE from 'three';
import {centerAt,gradeSpeed,groundAt,heightAt,roadSurface,rng,tangentAt} from './route.js';
import {createRider} from './rider.js';

// A side path beside the wheat road, not a popup and not a teleport.
// The main road stays where it is. This branch leaves it, winds, and joins it again.
// Geometry, plants and the wooden sign are original procedural drawings.
// No external image is sampled. Reference authorship and licence are unknown.
export const STARRY=Object.freeze({
  sight:4318,
  promptStart:4318,
  promptEnd:4396,
  easel:4338,
  split:4356,
  revealStart:4410,
  revealEnd:4460,
  releaseStart:4628,
  releaseEnd:4676,
  farewell:4660,
  end:4704,
  bikeLane:-3.15,
  easelLane:-2.55,
  roadHalf:1.72,
  bend:7.2,
});
export const STARRY_SIGN=Object.freeze({title:'画家村',subtitle:'写生小径',note:'前方汇回主路'});
export const STARRY_LIGHT=Object.freeze({
  background:'#a394b4',
  horizon:'#f3d0b8',
  ambient:'#f6e6d4',
  ground:'#c6b48a',
  moon:'#f3e2c2',
  ambientLevel:1.85,
  sunLevel:2.15,
  exposure:1.02,
  fogNear:36,
  fogFar:128,
  blueFogFar:180,
});
const smooth=(a,b,x)=>{if(!(b>a))return x>=b?1:0;const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
const DUSK_HORIZON=new THREE.Color(STARRY_LIGHT.horizon);
const DUSK_CLOUD=new THREE.Color('#f6e0cc');
const DUSK_RIDGES={
  'Hazy far horizon':'#f6d7c2',
  'Soft blue-green ridges':'#e3c9d0',
  'Low open hills':'#d2c4ae',
};

export function createStarryEvent(){return {status:'unseen',entryAt:0,leaveAt:0,time:0,fade:0,attention:false,entered:false,leftEarly:false,journal:false};}
export function canEnterStarry(){return false;}
export function enterStarry(){return false;}
export function skipStarry(){return false;}
export function leaveStarry(){return false;}
export function updateStarry(e,{started,paused,distance,lane=0}){
  if(!e||!started||paused)return;
  const on=starryLaneGuide(distance,lane).onBranch;
  e.attention=false;
  if(on&&distance>STARRY.split+24&&distance<STARRY.releaseEnd-8){e.status='riding';e.entered=true;e.entryAt=e.entryAt||distance;}
  else if(e.entered&&distance>=STARRY.releaseEnd-4){e.status='done';e.journal=true;}
  else if(!e.entered&&distance>STARRY.releaseEnd)e.status='passed';
  else if(distance>=STARRY.sight)e.status=e.entered?'riding':'fork';
}
export function starryView(e,distance,lane=0){
  const zero={connect:0,distant:0,village:0};
  const on=starryLaneGuide(distance,lane).onBranch||(!!e?.entered&&Math.abs((lane||0)-starryBranchCenter(distance))<2.2);
  if(!on)return zero;
  const release=1-smooth(STARRY.releaseStart,STARRY.releaseEnd,distance);
  return {
    connect:smooth(STARRY.split,STARRY.split+16,distance)*release,
    distant:smooth(STARRY.split+8,STARRY.split+48,distance)*release,
    village:smooth(STARRY.split+28,STARRY.revealEnd,distance)*release,
  };
}
export function starryRoadFrame(s,lane){
  const tangent=tangentAt(s),h=Math.hypot(tangent,1),fx=tangent/h,fz=-1/h,rx=-fz,rz=fx;
  const x=centerAt(s)+rx*lane,z=-s+rz*lane;
  return {s,lane,x,y:groundAt(x,s)-.015,z,fx,fz,rx,rz,yaw:Math.atan2(1,tangent)};
}
export function starryFigurePose(e,distance){
  const exit=!!e?.entered&&!e.leftEarly&&distance>=STARRY.releaseStart&&['active','farewell','done'].includes(e.status);
  const s=exit?STARRY.farewell:STARRY.easel;
  return {exit,bike:starryRoadFrame(s-.35,STARRY.bikeLane),easel:starryRoadFrame(s+.2,STARRY.easelLane)};
}
export function starryFigureOpacity(e,distance){
  return smooth(STARRY.sight-36,STARRY.sight,distance)*(1-smooth(STARRY.split+18,STARRY.split+64,distance));
}
export function starryVillageSeconds(step=2){
  let time=0;
  for(let s=STARRY.split;s<STARRY.releaseEnd;s+=step)time+=step/Math.max(.2,gradeSpeed(5,s)*roadSurface(s,0).speedFactor);
  return time;
}
export function starryRoadSpan(){
  let min=Infinity,max=-Infinity;
  for(let s=STARRY.revealEnd;s<=STARRY.releaseStart;s+=5){const x=centerAt(s);min=Math.min(min,x);max=Math.max(max,x);}
  return max-min;
}
// Lateral center of the branch. Zero at both ends, so it leaves the main road and returns.
export function starryBranchCenter(s){
  const a=STARRY.split,b=STARRY.releaseEnd;
  if(s<=a||s>=b)return 0;
  const u=(s-a)/(b-a),env=smooth(0,.32,u)*(1-smooth(.72,1,u));
  const wave=(Math.sin(u*Math.PI*2)*1.7+Math.sin(u*Math.PI*4)*.4)*smooth(.18,.42,u);
  return -(STARRY.bend*env+wave);
}
export function starryBend(s){return starryBranchCenter(s);}
export function starryLaneGuide(s,lane=0){
  const branch=starryBranchCenter(s),half=1.42,main=1.55,gap=Math.abs(branch);
  const committed=Math.abs(lane-branch)+.4<Math.abs(lane);
  if(gap<.15)return {min:-main,max:main,onBranch:false,branch,center:0};
  if(gap<3.2)return {min:Math.min(-main,branch-half),max:main,onBranch:committed,branch,center:committed?branch:0};
  const onBranch=committed,center=onBranch?branch:0,limit=onBranch?half:main;
  return {min:center-limit,max:center+limit,onBranch,branch,center};
}
export function starryPaintedFrame(s,lane=0){return starryRoadFrame(s,lane+starryBranchCenter(s));}
export function starrySurfaceY(x,s){return Math.max(heightAt(s),groundAt(x,s));}
export function starryBendCount(){
  let prev=0,count=0;
  for(let s=STARRY.split;s<=STARRY.releaseEnd;s+=1){
    const turn=starryBend(s+1)-starryBend(s-1),sign=Math.sign(turn);
    if(prev&&sign&&sign!==prev)count++;
    if(sign)prev=sign;
  }
  return count;
}

const FADE_NAME=/^(Golden wheat fields|Gathered hay rolls|Plants · BirchTree_|Plants · Grass_|Plants · Flower_|Plants · Meadow)/;
const DUSK_GROUND=new THREE.Color('#d7c3a4');
function chunkOverlaps(index){const a=index*64,b=a+64;return b>STARRY.easel-48&&a<STARRY.end+48;}
export function fadeCountryside(chunks,amount){
  const weight=Math.max(0,Math.min(1,amount||0));
  for(const chunk of chunks||[]){
    const index=Number(chunk.name?.split('_').pop());
    if(!Number.isFinite(index)||!chunkOverlaps(index))continue;
    chunk.traverse(obj=>{
      if(!obj.isMesh||!FADE_NAME.test(obj.name||''))return;
      if(weight<=.001){
        if(obj.userData.starryBase){obj.material=obj.userData.starryBase;obj.visible=obj.userData.starryVisible!==false;if(obj.userData.starryCast!=null)obj.castShadow=obj.userData.starryCast;}
        return;
      }
      if(!obj.userData.starryMat){
        const cloneOne=m=>{const c=m.clone();c.transparent=true;c.depthWrite=false;c.opacity=1;return c;};
        obj.userData.starryBase=obj.material;
        obj.userData.starryMat=Array.isArray(obj.material)?obj.material.map(cloneOne):cloneOne(obj.material);
        obj.userData.starryVisible=obj.visible;obj.userData.starryCast=obj.castShadow;
        const owned=chunk.userData.ownedMaterials||=[];
        for(const m of [].concat(obj.userData.starryMat))owned.push(m);
      }
      obj.material=obj.userData.starryMat;obj.visible=weight<.97;obj.castShadow=weight<.5&&!!obj.userData.starryCast;
      for(const m of [].concat(obj.material)){m.opacity=1-weight;m.transparent=true;m.depthWrite=false;}
    });
    chunk.traverse(obj=>{
      if(!obj.isMesh||obj.name!=='Meadow ground')return;
      if(weight<=.001){
        if(obj.userData.starryBase){obj.material=obj.userData.starryBase;obj.visible=obj.userData.starryVisible!==false;}
        return;
      }
      if(!obj.userData.starryMat){
        const cloneOne=m=>{const c=m.clone();c.userData.starryColor=c.color.clone();return c;};
        obj.userData.starryBase=obj.material;
        obj.userData.starryMat=Array.isArray(obj.material)?obj.material.map(cloneOne):cloneOne(obj.material);
        obj.userData.starryVisible=obj.visible;
        const owned=chunk.userData.ownedMaterials||=[];
        for(const m of [].concat(obj.userData.starryMat))owned.push(m);
      }
      obj.material=obj.userData.starryMat;obj.visible=true;
      for(const m of [].concat(obj.material))m.color.copy(m.userData.starryColor).lerp(DUSK_GROUND,weight);
    });
  }
}

function canvasTexture(draw,width,height){
  if(typeof document==='undefined')return null;
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  draw(canvas.getContext('2d'),width,height);
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.anisotropy=4;
  texture.minFilter=THREE.LinearMipmapLinearFilter;
  texture.magFilter=THREE.LinearFilter;
  texture.generateMipmaps=true;
  texture.needsUpdate=true;
  return texture;
}
function paintStudy(g,w,h){
  const sky=g.createLinearGradient(0,0,0,h*.62);
  sky.addColorStop(0,'#b7a4c6');sky.addColorStop(.55,'#e7b7b4');sky.addColorStop(1,'#f6dcc4');
  g.fillStyle=sky;g.fillRect(0,0,w,h);
  g.fillStyle='#f4e6c8';g.beginPath();g.arc(w*.28,h*.18,w*.08,0,Math.PI*2);g.fill();
  g.fillStyle='#f4f1e6';g.beginPath();g.moveTo(w*.5,h*.98);g.bezierCurveTo(w*.82,h*.72,w*.18,h*.58,w*.55,h*.4);g.bezierCurveTo(w*.86,h*.26,w*.28,h*.22,w*.48,h*.12);g.lineTo(w*.42,h*.12);g.bezierCurveTo(w*.18,h*.24,w*.7,h*.3,w*.42,h*.46);g.bezierCurveTo(w*.08,h*.66,w*.62,h*.78,w*.42,h*.98);g.fill();
  const homes=[['#e39a62',.22,.62],['#f0c24a',.38,.58],['#e7a0b0',.58,.6],['#8f9eb0',.72,.64]];
  for(const [color,x,y] of homes){g.fillStyle=color;g.fillRect(w*x,h*y,w*.1,h*.08);g.fillStyle='#f7f4ee';g.beginPath();g.moveTo(w*x-w*.01,h*y);g.lineTo(w*x+w*.05,h*y-h*.05);g.lineTo(w*x+w*.11,h*y);g.fill();}
  g.strokeStyle='#6a5348';g.lineWidth=2;g.strokeRect(1,1,w-2,h-2);
}
function paintWash(g,w,h,base,washes){
  g.fillStyle=base;g.fillRect(0,0,w,h);
  g.globalAlpha=.42;
  for(const [color,x,y,rx,ry] of washes){g.fillStyle=color;g.beginPath();g.ellipse(w*x,h*y,w*rx,h*ry,0,0,Math.PI*2);g.fill();}
  g.globalAlpha=1;
}
function paintRoad(g,w,h){
  paintWash(g,w,h,'#b4b0a8',[['#a8a49d',.28,.4,.42,.32],['#c2beb6',.72,.62,.36,.26],['#9c9892',.5,.18,.22,.16]]);
  g.globalAlpha=.22;g.fillStyle='#8f8b85';
  for(let i=0;i<14;i++)g.fillRect((i*37)%w,(i*19)%h,5,2);
  g.globalAlpha=1;
}
function paintMeadow(g,w,h){
  paintWash(g,w,h,'#c9d0b4',[['#d9d4c4',.25,.4,.4,.3],['#b7c49a',.7,.55,.42,.32],['#a8b48c',.48,.78,.3,.24]]);
}
function paintSign(g,w,h){
  g.fillStyle='#b08960';g.fillRect(0,0,w,h);
  g.fillStyle='#f3ead8';g.fillRect(10,10,w-20,h-20);
  g.fillStyle='#5c4636';g.font='700 72px sans-serif';g.fillText(STARRY_SIGN.title,48,118);
  g.fillStyle='#6d5844';g.font='500 46px sans-serif';g.fillText(STARRY_SIGN.subtitle,48,186);
  g.fillStyle='#7d6a56';g.font='400 30px sans-serif';g.fillText(STARRY_SIGN.note,48,246);
}
function duskDome(radius){
  const geo=new THREE.SphereGeometry(radius,28,18),pos=geo.attributes.position,colors=new Float32Array(pos.count*3);
  const horizon=new THREE.Color('#f6dcc4'),peach=new THREE.Color('#e7b7b4'),mauve=new THREE.Color('#c9b0c8'),zenith=new THREE.Color('#a394b4'),tint=new THREE.Color();
  for(let i=0;i<pos.count;i++){
    const t=Math.max(0,Math.min(1,(pos.getY(i)/radius+.08)/1.02));
    if(t<.4)tint.copy(horizon).lerp(peach,t/.4);
    else if(t<.72)tint.copy(peach).lerp(mauve,(t-.4)/.32);
    else tint.copy(mauve).lerp(zenith,(t-.72)/.28);
    colors[i*3]=tint.r;colors[i*3+1]=tint.g;colors[i*3+2]=tint.b;
  }
  geo.setAttribute('color',new THREE.BufferAttribute(colors,3));
  return geo;
}

function applyFade(materials,objects,amount){
  const on=amount>.002,opaque=amount>.985;
  for(const material of materials){material.opacity=opaque?1:amount;material.transparent=!opaque;material.depthWrite=opaque;}
  for(const object of objects)object.visible=on;
}
export function createStarryWorld(scene){
  const group=new THREE.Group();group.name='Starry stone village';group.userData.source='original-procedural';scene.add(group);
  const geometries=[],materials=[];
  const keep=g=>{geometries.push(g);return g;},track=m=>{materials.push(m);return m;};
  const rand=rng(77),half=STARRY.roadHalf,dummy=new THREE.Object3D(),up=new THREE.Vector3(0,1,0);
  const roadMap=canvasTexture(paintRoad,128,128);
  if(roadMap){roadMap.wrapS=roadMap.wrapT=THREE.RepeatWrapping;}
  const meadowMap=canvasTexture(paintMeadow,128,128);
  if(meadowMap){meadowMap.wrapS=meadowMap.wrapT=THREE.RepeatWrapping;}
  const roadMat=track(new THREE.MeshStandardMaterial({color:'#b7b3ab',map:roadMap,vertexColors:true,roughness:.96,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-2}));
  const vergeMat=track(new THREE.MeshStandardMaterial({color:'#c5d0b2',map:meadowMap,vertexColors:true,roughness:1,side:THREE.DoubleSide}));
  const tuftMat=track(new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1}));
  const bloomMat=track(new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1}));
  const wallMat=track(new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1}));
  const roofMat=track(new THREE.MeshStandardMaterial({color:'#f7f3ea',roughness:1}));
  const trimMat=track(new THREE.MeshStandardMaterial({color:'#6d5648',roughness:1}));
  const windowMat=track(new THREE.MeshStandardMaterial({color:'#f6e2c0',roughness:1,emissive:'#f0d7b0',emissiveIntensity:.18}));
  const doorMat=track(new THREE.MeshStandardMaterial({color:'#8d5c48',roughness:1}));
  const trunkMat=track(new THREE.MeshStandardMaterial({color:'#4a4038',roughness:1}));
  const twigMat=track(new THREE.MeshStandardMaterial({color:'#f6f1e6',roughness:1}));
  const positions=[],indices=[],colors=[],uvs=[];
  const roadFrom=STARRY.split-6,roadTo=STARRY.releaseEnd+6,step=2,across=6;
  for(let s=roadFrom,row=0;s<=roadTo;s+=step,row++){
    const branch=starryBranchCenter(s);
    for(let i=0;i<=across;i++){
      const lane=branch+THREE.MathUtils.lerp(-half,half,i/across),frame=starryRoadFrame(s,lane);
      const edge=Math.abs(i/across-.5)*2,shade=.97+.03*Math.sin(s*.07+i);
      colors.push(shade*(.72+.04*edge),shade*(.70+.03*edge),shade*(.66+.02*edge));
      positions.push(frame.x,starrySurfaceY(frame.x,s)+.025,frame.z);
      uvs.push(i/across,(s-roadFrom)/10);
      if(i<across&&s+step<=roadTo){const a=row*(across+1)+i,b=a+across+1;indices.push(a,a+1,b,a+1,b+1,b);}
    }
  }
  const roadGeo=keep(new THREE.BufferGeometry());
  roadGeo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  roadGeo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  roadGeo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  roadGeo.setIndex(indices);roadGeo.computeVertexNormals();
  const road=new THREE.Mesh(roadGeo,roadMat);road.name='Painter village asphalt';road.receiveShadow=true;group.add(road);
  const vergePos=[],vergeIndex=[],vergeColor=[],vergeUv=[];
  const vergeFrom=STARRY.split-4,vergeTo=STARRY.releaseEnd+4,bands=4;
  const dust=new THREE.Color('#d2d0c4'),grass=new THREE.Color('#b7c49a'),meadow=new THREE.Color('#8fa57a');
  for(let s=vergeFrom,row=0;s<=vergeTo;s+=step,row++){
    const branch=starryBranchCenter(s),reach=Math.abs(branch)<2.6?1.1:5.4;
    for(const side of [-1,1])for(let b=0;b<=bands;b++){
      const t=b/bands;
      const lane=branch+side*(half-.02+t*reach);
      const frame=starryRoadFrame(s,lane);
      const swell=t*t*(.06+.1*Math.sin(s*.05+side));
      vergePos.push(frame.x,starrySurfaceY(frame.x,s)+.008+Math.max(0,swell),frame.z);
      const col=t<.45?dust.clone().lerp(grass,t/.45):grass.clone().lerp(meadow,(t-.45)/.55);
      const shade=.96+.04*Math.sin(s*.05+b);
      vergeColor.push(col.r*shade,col.g*shade,col.b*shade);
      vergeUv.push((side<0?0:1)+b*.2,(s-vergeFrom)/14);
    }
    if(s+step<=vergeTo){
      const stride=(bands+1)*2,a=row*stride;
      for(let side=0;side<2;side++)for(let b=0;b<bands;b++){
        const i=a+side*(bands+1)+b,j=i+stride;
        vergeIndex.push(i,i+1,j,i+1,j+1,j);
      }
    }
  }
  const vergeGeo=keep(new THREE.BufferGeometry());
  vergeGeo.setAttribute('position',new THREE.Float32BufferAttribute(vergePos,3));
  vergeGeo.setAttribute('color',new THREE.Float32BufferAttribute(vergeColor,3));
  vergeGeo.setAttribute('uv',new THREE.Float32BufferAttribute(vergeUv,2));
  vergeGeo.setIndex(vergeIndex);vergeGeo.computeVertexNormals();
  const verge=new THREE.Mesh(vergeGeo,vergeMat);verge.name='Village floor';verge.receiveShadow=true;group.add(verge);
  const box=keep(new THREE.BoxGeometry(1,1,1));
  const tuftGeo=keep(new THREE.ConeGeometry(.45,1,5));
  const plantColors=['#d7b7c2','#e6d7a4','#c9b7d4','#8eaa78','#f0e2c8','#7f9a6c'].map(c=>new THREE.Color(c));
  const tuftSpots=[],bloomSpots=[];
  for(let s=STARRY.split+10;s<=STARRY.releaseEnd-8;s+=2.8){
    const open=Math.sin(s*.11)+Math.sin(s*.027*3);
    if(open>.85)continue;
    for(const side of [-1,1]){
      if(rand()>.72)continue;
      const lane=side*(half+1.25+rand()*3.6);
      const frame=starryPaintedFrame(s+(rand()-.5)*2.4,lane);
      const h=.28+.45*rand();
      const spot={x:frame.x,y:starrySurfaceY(frame.x,s)+h*.45,z:frame.z,h,s,lane,color:plantColors[Math.floor(rand()*plantColors.length)]};
      if(rand()>.62)bloomSpots.push({...spot,h:.35+.7*rand()});
      else tuftSpots.push(spot);
    }
  }
  const tufts=new THREE.InstancedMesh(tuftGeo,tuftMat,Math.max(1,tuftSpots.length));tufts.name='Fantasy grasses';
  tuftSpots.forEach((spot,i)=>{dummy.position.set(spot.x,spot.y,spot.z);dummy.scale.set(.45+spot.h,spot.h,.45+spot.h);dummy.rotation.y=i;dummy.updateMatrix();tufts.setMatrixAt(i,dummy.matrix);tufts.setColorAt(i,spot.color);});
  if(tuftSpots.length)tufts.instanceColor.needsUpdate=true;group.add(tufts);
  const bloomGeo=keep(new THREE.SphereGeometry(.5,8,6));
  const blooms=new THREE.InstancedMesh(bloomGeo,bloomMat,Math.max(1,bloomSpots.length));blooms.name='Fantasy blooms';
  bloomSpots.forEach((spot,i)=>{dummy.position.set(spot.x,spot.y+spot.h*.2,spot.z);dummy.scale.set(spot.h,spot.h*.7,spot.h);dummy.updateMatrix();blooms.setMatrixAt(i,dummy.matrix);blooms.setColorAt(i,spot.color);});
  if(bloomSpots.length)blooms.instanceColor.needsUpdate=true;group.add(blooms);
  const village=new THREE.Group();village.name='Painted cottages';group.add(village);
  const houseWalls=[],houses=[];
  const plans=[
    {s:4518,side:-1,homes:[[4.6,2,.9],[6.1,9,.75]]},
    {s:4566,side:-1,homes:[[5.3,-4,.8]]},
  ];
  const palette=['#e39a62','#f0c24a','#e7a0b0','#8f9eb0','#d98a6a','#e6b07a'];
  function cottage(s,lane,scale){
    const frame=starryPaintedFrame(s,lane),center=starryPaintedFrame(s,0);
    const w=(2.1+rand()*.8)*scale,d=(1.7+rand()*.4)*scale,h=(1.8+rand()*.7)*scale;
    const wall=wallMat.clone();wall.color.set(palette[houses.length%palette.length]);track(wall);houseWalls.push(wall);
    const home=new THREE.Group();
    home.position.set(frame.x,heightAt(s),frame.z);
    home.rotation.y=Math.atan2(center.x-frame.x,center.z-frame.z);
    const body=new THREE.Mesh(box,wall);body.scale.set(w,h,d);body.position.y=h*.5;body.castShadow=true;body.receiveShadow=true;
    const roofL=new THREE.Mesh(box,roofMat);roofL.scale.set(w*1.16,.2,d*1.12);roofL.position.set(0,h+.12,0);
    const door=new THREE.Mesh(box,doorMat);door.scale.set(.38,.72,.05);door.position.set((rand()-.5)*.25,.4,d*.5+.03);
    const win=new THREE.Mesh(box,windowMat);win.scale.set(.36,.34,.05);win.position.set(.48,h*.62,d*.5+.03);
    const win2=win.clone();win2.position.x=-.48;
    const post=new THREE.Mesh(box,trimMat);post.scale.set(.06,h,d*1.02);post.position.set(w*.5,h*.5,0);
    const post2=post.clone();post2.position.x=-w*.5;
    home.add(body,roofL,door,win,win2,post,post2);village.add(home);
    houses.push({s,lane,x:frame.x,z:frame.z,h});
  }
  for(const plan of plans)for(const [lane,ds,scale] of plan.homes)cottage(plan.s+ds,plan.side*lane,scale);
  const trunkGeo=keep(new THREE.CylinderGeometry(.5,.7,1,6));
  const trees=new THREE.Group();trees.name='Leafless ink trees';group.add(trees);
  const treeSpots=[];
  function limb(parent,a,b,r,mat){
    const mesh=new THREE.Mesh(trunkGeo,mat),dir=new THREE.Vector3(b[0]-a[0],b[1]-a[1],b[2]-a[2]);
    const len=Math.max(.05,dir.length());
    mesh.position.set((a[0]+b[0])*.5,(a[1]+b[1])*.5,(a[2]+b[2])*.5);
    mesh.scale.set(r,len,r);mesh.quaternion.setFromUnitVectors(up,dir.multiplyScalar(1/len));parent.add(mesh);
  }
  function growTree(s,side,lane,h){
    const frame=starryPaintedFrame(s,lane);
    const tree=new THREE.Group();tree.position.set(frame.x,heightAt(s),frame.z);
    const fork=h*.58,crown=h*.95;
    limb(tree,[0,0,0],[0,fork,0],.055,trunkMat);
    const left=[side*-.15,fork,.02],right=[side*.22,fork+.05,-.04];
    limb(tree,left,[-side*.7,crown,.22],.04,trunkMat);
    limb(tree,right,[side*.75,crown-.02,-.16],.038,trunkMat);
    limb(tree,[-side*.7,crown,.22],[-side*1.05,h*1.15,.4],.022,twigMat);
    limb(tree,[-side*.7,crown,.22],[-side*.45,h*1.2,-.08],.02,twigMat);
    limb(tree,[side*.75,crown-.02,-.16],[side*1.15,h*1.1,-.3],.02,twigMat);
    limb(tree,[side*.75,crown-.02,-.16],[side*.5,h*1.22,.1],.018,twigMat);
    trees.add(tree);treeSpots.push({s,lane,x:frame.x,z:frame.z,branches:6,replaced:s<4425});
  }
  growTree(4394,-1,-4.2,3.4);growTree(4412,-1,-5.1,4.1);
  for(let i=0;i<12;i++){
    const s=STARRY.split+36+(STARRY.releaseStart-STARRY.split-70)*(i/11);
    const side=i%2?-1:1;
    if(houses.some(home=>Math.abs(home.s-s)<4.5&&Math.sign(home.lane)===side))continue;
    const lane=side*(3.6+rand()*2.1),h=2.4+rand()*2.4;
    growTree(s,side,lane,h);
  }
  const signAt=STARRY.split+24,signBranch=starryBranchCenter(signAt);
  const signFrame=starryRoadFrame(signAt,signBranch-half-.85);
  const sign=new THREE.Group();sign.name='画家村路牌';
  const signMap=canvasTexture(paintSign,512,336);
  const signBoard=new THREE.Mesh(keep(new THREE.PlaneGeometry(1.9,1.24)),track(new THREE.MeshBasicMaterial({color:signMap?'#ffffff':'#f3ead8',map:signMap,side:THREE.DoubleSide})));
  signBoard.name='Painter village sign';signBoard.position.y=1.45;
  const signPost=new THREE.Mesh(trunkGeo,trunkMat);signPost.scale.set(.1,1.7,.1);signPost.position.y=.85;
  const signArrow=new THREE.Mesh(keep(new THREE.ConeGeometry(.18,.5,4)),trunkMat);signArrow.rotation.z=Math.PI/2;signArrow.position.set(-1.15,1.45,0);
  sign.add(signPost,signBoard,signArrow);
  sign.position.set(signFrame.x,starrySurfaceY(signFrame.x,signFrame.s),signFrame.z);
  sign.rotation.y=signFrame.yaw;group.add(sign);
  const skyRig=new THREE.Group();skyRig.name='Starry sky rig';group.add(skyRig);
  const domeMat=track(new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide,fog:false,transparent:true,depthWrite:false}));
  const dome=new THREE.Mesh(keep(duskDome(150)),domeMat);dome.name='Dusk sky';skyRig.add(dome);
  const starMat=track(new THREE.MeshBasicMaterial({color:'#fff4e2',fog:false,transparent:true,depthWrite:false,opacity:0}));
  const starGeo=keep(new THREE.SphereGeometry(1,6,5));
  const stars=new THREE.InstancedMesh(starGeo,starMat,24);stars.name='Faint dusk stars';
  for(let i=0;i<24;i++){
    const across=(rand()-.5)*1.2,ahead=.45+rand()*.7,up=.55+rand()*.5,radius=90+rand()*20;
    const len=Math.hypot(across,ahead,up);
    dummy.position.set(across/len*radius,up/len*radius,-ahead/len*radius);
    dummy.scale.setScalar(.08+rand()*.08);dummy.updateMatrix();stars.setMatrixAt(i,dummy.matrix);
  }
  skyRig.add(stars);
  const moon=new THREE.Mesh(keep(new THREE.SphereGeometry(2.4,20,16)),track(new THREE.MeshBasicMaterial({color:STARRY_LIGHT.moon,fog:false,transparent:true,depthWrite:false})));
  moon.name='Dusk moon';moon.position.set(-18,14,-48);skyRig.add(moon);
  group.userData.samples={houses,trees:treeSpots,plants:tuftSpots.concat(bloomSpots),texture:'dusk-gradient-sky',roadHalf:half,clusters:plans.length,sign:{title:STARRY_SIGN.title,subtitle:STARRY_SIGN.subtitle,note:STARRY_SIGN.note,s:signAt},moon:{x:-18,y:14,z:-48},walls:0};
  group.visible=false;
  return {group,road,dome,moon,stars,sign,update(view,anchor,chunks){
    const s=anchor?.s??0,near=s>STARRY.sight-90&&s<STARRY.end+30;
    group.visible=near;
    road.visible=verge.visible=tufts.visible=blooms.visible=village.visible=trees.visible=sign.visible=near;
    roadMat.opacity=vergeMat.opacity=1;roadMat.transparent=vergeMat.transparent=false;roadMat.depthWrite=vergeMat.depthWrite=true;
    const skyOn=view.distant>.02&&near;
    dome.visible=stars.visible=moon.visible=skyOn;
    domeMat.opacity=view.distant;starMat.opacity=view.distant*.22;moon.material.opacity=view.distant*.82;
    if(anchor){
      const frame=starryRoadFrame(s,0);
      skyRig.position.set(frame.x,anchor.y,frame.z);
      skyRig.rotation.y=Math.atan2(-frame.fx,-frame.fz);
    }
    fadeCountryside(chunks,view.village);
  },dispose(){scene.remove(group);for(const g of geometries)g.dispose();for(const m of materials){m.map?.dispose();m.dispose();}}};
}

export function createStarryPainter(scene,bike){
  bike.traverse(obj=>{if(!obj.isMesh)return;const list=[].concat(obj.material).map(m=>m.clone());obj.material=Array.isArray(obj.material)?list:list[0];});
  const root=new THREE.Group();root.name='Roadside painter';scene.add(root);root.add(bike);
  const rider=createRider(bike);
  const shirt=bike.getObjectByName('Soft terracotta T-shirt'),hair=bike.getObjectByName('Hair back');
  shirt.material.color.set('#8d5b4a');hair.material.color.set('#3d342c');
  const cap=new THREE.Mesh(new THREE.SphereGeometry(1,14,8),new THREE.MeshStandardMaterial({color:'#6e7884',roughness:1}));
  cap.scale.set(.116,.042,.111);cap.position.set(-.01,.1,0);bike.getObjectByName('Young face and short hair').add(cap);
  const easel=new THREE.Group();easel.name='Roadside sketching easel';easel.scale.setScalar(1.55);scene.add(easel);
  const wood=new THREE.MeshStandardMaterial({color:'#b1a18c',roughness:1});
  for(const z of [-.28,.28]){const leg=new THREE.Mesh(new THREE.BoxGeometry(.045,1.05,.045),wood);leg.position.set(0,.52,z);leg.rotation.x=-z*.45;easel.add(leg);}
  const board=new THREE.Mesh(new THREE.BoxGeometry(.62,.84,.04),new THREE.MeshStandardMaterial({color:'#efe8d6',roughness:1}));board.position.set(0,.96,.02);easel.add(board);
  const studyTexture=canvasTexture(paintStudy,160,220);
  const study=new THREE.Mesh(new THREE.PlaneGeometry(.5,.7),new THREE.MeshBasicMaterial({color:studyTexture?'#ffffff':'#efe8d6',map:studyTexture,side:THREE.DoubleSide}));
  study.name='Easel study';study.position.set(0,.98,.05);easel.add(study);
  const owned=[];
  root.traverse(obj=>{if(obj.isMesh)for(const m of [].concat(obj.material))owned.push(m);});
  easel.traverse(obj=>{if(obj.isMesh)for(const m of [].concat(obj.material))owned.push(m);});
  let shown=-1;
  function place(obj,frame){obj.position.set(frame.x,frame.y,frame.z);obj.rotation.y=frame.yaw;}
  return {root,easel,study,update(e,distance,view,elapsed){
    const pose=starryFigurePose(e,distance),opacity=starryFigureOpacity(e,distance,view);
    place(root,pose.bike);
    easel.position.set(pose.easel.x,pose.easel.y,pose.easel.z);
    easel.rotation.set(0,Math.atan2(-pose.easel.fx,-pose.easel.fz),0);
    const visible=opacity>.02;root.visible=easel.visible=visible;
    if(visible&&Math.abs(opacity-shown)>.01){shown=opacity;for(const m of owned){m.transparent=opacity<.985;m.opacity=opacity;m.depthWrite=opacity>=.985;}}
    rider.update(0,0,elapsed,0,1,0,0);
  },dispose(){scene.remove(root);scene.remove(easel);for(const m of owned){m.map?.dispose();m.dispose();}}};
}
export function applyStarrySky(sky,distant){
  const cloud=sky.cloud.material,weight=Math.max(0,Math.min(1,distant||0));
  cloud.color.set('#faf5db').lerp(DUSK_CLOUD,weight);
  if(weight<=0){if(cloud.opacity!==1||cloud.transparent){cloud.opacity=1;cloud.transparent=false;}}
  else{cloud.transparent=true;cloud.opacity=1-weight*.2;}
  sky.group.traverse(obj=>{
    if(!obj.isMesh||!/horizon|ridges|hills/i.test(obj.name||''))return;
    obj.material.color.set('#ffffff').lerp(DUSK_HORIZON.set(DUSK_RIDGES[obj.name]||STARRY_LIGHT.horizon),weight);
  });
}
