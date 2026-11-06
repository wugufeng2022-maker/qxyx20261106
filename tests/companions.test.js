import * as THREE from 'three';
import {test} from 'node:test';import assert from 'node:assert/strict';
import {createWalker,createWalkerEvent,inviteWalker,leaveWalker,updateWalker,WALKER} from '../src/companions.js';
const tick=(e,d,dt=.05)=>updateWalker(e,{started:true,paused:false,distance:d,dt});
test('neighbour has a fixed destination, voluntary invitation and bounded pace',()=>{const e=createWalkerEvent();tick(e,WALKER.start-20);assert.equal(e.status,'available');assert.equal(inviteWalker(e),true);for(let i=0;i<200;i++)tick(e,e.s-4);assert.ok(e.s>WALKER.start+10&&e.s<WALKER.start+12);leaveWalker(e);assert.equal(e.status,'departing');for(let i=0;i<1700;i++)tick(e,WALKER.end+150);assert.equal(e.s,WALKER.end);assert.equal(e.status,'arrived');tick(e,WALKER.start-20);assert.equal(e.status,'arrived');});
test('ignored and departed walker never chases rider; pause freezes event',()=>{const e=createWalkerEvent();tick(e,WALKER.start-10);const before=structuredClone(e);updateWalker(e,{started:true,paused:true,distance:WALKER.start+20,dt:20});assert.deepEqual(e,before);tick(e,WALKER.start+30);assert.equal(e.status,'departing');const s=e.s;tick(e,WALKER.end+90,1);assert.ok(Math.abs(e.s-s-WALKER.speed)<1e-8);});

test('invitation waits until close enough, then maintains a quiet lead without chasing',()=>{const e=createWalkerEvent();tick(e,WALKER.start-24);assert.equal(inviteWalker(e,WALKER.start-24),false);tick(e,WALKER.start-10);assert.equal(inviteWalker(e,WALKER.start-10),true);tick(e,WALKER.start-10);assert.equal(e.status,'active');assert.equal(e.speed,0);for(let i=0;i<120;i++)tick(e,WALKER.start-2+i*.0525);assert.ok(e.s-(WALKER.start-2+119*.0525)<5);assert.ok(e.speed<=WALKER.speed);});

test('neighbour legs preserve lengths across walking and waiting phases',()=>{const scene=new THREE.Scene(),actor=createWalker(scene),e=createWalkerEvent();e.status='active';for(const speed of [0,.1,.35,1.05])for(let i=0;i<80;i++){e.speed=speed;e.phase=i/80*2*Math.PI;actor.update(e);for(const name of ['Neighbour thigh','Neighbour shin'])for(const leg of actor.root.getObjectsByProperty('name',name))assert.ok(Math.abs(leg.scale.y-.385)<1e-8);}});
test('arrival settles by the bench with a single bounded farewell, pause freezes it',()=>{const e=createWalkerEvent();e.status='active';e.invited=true;e.s=WALKER.end-.01;tick(e,WALKER.end-4);assert.equal(e.status,'arrived');tick(e,WALKER.end,2);assert.equal(e.arrivalTime,2);const copy=structuredClone(e);updateWalker(e,{started:true,paused:true,distance:WALKER.end,dt:2});assert.deepEqual(e,copy);tick(e,WALKER.end+80,4);assert.equal(e.status,'arrived');assert.equal(e.s,WALKER.end);assert.equal(e.arrivalTime,6);});

test('farewell arm keeps fixed lengths throughout lifting, waving and returning',()=>{const scene=new THREE.Scene(),actor=createWalker(scene),e=createWalkerEvent();e.status='arrived';e.accompanied=true;for(let i=0;i<100;i++){e.arrivalTime=i*.05;actor.update(e);for(const name of ['Neighbour sleeve','Neighbour forearm'])for(const arm of actor.root.getObjectsByProperty('name',name))assert.ok(Math.abs(arm.scale.y-.24)<1e-8);}});

test('invitation walking releases at arrival and distance separation, preserving manual choices',async()=>{
 const {inviteWalkerWithWalking,releaseWalkerWalking,requestWalking}=await import('../src/companions.js');
 for(const outcome of ['arrived','departing']){
  const e=createWalkerEvent();tick(e,WALKER.start-10);const s={distance:WALKER.start-2,walkRequested:false};
  assert.equal(inviteWalkerWithWalking(e,s),true);assert.equal(s.walkFromWalker,true);
  if(outcome==='arrived'){e.s=WALKER.end-.01;tick(e,WALKER.end-2);}else tick(e,WALKER.start+30);
  assert.equal(e.status,outcome);assert.equal(releaseWalkerWalking(e,s),true);assert.equal(s.walkRequested,false);assert.equal(releaseWalkerWalking(e,s),false);
 }
 for(const manualBefore of [true,false]){
  const e=createWalkerEvent();tick(e,WALKER.start-10);const s={distance:WALKER.start-2,walkRequested:manualBefore};
  inviteWalkerWithWalking(e,s);
  if(!manualBefore){requestWalking(s,false);requestWalking(s,true);}
  leaveWalker(e);assert.equal(releaseWalkerWalking(e,s),false);assert.equal(s.walkRequested,true);
 }
});
