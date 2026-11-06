import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createGrassTumble,updateGrassTumble,requestGetUp,tumbleLocked,safeGrassAt,applyGrassPose,visibleGroundAt} from '../src/grass-tumble.js';
import {updateRide,centerAt,heightAt,tangentAt,ROUTE_LENGTH} from '../src/route.js';
import {createRider} from '../src/rider.js';
import {createAnimalSeatRigs} from '../src/animal-seats.js';
const state=(mode='leisure')=>({started:true,paused:false,auto:true,speed:5,distance:620,lane:0,turn:0,rideMode:mode,shoulderAllowed:true});
function tick(t,s,seconds,keys=new Set(),opts={}){for(let i=0;i<seconds*60;i++){updateGrassTumble(t,s,1/60,opts);updateRide(s,keys,1/60);}}
test('chase is smooth, visibly faster on flats, uniquely capped at 42; brake and finish win',()=>{
 const a=state('chase'),b=state('brisk');a.speed=b.speed=0;
 for(let i=0;i<1200;i++){updateRide(a,new Set(),1/60);updateRide(b,new Set(),1/60);}
 assert.ok(a.speed*3.6>=35&&a.speed*3.6<=38);assert.ok(a.speed>b.speed+2);
 const before=a.speed;a.rideMode='brisk';updateRide(a,new Set(),1/60);assert.ok(Math.abs(a.speed-before)<.04);
 for(const mode of ['leisure','brisk','joyful','chase']){
  const s=state(mode);s.distance=2900;s.fastRequested=true;
  for(let i=0;i<1500;i++){updateRide(s,new Set(),1/60);assert.ok(s.speed<=(mode==='chase'?42/3.6:10)+1e-8);}
  for(let i=0;i<240;i++)updateRide(s,new Set(['s']),1/60);assert.equal(s.speed,0);
  s.distance=ROUTE_LENGTH-.01;s.speed=8;updateRide(s,new Set(),1/60);assert.equal(s.distance,ROUTE_LENGTH);assert.equal(s.speed,0);
 }
 const near=state('chase');near.weaveSafe=false;for(let i=0;i<900;i++)updateRide(near,new Set(),1/60);assert.ok(near.speed<8.5);
});
test('only reserved dry flat grass opens shoulders; ordinary steering and joyful mode retain bounds',()=>{
 for(const s of [580,620,670,4450,4650,4900])for(const lane of [-3.1,3.1])assert.ok(safeGrassAt(s,lane));
 for(const s of [0,170,480,740,960,1490,1650,2160,2550,2940,3650,5650,6650,7650,8650,9650])assert.equal(safeGrassAt(s,3.1),false);
 const s=state();for(let i=0;i<300;i++)updateRide(s,new Set(['d']),1/60);assert.equal(s.lane,3.1);
 s.shoulderAllowed=false;const before=s.lane;updateRide(s,new Set(['d']),1/60);assert.ok(s.lane<before&&s.lane>3);for(let i=0;i<180;i++)updateRide(s,new Set(),1/60);assert.equal(s.lane,1.55);
 const j=state('joyful'),t=createGrassTumble();for(let i=0;i<3600;i++){updateGrassTumble(t,j,1/60);updateRide(j,new Set(),1/60);assert.equal(t.phase,'riding');assert.ok(Math.abs(j.lane)<1.45);}
});
test('grass warning needs sustained motion, returning, braking and encounters cancel it',()=>{
 for(const cancel of ['return','stop','blocked','walk']){
  const t=createGrassTumble(),s=state();s.lane=2.7;tick(t,s,1.2);assert.equal(t.phase,'slowing');
  if(cancel==='return')s.lane=1.8;if(cancel==='stop')s.speed=0;if(cancel==='walk')s.walkRequested=true;
  updateGrassTumble(t,s,.05,{blocked:cancel==='blocked'});assert.equal(t.phase,'riding');assert.equal(t.grassTime,0);
 }
 const t=createGrassTumble(),s=state();s.lane=2.7;tick(t,s,1);s.paused=true;const snapshot=structuredClone({t,s});tick(t,s,5);assert.deepEqual({t,s},snapshot);
});
test('safe fall freezes travel, rests until chosen, rises without losing route, then cools down',()=>{
 const t=createGrassTumble(),s=state('chase');s.lane=-2.9;s.speed=10;
 tick(t,s,2.5);assert.equal(t.phase,'slowing');assert.ok(s.speed<3);
 tick(t,s,.3);assert.equal(t.phase,'tipping');assert.ok(tumbleLocked(t));const at=s.distance;
 tick(t,s,3,new Set(['w','d']));assert.equal(t.phase,'resting');assert.equal(s.distance,at);assert.equal(s.speed,0);assert.equal(t.blend,1);
 s.paused=true;const copy=structuredClone(t);tick(t,s,4);assert.deepEqual(t,copy);s.paused=false;
 assert.ok(requestGetUp(t));assert.equal(requestGetUp(t),false);tick(t,s,2);assert.equal(s.distance,at);assert.equal(s.lane,-2.9,'body stays in place until almost standing');
 tick(t,s,1.5);assert.equal(t.phase,'cooldown');assert.equal(tumbleLocked(t),false);assert.ok(Math.abs(s.lane)<1.3);assert.ok(s.speed<1);assert.ok(s.distance-at<.2);
 s.lane=-2.9;tick(t,s,10);assert.equal(t.phase,'cooldown');s.lane=0;tick(t,s,8);assert.equal(t.phase,'riding');
});
test('independent body remains above rendered ground; both seat occupants stay visible and anchored',()=>{
 for(const s of [620,4650])for(const side of [-1,1]){
  const vehicle=new THREE.Group(),bike=new THREE.Group(),steering=new THREE.Group();vehicle.add(bike);bike.add(steering);steering.position.set(.405,.91,0);
  const rider=createRider(bike),seats=createAnimalSeatRigs(bike,steering),events={rabbit:{status:'active',seat:'front'},cat:{status:'active',seat:'rear'}};
  const yaw=Math.atan2(1,tangentAt(s)),right=new THREE.Vector3(1,0,tangentAt(s)).normalize();
  vehicle.position.set(centerAt(s)+right.x*side*2.9,heightAt(s)+.025,-s+right.z*side*2.9);vehicle.rotation.y=yaw;
  let anchor;
  for(let i=0;i<=20;i++){
   const b=i/20;rider.update(0,0,2,0,0,0,b);applyGrassPose(rider.root,b,side);seats.update(events,2,0);vehicle.updateMatrixWorld(true);
   const animalPositions=[];
   for(const [id,seat] of [['rabbit','front'],['cat','rear']]){const r=seats.rigs[id][seat];assert.ok(r.root.visible);animalPositions.push(r.root.getWorldPosition(new THREE.Vector3()).toArray());}
   if(!anchor)anchor=animalPositions;else assert.deepEqual(animalPositions,anchor,'fall cannot move a companion off its pad');
   if(i){const p=new THREE.Vector3();let nearest=Infinity;rider.root.traverse(mesh=>{if(!mesh.isMesh)return;const a=mesh.geometry.attributes.position;for(let v=0;v<a.count;v++){p.fromBufferAttribute(a,v).applyMatrix4(mesh.matrixWorld);const gap=p.y-visibleGroundAt(p.x,-p.z);nearest=Math.min(nearest,gap);assert.ok(gap>=.011,'all visible body vertices clear terrain triangles');}});if(i===20)assert.ok(nearest<.02,'resting body contacts the visible terrain within 2cm');}
  }
  const riderBox=new THREE.Box3().setFromObject(rider.root);assert.ok(riderBox.max.y-riderBox.min.y<.7,'rest is horizontal');
 }
});
