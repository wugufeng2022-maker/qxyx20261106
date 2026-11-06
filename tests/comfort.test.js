import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {updateRide} from '../src/route.js';
import {VILLAGE_HOMES} from '../src/scenery.js';
import {createRider} from '../src/rider.js';
import {createRabbit} from '../src/rabbit.js';
const state=mode=>({started:true,paused:false,auto:true,speed:0,distance:600,lane:0,turn:0,rideMode:mode});
test('automatic modes need no held input; acceleration persists and brakes override it',()=>{
 const leisurely=state('leisure'),brisk=state('brisk');
 for(let i=0;i<600;i++){updateRide(leisurely,new Set(),1/60);updateRide(brisk,new Set(),1/60);}
 assert.ok(brisk.speed>leisurely.speed+1.5);
 brisk.fastRequested=true;for(let i=0;i<600;i++)updateRide(brisk,new Set(),1/60);
 assert.ok(brisk.speed>8.5);
 for(let i=0;i<180;i++)updateRide(brisk,new Set(['s']),1/60);
 assert.equal(brisk.speed,0);
});
test('joyful weave is visibly broader but stays inside the road, and settles straight near encounters',()=>{
 const s=state('joyful'),lanes=[];
 let peakTurn=0;
 for(let i=0;i<2400;i++){const before=s.lane;updateRide(s,new Set(),1/60);lanes.push(s.lane);peakTurn=Math.max(peakTurn,Math.abs(s.turn));assert.ok(Math.abs(s.lane-before)<.022);}
 assert.ok(Math.min(...lanes)<-1.25&&Math.max(...lanes)>1.25);assert.ok(lanes.every(l=>Math.abs(l)<1.45));
 assert.ok(peakTurn>.65&&peakTurn<1.3,'bicycle has a visible, bounded alternating lean');
 s.weaveSafe=false;for(let i=0;i<600;i++)updateRide(s,new Set(),1/60);assert.ok(Math.abs(s.lane)<.001);
 s.pointerSteer=1;for(let i=0;i<300;i++)updateRide(s,new Set(),1/60);assert.equal(s.lane,1.55);
 s.paused=true;const snapshot={...s};updateRide(s,new Set(),1);assert.deepEqual(s,snapshot);
});
test('village has five widely separated cottages, with varied setbacks and types',()=>{
 assert.equal(VILLAGE_HOMES.length,5);assert.equal(new Set(VILLAGE_HOMES.map(h=>h.variant)).size,4);
 VILLAGE_HOMES.forEach((h,i)=>{assert.ok(h.setback>12);if(i)assert.ok(h.s-VILLAGE_HOMES[i-1].s>=112);});
});
test('pushing is on bicycle left and the near hand remains on its grip',()=>{
 const bike=new THREE.Group(),r=createRider(bike);r.update(0,0,0,1,1,1);bike.updateMatrixWorld(true);
 for(const side of [-1,1])assert.ok(bike.getObjectByName(`Canvas sneaker ${side}`).getWorldPosition(new THREE.Vector3()).z<-.3);
 const hand=bike.getObjectByName('Hand around grip 1').getWorldPosition(new THREE.Vector3());assert.ok(hand.distanceTo(new THREE.Vector3(.3,1.115,-.263))<1e-8);
});
test('basket rabbit nose faces back toward rider and eyes lie on the visible head surface',()=>{
 const r=createRabbit(new THREE.Group(),{basket:true});r.root.updateMatrixWorld(true);
 const head=r.head.getWorldPosition(new THREE.Vector3()),nose=r.root.getObjectByName('Small nose').getWorldPosition(new THREE.Vector3());assert.ok(nose.x<head.x);
 const eye=r.root.getObjectByName('Rabbit eye').position;assert.ok((eye.x/.065)**2+(eye.y/.064)**2+(eye.z/.06)**2>1);
});
