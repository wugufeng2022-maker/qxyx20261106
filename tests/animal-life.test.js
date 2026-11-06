import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createRabbit} from '../src/rabbit.js';
import {createCat} from '../src/cat.js';
test('rabbit blinks, reopens, looks around and responds to air without changing foot contacts',()=>{
 const rig=createRabbit(new THREE.Group(),{basket:true});
 const eye=rig.head.getObjectByName('Rabbit eye'),ear=rig.head.getObjectByName('Soft upright ear');
 rig.update(0,0);const open=eye.scale.y,calm=ear.rotation.clone();
 rig.update(2.24,7);assert.ok(eye.scale.y<open*.15);
 rig.update(3,7);assert.equal(eye.scale.y,open);assert.ok(Math.abs(ear.rotation.x-calm.x)>.01);
 const first=rig.head.rotation.y;rig.update(13,7);assert.ok(Math.abs(first-rig.head.rotation.y)>.15);
 const frozen=ear.rotation.clone();rig.update(13,0);assert.ok(ear.rotation.equals(frozen),'same elapsed time freezes wind during pause');
});
test('cat ears respond gently to riding speed and freeze with game time',()=>{
 const rig=createCat(new THREE.Group(),{carrier:true}),ear=rig.head.getObjectByName('Cat ear root');
 rig.update(1,0);const rest=ear.rotation.z;rig.update(1.1,7);assert.ok(Math.abs(ear.rotation.z-rest)>.01);
 const frozen=ear.rotation.clone();rig.update(1.1,0);assert.ok(ear.rotation.equals(frozen));
});
