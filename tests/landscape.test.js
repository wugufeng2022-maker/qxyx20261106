import {test} from 'node:test';
import assert from 'node:assert/strict';
import {landscapeAt,LAKE,groundAt,centerAt,heightAt,isDryLand} from '../src/route.js';
test('the itinerary opens into five distinct regions with continuous density transitions',()=>{
 assert.deepEqual([0,170,500,1020,1500].map(s=>landscapeAt(s).label),['风吹花田','林荫大道','开阔草坡','湖畔微风','午后小村']);
 for(let s=0;s<2000;s+=.5){const a=landscapeAt(s),b=landscapeAt(s+.01);for(const k of ['flowerDensity','treeDensity']){assert.ok(a[k]>=0&&a[k]<=1);assert.ok(Math.abs(a[k]-b[k])<.001);}}
});
test('the lake basin stays below a level surface and never intersects the riding corridor',()=>{
 assert.ok(groundAt(LAKE.x,LAKE.s)<LAKE.level-1);
 assert.equal(isDryLand(LAKE.x,LAKE.s),false);
 for(let s=750;s<1300;s+=.5){for(const lane of [-2.2,0,2.2]){assert.equal(groundAt(centerAt(s)+lane,s),heightAt(s));assert.ok(isDryLand(centerAt(s)+lane,s));}}
 for(let s=832;s<1216;s+=64)for(let x=LAKE.x-65;x<LAKE.x+65;x+=2)assert.ok(Math.abs(groundAt(x,s-.0001)-groundAt(x,s+.0001))<.001);
});
