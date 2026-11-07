import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {PAINTING,paintingWeight,choosePainting,wantsPainting} from '../src/painting.js';
import {createEncounterDirector,updateEncounterDirector} from '../src/encounter-director.js';
import {loadJourney,remember} from '../src/journey.js';
import {CREEK_REACH,centerAt,groundAt,tangentAt} from '../src/route.js';
import {updateRide} from '../src/route.js';
import {STARRY,STARRY_LIGHT,STARRY_SIGN,createStarryEvent,createStarryWorld,enterStarry,fadeCountryside,leaveStarry,starryBend,starryBendCount,starryBranchCenter,starryFigurePose,starryLaneGuide,starryPaintedFrame,starryRoadFrame,starrySurfaceY,starryView,starryVillageSeconds,updateStarry} from '../src/starry-village.js';

const tick=(e,distance,lane=0,dt=.05)=>updateStarry(e,{started:true,paused:false,distance,lane,dt});

test('the painter-village branch leaves the wheat road and rejoins it',()=>{
  assert.ok(PAINTING.end<STARRY.sight);
  assert.ok(STARRY.releaseEnd<CREEK_REACH.start);
  assert.equal(paintingWeight((STARRY.split+STARRY.releaseEnd)/2),0);
  assert.equal(starryBranchCenter(STARRY.split),0);
  assert.equal(starryBranchCenter(STARRY.releaseEnd),0);
  assert.equal(starryBend(STARRY.split),0);
  assert.ok(Math.abs(starryBranchCenter((STARRY.split+STARRY.releaseEnd)/2))>5);
  assert.ok(starryBendCount()>=2);
  const seconds=starryVillageSeconds();
  assert.ok(seconds>48&&seconds<80,`branch ride ${seconds}`);
  let swing=0;
  for(let s=STARRY.split;s<STARRY.releaseEnd-40;s+=5)swing=Math.max(swing,Math.abs(starryBranchCenter(s+40)-starryBranchCenter(s)));
  assert.ok(swing>2);
  for(let s=STARRY.split;s<=STARRY.releaseEnd;s+=20){
    const main=starryRoadFrame(s,0);
    assert.equal(main.x,centerAt(s));
    assert.equal(main.z,-s);
    assert.equal(main.yaw,Math.atan2(1,tangentAt(s)));
  }
  assert.equal(STARRY_SIGN.title,'画家村');
  assert.equal(STARRY_SIGN.subtitle,'写生小径');
  assert.equal(STARRY_SIGN.note,'前方汇回主路');
  assert.equal(STARRY_SIGN.subtitle.includes('沿溪'),false);
});

test('steering chooses the branch; the main road still continues and dusk stays on the branch',()=>{
  let mouth=STARRY.split+20;
  for(let s=STARRY.split;s<STARRY.split+90;s++)if(Math.abs(starryBranchCenter(s))>1.2&&Math.abs(starryBranchCenter(s))<3.1){mouth=s;break;}
  const open=starryLaneGuide(mouth,0);
  assert.equal(open.onBranch,false);
  assert.ok(open.min<starryBranchCenter(mouth));
  const taking=starryLaneGuide(mouth,starryBranchCenter(mouth));
  assert.equal(taking.onBranch,true);
  const mid=(STARRY.split+STARRY.releaseEnd)/2;
  const stay=starryLaneGuide(mid,0);
  const ride=starryLaneGuide(mid,starryBranchCenter(mid));
  assert.equal(stay.onBranch,false);
  assert.equal(ride.onBranch,true);
  assert.ok(stay.max<=1.6&&stay.min>=-1.6);
  assert.ok(Math.abs(starryBranchCenter(mid))>4);
  assert.deepEqual(starryView(createStarryEvent(),mid,0),{connect:0,distant:0,village:0});
  const onPath=starryView(createStarryEvent(),mid,starryBranchCenter(mid));
  assert.ok(onPath.distant>.8&&onPath.village>.8);
  assert.ok(starryView(createStarryEvent(),STARRY.releaseEnd+6,starryBranchCenter(STARRY.releaseEnd+6)).distant<0.001);
  const state={started:true,paused:false,speed:5,distance:mouth,lane:0,auto:true,walking:false,walkRequested:false,rideMode:'leisure',fastRequested:false,pointerSteer:0,weaveSafe:false,shoulderAllowed:false,laneGuide:starryLaneGuide(mouth,0)};
  updateRide(state,new Set(['ArrowLeft']),.4);
  assert.ok(state.lane<0);
  assert.equal(enterStarry(),false);
  assert.equal(leaveStarry(),false);
});

