import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {RABBIT_HOME,RABBIT_CARE,START_COURTYARD,addStartCourtyard,courtyardExcludes} from '../src/start-courtyard.js';
import {createRabbitEvent,updateRabbitEvent,createRabbitHome,inviteRabbit} from '../src/rabbit-event.js';
import {stopForAnimal,animalHolding} from '../src/animal-interaction.js';
import {createEncounterDirector,updateEncounterDirector} from '../src/encounter-director.js';
import {centerAt} from '../src/route.js';
import {visibleGroundAt} from '../src/grass-tumble.js';
import {disposeChunk} from '../src/scenery.js';
import {ROUTE_EVENTS} from '../src/itinerary.js';
import {MEMORY_LABELS,loadJourney,JOURNEY_KEY} from '../src/journey.js';

test('first departure discovers the home, direct passing never holds or repeats the old village invitation',()=>{
 const e=createRabbitEvent(),director=createEncounterDirector();
 for(let distance=0;distance<1600;distance+=.425){
  const state={started:true,paused:false,distance,speed:8.5,dt:.05};updateRabbitEvent(e,state);
  const owner=updateEncounterDirector(director,{rabbit:e},state);
  if(distance===0){assert.equal(e.status,'available');assert.equal(owner,'rabbit');}
  assert.equal(animalHolding(e),false);assert.equal(e.seat,null);
  if(distance>RABBIT_HOME+18){assert.equal(e.status,'skipped');assert.notEqual(owner,'rabbit');}
 }
 assert.equal(e.approach.progress,1);
 assert.deepEqual(ROUTE_EVENTS.filter(e=>e.label.includes('小兔')).map(e=>e.at),[RABBIT_HOME]);
 const old={version:1,memories:{rabbit:true},themes:{}};
 const restored=loadJourney({getItem:key=>key===JOURNEY_KEY?JSON.stringify(old):null});assert.equal(restored.memories.rabbit,true);assert.ok(MEMORY_LABELS.rabbit.includes('起点小院'));
});
for(const seat of ['front','rear'])test(`new home deliberate invitation supports ${seat}, pause freezes boarding`,()=>{
 const e=createRabbitEvent(),state={started:true,paused:false,distance:RABBIT_HOME-3,speed:0,dt:.1};
 updateRabbitEvent(e,state);assert.ok(stopForAnimal(e,RABBIT_HOME,state.distance,0));updateRabbitEvent(e,state);
 assert.ok(inviteRabbit(e,state.distance,0,seat));const before=structuredClone(e);updateRabbitEvent(e,{...state,paused:true,dt:5});assert.deepEqual(e,before);
 for(let i=0;i<11;i++)updateRabbitEvent(e,state);assert.equal(e.status,'active');assert.equal(e.seat,seat);
});
test('yard is independently streamed, preserves the rabbit opening and disposes all locally owned resources',()=>{
 const roots=[new THREE.Group(),new THREE.Group(),new THREE.Group()];roots.forEach((g,i)=>addStartCourtyard(g,i));
 assert.equal(roots[2].children.length,0);let houses=0,triangles=0,meshes=0;
 for(const root of roots){root.updateMatrixWorld(true);root.traverse(mesh=>{
  if(!mesh.isMesh)return;meshes++;triangles+=(mesh.geometry.index?.count||mesh.geometry.attributes.position.count)/3;
  if(mesh.name==='Warm plaster cottage')houses++;
  const bounds=new THREE.Box3().setFromObject(mesh),s=-mesh.position.z;
  assert.ok(bounds.max.x<centerAt(s)-3.1,'yard never reaches the riding shoulder');
  if(s>=48&&s<=66)assert.ok(bounds.max.x<centerAt(s)-6,'open entrance behind the rabbit');
  if(mesh.name==='Garden fence post')assert.ok(bounds.min.y<visibleGroundAt(mesh.position.x,s),'posts rooted below visible ground');
 });}
 assert.equal(houses,1);assert.ok(triangles<1800);assert.ok(meshes<120);
 for(const root of roots){const geometries=new Set(),materials=new Set(root.userData.ownedMaterials||[]);let disposedG=0,disposedM=0;root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);});geometries.forEach(g=>g.addEventListener('dispose',()=>disposedG++));materials.forEach(m=>m.addEventListener('dispose',()=>disposedM++));disposeChunk(root);assert.equal(disposedG,geometries.size);assert.equal(disposedM,materials.size);}
 assert.ok(courtyardExcludes(centerAt(RABBIT_HOME)-2,RABBIT_HOME));assert.equal(courtyardExcludes(centerAt(1490)-3,1490),false);assert.equal(START_COURTYARD.to,85);
});
test('rabbit ends both finite hops with paws on visible terrain and no platform penetration',()=>{
 const scene=new THREE.Scene(),rig=createRabbitHome(scene),e=createRabbitEvent();let peaks=0,previous=0,rising=false;
 for(let i=0;i<=200;i++){
  e.approach={attention:1,progress:i/200};rig.update(e,0);scene.updateMatrixWorld(true);
  const pawn=rig.bunny.bunny.getObjectByName('Resting front paw'),bounds=new THREE.Box3().setFromObject(pawn);
  const floor=visibleGroundAt(centerAt(RABBIT_HOME)+RABBIT_CARE.lane+rig.bunny.bunny.position.x,RABBIT_HOME);
  assert.ok(bounds.min.y>=floor-.01,'never below the visible terrain');
  const lift=Math.sin(Math.PI*Math.min(1,i/100))*.16+Math.sin(Math.PI*Math.max(0,i/100-1))*.16;
  if(lift<previous&&rising){peaks++;rising=false;}if(lift>previous)rising=true;previous=lift;
 }
 assert.equal(peaks,2);
 const paw=new THREE.Box3().setFromObject(rig.bunny.bunny.getObjectByName('Resting front paw'));
 assert.ok(Math.abs(paw.min.y-visibleGroundAt(centerAt(RABBIT_HOME)+RABBIT_CARE.lane+RABBIT_CARE.firstHop+RABBIT_CARE.secondHop,RABBIT_HOME))<.01);
});
