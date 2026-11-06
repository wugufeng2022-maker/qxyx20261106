import test from 'node:test';
import assert from 'node:assert/strict';
import {createDuckEvent,updateDuckEvent,canChooseDuckWait,chooseDuckWait,leaveDuckWait,duckSurface,DUCK_CROSSING,DUCK_SPACING,inDuckCorridor} from '../src/duck-event.js';
import {LAKE,brakeRate,centerAt,groundAt,heightAt,lakeRadius,roadRelief,updateRide} from '../src/route.js';
function tick(e,distance,speed=0,dt=.05,paused=false){return updateDuckEvent(e,{distance,speed,dt,paused});}
test('discover, explicitly wait, cross and finish one bounded family journey',()=>{
  const e=createDuckEvent();tick(e,929);assert.equal(e.status,'unseen');tick(e,930);assert.equal(e.status,'available');assert.equal(e.waiting,false);
  chooseDuckWait(e,932);assert.equal(e.waiting,false);chooseDuckWait(e,956);assert.equal(e.waiting,true);
  for(let i=0;i<600;i++)tick(e,958);
  assert.equal(e.status,'complete');assert.equal(e.waiting,false);assert.ok(e.positions[3]>15);
  const end=structuredClone(e);tick(e,930);assert.deepEqual({...e,swimTime:end.swimTime},end);
});
test('passing never requests braking; family yields until rider safely passed',()=>{
  const e=createDuckEvent();tick(e,960,9);assert.equal(e.waiting,false);assert.equal(e.status,'available');
  tick(e,986,9);assert.equal(e.status,'active');assert.equal(e.waiting,false);
  for(let i=0;i<600;i++)tick(e,989,0);
  assert.equal(e.status,'complete');
});
test('pause freezes every event field; departure skips and revisiting cannot respawn',()=>{
  const e=createDuckEvent();tick(e,956);chooseDuckWait(e,956);tick(e,958,0,1);const frozen=structuredClone(e);
  tick(e,958,0,20,true);assert.deepEqual(e,frozen);
  leaveDuckWait(e);assert.equal(e.waiting,false);tick(e,1021);assert.equal(e.status,'skipped');
  const prior=e.positions[0];tick(e,930,0,10);assert.equal(e.status,'skipped');assert.ok(e.positions[0]>=prior);assert.equal(e.waiting,false);
  const missed=createDuckEvent();tick(missed,1200);assert.equal(missed.status,'skipped');
});
test('early resume makes remaining verge ducks yield, without slowing rider',()=>{
  const e=createDuckEvent();tick(e,956);chooseDuckWait(e,956);
  for(let i=0;i<20;i++)tick(e,958,3);
  leaveDuckWait(e);
  for(let i=0;i<80;i++)tick(e,961,9);
  assert.equal(e.waiting,false);assert.ok(e.positions.every(p=>p<=-2.8));assert.equal(e.yielding,true);
});
test('family approaches before the card and keeps the road clear for a slow pass',()=>{
  const e=createDuckEvent(),start=e.positions[0];
  for(let i=0;i<60;i++)tick(e,924,2);
  assert.equal(e.status,'unseen');assert.ok(e.positions[0]>start+2);
  for(let s=930;s<=985;s+=.1){
    tick(e,s,2);
    assert.ok(e.positions.every(p=>p<=-2.8));
    assert.equal(e.waiting,false);
  }
  for(let i=0;i<60;i++)tick(e,986,2);
  assert.ok(e.positions[0]>-2.8);
  const nearby=createDuckEvent();tick(nearby,969,9);
  assert.equal(canChooseDuckWait(nearby,969,9),false);
  assert.equal(canChooseDuckWait(nearby,969,2),true);
});

test('a permitted wait stops within reach for cycling, pushing and dismounting',()=>{
  const event=createDuckEvent();tick(event,960);
  for(const motion of [{walking:false,speed:7},{walking:true,speed:1.05},{walking:false,walkRequested:true,speed:7}]){
    const rate=brakeRate(motion);
    const state={started:true,distance:974-motion.speed**2/(2*rate)-.02,turn:0,lane:0,...motion};
    assert.equal(canChooseDuckWait(event,state.distance,state.speed,rate),true);
    for(let i=0;i<250&&state.speed>0;i++)updateRide(state,new Set(['ArrowDown']),.05);
    assert.equal(state.speed,0);assert.ok(state.distance<=974);
    assert.equal(canChooseDuckWait(event,973.87,1.05,brakeRate({walking:true})),false);
  }
});
test('family spacing, road contact, continuous bank to actual water and clear corridor',()=>{
  const e=createDuckEvent();tick(e,956);chooseDuckWait(e,956);
  for(let i=0;i<600;i++){
    tick(e,958);
    for(let j=1;j<4;j++)assert.ok(e.positions[j-1]-e.positions[j]>=DUCK_SPACING-1e-8);
  }
  for(let lane=-2;lane<=2;lane+=.1)assert.equal(duckSurface(lane).y,heightAt(980)+roadRelief(980,lane)+.018);
  let previous=duckSurface(3).y;
  for(let lane=3.01;lane<20;lane+=.01){const p=duckSurface(lane);assert.ok(Math.abs(p.y-previous)<.01);assert.ok(inDuckCorridor(p.x,p.s));previous=p.y;}
  const water=duckSurface(19);assert.equal(water.swimming,true);assert.equal(water.y,LAKE.level-.10);
});