test('riding the branch can be remembered; passing on the main road does not lock other encounters',()=>{
  const passed=createStarryEvent();
  tick(passed,STARRY.releaseEnd+8,0);
  assert.equal(passed.status,'passed');
  assert.equal(passed.journal,false);
  assert.equal(passed.attention,false);
  const rider=createStarryEvent();
  const before=structuredClone(rider);
  updateStarry(rider,{started:true,paused:true,distance:4500,lane:starryBranchCenter(4500),dt:1});
  assert.deepEqual(rider,before);
  for(let s=STARRY.split+30;s<STARRY.releaseEnd;s+=12)tick(rider,s,starryBranchCenter(s),.2);
  assert.equal(rider.status,'done');
  assert.equal(rider.journal,true);
  const director=createEncounterDirector();
  const events={duck:{status:'available'},starry:rider};
  assert.equal(updateEncounterDirector(director,events,{distance:4500}),'duck');
  const storage={data:new Map(),getItem:k=>storage.data.get(k)||null,setItem:(k,v)=>storage.data.set(k,v)};
  const journey=loadJourney(storage);remember(journey,'starry',storage);
  assert.equal(journey.themes.impressionist,false);
  assert.equal(journey.memories.starry,true);
  assert.equal(wantsPainting({choice:'off',invitation:false},'active',false),false);
  choosePainting({choice:'off',invitation:false},'impressionist');
  assert.notEqual(STARRY_LIGHT.background,'#dce7d0');
});

test('branch asphalt, plants and the sign stay rideable without a colored wall',()=>{
  const pose=starryFigurePose(createStarryEvent(),STARRY.easel);
  assert.ok(Math.abs(pose.bike.lane)>2.8&&Math.abs(pose.easel.lane)>2.5);
  assert.ok(Math.abs(pose.easel.lane)<Math.abs(pose.bike.lane));
  const scene=new THREE.Scene(),world=createStarryWorld(scene);
  world.update({connect:0,distant:0,village:0},{x:0,y:0,s:1000},[]);
  assert.equal(world.group.visible,false);
  world.update({connect:0,distant:0,village:0},{x:0,y:0,s:4520},[]);
  assert.equal(world.group.visible,true);
  assert.equal(world.dome.visible,false);
  assert.equal(world.road.name,'Painter village asphalt');
  assert.equal(world.sign.name,'画家村路牌');
  world.group.traverse(obj=>{
    assert.notEqual(obj.name,'Colored pebble wall');
    assert.notEqual(obj.name,'Painted brick center');
    if(obj.geometry?.type==='PlaneGeometry'&&obj.name!=='Painter village sign')assert.ok(Math.max(obj.geometry.parameters.width,obj.geometry.parameters.height)<2,obj.name);
  });
  const {houses,trees,plants,roadHalf,walls,sign}=world.group.userData.samples;
  assert.equal(walls,0);
  assert.equal(roadHalf,STARRY.roadHalf);
  assert.equal(sign.subtitle,'写生小径');
  assert.ok(houses.length>=3&&houses.length<8);
  assert.ok(houses.every(home=>home.s>4460&&home.lane<0));
  assert.ok(trees.filter(tree=>tree.replaced).length>=2);
  assert.ok(trees.every(tree=>Math.abs(tree.lane)>3.4&&tree.branches>=4));
  assert.ok(plants.length>20);
  assert.ok(plants.every(spot=>Math.abs(spot.lane)>roadHalf+.7));
  const gray=world.road.material.color;
  assert.ok(Math.abs(gray.r-gray.g)<.08&&Math.abs(gray.g-gray.b)<.08);
  assert.ok(gray.r>.35&&gray.r<.75);
  world.update({connect:1,distant:1,village:1},{x:0,y:0,s:4520},[]);
  assert.equal(world.dome.material.opacity,1);
  assert.equal(world.dome.material.fog,false);
  const roadPos=world.road.geometry.attributes.position;
  for(let s=STARRY.split+8;s<=STARRY.releaseEnd-8;s+=10){
    const point=starryPaintedFrame(s,0);
    let nearest=Infinity,nearestY=0;
    for(let i=0;i<roadPos.count;i++){
      const d=Math.hypot(roadPos.getX(i)-point.x,roadPos.getZ(i)-point.z);
      if(d<nearest){nearest=d;nearestY=roadPos.getY(i);}
    }
    assert.ok(nearest<1.1,`${s} is ${nearest}m off the branch`);
    assert.ok(nearestY>=starrySurfaceY(point.x,s)-.01,`${s} branch is buried`);
    if(Math.abs(starryBranchCenter(s))>4)assert.ok(Math.hypot(point.x-centerAt(s),point.z+s)>3);
  }
  const shared=new THREE.MeshBasicMaterial({opacity:1});
  const mesh=new THREE.Mesh(new THREE.BufferGeometry(),shared);mesh.name='Golden wheat fields';
  const inside=new THREE.Group();inside.name='Countryside_70';inside.add(mesh);
  const outside=mesh.clone();outside.material=shared;const far=new THREE.Group();far.name='Countryside_10';far.add(outside);
  fadeCountryside([inside,far],1);
  assert.notEqual(mesh.material,shared);assert.ok(mesh.material.opacity<.05);assert.equal(shared.opacity,1);
  fadeCountryside([inside],0);assert.equal(mesh.material,shared);
  world.dispose();
});
