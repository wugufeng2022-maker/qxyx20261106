import {test} from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {createAnimalSeatRigs,seatOccupant,canChooseAnimalSeat} from '../src/animal-seats.js';
import {inviteAnimal,leaveAnimal} from '../src/animal-interaction.js';
function setup(){const model=new THREE.Group(),steering=new THREE.Group();model.add(steering);steering.position.set(.405,.91,0);return {model,...createAnimalSeatRigs(model,steering)};}
test('each animal chooses either seat, no eviction or reservation on cancel',()=>{
 for(const first of ['front','rear']){
  const a={status:'talking',time:0,seat:null},b={status:'talking',time:0,seat:null},events=[a,b];
  assert.ok(inviteAnimal(a,100,100,0,first,events));assert.equal(seatOccupant(events,first),a);
  assert.equal(inviteAnimal(b,100,100,0,first,events),false);assert.equal(b.seat,null);assert.equal(a.status,'boarding');
  assert.ok(leaveAnimal(b));assert.equal(canChooseAnimalSeat(events,first==='front'?'rear':'front'),true);
  b.status='talking';assert.ok(inviteAnimal(b,100,100,0,first==='front'?'rear':'front',events));
 }
});
test('all four seating rigs fit basket/rack and preview cannot overlap a real occupant',()=>{
 const {model,rigs,update}=setup();
 for(const id of ['rabbit','cat'])for(const seat of ['front','rear']){
  const events={rabbit:{status:'unseen',time:0,seat:null},cat:{status:'unseen',time:0,seat:null}};events[id]={status:'active',time:2,seat};
  for(const time of [0,5,12,20,35]){
   update(events,time,8);model.updateMatrixWorld(true);
   const rig=rigs[id][seat],animal=rig.bunny||rig.cat,box=new THREE.Box3().setFromObject(animal);
   if(seat==='front'){assert.ok(box.min.x>.57&&box.max.x<.87,`${id}: ${JSON.stringify(box)}`);assert.ok(box.min.z>-.112&&box.max.z<.112);assert.ok(box.max.y<1.32);}
   else{assert.ok(box.min.x>-.86&&box.max.x<-.36);assert.ok(box.min.z>-.112&&box.max.z<.112);assert.ok(box.min.y>.87&&box.max.y<1.32);}
   if(id==='cat'&&seat==='front'){
    const pad=new THREE.Box3().setFromObject(rig.root.getObjectByName('Front cat sage linen cushion'));
    assert.ok(Math.abs(box.min.y-pad.max.y)<.002,'cat paws contact the thicker basket cushion');
    const eye=rig.cat.getObjectByName('Cat blinking eye').getWorldPosition(new THREE.Vector3());assert.ok(eye.y>1.14,'cat eyes sit above wicker rim');
   }
   assert.ok(rig.root.visible);
  }
  update(events,1,0,{rabbit:true,cat:true});
  assert.equal(Object.values(rigs).filter(s=>s[seat].root.visible).length,1);
 }
});
