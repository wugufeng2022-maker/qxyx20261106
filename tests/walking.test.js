import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createRider} from '../src/rider.js';
import {updateRide} from '../src/route.js';
import handAsset from '../assets/rider/hand-mesh.js';
test('walking and mount transitions keep limbs within anatomical lengths',()=>{
 const bike=new THREE.Group(),rig=createRider(bike);
 for(let j=0;j<=20;j++)for(let i=0;i<40;i++){
  rig.update(0,.12,0,1,j/20,i/40*Math.PI*2);
  for(const [name,length] of [['Upper arm',.31],['Trouser thigh',.425],['Tapered trouser leg',.435]])for(const o of bike.getObjectsByProperty('name',name))assert.ok(Math.abs(o.scale.y-length)<1e-8,`${name} ${o.scale.y}`);
 }
});
test('mounting brakes and does not start while pose has not settled',()=>{
 const s={started:true,paused:false,auto:true,speed:5,distance:0,lane:0,turn:0,walking:false,walkRequested:true,walkBlend:0};
 for(let i=0;i<100;i++)updateRide(s,new Set(),.05);
 assert.equal(s.walking,true);assert.equal(s.speed,0);
 s.walkBlend=1;for(let i=0;i<60;i++)updateRide(s,new Set(),.05);
 assert.ok(s.speed>1&&s.speed<1.1);
 s.walkRequested=false;for(let i=0;i<100;i++)updateRide(s,new Set(),.05);
 assert.equal(s.walking,false);assert.equal(s.speed,0);
 s.walkBlend=0;updateRide(s,new Set(),.05);assert.ok(s.speed>0);
});
test('supporting shoe remains on ground and fixed in world during stance',()=>{
 const bike=new THREE.Group(),rig=createRider(bike),side=1;
 const positions=[];
 for(const cycle of [.05,.15,.25,.35,.45]){
  rig.update(0,0,0,1,1,cycle*2*Math.PI);bike.position.x=cycle*.62;bike.updateMatrixWorld(true);
  positions.push(bike.getObjectByName(`Canvas sneaker ${side}`).localToWorld(new THREE.Vector3(-.015,-.034,0)));
 }
 for(const p of positions){assert.ok(Math.abs(p.x-positions[0].x)<1e-8);assert.ok(Math.abs(p.y+.01)<1e-8);}
});

test('stopping at every walking phase settles both soles on the ground',()=>{
 const bike=new THREE.Group(),rig=createRider(bike);
 for(let i=0;i<40;i++){rig.update(0,0,0,0,1,i/40*Math.PI*2);bike.updateMatrixWorld(true);
 for(const side of [-1,1])assert.ok(Math.abs(bike.getObjectByName(`Canvas sneaker ${side}`).localToWorld(new THREE.Vector3(-.015,-.034,0)).y+.01)<1e-8);}
});

test('walking uses the inner hand on the near grip and swings the outer hand opposite its foot',()=>{
 const bike=new THREE.Group(),rig=createRider(bike),up=new THREE.Vector3(0,1,0);
 const inner=bike.getObjectByName('Hand around grip 1'),outer=bike.getObjectByName('Hand around grip -1');
 const handX=[],footX=[];
 for(let i=0;i<40;i++){
  const phase=i/40*Math.PI*2,steer=Math.sin(phase)*.2;
  rig.update(0,steer,0,1,1,phase);bike.updateMatrixWorld(true);
  const expected=new THREE.Vector3(.30,1.115,-.263).sub(new THREE.Vector3(.405,.91,0)).applyAxisAngle(up,steer).add(new THREE.Vector3(.405,.91,0));
  assert.ok(inner.getWorldPosition(new THREE.Vector3()).distanceTo(expected)<1e-8);
  const free=outer.getWorldPosition(new THREE.Vector3());
  assert.ok(free.y<.71&&free.z<-.65,'free hand must hang outside the thigh');
  handX.push(free.x+.14);
  footX.push(bike.getObjectByName('Canvas sneaker 1').getWorldPosition(new THREE.Vector3()).x);
 }
 const footMean=footX.reduce((sum,x)=>sum+x,0)/footX.length;
 assert.ok(handX.reduce((sum,x,i)=>sum+x*(footX[i]-footMean),0)<0,'same-side arm and foot must move in opposition');
 assert.ok(Math.max(...handX)-Math.min(...handX)<.14,'walking swing stays small');
});

test('free hand settles at rest and does not turn with the handlebar',()=>{
 const bike=new THREE.Group(),rig=createRider(bike),hand=bike.getObjectByName('Hand around grip -1');
 let position,orientation;
 for(let i=0;i<40;i++){
  rig.update(0,Math.sin(i)*.2,0,0,1,i/40*Math.PI*2);bike.updateMatrixWorld(true);
  const p=hand.getWorldPosition(new THREE.Vector3()),q=hand.getWorldQuaternion(new THREE.Quaternion());
  if(position){assert.ok(p.distanceTo(position)<1e-8);assert.ok(q.angleTo(orientation)<1e-7);}
  position=p;orientation=q;
 }
});

test('mount transitions move and rotate hands continuously',()=>{
 const bike=new THREE.Group(),rig=createRider(bike),previous=new Map();
 for(let i=0;i<=100;i++){
  rig.update(0,.15,0,.7,i/100,1.1);bike.updateMatrixWorld(true);
  for(const side of [-1,1]){
   const hand=bike.getObjectByName(`Hand around grip ${side}`),p=hand.getWorldPosition(new THREE.Vector3()),q=hand.getWorldQuaternion(new THREE.Quaternion());
   const last=previous.get(side);
   if(last){assert.ok(p.distanceTo(last.p)<.012);assert.ok(q.angleTo(last.q)<.04);}
   previous.set(side,{p,q});
  }
 }
});

test('hanging wrist aligns its original forearm axis with the solved elbow',()=>{
 const bike=new THREE.Group(),rig=createRider(bike),hand=bike.getObjectByName('Hand around grip -1');
 const elbow=bike.getObjectsByProperty('name','Elbow')[0];
 for(const speed of [0,.15,1])for(let i=0;i<40;i++){
  rig.update(0,Math.sin(i)*.2,0,speed,1,i/40*Math.PI*2);bike.updateMatrixWorld(true);
  const wrist=hand.localToWorld(new THREE.Vector3(handAsset.wrist[0],handAsset.wrist[1],-handAsset.wrist[2]));
  const original=hand.localToWorld(new THREE.Vector3(handAsset.elbow[0],handAsset.elbow[1],-handAsset.elbow[2])).sub(wrist).normalize();
  const solved=elbow.getWorldPosition(new THREE.Vector3()).sub(wrist).normalize();
  assert.ok(original.angleTo(solved)<1e-6,'wrist must continue into the actual forearm without a sharp bend');
  assert.ok(wrist.y<.75,'hanging arm stays long and relaxed');
 }
});
