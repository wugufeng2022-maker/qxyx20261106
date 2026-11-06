import {stopForAnimal,animalHolding} from '../src/animal-interaction.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCat,CAT_SEAT} from '../src/cat.js';
import {CAT_HOME,createCatEvent,updateCatEvent,inviteCat,canInviteCat} from '../src/cat-event.js';
import {createEncounterDirector,updateEncounterDirector} from '../src/encounter-director.js';
import {loadJourney,remember} from '../src/journey.js';
import {updateRide} from '../src/route.js';
import {readPreview,previewURL} from '../src/dev-preview.js';
const tick=(e,distance,speed=0,dt=.05,paused=false)=>updateCatEvent(e,{started:true,paused,distance,speed,dt});
test('roadside cat is a voluntary stationary domestic encounter, then boards only after braking',()=>{
 const e=createCatEvent();tick(e,CAT_HOME-26,5);assert.equal(e.status,'available');assert.equal(canInviteCat(e,CAT_HOME-26,5),false);
 assert.equal(inviteCat(e,CAT_HOME+9,8),false);assert.equal(stopForAnimal(e,CAT_HOME,CAT_HOME-5,5),true);
 tick(e,CAT_HOME-4,2,2);assert.equal(e.time,0);
 const snapshot={...e};tick(e,CAT_HOME-2,0,5,true);assert.deepEqual(e,snapshot);
 tick(e,CAT_HOME-2,0,.65);assert.equal(e.status,'talking');assert.equal(inviteCat(e,CAT_HOME-2,0),true);tick(e,CAT_HOME-2,0,.65);assert.equal(e.status,'boarding');tick(e,CAT_HOME-2,0,.65);assert.equal(e.status,'active');
 tick(e,2400,9,9);assert.equal(e.status,'active');assert.equal(inviteCat(e,CAT_HOME,0),false);
 const skipped=createCatEvent();tick(skipped,CAT_HOME+19,5);tick(skipped,CAT_HOME);assert.equal(skipped.status,'skipped');
});
test('cat boarding remains the only prompt, passive rabbit/cat can share the ride and memory persists',()=>{
 const e=createCatEvent(),director=createEncounterDirector();tick(e,CAT_HOME-5);
 assert.equal(updateEncounterDirector(director,{rabbit:{status:'active'},cat:e},{distance:CAT_HOME-5}),'cat');
 stopForAnimal(e,CAT_HOME,CAT_HOME-5,0);tick(e,CAT_HOME-5);inviteCat(e,CAT_HOME-5,0);assert.equal(updateEncounterDirector(director,{cat:e},{distance:CAT_HOME-5}),'cat');tick(e,CAT_HOME-5,0,1.3);
 assert.equal(updateEncounterDirector(director,{cat:e,rabbit:{status:'active'}},{distance:CAT_HOME-5}),null);
 const data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)},journey=loadJourney(storage);
 assert.equal(remember(journey,'cat',storage),true);assert.equal(remember(journey,'cat',storage),false);assert.equal(loadJourney(storage).memories.cat,true);
 const p=readPreview(new URL(previewURL('http://localhost/',{at:CAT_HOME,rabbit:true,cat:true})).search);assert.equal(p.cat,true);assert.equal(p.rabbit,true);
});
test('cat and tucked tail fit the actual rear rack pad, clear the saddle, and sit on the pad',()=>{
 const model=new THREE.Group(),c=createCat(model,{carrier:true});
 assert.deepEqual(CAT_SEAT.center,[-.675,.842,0]);
 for(const time of [0,1,3,8,15]){
  c.update(time,10);model.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(c.cat,true);
  assert.ok(box.min.x>-.86&&box.max.x<-.36,JSON.stringify(box));assert.ok(box.min.z>-.112&&box.max.z<.112);
  assert.ok(box.min.y>=.87&&box.min.y<.89);assert.ok(box.max.y<1.23);
  assert.equal(c.cat.getObjectByName('Cat front paw').position.y,.020);
 }
 const ears=[];c.cat.traverse(o=>{if(o.name==='Triangular cat ear')ears.push(o);});assert.equal(ears.length,2);
});
test('full invitation brakes, boards, resumes and carries a cat into the long hill without stuck controls',()=>{
 const state={started:true,paused:false,auto:true,speed:5,distance:CAT_HOME-55,lane:0,turn:0},e=createCatEvent();let invited=false;
 for(let frame=0;frame<9000&&state.distance<1900;frame++){
  updateRide(state,animalHolding(e)?new Set(['s']):new Set(),.05);tick(e,state.distance,state.speed);
  stopForAnimal(e,CAT_HOME,state.distance,state.speed);
  if(canInviteCat(e,state.distance,state.speed)){assert.equal(inviteCat(e,state.distance,state.speed),true);invited=true;}
 }
 assert.equal(invited,true);assert.equal(e.status,'active');assert.ok(state.distance>=1900);assert.ok(state.speed>0);
});
test('lifelike gestures rest between looks, alternate sides and pause without drifting contacts',()=>{
 const c=createCat(new THREE.Group(),{carrier:true});
 const paws=[];c.cat.traverse(o=>{if(o.name.includes('paw')||o.name==='Cat seated haunches')paws.push(o);});
 const contacts=paws.map(o=>o.position.toArray());
 for(const [time,sign] of [[0,0],[5,1],[12,0],[20,-1],[28,0],[35,1],[42,0]]){
  c.update(time,8);assert.equal(Math.sign(c.head.rotation.y),sign);
  assert.deepEqual(paws.map(o=>o.position.toArray()),contacts);assert.deepEqual(c.cat.scale.toArray(),[1,1,1]);
 }
 const tail=c.cat.getObjectByName('Curled tail inside carrier');
 c.update(10,8);const before=Array.from(tail.geometry.attributes.position.array),head=c.head.rotation.toArray();
 c.update(10,0);assert.deepEqual(Array.from(tail.geometry.attributes.position.array),before);assert.deepEqual(c.head.rotation.toArray(),head);
 c.update(40,0);const direct=createCat(new THREE.Group(),{carrier:true});direct.update(40,0);
 assert.deepEqual(c.head.rotation.toArray(),direct.head.rotation.toArray());
 assert.deepEqual(Array.from(tail.geometry.attributes.position.array),Array.from(direct.cat.getObjectByName('Curled tail inside carrier').geometry.attributes.position.array));
});
test('full independent gesture cycles preserve rear rack envelope, tail root and smooth motion',()=>{
 const c=createCat(new THREE.Group(),{carrier:true});
 const tail=c.cat.getObjectByName('Curled tail inside carrier'),root=Array.from(tail.geometry.attributes.position.array.slice(0,9*3));
 const ears=[];c.cat.traverse(o=>{if(o.name==='Cat ear root')ears.push(o);});
 let previous=null,leftMoved=false,rightMoved=false;
 for(let frame=0;frame<=86*30;frame++){
  c.update(frame/30,10);c.root.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(c.cat,true);
  assert.ok(box.min.x>-.86&&box.max.x<-.36&&box.min.z>-.112&&box.max.z<.112&&box.min.y>=.87&&box.max.y<1.23,JSON.stringify(box));
  assert.deepEqual(Array.from(tail.geometry.attributes.position.array.slice(0,27)),root);
  const points=tail.geometry.attributes.position;
  for(let i=0;i<points.count;i++){
   const x=points.getX(i),y=points.getY(i)+c.cat.position.y,z=points.getZ(i);
   const atRimHeight=y>=.0495&&y<=.0825;
   assert.ok(!(atRimHeight&&Math.abs(x)<=.18&&Math.abs(z)>=.103&&Math.abs(z)<=.115),'tail intersects side rim');
   assert.ok(!(atRimHeight&&Math.abs(x)>=.171&&Math.abs(x)<=.183&&Math.abs(z)<=.115),'tail intersects end rim');
  }
  if(previous!==null)assert.ok(Math.abs(c.head.rotation.y-previous)<.02);
  previous=c.head.rotation.y;
  leftMoved ||=Math.abs(ears[0].rotation.y)>.2&&ears[1].rotation.y===0;
  rightMoved ||=Math.abs(ears[1].rotation.y)>.2&&ears[0].rotation.y===0;
 }
 assert.ok(leftMoved&&rightMoved);
});
test('tail skips static uploads and normals, resumes and returns exactly, with conservative bounds',()=>{
 const c=createCat(new THREE.Group(),{carrier:true}),geometry=c.cat.getObjectByName('Curled tail inside carrier').geometry;
 const positions=geometry.attributes.position,rest=positions.array.slice();
 let normals=0;const compute=geometry.computeVertexNormals.bind(geometry);geometry.computeVertexNormals=()=>{normals++;compute();};
 const version=positions.version;
 for(let i=1;i<=240;i++)c.update(i/30,8);
 assert.equal(normals,0);assert.equal(positions.version,version);
 const point=new THREE.Vector3();
 for(let i=241;i<=31*30;i++){
  c.update(i/30,8);
  for(let j=0;j<positions.count;j++){
   point.fromBufferAttribute(positions,j);
   assert.ok(geometry.boundingBox.containsPoint(point));assert.ok(geometry.boundingSphere.containsPoint(point));
  }
 }
 assert.ok(normals>0&&normals<31*30-240);assert.deepEqual(positions.array,rest);
 const after=normals;c.update(31,0);assert.equal(normals,after);
 c.update(41,8);const direct=createCat(new THREE.Group(),{carrier:true});direct.update(41,0);
 assert.deepEqual(positions.array,direct.cat.getObjectByName('Curled tail inside carrier').geometry.attributes.position.array);
});
test('eye patches remain outside the head surface through slow blinks and head turns',()=>{
 const c=createCat(new THREE.Group());
 for(const time of [0,5.28,5.36,5.42,5.5,12.95,20,35]){
  c.update(time);c.root.updateMatrixWorld(true);
  for(const eye of c.head.children.filter(o=>o.name==='Cat blinking eye'))for(const patch of eye.children){
   const positions=patch.geometry.attributes.position;
   for(let i=0;i<positions.count;i++){
    const point=new THREE.Vector3().fromBufferAttribute(positions,i).applyMatrix4(patch.matrixWorld);c.head.worldToLocal(point);
    const surface=-.080*Math.sqrt(1-(point.y/.073)**2-(point.z/.069)**2);
    assert.ok(surface-point.x>.00049&&surface-point.x<.00141,'eye remains a thin attached colour patch');
   }
  }
 }
});
