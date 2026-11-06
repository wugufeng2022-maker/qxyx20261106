import {RABBIT_HOME} from '../src/start-courtyard.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {screenTilt,createTiltSteering} from '../src/tilt-steering.js';
import {updateRide} from '../src/route.js';

function rig(options={}){
 const target=new EventTarget();let time=0,angle=0;
 const c=createTiltSteering({target,orientation:{},secure:true,now:()=>time,angle:()=>angle,...options});
 return {c,advance(ms){time+=ms;c.tick();},rotate(a){angle=a;c.rotate();},sample(beta,gamma){const e=new Event('deviceorientation');e.beta=beta;e.gamma=gamma;target.dispatchEvent(e);},step(beta,gamma,count=20){for(let i=0;i<count;i++){time+=30;this.sample(beta,gamma);}}};
}
test('gravity projects screen right in each orientation, independent of compass',()=>{
 // Physical screen-right tilt of a phone, expressed in natural device axes.
 // 0: right edge lowered (gamma+); 90: natural top lowered (beta-);
 // 180: natural left lowered (gamma-); 270: natural bottom lowered (beta+).
 for(const [angle,b,g] of [[0,0,12],[90,-12,0],[180,0,-12],[270,12,0]]){
   assert.ok(Math.abs(screenTilt(b,g,angle)-12)<1e-9);
   assert.ok(Math.abs(screenTilt(-b,-g,angle)+12)<1e-9);
 }
 for(const v of [null,undefined,NaN,Infinity,'10']){assert.equal(screenTilt(v,0),null);assert.equal(screenTilt(0,v),null);}
});
test('equivalent Euler representations around vertical stay continuous',()=>{
 // Same gravity vector across beta 90°, gamma +90/-90 boundary.
 assert.ok(Math.abs(screenTilt(89.999,90)-screenTilt(90.001,-90))<1e-8);
 assert.ok(Math.abs(screenTilt(89.999,90,90)-screenTilt(90.001,-90,90))<1e-6);
});
test('starts off; valid sample calibrates neutral, dead zone then smooth relative turning',async()=>{
 const r=rig();assert.equal(r.c.snapshot().enabled,false);await r.c.enable();assert.equal(r.c.snapshot().status,'waiting');
 r.sample(null,0);assert.equal(r.c.snapshot().status,'waiting');r.sample(10,8);assert.equal(r.c.snapshot().value,0);
 r.step(10,9);assert.equal(r.c.snapshot().value,0);r.step(10,25);assert.ok(r.c.snapshot().value>.5);
 r.c.calibrate();assert.equal(r.c.snapshot().value,0);r.sample(10,25);assert.equal(r.c.snapshot().value,0);
 r.step(10,5);assert.ok(r.c.snapshot().value<-.5);
});
test('paused, restored, rotated and expired readings cannot retain steering',async()=>{
 const r=rig();await r.c.enable();r.sample(0,0);r.step(0,25);assert.ok(r.c.snapshot().value>.8);
 r.c.setBlocked(true);assert.equal(r.c.snapshot().value,0);r.step(0,25);assert.equal(r.c.snapshot().value,0);
 r.c.setBlocked(false);assert.equal(r.c.snapshot().value,0);r.sample(0,25);assert.equal(r.c.snapshot().value,0);
 r.step(0,0);assert.ok(r.c.snapshot().value<-.8);
 r.rotate(90);assert.equal(r.c.snapshot().value,0);r.sample(-25,0);assert.equal(r.c.snapshot().value,0);
 r.step(-45,0);assert.ok(r.c.snapshot().value>.8);r.advance(1601);assert.equal(r.c.snapshot().value,0);assert.equal(r.c.snapshot().status,'stale');
 r.sample(-45,0);assert.equal(r.c.snapshot().value,0);assert.equal(r.c.snapshot().status,'ready');
});
test('unsupported, insecure, denied, invalid-only and absent sensors report honestly',async()=>{
 for(const [opts,status] of [[{orientation:null},'unsupported'],[{secure:false},'insecure'],[{orientation:{requestPermission:()=>Promise.resolve('denied')}},'denied'],[{orientation:{requestPermission:()=>{throw Error();}}},'denied']]){
  const r=rig(opts);await r.c.enable();assert.equal(r.c.snapshot().status,status);assert.equal(r.c.snapshot().enabled,false);
 }
 const r=rig();await r.c.enable();r.sample(null,null);r.sample(NaN,Infinity);r.advance(6001);assert.equal(r.c.snapshot().status,'stale');assert.equal(r.c.snapshot().value,0);
});
test('permission called synchronously; disable and timeout invalidate late permission',async()=>{
 let resolve,called=false;
 const r=rig({orientation:{requestPermission:()=>{called=true;return new Promise(r=>resolve=r);}}});
 const pending=r.c.enable();assert.equal(called,true);r.c.disable();resolve('granted');await pending;assert.equal(r.c.snapshot().enabled,false);
 const late=r.c.enable();r.advance(10001);assert.equal(r.c.snapshot().status,'timeout');resolve('granted');await late;assert.equal(r.c.snapshot().enabled,false);
});
test('manual arrows win; neutral enabled tilt suppresses mouse and joyful weave',()=>{
 const fresh=()=>({started:true,paused:false,auto:true,speed:5,distance:20,lane:0,turn:0,rideMode:'joyful',pointerSteer:-1,tiltEnabled:true,tiltSteer:0});
 const centered=fresh();updateRide(centered,new Set(),.1);assert.equal(centered.lane,0);
 const tilt=fresh();tilt.tiltSteer=.8;updateRide(tilt,new Set(),.1);assert.ok(tilt.lane>0);
 const key=fresh();key.tiltSteer=.8;updateRide(key,new Set(['ArrowLeft']),.1);assert.ok(key.lane<0);
 const both=fresh();both.tiltSteer=.8;updateRide(both,new Set(['ArrowLeft','ArrowRight']),.1);assert.equal(both.lane,0);
 const mouse=fresh();mouse.tiltEnabled=false;updateRide(mouse,new Set(),.1);assert.ok(mouse.lane<0);
});

