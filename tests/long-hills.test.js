import {test} from 'node:test';
import assert from 'node:assert/strict';
import {heightAt,slopeAt,hillAt,LONG_HILL,landscapeAt,gradeSpeed,updateRide,groundAt,centerAt,ROUTE_LENGTH} from '../src/route.js';
import {previewURL,readPreview} from '../src/dev-preview.js';
import {canWatchPond,POND_STOP} from '../src/pond-stop.js';
import {brakeRate} from '../src/route.js';
const fresh=distance=>({started:true,paused:false,auto:true,speed:0,distance,lane:0,turn:0});
test('optional pond stop accepts only an achievable stop and releases back into the descent',()=>{
 for(const motion of [{speed:42/3.6},{speed:1.05,walking:true},{speed:7,walkRequested:true,walking:false}]){
  const brake=brakeRate({...motion,pondWatching:true});
  const boundary=POND_STOP.to-motion.speed**2/(2*brake);
  const state={...fresh(boundary-.01),...motion};
  assert.ok(canWatchPond(state));
  assert.equal(canWatchPond({...state,distance:boundary+.01}),false);
  assert.equal(canWatchPond({...state,paused:true}),false);
  state.pondWatching=true;
  for(let i=0;i<300&&state.speed>0;i++)updateRide(state,new Set(['ArrowDown']),.05);
  assert.equal(state.speed,0);assert.ok(state.distance<=POND_STOP.to);
  assert.equal(canWatchPond(state),false);
  const stopped=state.distance;
  state.pondWatching=false;
  for(let i=0;i<180;i++)updateRide(state,new Set(),.05);
  assert.ok(state.distance>stopped+2);
 }
});
test('existing heights through the village and lake remain exactly unchanged',()=>{
 for(let s=0;s<=1850;s+=.25){
  assert.equal(heightAt(s),.15+Math.sin(s*.009)*.8+Math.sin(s*.025)*.18);
  assert.equal(slopeAt(s),Math.cos(s*.009)*.0072+Math.cos(s*.025)*.0045);
 }
});
test('long hill has two 700 metre legs, shared continuous height/grade, and smooth feet/crest',()=>{
 assert.equal(LONG_HILL.crest-LONG_HILL.start,700);assert.equal(LONG_HILL.end-LONG_HILL.crest,700);
 assert.equal(hillAt(2550).height,48);
 for(let s=1850;s<=3250;s+=.5){
  assert.ok(Math.abs((heightAt(s+.001)-heightAt(s-.001))/.002-slopeAt(s))<1e-7);
  assert.equal(groundAt(centerAt(s),s),heightAt(s));assert.ok(Math.abs(slopeAt(s))<=.15);
  if(s>1970&&s<2550)assert.ok(slopeAt(s)>0);
  if(s>2550&&s<3250)assert.ok(slopeAt(s)<0);
 }
 for(const joint of [1850,1970,2550,3250]) {
  assert.ok(Math.abs(heightAt(joint+.001)-heightAt(joint-.001))<.001);
  assert.ok(Math.abs(slopeAt(joint+.001)-slopeAt(joint-.001))<.00001);
 }
});
test('equal effort slows the climb, then accelerates smoothly down the sunny side',()=>{
 assert.ok(gradeSpeed(5,2200)*3.6>9&&gradeSpeed(5,2200)*3.6<11);
 assert.ok(gradeSpeed(5,2900)*3.6>33&&gradeSpeed(5,2900)*3.6<=36);
 assert.ok(gradeSpeed(8.5,2900)<=10);
 const up=fresh(2190),down=fresh(2890);
 for(let i=0;i<600;i++){updateRide(up,new Set(),1/60);updateRide(down,new Set(),1/60);}
 assert.ok(down.speed>up.speed+4);assert.ok(down.speed*3.6>33&&down.speed*3.6<=36);
 const boost=fresh(2890);for(let i=0;i<600;i++)updateRide(boost,new Set(['w']),1/60);assert.ok(boost.speed<=10);
 for(let i=0;i<180;i++)updateRide(down,new Set(['s']),1/60);
 assert.equal(down.speed,0);
 down.auto=false;for(let i=0;i<120;i++)updateRide(down,new Set(),1/60);assert.equal(down.speed,0);
 down.paused=true;const snapshot={...down};updateRide(down,new Set(['w']),1);assert.deepEqual(down,snapshot);
 const walk={...fresh(2900),walking:true,walkRequested:true,walkBlend:1};
 for(let i=0;i<300;i++)updateRide(walk,new Set(),1/60);assert.equal(walk.speed,1.05);
});
test('ascent is green and dense, descent opens up; development previews reach both sides',()=>{
 const up=landscapeAt(2200),down=landscapeAt(2900);
 assert.ok(up.uphill>.9&&up.treeDensity>down.treeDensity+.5);assert.ok(down.flowerDensity>up.flowerDensity+.5);
 for(const at of [2160,2550,2820,3250,4000])assert.equal(readPreview(new URL(previewURL('http://localhost/',{at})).search).at,at);
});

test('stronger slopes stay C2 at every elevation knot and meaningfully tilt both long-hill legs',()=>{
 const joints=[1850,1970,2550,3250,3650,4200,4700,5150,5650,6150,6650,7150,7650,8150,8650,9150,9600,10000];
 const h=.01;
 for(const s of joints){
  const left=(slopeAt(s)-slopeAt(s-h))/h,right=(slopeAt(s+h)-slopeAt(s))/h;
  assert.ok(Math.abs(left-right)<.00001,`curvature discontinuity at ${s}`);
 }
 assert.ok(slopeAt(2200)>.125&&slopeAt(2900)<-.125,'both long legs clearly exceed the old 8.6% peak');
});
test('all hill speeds preserve the 36 km/h cap and zero effort does not roll away',()=>{
 for(let s=1850;s<=ROUTE_LENGTH;s+=10){
  for(const effort of [5,7,8.5])assert.ok(gradeSpeed(effort,s)>0&&gradeSpeed(effort,s)<=10);
  assert.equal(gradeSpeed(0,s),0);
  const state={...fresh(s),speed:10};
  updateRide(state,new Set(['w']),1/60);
  assert.ok(state.speed<=10,`speed cap at ${s}`);
 }
});
