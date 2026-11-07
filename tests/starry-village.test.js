import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {PAINTING,paintingWeight,choosePainting,wantsPainting} from '../src/painting.js';
import {createEncounterDirector,updateEncounterDirector} from '../src/encounter-director.js';
import {loadJourney,remember} from '../src/journey.js';
import {centerAt,tangentAt} from '../src/route.js';
import {STARRY,STARRY_LIGHT,canEnterStarry,createStarryEvent,createStarryWorld,enterStarry,fadeCountryside,leaveStarry,skipStarry,starryBend,starryBendCount,starryFigurePose,starryRoadFrame,starryRoadSpan,starryView,starryVillageSeconds,updateStarry} from '../src/starry-village.js';

const tick=(e,distance,dt=.05,extra={})=>updateStarry(e,{started:true,paused:false,distance,dt,...extra});

test('starry village is a separate theme on the real wheat road',()=>{
  assert.ok(PAINTING.end<STARRY.sight);
  assert.equal(paintingWeight((STARRY.revealEnd+STARRY.releaseStart)/2),0);
  assert.equal(starryView({status:'active',entryAt:STARRY.easel},1130).distant,0);
  assert.equal(starryBendCount(),3);
  assert.equal(starryBend(STARRY.revealEnd),0);
  assert.equal(starryBend(STARRY.releaseStart),0);
  assert.ok(Math.abs(starryBend((STARRY.revealEnd+STARRY.releaseStart)/2))>4);
  let swing=0;
  for(let s=STARRY.revealEnd;s<STARRY.releaseStart-45;s+=5)swing=Math.max(swing,Math.abs(starryBend(s+45)-starryBend(s)));
  assert.ok(swing>2.2,`visible bend ${swing}`);
  assert.ok(starryRoadSpan()>8);
  const seconds=starryVillageSeconds();
  assert.ok(seconds>52&&seconds<70,`village ride ${seconds}`);
  let heading=0;
  for(let s=STARRY.revealEnd;s<STARRY.releaseStart;s++)heading=Math.max(heading,Math.abs(Math.atan(tangentAt(s+1))-Math.atan(tangentAt(s))));
  assert.ok(heading<.01);
  for(let s=STARRY.revealEnd;s<=STARRY.releaseStart;s+=20){
    const frame=starryRoadFrame(s,0);
    assert.equal(frame.x,centerAt(s));
    assert.equal(frame.z,-s);
    assert.equal(frame.yaw,Math.atan2(1,tangentAt(s)));
  }
});

test('entry is voluntary and stages blue before the village, then restores daylight',()=>{
  const early=createStarryEvent();tick(early,STARRY.sight-5);assert.equal(early.status,'unseen');
  tick(early,STARRY.promptStart);assert.equal(canEnterStarry(early,STARRY.promptStart),true);
  assert.equal(enterStarry(early,STARRY.promptStart),true);
  assert.equal(enterStarry(early,STARRY.promptStart),false);
  const viewAt=s=>starryView(early,s);
  assert.ok(viewAt(early.entryAt).connect<.001&&viewAt(early.entryAt).distant<.001);
  let ledBlue=false,ledRoad=false;
  for(let s=early.entryAt;s<STARRY.releaseStart;s+=1){
    const view=viewAt(s);
    if(view.distant>.25&&!ledRoad){assert.ok(view.connect>.5);ledRoad=true;}
    if(view.village>.2&&!ledBlue){assert.ok(view.distant>.75);ledBlue=true;}
    const next=viewAt(s+1);
    for(const key of ['connect','distant','village'])assert.ok(Math.abs(next[key]-view[key])<.12);
  }
  assert.equal(ledBlue,true);
  for(const key of ['connect','distant','village'])assert.ok(viewAt(STARRY.releaseEnd+3)[key]<.001);
  const late=createStarryEvent();late.status='available';
  assert.equal(enterStarry(late,10),false);
  assert.equal(enterStarry(late,STARRY.promptEnd),true);
  const lateView=starryView(late,late.entryAt);
  assert.ok(lateView.connect<.001&&lateView.village<.001);
  assert.ok(starryView(late,(STARRY.revealEnd+STARRY.releaseStart)/2).village>.9);
});

test('ignore, leave, pause, refresh and passing again do not retrigger or stick',()=>{
  const ignored=createStarryEvent();tick(ignored,STARRY.promptStart);skipStarry(ignored);
  tick(ignored,STARRY.promptStart+10);tick(ignored,STARRY.easel);assert.equal(ignored.status,'skipped');
  assert.equal(canEnterStarry(ignored,STARRY.easel),false);
  assert.deepEqual(starryView(ignored,4600),{connect:0,distant:0,village:0});
  const missed=createStarryEvent();tick(missed,4600);assert.equal(missed.status,'skipped');assert.equal(missed.journal,false);
  const rider=createStarryEvent();tick(rider,STARRY.promptStart);enterStarry(rider,STARRY.promptStart);
  const before=structuredClone(rider);updateStarry(rider,{started:true,paused:true,distance:4600,dt:1});assert.deepEqual(rider,before);
  assert.equal(leaveStarry(rider,4500),true);
  for(let i=0;i<40;i++)tick(rider,4500,.1);
  assert.equal(rider.status,'done');assert.equal(rider.journal,false);
  assert.deepEqual(starryView(rider,4500),{connect:0,distant:0,village:0});
  tick(rider,STARRY.promptStart);assert.notEqual(rider.status,'available');
  const fresh=createStarryEvent();assert.equal(fresh.status,'unseen');assert.deepEqual(starryView(fresh,4620),{connect:0,distant:0,village:0});
  const through=createStarryEvent();tick(through,STARRY.promptStart);enterStarry(through,STARRY.promptStart);
  let guard=0;for(let s=through.entryAt;s<STARRY.end+24&&through.status!=='done';s+=8){tick(through,s,.2);guard++;}
  assert.equal(through.status,'done');assert.equal(through.journal,true);assert.ok(guard<80);
  assert.equal(through.attention,false);
});

