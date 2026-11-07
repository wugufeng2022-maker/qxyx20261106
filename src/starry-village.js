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
  roadHalf:2.15,
  bend:7.6,
});
export const STARRY_LIGHT=Object.freeze({
  background:'#07111f',
  ambient:'#d5def2',
  ground:'#6a5d52',
  moon:'#ffe14a',
  ambientLevel:1.15,
  sunLevel:1.35,
  exposure:.94,
  fogNear:20,
  fogFar:72,
  blueFogFar:120,
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
export function starryRoadSpan(){
  let min=Infinity,max=-Infinity;
  for(let s=STARRY.revealEnd;s<=STARRY.releaseStart;s+=5){const x=centerAt(s);min=Math.min(min,x);max=Math.max(max,x);}
  return max-min;
}
// A rideable S added to the real lane. Zero value and slope at both ends,
// so the painted road joins the wheat road and leaves it again.
export function starryBend(s){
  const a=STARRY.revealEnd,b=STARRY.releaseStart;
  if(s<=a||s>=b)return 0;
  const u=(s-a)/(b-a),env=smooth(0,.12,u)*(1-smooth(.88,1,u));
  return STARRY.bend*env*Math.sin(u*Math.PI*3);
}
export function starryPaintedFrame(s,lane=0){return starryRoadFrame(s,lane+starryBend(s));}
export function starryBendCount(){
  let prev=0,count=0;
  for(let s=STARRY.revealEnd;s<=STARRY.releaseStart;s+=1){
    const turn=starryBend(s+1)-starryBend(s-1),sign=Math.sign(turn);
    if(prev&&sign&&sign!==prev)count++;
    if(sign)prev=sign;
  }
  return count;
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
function paintSky(g,w,h){
  const rand=rng(20261107);
  g.fillStyle='#081226';g.fillRect(0,0,w,h);
  const wash=g.createRadialGradient(w*.62,h*.58,20,w*.62,h*.58,w*.42);
  wash.addColorStop(0,'rgba(28,48,92,.85)');wash.addColorStop(1,'rgba(8,18,38,0)');
  g.fillStyle=wash;g.fillRect(0,0,w,h);
  for(let i=0;i<1600;i++){
    const t=i/1600,ang=t*Math.PI*4.4,rx=.16+.1*Math.sin(t*6.5);
    const x=w*(.58+Math.cos(ang)*rx)+ (rand()-.5)*22,y=h*(.62+Math.sin(ang)*rx*.72)+(rand()-.5)*16;
    const tone=i%5;
    g.fillStyle=`rgba(${tone===0?230:170+rand()*50|0},${tone===1?210:150+rand()*60|0},${tone===2?230:170+rand()*40|0},${.28+rand()*.55})`;
    g.beginPath();g.arc(x,y,1.15+rand()*1.35,0,Math.PI*2);g.fill();
  }
  g.fillStyle='#ffe14a';g.beginPath();g.arc(w*.3,h*.48,Math.min(w,h)*.1,0,Math.PI*2);g.fill();
  g.fillStyle='rgba(255,236,170,.4)';g.beginPath();g.arc(w*.3,h*.48,Math.min(w,h)*.15,0,Math.PI*2);g.fill();
  for(let i=0;i<420;i++){g.fillStyle=`rgba(255,246,224,${.35+rand()*.65})`;g.fillRect(rand()*w,rand()*h*.92,1.4,1.4);}
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
  const rand=rng(77),half=STARRY.roadHalf,dummy=new THREE.Object3D(),tint=new THREE.Color(),up=new THREE.Vector3(0,1,0);
  const roadMat=track(new THREE.MeshStandardMaterial({color:'#f7f2e6',vertexColors:true,roughness:1,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-2}));
  const vergeMat=track(new THREE.MeshStandardMaterial({color:'#b9b3a6',roughness:1,side:THREE.DoubleSide}));
  const brickMat=track(new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-4}));
  const stoneMat=track(new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1}));
  const wallMat=track(new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1}));
  const roofMat=track(new THREE.MeshStandardMaterial({color:'#f4f1ea',roughness:1}));
  const trimMat=track(new THREE.MeshStandardMaterial({color:'#241c18',roughness:1}));
  const windowMat=track(new THREE.MeshStandardMaterial({color:'#f3d7a1',roughness:1}));
  const doorMat=track(new THREE.MeshStandardMaterial({color:'#6a4638',roughness:1}));
  const trunkMat=track(new THREE.MeshBasicMaterial({color:'#14110e'}));
  const twigMat=track(new THREE.MeshBasicMaterial({color:'#f4f0e6'}));
  const positions=[],indices=[],colors=[];
  const roadFrom=STARRY.promptStart-8,roadTo=STARRY.end+6,step=2,across=6;
  for(let s=roadFrom,row=0;s<=roadTo;s+=step,row++){
    for(let i=0;i<=across;i++){
      const lane=THREE.MathUtils.lerp(-half,half,i/across),frame=starryPaintedFrame(s,lane);
      const shade=.97+.03*Math.sin(s*.04+i);colors.push(shade,shade*.99,shade*.94);
      positions.push(frame.x,heightAt(s)+.034,frame.z);
      if(i<across&&s+step<=roadTo){const a=row*(across+1)+i,b=a+across+1;indices.push(a,a+1,b,a+1,b+1,b);}
    }
  }
  const roadGeo=keep(new THREE.BufferGeometry());
  roadGeo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  roadGeo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  roadGeo.setIndex(indices);roadGeo.computeVertexNormals();
  const road=new THREE.Mesh(roadGeo,roadMat);road.name='Milky painted road';road.receiveShadow=true;group.add(road);
  const vergePos=[],vergeIndex=[];
  for(let s=STARRY.revealEnd-4,row=0;s<=STARRY.releaseStart+4;s+=step,row++){
    for(const side of [-1,1])for(const edge of [half+.12,9]){
      const frame=starryPaintedFrame(s,side*edge);
      vergePos.push(frame.x,Math.max(heightAt(s)+.02,groundAt(frame.x,s)+.012),frame.z);
    }
    if(s+step<=STARRY.releaseStart+4){const a=row*4;vergeIndex.push(a,a+1,a+4,a+1,a+5,a+4,a+2,a+3,a+6,a+3,a+7,a+6);}
  }
  const vergeGeo=keep(new THREE.BufferGeometry());
  vergeGeo.setAttribute('position',new THREE.Float32BufferAttribute(vergePos,3));vergeGeo.setIndex(vergeIndex);vergeGeo.computeVertexNormals();
  const verge=new THREE.Mesh(vergeGeo,vergeMat);verge.name='Village floor';verge.receiveShadow=true;group.add(verge);
  const brickColors=['#c48474','#d2ae62','#7f97b0','#e0a8b6','#86a894','#efe4d2'].map(c=>new THREE.Color(c));
  const brickSpots=[];
  for(let s=STARRY.revealEnd,n=0;s<=STARRY.releaseStart;s+=.7,n++){
    const frame=starryPaintedFrame(s,0);
    brickSpots.push({x:frame.x,y:heightAt(s)+.055,z:frame.z,yaw:Math.atan2(frame.fx,frame.fz),color:brickColors[n%brickColors.length]});
  }
  const box=keep(new THREE.BoxGeometry(1,1,1));
  const bricks=new THREE.InstancedMesh(box,brickMat,Math.max(1,brickSpots.length));bricks.name='Painted brick center';
  brickSpots.forEach((spot,i)=>{dummy.position.set(spot.x,spot.y,spot.z);dummy.rotation.set(0,spot.yaw,0);dummy.scale.set(.3,.04,.55);dummy.updateMatrix();bricks.setMatrixAt(i,dummy.matrix);bricks.setColorAt(i,tint.set(spot.color));});
  if(brickSpots.length)bricks.instanceColor.needsUpdate=true;group.add(bricks);
  const stoneColors=['#e07a62','#f0c14a','#f2a3b8','#8ea4b8','#d9d3c7','#7faf9a','#e6b07a','#c46b58'];
  const stoneSpots=[],wallTops=[];
  for(let s=STARRY.revealEnd+2;s<=STARRY.releaseStart-2;s+=.34)for(const side of [-1,1]){
    const crest=.28+.24*(.5+.5*Math.sin(s*.085+side*1.7));
    wallTops.push(crest);
    const courses=1+Math.floor(crest/.22);
    for(let course=0;course<courses;course++){
      const lane=side*(half+.72+course*.06+(rand()-.5)*.04);
      const frame=starryPaintedFrame(s+(course%2)*.16,lane);
      const radius=.2+.04*rand();
      stoneSpots.push({x:frame.x,y:Math.max(heightAt(s),groundAt(frame.x,s))+.08+course*.16,z:frame.z,r:.16,sx:.46,sy:.16,sz:.32,s,lane,color:stoneColors[(course+Math.floor(s))%stoneColors.length]});
    }
  }
  const stoneGeo=keep(new THREE.BoxGeometry(1,1,1));
  const stones=new THREE.InstancedMesh(stoneGeo,stoneMat,stoneSpots.length);stones.name='Colored pebble wall';
  stoneSpots.forEach((spot,i)=>{dummy.position.set(spot.x,spot.y,spot.z);dummy.scale.set(spot.sx,spot.sy,spot.sz);dummy.rotation.set(0,spot.s*.3,0);dummy.updateMatrix();stones.setMatrixAt(i,dummy.matrix);stones.setColorAt(i,tint.set(spot.color));});
  stones.instanceColor.needsUpdate=true;group.add(stones);
  const village=new THREE.Group();village.name='Painted cottages';group.add(village);
  const houseWalls=[],houses=[];
  const plans=[
    {s:4688,side:1,homes:[[5.2,4,1],[6.6,-6,.85],[5.8,12,.75],[7.4,8,.7]]},
    {s:4668,side:-1,homes:[[5.0,-4,1],[6.8,3,.85],[5.7,10,.7]]},
    {s:4748,side:1,homes:[[4.9,0,1.05],[6.6,7,.8],[7.8,-6,.7]]},
    {s:4588,side:-1,homes:[[5.1,2,.95],[6.9,-5,.75]]},
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
  for(let i=0;i<14;i++){
    const s=STARRY.revealEnd+12+(STARRY.releaseStart-STARRY.revealEnd-24)*(i/13);
    const side=i%2?-1:1;
    if(houses.some(home=>Math.abs(home.s-s)<4.5&&Math.sign(home.lane)===side))continue;
    const lane=side*(3.7+rand()*1.1),frame=starryPaintedFrame(s,lane),h=2.8+rand()*1.6;
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
    trees.add(tree);treeSpots.push({s,lane,x:frame.x,z:frame.z,branches:6});
  }
  const skyTexture=canvasTexture(paintSky,1024,512);
  const skyMat=track(new THREE.MeshBasicMaterial({color:skyTexture?'#ffffff':'#091428',map:skyTexture,fog:false,transparent:true,depthWrite:false,side:THREE.DoubleSide}));
  const skyRig=new THREE.Group();skyRig.name='Starry sky rig';group.add(skyRig);
  const domeMat=track(new THREE.MeshBasicMaterial({color:'#091428',side:THREE.BackSide,fog:false,transparent:true,depthWrite:false}));
  const dome=new THREE.Mesh(keep(new THREE.SphereGeometry(120,20,12)),domeMat);dome.name='Night fill';skyRig.add(dome);
  const nebula=new THREE.Mesh(keep(new THREE.PlaneGeometry(58,28)),skyMat);nebula.name='Curling night nebula';nebula.position.set(0,6.5,-20);skyRig.add(nebula);
  const moon=new THREE.Mesh(keep(new THREE.SphereGeometry(1.35,20,16)),track(new THREE.MeshBasicMaterial({color:STARRY_LIGHT.moon,fog:false,transparent:true,depthWrite:false})));
  moon.name='Yellow moon';moon.position.set(-3.2,6.2,-16);skyRig.add(moon);
  const villageMaterials=[vergeMat,brickMat,stoneMat,...houseWalls,roofMat,trimMat,windowMat,doorMat,trunkMat,twigMat];
  const villageObjects=[verge,bricks,stones,village,trees];
  group.userData.samples={stones:stoneSpots,houses,trees:treeSpots,texture:skyTexture?'procedural-sky':'flat-color',roadHalf:half,wallTops,clusters:plans.length,moon:{x:-3.2,y:6.2,z:-16}};
  group.visible=false;
  return {group,road,dome,nebula,moon,update(view,anchor,chunks){
    const show=view.connect>.002||view.distant>.002||view.village>.002;
    group.visible=show;
    applyFade([roadMat],[road],Math.max(view.connect,view.village));
    applyFade(villageMaterials,villageObjects,view.village);
    const skyOn=view.distant>.002;
    dome.visible=nebula.visible=moon.visible=skyOn;
    domeMat.opacity=view.distant;skyMat.opacity=view.distant;moon.material.opacity=view.distant;
    if(anchor){
      const frame=starryPaintedFrame(anchor.s,0);
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
  if(weight<=0){if(cloud.opacity!==1||cloud.transparent){cloud.opacity=1;cloud.transparent=false;}}
  else{cloud.transparent=true;cloud.opacity=1-weight*.97;}
  sky.group.traverse(obj=>{
    if(!obj.isMesh||!/horizon|ridges|hills/i.test(obj.name||''))return;
    obj.material.color.set('#ffffff').lerp(NIGHT,weight);
  });
}
