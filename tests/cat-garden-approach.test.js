import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCatEvent,updateCatEvent,createCatHome,CAT_HOME} from '../src/cat-event.js';
import {catGreetingPose} from '../src/animal-approach.js';
import {brakeRate,centerAt,ROAD_HALF_WIDTH,updateRide} from '../src/route.js';
import {CAT_YARD} from '../src/village-cat-site.js';
import {visibleGroundAt} from '../src/grass-tumble.js';
import {canStopForAnimal,stopForAnimal} from '../src/animal-interaction.js';

const rideAt=(ahead=65,speed=5,dt=.05)=>({started:true,paused:false,distance:CAT_HOME-ahead,speed,dt});

test('cat leaves the door once, trots outside the road and settles at the shoulder',()=>{
 const event=createCatEvent(),rig=createCatHome(new THREE.Scene());
 let lastOffset=0,lastYaw=Math.PI*.5,maxPawLift=0;
 for(let i=0;i<190;i++){
  updateCatEvent(event,rideAt(68-i*.25));rig.update(event,i*.05);
  const pose=event.approach;
  assert.ok(pose.offset>=lastOffset);lastOffset=pose.offset;
  assert.ok(Math.abs(rig.home.root.rotation.y-lastYaw)<.4);lastYaw=rig.home.root.rotation.y;
  const at=CAT_HOME-rig.home.root.position.z,lane=rig.site.position.x+rig.home.root.position.x-centerAt(at);
  assert.ok(lane<=-ROAD_HALF_WIDTH-.50);
  maxPawLift=Math.max(maxPawLift,rig.home.cat.getObjectByName('Cat front paw').position.y);
 }
 assert.ok(maxPawLift>.04);assert.equal(event.approach.progress,1);
 const pose=structuredClone(event.approach);
 for(let i=0;i<100;i++)updateCatEvent(event,rideAt(25));
 assert.deepEqual(event.approach,pose);
 rig.site.updateMatrixWorld(true);
 const paw=new THREE.Box3().setFromObject(rig.home.cat.getObjectByName('Cat front paw'));
 const floor=visibleGroundAt(centerAt(CAT_HOME)+CAT_YARD.greetingLane,CAT_HOME);
 assert.ok(Math.abs(paw.min.y-floor)<.02);
});

test('near preview starts at the shoulder and pause freezes a running cat',()=>{
 const close=createCatEvent();updateCatEvent(close,rideAt(12));
 assert.equal(close.approach.progress,1);
 const event=createCatEvent();
 for(let i=0;i<22;i++)updateCatEvent(event,rideAt(40));
 assert.ok(event.approach.progress>0&&event.approach.progress<1);
 const frozen=structuredClone(event);
 updateCatEvent(event,{...rideAt(40),paused:true,dt:20});assert.deepEqual(event,frozen);
 for(let i=0;i<70;i++)updateCatEvent(event,rideAt(13,11.6));
 assert.equal(event.approach.progress,1);
 updateCatEvent(event,rideAt(-20));
 assert.equal(event.status,'skipped');assert.equal(event.approach.offset,catGreetingPose(1).offset);
});

test('cat walk has four animated legs and clears the doorstep mat',()=>{
 const scene=new THREE.Scene(),rig=createCatHome(scene),event=createCatEvent();
 scene.updateMatrixWorld(true);
 const mat=new THREE.Box3().setFromObject(rig.site.children.find(o=>o.geometry?.type==='BoxGeometry'));
 for(let i=0;i<=335;i++){
  const progress=i/335;event.approach={attention:1,...catGreetingPose(progress),travel:progress*7,progress};
  rig.update(event,i/100);scene.updateMatrixWorld(true);
  if(i===150){
   const legs=rig.home.cat.children.filter(o=>o.name==='Home cat walking leg');
   assert.equal(legs.length,4);assert.ok(legs.every(o=>o.visible&&o.scale.y>.08));
  }
  rig.home.cat.traverse(paw=>{
   if(!paw.name.includes('paw'))return;
   const box=new THREE.Box3().setFromObject(paw);
   if(box.max.x>=mat.min.x&&box.min.x<=mat.max.x&&box.max.z>=mat.min.z&&box.min.z<=mat.max.z)
    assert.ok(box.min.y>=mat.max.y-.024);
  });
 }
});

test('early cat click works while slowing; a late push or dismount cannot overshoot a stop',()=>{
 const event=createCatEvent();updateCatEvent(event,rideAt());
 assert.equal(canStopForAnimal(event,CAT_HOME,CAT_HOME-22,5),true);
 assert.equal(canStopForAnimal(event,CAT_HOME,CAT_HOME-23,5),false);
 for(const motion of [{walking:true,speed:1.05},{walking:false,walkRequested:true,speed:7}]){
  const rate=brakeRate(motion);
  assert.equal(canStopForAnimal(event,CAT_HOME,CAT_HOME+11.9,motion.speed,rate),false);
  const state={started:true,distance:CAT_HOME+12-motion.speed**2/(2*rate)-.03,turn:0,lane:0,...motion};
  assert.equal(stopForAnimal(event,CAT_HOME,state.distance,state.speed,rate),true);
  for(let i=0;i<240&&state.speed>0;i++)updateRide(state,new Set(['ArrowDown']),.05);
  assert.equal(state.speed,0);assert.ok(state.distance<=CAT_HOME+12);
  event.status='available';
 }
});