test('one major encounter at a time and the journal does not unlock night or impressionism',()=>{
  const director=createEncounterDirector();
  const events={walker:{status:'active'},starry:{attention:true,status:'available'}};
  assert.equal(updateEncounterDirector(director,events,{distance:500}),'walker');
  events.walker.status='departing';events.starry.attention=false;
  const starry=createStarryEvent();tick(starry,STARRY.promptStart);enterStarry(starry,STARRY.promptStart);tick(starry,STARRY.promptStart+12);
  const ride={duck:{status:'unseen'},artist:{status:'unseen'},starry};
  const owned=createEncounterDirector();
  assert.equal(updateEncounterDirector(owned,ride,{distance:4500}),'starry');
  ride.duck.status='available';
  assert.equal(updateEncounterDirector(owned,ride,{distance:4510}),'starry');
  const storage={data:new Map(),getItem:k=>storage.data.get(k)||null,setItem:(k,v)=>storage.data.set(k,v)};
  const journey=loadJourney(storage);remember(journey,'starry',storage);
  assert.equal(journey.themes.impressionist,false);assert.equal(journey.memories.starry,true);
  const pref={choice:'off',invitation:false};choosePainting(pref,'impressionist');
  assert.equal(wantsPainting(pref,'arrived',true),true);
  assert.equal(wantsPainting({choice:'off',invitation:false},'active',false),false);
  assert.notEqual(STARRY_LIGHT.background,'#dce7d0');
});

test('painted props stay off the rideable road and daytime props can fade without sharing materials',()=>{
  const pose=starryFigurePose(createStarryEvent(),STARRY.easel);
  assert.ok(Math.abs(pose.bike.lane)>2.8&&Math.abs(pose.easel.lane)>2.5);
  assert.ok(Math.abs(pose.easel.lane)<Math.abs(pose.bike.lane));
  const scene=new THREE.Scene(),world=createStarryWorld(scene);
  world.update({connect:0,distant:0,village:0},{x:0,y:0,s:4600},[]);
  assert.equal(world.group.visible,false);
  assert.equal(world.road.material.polygonOffset,true);
  assert.equal(world.dome.material.fog,false);
  assert.equal(world.nebula.material.fog,false);
  assert.equal(world.moon.material.fog,false);
  assert.ok(['procedural-sky','flat-color'].includes(world.group.userData.samples.texture));
  const {stones,houses,trees,wallTops,clusters,moon,roadHalf}=world.group.userData.samples;
  assert.equal(roadHalf,2.15);
  assert.ok(stones.length>800&&stones.length<12000);
  assert.ok(houses.length>=12&&trees.length>=6&&clusters>=4);
  assert.ok(Math.max(...wallTops)-Math.min(...wallTops)>.18);
  assert.ok(moon.z<-12&&moon.y>5&&moon.x<0);
  for(const spot of stones){
    assert.ok(Math.abs(spot.lane)-spot.r>2.25);
    assert.ok(Number.isFinite(spot.x+spot.y+spot.z));
  }
  for(const home of houses)assert.ok(Math.abs(home.lane)>=4.7);
  for(const tree of trees){assert.ok(Math.abs(tree.lane)>3.4);assert.ok(tree.branches>=4);}
  world.update({connect:1,distant:1,village:1},{x:centerAt(4620),y:0,s:4620},[]);
  assert.equal(world.group.visible,true);
  assert.equal(world.road.material.opacity,1);
  assert.equal(world.dome.material.opacity,1);
  const shared=new THREE.MeshBasicMaterial({opacity:1});
  const mesh=new THREE.Mesh(new THREE.BufferGeometry(),shared);mesh.name='Golden wheat fields';
  const inside=new THREE.Group();inside.name='Countryside_70';inside.add(mesh);
  const outside=mesh.clone();outside.material=shared;const far=new THREE.Group();far.name='Countryside_10';far.add(outside);
  fadeCountryside([inside,far],1);
  assert.notEqual(mesh.material,shared);assert.ok(mesh.material.opacity<.05);assert.equal(shared.opacity,1);assert.equal(outside.material,shared);
  fadeCountryside([inside],0);assert.equal(mesh.material,shared);assert.equal(mesh.visible,true);
  world.dispose();
});
