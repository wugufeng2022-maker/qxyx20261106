import {test} from 'node:test';
import assert from 'node:assert/strict';
import {beePosition} from '../src/wildlife.js';
test('bees rest at flowers and take short, continuous flights to the next flower',()=>{
 const targets=[[4,.5,10],[5,.6,11],[4.5,.5,12]];
 for(const time of [0,1,4])assert.equal(beePosition(targets,time).flying,false);
 assert.equal(beePosition(targets,6).flying,true);
 assert.ok(beePosition(targets,6).y>.7);
 for(let t=0;t<30;t+=.05){
  const p=beePosition(targets,t),q=beePosition(targets,t+.001);
  assert.ok(p.x>=4&&p.x<=5&&p.z>=10&&p.z<=12);
  assert.ok(Math.hypot(p.x-q.x,p.y-q.y,p.z-q.z)<.003);
 }
 assert.deepEqual(beePosition(targets,3),beePosition(targets,3));
});

test('verge insects use both sides before and after the orchard and return to their grass patch',async()=>{
 const {vergeInsectSites,vergeInsectPose}=await import('../src/wildlife.js');
 const {centerAt,ROAD_HALF_WIDTH}=await import('../src/route.js');
 const {visibleGroundAt}=await import('../src/grass-tumble.js');
 for(const index of [9,31,45,69,128,153]){
  const sites=vergeInsectSites(index);
  if(index!==45)assert.deepEqual([...new Set(sites.map(site=>site.side))],[-1,1]);
  for(const site of sites){
   for(let t=0;t<36;t+=.2){
    const pose=vergeInsectPose(site,t);
    assert.ok(Math.abs(pose.z+site.s)<1.41);
    assert.ok(site.side*(pose.x-centerAt(-pose.z))>ROAD_HALF_WIDTH+.5);
    assert.ok(pose.y>=site.y);
    assert.ok(pose.y>visibleGroundAt(pose.x,-pose.z));
   }
  }
 }
});
