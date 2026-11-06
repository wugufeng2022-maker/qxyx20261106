import {CAT_HOME} from '../src/village-cat-site.js';
import {RABBIT_HOME} from '../src/start-courtyard.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {canStopForAnimal,stopForAnimal,leaveAnimal,inviteAnimal,updateAnimalEncounter,animalHolding,withinAnimalHit} from '../src/animal-interaction.js';
import {updateRide} from '../src/route.js';
for(const home of [RABBIT_HOME,CAT_HOME])test(`animal ${home}: deliberate click, bounded brake, stationary invitation, resume`,()=>{
 const e={status:'unseen',time:0},s={started:true,paused:false,auto:true,distance:home-60,speed:8.5,lane:0,turn:0};
 const tick=dt=>updateAnimalEncounter(e,home,1.2,{...s,dt});tick(.05);
 assert.equal(e.status,'available');assert.equal(animalHolding(e),false);
 assert.equal(stopForAnimal(e,home,s.distance,s.speed),false);assert.equal(inviteAnimal(e,home,home,0),false);
 s.distance=home-10;assert.ok(canStopForAnimal(e,home,s.distance,s.speed));assert.ok(stopForAnimal(e,home,s.distance,s.speed));
 for(let i=0;i<100;i++){updateRide(s,animalHolding(e)?new Set(['s']):new Set(),.05);tick(.05);}
 assert.equal(e.status,'talking');assert.equal(s.speed,0);assert.ok(Math.abs(s.distance-home)<12);
 const before=structuredClone(e);s.paused=true;tick(5);assert.deepEqual(e,before);s.paused=false;
 assert.ok(leaveAnimal(e));assert.equal(e.status,'available');updateRide(s,new Set(),.05);assert.ok(s.speed>0);
 assert.ok(stopForAnimal(e,home,s.distance,s.speed));s.speed=0;tick(.05);assert.ok(inviteAnimal(e,home,s.distance,s.speed));
 tick(1.3);assert.equal(e.status,'active');assert.equal(animalHolding(e),false);assert.equal(stopForAnimal(e,home,s.distance,0),false);
});
test('late fast click is refused, leaving and passing expires without boarding',()=>{
 const e={status:'available',time:0};assert.equal(stopForAnimal(e,100,110,8.5),false);
 assert.ok(stopForAnimal(e,100,99,0));assert.ok(leaveAnimal(e));
 updateAnimalEncounter(e,100,1,{started:true,paused:false,distance:119,speed:5,dt:.05});assert.equal(e.status,'skipped');
});
test('touch expands only the bounded projected animal, never unrelated scenery',()=>{
 const b={minX:100,maxX:115,minY:80,maxY:110};assert.ok(withinAnimalHit({x:80,y:90},b,22));assert.equal(withinAnimalHit({x:60,y:90},b,22),false);assert.equal(withinAnimalHit({x:80,y:90},b,10),false);
});
