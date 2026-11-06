import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createRider } from '../src/rider.js';

test('body sway preserves hand grips and shoe contact throughout pedaling and turning',()=>{
  const bike=new THREE.Group(),rig=createRider(bike),yAxis=new THREE.Vector3(0,1,0);
  for(let i=0;i<144;i++){
    const angle=i*Math.PI/36,steer=Math.sin(i*.17)*.2;
    rig.update(angle,steer,i/24,4);bike.updateMatrixWorld(true);
    for(const side of [-1,1]){
      const grip=new THREE.Vector3(.30,1.115,side*.263).sub(new THREE.Vector3(.405,.91,0)).applyAxisAngle(yAxis,steer).add(new THREE.Vector3(.405,.91,0));
      const hand=bike.getObjectByName(`Hand around grip ${side}`).getWorldPosition(new THREE.Vector3());
      assert.ok(hand.distanceTo(grip)<1e-8,'hand must remain on the moving handlebar');
      const pedal=new THREE.Vector3(-.1+side*.055*Math.cos(angle)-side*.14*Math.sin(angle),.385+side*.055*Math.sin(angle)+side*.14*Math.cos(angle),-side*.16);
      const sole=bike.getObjectByName(`Canvas sneaker ${side}`).localToWorld(new THREE.Vector3(-.015,-.034,0));
      assert.ok(sole.distanceTo(pedal)<1e-8,'sole must remain on the pedal while the ankle flexes');
    }
    for(const arm of bike.getObjectsByProperty('name','Upper arm')) assert.ok(Math.abs(arm.scale.y-.31)<1e-8);
    for(const skin of bike.getObjectsByProperty('name','Continuous hand and forearm')) {
      assert.ok(skin.geometry.attributes.position.array.every(Number.isFinite));
    }
    for(const leg of bike.getObjectsByProperty('name','Trouser thigh')) assert.ok(Math.abs(leg.scale.y-.425)<1e-8);
    for(const leg of bike.getObjectsByProperty('name','Tapered trouser leg')) assert.ok(Math.abs(leg.scale.y-.435)<1e-8);
    bike.traverse(o=>assert.ok(o.matrixWorld.elements.every(Number.isFinite)));
  }
});

test('seated motion stays subtle and stops rocking when stationary',()=>{
  const bike=new THREE.Group(),rig=createRider(bike),body=bike.getObjectByName('Relaxed upper body');
  const shoulder=new THREE.Vector3(-.095,1.49,0),ys=[];
  for(let i=0;i<120;i++){
    rig.update(i*Math.PI/60,0,i/60,4);bike.updateMatrixWorld(true);
    ys.push(body.localToWorld(shoulder.clone()).y);
  }
  const range=Math.max(...ys)-Math.min(...ys);
  assert.ok(range>.004 && range<.025,'shoulder motion should be visible but under 2.5 cm');
  rig.update(0,0,0,0);const resting=body.quaternion.clone();
  rig.update(0,0,2,0);assert.ok(resting.angleTo(body.quaternion)<1e-8);
  assert.equal(bike.getObjectByName('Helmet'),undefined);
});

test('handlebar view keeps both animated forearms and hands and restores the full rider',()=>{
  const bike=new THREE.Group(),rig=createRider(bike);
  rig.setFirstPerson(true);rig.update(1.2,.15,3,4);bike.updateMatrixWorld(true);
  const visible=[];bike.traverse(o=>{if(o.isMesh&&o.visible)visible.push(o);});
  assert.equal(visible.length,2,'first-person skin should consist of just two continuous arm/hand meshes');
  assert.equal(visible.filter(o=>o.name==='Continuous hand and forearm').length,2);
  assert.equal(bike.getObjectByName('Face').visible,false);
  assert.equal(bike.getObjectByName('Daypack main pouch').visible,false);
  rig.setFirstPerson(false);
  bike.traverse(o=>{if(o.isMesh)assert.equal(o.visible,true);});
});