test('animal stop, greeting and boarding hold tilt neutral until active; resume recalibrates',async()=>{
 const {animalHolding,stopForAnimal,updateAnimalEncounter,inviteAnimal}=await import('../src/animal-interaction.js');
 const r=rig();await r.c.enable();r.sample(0,0);r.step(0,20);
 const animal={status:'available',time:0},home=RABBIT_HOME;
 const ride={started:true,paused:false,auto:true,speed:5,distance:home-2,lane:0,turn:0,tiltEnabled:true};
 assert.ok(stopForAnimal(animal,home,ride.distance,ride.speed));r.c.setBlocked(true);
 for(let frame=0;frame<40;frame++){
  r.c.setBlocked(animalHolding(animal));r.step(0,frame%2?25:-25,1);ride.tiltSteer=r.c.snapshot().value;
  updateRide(ride,new Set(['ArrowDown']),.03);updateAnimalEncounter(animal,home,.3,{...ride,dt:.03});
  assert.equal(ride.lane,0);
 }
 assert.equal(animal.status,'talking');assert.ok(inviteAnimal(animal,home,ride.distance,ride.speed,'front',[animal]));
 for(let frame=0;frame<11;frame++){
  r.c.setBlocked(animalHolding(animal));r.step(0,25,1);assert.equal(r.c.snapshot().value,0);
  updateAnimalEncounter(animal,home,.3,{...ride,dt:.03});
 }
 assert.equal(animal.status,'active');r.c.setBlocked(animalHolding(animal));r.sample(0,25);assert.equal(r.c.snapshot().value,0);
 r.step(0,0);assert.ok(r.c.snapshot().value<-.8);
});
