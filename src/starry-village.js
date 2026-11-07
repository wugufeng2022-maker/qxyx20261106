import * as THREE from 'three';
import {centerAt,gradeSpeed,groundAt,heightAt,roadSurface,rng,tangentAt} from './route.js';
import {createRider} from './rider.js';

// Another painting theme beside the lakeside impressionist study.
// The ride stays on the real wheat-field centerline: the milky road is a
// resurfacing of the path under the wheels, not a second level or a teleport.
// Geometry, stars and the easel study are original procedural drawings.
// No external image is sampled. Reference authorship and licence are unknown.
export const STARRY=Object.freeze({
  sight:4314,
  promptStart:4314,
  promptEnd:4388,
  easel:4336,
  revealStart:4420,
  revealEnd:4490,
  releaseStart:4810,
  releaseEnd:4885,
  farewell:4848,
  end:4892,
  bikeLane:4.55,
  easelLane:3.28,
});
export const STARRY_LIGHT=Object.freeze({
  background:'#07111f',
  ambient:'#c5d2ea',
  ground:'#5c516e',
  moon:'#ffe39a',
  ambientLevel:1.5,
  sunLevel:1.7,
  exposure:.9,
  fogNear:14,
  fogFar:58,
});
const smooth=(a,b,x)=>{if(!(b>a))return x>=b?1:0;const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
const NIGHT=new THREE.Color(STARRY_LIGHT.background);

export function createStarryEvent(){return {status:'unseen',entryAt:0,leaveAt:0,time:0,fade:0,attention:false,entered:false,leftEarly:false,journal:false};}
export function canEnterStarry(e,distance){return !!e&&e.status==='available'&&distance>=STARRY.promptStart&&distance<=STARRY.promptEnd;}
export function enterStarry(e,distance){if(!canEnterStarry(e,distance))return false;e.status='active';e.entered=true;e.entryAt=distance;e.time=0;e.fade=0;e.leftEarly=false;e.journal=false;return true;}
export function skipStarry(e){if(!e||e.status!=='available')return false;e.status='skipped';e.attention=false;return true;}
export function leaveStarry(e,distance){if(!e||!['active','farewell'].includes(e.status))return false;e.status='departing';e.leftEarly=true;e.leaveAt=distance;e.time=0;e.fade=0;return true;}
function syncAttention(e,distance){
  e.attention=(e.status==='available'&&distance>=STARRY.promptStart&&distance<=STARRY.promptEnd)
    ||e.status==='active'||e.status==='departing'||(e.status==='farewell'&&e.time<4.5);
}
export function updateStarry(e,{started,paused,distance,dt}){
  if(!e||!started||paused)return;
  if(e.status==='unseen')e.status=distance>STARRY.promptEnd?'skipped':distance>=STARRY.sight?'available':'unseen';
  else if(e.status==='available'&&distance>STARRY.promptEnd)e.status='skipped';
  else if(e.status==='active'&&distance>=STARRY.farewell){e.status='farewell';e.time=0;}
  else if(e.status==='farewell'){e.time+=dt;if(e.time>=4.5||distance>STARRY.end+12){e.status='done';e.journal=!!e.entered;}}
  else if(e.status==='departing'){e.time+=dt;e.fade=Math.min(1,Math.max(e.time/2.4,(distance-(e.leaveAt??distance))/36));if(e.fade>=1)e.status='done';}
  syncAttention(e,distance);
}
export function starryView(e,distance){
  const zero={connect:0,distant:0,village:0};
  if(!e||!['active','farewell','departing'].includes(e.status))return zero;
  if(!(e.entryAt>=STARRY.sight-80))return zero;
  const fade=e.status==='departing'?1-(e.fade||0):1;
  const entry=e.entryAt,release=1-smooth(STARRY.releaseStart,STARRY.releaseEnd,distance);
  const connect=smooth(entry,entry+22,distance)*release*fade;
  const distant=smooth(entry+16,entry+64,distance)*release*fade;
  const villageStart=Math.max(STARRY.revealStart,entry+38);
  const village=smooth(villageStart,Math.max(STARRY.revealEnd,villageStart+70),distance)*release*fade;
  return {connect,distant,village};
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
export function starryFigureOpacity(e,distance,view){
  if(starryFigurePose(e,distance).exit)return smooth(STARRY.releaseStart,STARRY.releaseStart+36,distance);
  if(['unseen','available','skipped'].includes(e?.status))return 1;
  if(e?.status==='active')return 1-Math.min(1,view?.village||0);
  return 0;
}
export function starryVillageSeconds(step=2){
  let time=0;
  for(let s=STARRY.revealEnd;s<STARRY.releaseStart;s+=step)time+=step/Math.max(.2,gradeSpeed(5,s)*roadSurface(s,0).speedFactor);
  return time;
}
export function starryBendCount(){
  let prev=0,count=0;
  for(let s=STARRY.revealEnd;s<=STARRY.releaseStart;s+=1){
    const turn=tangentAt(s+.5)-tangentAt(s-.5),sign=Math.sign(turn);
    if(prev&&sign&&sign!==prev)count++;
    if(sign)prev=sign;
  }
  return count;
}
export function starryRoadSpan(){
  let min=Infinity,max=-Infinity;
  for(let s=STARRY.revealEnd;s<=STARRY.releaseStart;s+=5){const x=centerAt(s);min=Math.min(min,x);max=Math.max(max,x);}
  return max-min;
}

const FADE_NAME=/^(Golden wheat fields|Gathered hay rolls|Plants · BirchTree_|Plants · Grass_|Plants · Flower_|Plants · Meadow)/;
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
  g.fillStyle='#10203f';g.fillRect(0,0,w,h);
  g.fillStyle='#ffe39a';g.beginPath();g.arc(w*.28,h*.16,w*.1,0,Math.PI*2);g.fill();
  g.fillStyle='#f4f1e6';g.beginPath();g.moveTo(w*.5,h*.98);g.bezierCurveTo(w*.82,h*.72,w*.18,h*.58,w*.55,h*.4);g.bezierCurveTo(w*.86,h*.26,w*.28,h*.22,w*.48,h*.12);g.lineTo(w*.42,h*.12);g.bezierCurveTo(w*.18,h*.24,w*.7,h*.3,w*.42,h*.46);g.bezierCurveTo(w*.08,h*.66,w*.62,h*.78,w*.42,h*.98);g.fill();
  const homes=[['#e39a62',.22,.62],['#f0c24a',.38,.58],['#e7a0b0',.58,.6],['#8f9eb0',.72,.64]];
  for(const [color,x,y] of homes){g.fillStyle=color;g.fillRect(w*x,h*y,w*.1,h*.08);g.fillStyle='#f7f4ee';g.beginPath();g.moveTo(w*x-w*.01,h*y);g.lineTo(w*x+w*.05,h*y-h*.05);g.lineTo(w*x+w*.11,h*y);g.fill();}
  g.strokeStyle='#16130f';g.lineWidth=2;g.strokeRect(1,1,w-2,h-2);
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
  const rand=rng(77);
  const roadMat=track(new THREE.MeshStandardMaterial({color:'#f4f1e6',vertexColors:true,roughness:1,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-2}));
  const brickMat=track(new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-4}));
  const stoneMat=track(new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1}));
  const outlineMat=track(new THREE.MeshBasicMaterial({color:'#161311',side:THREE.BackSide}));
  const positions=[],indices=[],colors=[];
  const roadFrom=STARRY.promptStart-8,roadTo=STARRY.end+6,roadStep=2,across=8,half=2.55;
  for(let s=roadFrom,row=0;s<=roadTo;s+=roadStep,row++){
    for(let i=0;i<=across;i++){
      const lane=THREE.MathUtils.lerp(-half,half,i/across),frame=starryRoadFrame(s,lane);
      const shade=.94+.06*Math.sin(s*.07+i);colors.push(shade,shade*.985,shade*.94);
      positions.push(frame.x,Math.max(heightAt(s)+.028,groundAt(frame.x,s)+.02),frame.z);
      if(i<across&&s+roadStep<=roadTo){const a=row*(across+1)+i,b=a+across+1;indices.push(a,a+1,b,a+1,b+1,b);}
    }
  }
  const roadGeo=keep(new THREE.BufferGeometry());
  roadGeo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  roadGeo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  roadGeo.setIndex(indices);roadGeo.computeVertexNormals();
  const road=new THREE.Mesh(roadGeo,roadMat);road.name='Milky painted road';road.receiveShadow=true;group.add(road);
  const skirtMat=track(new THREE.MeshStandardMaterial({color:'#d4cdc0',roughness:1,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));
  const skirtPos=[],skirtIndex=[];
  for(let s=STARRY.revealStart-12,row=0;s<=STARRY.releaseStart+12;s+=roadStep,row++){
    for(const lane of [-5.6,5.6]){const frame=starryRoadFrame(s,lane);skirtPos.push(frame.x,Math.max(heightAt(s)+.018,groundAt(frame.x,s)+.012),frame.z);}
    if(s+roadStep<=STARRY.releaseStart+12){const a=row*2;skirtIndex.push(a,a+1,a+2,a+1,a+3,a+2);}
  }
  const skirtGeo=keep(new THREE.BufferGeometry());
  skirtGeo.setAttribute('position',new THREE.Float32BufferAttribute(skirtPos,3));skirtGeo.setIndex(skirtIndex);skirtGeo.computeVertexNormals();
  const skirt=new THREE.Mesh(skirtGeo,skirtMat);skirt.name='Milky verge';group.add(skirt);
  const brickColors=['#c9847a','#d7b56a','#7f9bb8','#e3b0bc','#8aab96','#efe6d4'].map(c=>new THREE.Color(c));
  const brickSpots=[];
  for(let s=STARRY.revealStart,n=0;s<=STARRY.releaseStart;s+=.52,n++){
    if(n%6===5)continue;
    const frame=starryRoadFrame(s,0);
    brickSpots.push({x:frame.x,y:heightAt(s)+.055,z:frame.z,yaw:frame.yaw,color:brickColors[n%brickColors.length]});
  }
  const brickGeo=keep(new THREE.BoxGeometry(1,1,1)),dummy=new THREE.Object3D(),tint=new THREE.Color();
  const bricks=new THREE.InstancedMesh(brickGeo,brickMat,brickSpots.length);bricks.name='Painted brick center';
  brickSpots.forEach((spot,i)=>{dummy.position.set(spot.x,spot.y,spot.z);dummy.rotation.set(0,spot.yaw,0);dummy.scale.set(.42,.045,.62);dummy.updateMatrix();bricks.setMatrixAt(i,dummy.matrix);bricks.setColorAt(i,tint.set(spot.color));});
  bricks.instanceColor.needsUpdate=true;group.add(bricks);
  const stoneSpots=[];
  for(let s=STARRY.revealStart+4;s<=STARRY.releaseStart-4;s+=.55)for(const side of [-1,1])for(const layer of [0,1]){
    const lane=side*(3.05+layer*.22+(rand()-.5)*.08),frame=starryRoadFrame(s,lane),radius=layer?.16+.04*rand():.22+.05*rand();
    const y=groundAt(frame.x,s)+layer*.28-radius*.2;
    stoneSpots.push({x:frame.x,y:y+radius,z:frame.z,r:radius,s,lane,color:['#e07a62','#f0c14a','#f2a3b8','#8ea4b8','#d9d3c7','#7faf9a','#e6b07a'][(stoneSpots.length)%7]});
  }
  const stoneGeo=keep(new THREE.SphereGeometry(1,10,8));
  const stones=new THREE.InstancedMesh(stoneGeo,stoneMat,stoneSpots.length),outlines=new THREE.InstancedMesh(stoneGeo,outlineMat,stoneSpots.length);
  stones.name='Colored pebble wall';outlines.name='Pebble ink outline';outlines.renderOrder=1;stones.renderOrder=2;
  stoneSpots.forEach((spot,i)=>{
    dummy.position.set(spot.x,spot.y,spot.z);dummy.scale.setScalar(spot.r);dummy.rotation.set(0,spot.s*.2,0);dummy.updateMatrix();stones.setMatrixAt(i,dummy.matrix);stones.setColorAt(i,tint.set(spot.color));
    dummy.scale.setScalar(spot.r*1.06);dummy.updateMatrix();outlines.setMatrixAt(i,dummy.matrix);
  });
  stones.instanceColor.needsUpdate=true;group.add(outlines,stones);
  const wallMat=track(new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1})),roofMat=track(new THREE.MeshStandardMaterial({color:'#f7f4ee',roughness:1})),trimMat=track(new THREE.MeshBasicMaterial({color:'#1a1614',side:THREE.BackSide})),windowMat=track(new THREE.MeshStandardMaterial({color:'#f3d7a1',roughness:1}));
  const box=keep(new THREE.BoxGeometry(1,1,1)),houses=[],houseWalls=[];
  const village=new THREE.Group();village.name='Painted cottages';group.add(village);
  for(let i=0;i<12;i++){
    const s=STARRY.revealStart+28+(STARRY.releaseStart-STARRY.revealStart-56)*(i/11),side=i%2?1:-1;
    const lane=side*(7.5+rand()*1.6),frame=starryRoadFrame(s,lane),w=2.3+rand()*1.4,d=2+rand()*.8,h=1.7+rand()*1.15;
    const wall=wallMat.clone();wall.color.set(['#e39a62','#f0c24a','#e7a0b0','#8f9eb0','#d98a6a','#e6b07a'][i%6]);track(wall);houseWalls.push(wall);
    const home=new THREE.Group();home.position.set(frame.x,groundAt(frame.x,s),frame.z);home.rotation.y=frame.yaw+rand()*.4;
    const body=new THREE.Mesh(box,wall);body.scale.set(w,h,d);body.position.y=h*.5;body.castShadow=true;body.receiveShadow=true;
    const ink=body.clone();ink.material=trimMat;ink.scale.multiplyScalar(1.045);ink.castShadow=false;
    const roof=new THREE.Mesh(box,roofMat);roof.scale.set(w*1.12,.28,d*1.16);roof.position.y=h+.16;roof.rotation.z=side*.18;roof.castShadow=true;
    const win=new THREE.Mesh(box,windowMat);win.scale.set(.42,.46,.06);win.position.set(0,h*.48,d*.5+.02);
    const winBack=win.clone();winBack.position.z=-d*.5-.02;
    home.add(ink,body,roof,win,winBack);village.add(home);houses.push({s,lane,x:frame.x,z:frame.z});
  }
  const trunkMat=track(new THREE.MeshBasicMaterial({color:'#14110e'})),twigMat=track(new THREE.MeshBasicMaterial({color:'#f7f4ea'}));
  const trunkGeo=keep(new THREE.CylinderGeometry(.5,.62,1,5)),trees=new THREE.Group();trees.name='Leafless ink trees';group.add(trees);
  const treeSpots=[];
  for(let i=0;i<16;i++){
    const s=STARRY.revealStart+18+(STARRY.releaseStart-STARRY.revealStart-36)*(i/15),side=i%2?-1:1;
    if(houses.some(home=>Math.abs(home.s-s)<6&&Math.sign(home.lane)===side))continue;
    const lane=side*(5.2+rand()*1.5),frame=starryRoadFrame(s,lane),h=2.4+rand()*1.4;
    const tree=new THREE.Group();tree.position.set(frame.x,groundAt(frame.x,s),frame.z);
    const trunk=new THREE.Mesh(trunkGeo,trunkMat);trunk.scale.set(.05,h,.05);trunk.position.y=h*.5;tree.add(trunk);
    for(let n=0;n<3;n++){
      const twig=new THREE.Mesh(trunkGeo,twigMat),reach=.28+rand()*.22,lean=(n-1)*.7;
      twig.scale.set(.02,reach,.02);twig.position.set(Math.sin(lean)*.08,h*.78,0);twig.rotation.z=lean*.4;tree.add(twig);
    }
    trees.add(tree);treeSpots.push({s,lane,x:frame.x,z:frame.z});
  }
  const domeMat=track(new THREE.MeshBasicMaterial({color:'#091428',side:THREE.BackSide,fog:false,transparent:true,depthWrite:false}));
  const dome=new THREE.Mesh(keep(new THREE.SphereGeometry(150,28,18)),domeMat);dome.name='Hand-painted night sky';
  const starGeo=keep(new THREE.SphereGeometry(1,6,5)),starMat=track(new THREE.MeshBasicMaterial({color:'#fff6e4',fog:false,transparent:true,depthWrite:false}));
  const starCount=180,stars=new THREE.InstancedMesh(starGeo,starMat,starCount);stars.name='Night stars';
  for(let i=0;i<starCount;i++){
    const across=(rand()-.35)*1.7,ahead=.15+rand()*.55,up=.4+rand()*.9,radius=110,size=.16+rand()*.18;
    const len=Math.hypot(across,ahead,up);
    dummy.position.set(-across/len*radius,up/len*radius,-ahead/len*radius);
    dummy.scale.setScalar(size);dummy.updateMatrix();stars.setMatrixAt(i,dummy.matrix);
    stars.setColorAt(i,tint.set(['#fff4d2','#f7d7e4','#d5e4ff','#fffaf0'][i%4]));
  }
  stars.instanceColor.needsUpdate=true;dome.add(stars);
  const moon=new THREE.Mesh(keep(new THREE.SphereGeometry(2.2,24,18)),track(new THREE.MeshBasicMaterial({color:STARRY_LIGHT.moon,fog:false,transparent:true,depthWrite:false})));
  moon.name='Yellow moon';moon.position.set(-9,9,-30);dome.add(moon);
  group.add(dome);
  const villageMaterials=[brickMat,stoneMat,outlineMat,skirtMat,...houseWalls,roofMat,trimMat,windowMat,trunkMat,twigMat];
  const villageObjects=[bricks,stones,outlines,skirt,village,trees];
  group.userData.samples={stones:stoneSpots,houses,trees:treeSpots,texture:'procedural-sky'};
  group.visible=false;
  return {group,road,dome,update(view,anchor,chunks){
    const show=view.connect>.002||view.distant>.002||view.village>.002;
    group.visible=show;
    applyFade([roadMat],[road],view.connect);
    applyFade(villageMaterials,villageObjects,view.village);
    dome.visible=view.distant>.002;domeMat.opacity=view.distant;moon.material.opacity=view.distant;
    stars.visible=view.distant>.02;starMat.opacity=view.distant;
    if(anchor){const frame=starryRoadFrame(anchor.s,0);dome.position.set(frame.x,anchor.y+2,frame.z);dome.rotation.y=Math.atan2(-frame.fx,-frame.fz);}
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
  if(weight<=0){if(cloud.opacity!==1||cloud.transparent){cloud.opacity=1;cloud.transparent=false;}}
  else{cloud.transparent=true;cloud.opacity=1-weight*.97;}
  sky.group.traverse(obj=>{
    if(!obj.isMesh||!/horizon|ridges|hills/i.test(obj.name||''))return;
    obj.material.color.set('#ffffff').lerp(NIGHT,weight);
  });
}
