import {RABBIT_CARE} from '../src/start-courtyard.js';
import {visibleGroundAt} from '../src/grass-tumble.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createRabbitEvent,updateRabbitEvent,createRabbitHome,RABBIT_HOME} from '../src/rabbit-event.js';
import {createCatEvent,updateCatEvent,createCatHome,CAT_HOME} from '../src/cat-event.js';
import {groundAt,centerAt} from '../src/route.js';
for(const [name,create,tick,home,render] of [['rabbit',createRabbitEvent,updateRabbitEvent,RABBIT_HOME,createRabbitHome]]){
 test(`${name}: greeting thresholds, frozen pause and bounded path without pursuit`,()=>{
  const event=create(),state={started:true,paused:false,distance:home-66,speed:5,dt:.05};
  tick(event,state);assert.equal(event.approach.attention,0);assert.equal(event.approach.progress,0);
  state.distance=home-60;for(let i=0;i<20;i++)tick(event,state);
  assert.equal(event.approach.attention,1);assert.equal(event.approach.progress,0);
  state.distance=home-45;tick(event,state);assert.ok(event.approach.progress>0);
  const frozen=structuredClone(event);tick(event,{...state,paused:true,dt:10});assert.deepEqual(event,frozen);
  const scene=new THREE.Scene(),rig=render(scene);let previousAngle=null;
  for(let frame=0;frame<100;frame++){
   tick(event,state);rig.update(event,frame*.05);
   const animal=rig.bunny?.bunny||rig.home.root;
   if(previousAngle!==null)assert.ok(Math.abs(animal.rotation.y-previousAngle)<.3,'orientation is continuous');previousAngle=animal.rotation.y;
  }
  const animal=rig.bunny?.bunny||rig.home.root,rest=animal.position.clone();
  assert.equal(event.approach.progress,1);
  state.distance=home+60;for(let i=0;i<200;i++){tick(event,state);rig.update(event,10+i*.05);}
  assert.equal(event.status,'skipped');assert.ok(animal.position.distanceTo(rest)<1e-9,'no pursuit after passing');
  assert.ok(animal.position.x<=.65);
  if(name==='rabbit'){
   for(const ear of rig.bunny.head.children.filter(o=>o.name==='Soft upright ear'))assert.ok(ear.scale.y<=.064*1.17+1e-9);
   const paw=rig.bunny.bunny.getObjectByName('Resting front paw');scene.updateMatrixWorld(true);
   const box=new THREE.Box3().setFromObject(paw),floor=visibleGroundAt(centerAt(home)+RABBIT_CARE.lane+RABBIT_CARE.firstHop+RABBIT_CARE.secondHop,home);
   assert.ok(Math.abs(box.min.y-floor)<.01,`rabbit paw contact ${box.min.y-floor}`);
  }else{
   const paw=rig.home.cat.getObjectByName('Cat front paw');scene.updateMatrixWorld(true);
   const box=new THREE.Box3().setFromObject(paw),floor=groundAt(centerAt(home)-2.05,home);
   assert.ok(Math.abs(box.min.y-floor)<.01,`cat paw contact ${box.min.y-floor}`);
  }
 });
}
test('rabbit clears the platform before descending off its side',()=>{
 const event=createRabbitEvent(),rig=createRabbitHome(new THREE.Scene());
 for(let i=0;i<=100;i++){
  event.approach={attention:1,progress:i/200};rig.update(event,0);
  const x=rig.bunny.bunny.position.x,bottom=rig.bunny.root.position.y+rig.bunny.bunny.position.y+.033;
  if(x<.48)assert.ok(bottom>=.48-1e-9,'does not descend through the solid platform');
 }
});
