import {test} from 'node:test';
import assert from 'node:assert/strict';
import {windSamples,windLevel} from '../src/wind-audio.js';
test('wind strengthens with speed, softens under trees and is bounded',()=>{
 assert.ok(windLevel(0)<windLevel(3.8));assert.ok(windLevel(3.8)<windLevel(7));
 assert.ok(windLevel(3.8,1)<windLevel(3.8,0));
 assert.equal(windLevel(100),windLevel(7));assert.equal(windLevel(-10),windLevel(0));
});
test('wind has two finite, distinct channels with headroom at maximum speed',()=>{
 const channels=windSamples(22050,2);
 assert.equal(channels.length,2);assert.equal(channels[0].length,44100);
 let energy=0,difference=0;
 for(let i=0;i<channels[0].length;i++){
  for(const channel of channels){ assert.ok(Number.isFinite(channel[i]));assert.ok(Math.abs(channel[i]*windLevel(7))<.8);energy+=channel[i]**2; }
  difference+=Math.abs(channels[0][i]-channels[1][i]);
 }
 assert.ok(energy>1);assert.ok(difference>1);
});
