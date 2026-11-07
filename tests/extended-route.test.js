import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CLEAR_LAKE,CREEK_REACH,ROUTE_LENGTH,EXTENDED_REGIONS,landscapeAt,extendedWaterAt,groundAt,centerAt,heightAt,slopeAt,updateRide,isDryLand,roadHalfWidthAt} from '../src/route.js';

test('one fixed 10 km itinerary has seven materially different ecological weights',()=>{
  assert.equal(ROUTE_LENGTH,10000);
  for(const r of EXTENDED_REGIONS){const sample=landscapeAt((r.start+r.end)/2);assert.equal(sample.label,r.label);assert.ok(sample[r.key]>.9);}
  assert.ok(landscapeAt(6650).treeDensity>landscapeAt(8650).treeDensity+.8);
  for(let s=0;s<ROUTE_LENGTH;s+=.5){const a=landscapeAt(s),b=landscapeAt(s+.01);for(const key of ['flowerDensity','treeDensity']){assert.ok(a[key]>=0&&a[key]<=1);assert.ok(Math.abs(a[key]-b[key])<.001);}}
});
test('extended road remains analytic, comfortable, grounded, and continuous at all streamed joints',()=>{
  for(let s=3250;s<=ROUTE_LENGTH;s+=.5){
    assert.ok(Math.abs(slopeAt(s))<=.15);
    assert.ok(Math.abs((heightAt(s+.001)-heightAt(s-.001))/.002-slopeAt(s))<1e-7);
    for(const lane of [-2.2,0,2.2])assert.equal(groundAt(centerAt(s)+lane,s),heightAt(s));
  }
  for(let s=3264;s<ROUTE_LENGTH;s+=64)for(const lane of [-100,-65,-30,-13,-3,0,3,13,30,65,100]){
    assert.ok(Math.abs(groundAt(centerAt(s-.001)+lane,s-.001)-groundAt(centerAt(s+.001)+lane,s+.001))<.02,`seam at ${s}, ${lane}`);
  }
});
test('river and bay water sit inside depressed side basins while the entire road is dry',()=>{
  for(const s of [5500,5700,5900,9550,9770,9990]){
    const w=extendedWaterAt(s);assert.ok(w&&w.strength>.95);
    assert.ok(groundAt(centerAt(s)+w.offset,s)<w.level-1);
    assert.equal(isDryLand(centerAt(s)+w.offset,s),false);
    for(const lane of [-2.2,0,2.2]){assert.ok(isDryLand(centerAt(s)+lane,s));assert.ok(groundAt(centerAt(s)+lane,s)>w.level+.5);}
  }
  for(let s=3250;s<=10000;s+=5)for(const lane of [-2.2,0,2.2])assert.ok(isDryLand(centerAt(s)+lane,s));
  assert.equal(extendedWaterAt(6500).kind,'river');
  assert.equal(extendedWaterAt(CREEK_REACH.end),null);
  assert.equal(extendedWaterAt(8650),null);
});
test('end approach gently limits speed, stops exactly at 10 km, and cannot replay with held pedals',()=>{
  for(const options of [{},{walking:true,walkRequested:true,walkBlend:1},{auto:false,fastRequested:true}]){
    const state={started:true,paused:false,distance:9950,speed:5,lane:0,turn:0,auto:true,...options};
    let traveled=0;for(let i=0;i<12000;i++)traveled+=updateRide(state,new Set(['w']),1/60);
    assert.equal(state.distance,10000);assert.equal(state.speed,0);assert.ok(Math.abs(traveled-50)<1e-8);
    assert.equal(updateRide(state,new Set(['w']),1),0);assert.equal(state.distance,10000);
  }
});
test('the meandering creek stays close to the path and exposes a descending bank',()=>{
  const bankPositions=[];
  for(let s=5330;s<6375;s+=5){
    const w=extendedWaterAt(s),near=w.offset-w.halfWidth;
    assert.ok(near>=4.2&&near<=7.7);
    assert.ok(w.halfWidth>=1.7&&w.halfWidth<=3.6);
    bankPositions.push(near);
    let previous=groundAt(centerAt(s)+3,s);
    for(let d=3.1;d<=near;d+=.1){const h=groundAt(centerAt(s)+d,s);assert.ok(h<=previous+.0001,`bank at ${s}/${d}`);previous=h;}
    assert.ok(groundAt(centerAt(s)+near,s)>w.level);
    assert.ok(groundAt(centerAt(s)+near+w.halfWidth*.38,s)<w.level);
    assert.ok(groundAt(centerAt(s)+w.offset+w.halfWidth+2,s)>w.level);
    assert.equal(groundAt(centerAt(s)+2.2,s),heightAt(s));
  }
  assert.ok(Math.max(...bankPositions)-Math.min(...bankPositions)>2.5);
});

test('the path narrows smoothly, keeps steering inside its edges, and opens again',()=>{
  assert.equal(roadHalfWidthAt(5250),2.15);
  assert.equal(roadHalfWidthAt(6500),2.15);
  assert.ok(roadHalfWidthAt(5600)<1.4);
  assert.ok(roadHalfWidthAt(6250)<1.4);
  for(const mode of ['leisure','joyful']){
    const state={started:true,auto:true,rideMode:mode,distance:5250,speed:5,lane:1.55,turn:0};
    const keys=new Set(mode==='leisure'?['ArrowRight']:[]);
    while(state.distance<6500){
      const before=state.lane;
      updateRide(state,keys,1/60);
      assert.ok(Math.abs(state.lane)<roadHalfWidthAt(state.distance)-.56);
      assert.ok(Math.abs(state.lane-before)<.032);
    }
  }
});

test('clear lake opens after the woods with a level surface, shallows, and a dry rideable shore',()=>{
  assert.equal(extendedWaterAt(CLEAR_LAKE.start),null);
  assert.equal(extendedWaterAt(CLEAR_LAKE.end),null);
  const level=extendedWaterAt(6960).level;
  for(let s=6840;s<=7130;s+=2){
    const lake=extendedWaterAt(s),near=lake.offset-lake.halfWidth;
    const bed=d=>groundAt(centerAt(s)+d,s);
    assert.equal(lake.kind,'clearLake');
    assert.equal(lake.level,level);
    assert.ok(lake.halfWidth>34);
    assert.ok(bed(2.15)>level+.7);
    assert.ok(bed(near)>level);
    assert.ok(bed(near+4)<level&&bed(near+4)>level-.6);
    assert.ok(bed(lake.offset)<level-3);
    assert.ok(bed(lake.offset+lake.halfWidth+2)>level);
  }
});

test('terraces rise decisively into the ridge and descend within a 15% maximum grade',()=>{
 const datum=heightAt(3250);
 for(const [s,rise]of [[7150,7],[7650,24],[8150,52],[8650,66],[9150,27],[9600,3]])assert.ok(Math.abs(heightAt(s)-datum-rise)<1e-10);
 assert.ok(slopeAt(7900)>.10,'readable terrace ascent');
 assert.ok(slopeAt(8900)<-.14,'readable ridge descent');
 for(let s=7150;s<8650;s+=1)assert.ok(slopeAt(s)>=0);
 for(let s=8650;s<9600;s+=1)assert.ok(slopeAt(s)<=0);
});