test('close voluntary wait crosses; early continue queues at most one road clearance',()=>{
  const e=createDuckEvent();tick(e,968);chooseDuckWait(e,968);
  for(let i=0;i<120;i++)tick(e,970);
  assert.ok(e.positions.some(p=>p> -2.8&&p<2.8));
  leaveDuckWait(e);assert.equal(e.resumeRequested,true);assert.equal(e.waiting,true);
  for(let i=0;i<130;i++)tick(e,970);
  assert.equal(e.waiting,false);assert.equal(e.resumeRequested,false);
  assert.ok(e.positions.every(p=>p<=-2.8||p>=2.8));
});

test('resume queue releases with the tail still safe at the verge',()=>{
  const e=createDuckEvent();tick(e,950);chooseDuckWait(e,950);
  while(e.positions[0]<=-2.8)tick(e,950);
  leaveDuckWait(e);assert.equal(e.resumeRequested,true);
  for(let i=0;i<130;i++)tick(e,950);
  assert.equal(e.waiting,false);assert.equal(e.resumeRequested,false);
  assert.ok(e.positions[1]<=-2.8);
});

test('north inlet leaves a dry road and the family continues in the lake after all enter',()=>{
 for(let s=790;s<=980;s+=.25){
   for(const lane of [-3,0,3])assert.ok(groundAt(centerAt(s)+lane,s)>LAKE.level+.5);
 }
 const e=createDuckEvent();tick(e,967);chooseDuckWait(e,967);
 for(let i=0;i<650;i++)tick(e,967);
 assert.equal(e.status,'complete');
 const atEntry=e.positions.map(lane=>duckSurface(lane));
 for(let t=0;t<=70;t+=.25){
   for(const lane of e.positions){
     const p=duckSurface(lane,t);
     assert.ok(p.swimming&&lakeRadius(p.x,p.s)<.96&&groundAt(p.x,p.s)<LAKE.level);
   }
 }
 for(let i=0;i<100;i++)tick(e,967);
 assert.ok(duckSurface(e.positions[0],e.swimTime).x>atEntry[0].x+2);
});

test('rendered body heights and foot immersion stay continuous through shore entry',()=>{
  let previous=duckSurface(12);
  for(let lane=12.001;lane<=16;lane+=.001){
    const p=duckSurface(lane);
    assert.ok(p.immersion>=previous.immersion);
    assert.ok(Math.abs(p.immersion-previous.immersion)<.003);
    for(const offset of [.18,.095])assert.ok(Math.abs((p.y-p.immersion*offset)-(previous.y-previous.immersion*offset))<.002);
    previous=p;
  }
  assert.equal(previous.immersion,1);
});

test('duck memory requires an actual chosen nearby wait through completion',()=>{
 const watched=createDuckEvent();tick(watched,960);chooseDuckWait(watched,960);
 for(let i=0;i<650;i++)tick(watched,960);
 assert.equal(watched.status,'complete');assert.equal(watched.witnessed,true);
 const passing=createDuckEvent();tick(passing,960,9);tick(passing,986,9);
 for(let i=0;i<650;i++)tick(passing,989);
 assert.equal(passing.status,'complete');assert.equal(passing.witnessed,false);
 const early=createDuckEvent();tick(early,960);chooseDuckWait(early,960);tick(early,960,0,1);leaveDuckWait(early);
 for(let i=0;i<650;i++)tick(early,989);
 assert.equal(early.status,'complete');assert.equal(early.witnessed,false);
 const departed=createDuckEvent();tick(departed,960);chooseDuckWait(departed,960);
 for(let i=0;i<650;i++)tick(departed,1015);
 assert.equal(departed.status,'complete');assert.equal(departed.witnessed,false);
 const paused=createDuckEvent();tick(paused,960);chooseDuckWait(paused,960);tick(paused,960,0,3);
 const frozen=structuredClone(paused);tick(paused,960,0,60,true);assert.deepEqual(paused,frozen);
 for(let i=0;i<650;i++)tick(paused,960);
 assert.equal(paused.witnessed,true);
});
