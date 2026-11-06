import {centerAt} from '../src/route.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nearbyPerches,roadsideBirds} from '../src/nature-audio.js';
import {windLevel} from '../src/wind-audio.js';
test('tree calls keep world positions as the listener passes and disappear out of range',()=>{
 const tree=[5,8,-100],others=[[-12,7,-115],[20,8,-200]],perches=[tree,...others];
 const before=nearbyPerches(perches,{x:0,y:2,z:-80});
 const beside=nearbyPerches(perches,{x:0,y:2,z:-100});
 const after=nearbyPerches(perches,{x:0,y:2,z:-120});
 assert.equal(before[0].p,tree);assert.equal(beside[0].p,tree);
 assert.ok(beside[0].d<before[0].d);
 assert.ok(after.find(v=>v.p===tree).d>beside[0].d);
 assert.equal(nearbyPerches([tree],{x:0,y:2,z:-150}).length,0);
 assert.deepEqual(tree,[5,8,-100]);
});
test('revised wind is about eleven dB below the previous mix',()=>{
 const original=(.045+.5*Math.pow(3.8/7,.85));
 const difference=20*Math.log10(windLevel(3.8)/original);
 assert.ok(difference < -10 && difference > -12);
});

test('gravel-side riding favors nearby trees on that side without moving the sound source',()=>{
 const distance=150,x=centerAt(distance),left=[x-6,7,-distance],right=[x+6,7,-distance],pos={x,y:2,z:-distance};
 const a=roadsideBirds([left,right],pos,{distance,lane:-1.5});
 const b=roadsideBirds([left,right],pos,{distance,lane:1.5});
 const center=roadsideBirds([left,right],pos,{distance,lane:0});
 assert.equal(a.candidates[0].p,left);assert.equal(b.candidates[0].p,right);
 assert.ok(a.interval<center.interval);assert.equal(center.candidates.length,2);
 assert.equal(roadsideBirds([],pos,{distance,lane:1.5}).candidates.length,0);
});
