import {RABBIT_HOME} from '../src/start-courtyard.js';
import {stopForAnimal,animalHolding} from '../src/animal-interaction.js';
import {test} from 'node:test';import assert from 'node:assert/strict';import {MathUtils} from 'three';
import {updateRide} from '../src/route.js';import {createDuckEvent,updateDuckEvent,chooseDuckWait} from '../src/duck-event.js';import {createWalkerEvent,updateWalker,inviteWalkerWithWalking,releaseWalkerWalking} from '../src/companions.js';import {createArtistEvent,updateArtist,inviteArtist} from '../src/artist.js';import {createRabbitEvent,updateRabbitEvent,inviteRabbit} from '../src/rabbit-event.js';import {createEncounterDirector,updateEncounterDirector} from '../src/encounter-director.js';
test('full ride joins each encounter, pauses, changes chunks and finishes without stuck controls',()=>{
 const s={started:true,paused:false,auto:true,speed:0,distance:0,lane:0,turn:0,walking:false,walkRequested:false,walkBlend:0};const events={walker:createWalkerEvent(),duck:createDuckEvent(),artist:createArtistEvent(),rabbit:createRabbitEvent()},director=createEncounterDirector(),seen=new Set();let frame=0,chunkChanges=0,lastChunk=0;
 for(;frame<30000&&s.distance<3720;frame++){
  const dt=.05;s.paused=frame%1300>=1290;
  const snapshot=s.paused?JSON.stringify(events):null;
  updateRide(s,events.duck.waiting||animalHolding(events.rabbit)?new Set(['ArrowDown']):new Set(),dt);
  if(!s.paused)s.walkBlend=MathUtils.damp(s.walkBlend,s.walking?1:0,5,dt);
  for(const [id,update] of [['walker',updateWalker],['duck',updateDuckEvent],['artist',updateArtist],['rabbit',updateRabbitEvent]])update(events[id],{...s,dt});
  releaseWalkerWalking(events.walker,s);
  if(s.paused)assert.equal(JSON.stringify(events),snapshot,'pause must freeze every encounter');
  const owner=updateEncounterDirector(director,events,s);
  if(!s.paused){
   if(owner==='walker'&&inviteWalkerWithWalking(events.walker,s)){seen.add('walker');}
   if(owner==='duck'&&!events.duck.waiting&&s.distance>=956&&s.distance+s.speed*s.speed/9<=974)chooseDuckWait(events.duck,s.distance);
   if(events.duck.waiting)seen.add('duck');
   if(owner==='artist'&&inviteArtist(events.artist,s.distance,s.speed))seen.add('artist');
   if(owner==='rabbit')stopForAnimal(events.rabbit,RABBIT_HOME,s.distance,s.speed);
   if(owner==='rabbit'&&inviteRabbit(events.rabbit,s.distance,s.speed))seen.add('rabbit');
  }
  const chunk=Math.floor(s.distance/64);if(chunk!==lastChunk){chunkChanges++;lastChunk=chunk;}
 }
 assert.ok(s.distance>=3720,'journey must remain movable');assert.deepEqual([...seen].sort(),['artist','duck','rabbit','walker']);assert.equal(events.walker.status,'arrived');assert.equal(events.walker.accompanied,true);assert.equal(events.duck.status,'complete');assert.equal(events.duck.witnessed,true);assert.equal(events.artist.status,'arrived');assert.equal(events.rabbit.status,'active');assert.ok(chunkChanges>=24);assert.ok(s.speed>4);
});
