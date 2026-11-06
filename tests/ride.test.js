import { test } from 'node:test';
import assert from 'node:assert/strict';
import { centerAt, heightAt, groundAt, tangentAt, CHUNK_LENGTH, updateRide, avenueShade, openingSideView, roadSurface, roadRelief } from '../src/route.js';

const fresh = () => ({ started: true, paused: false, auto: true, speed: 0, distance: 0, lane: 0, turn: 0 });
test('autopilot moves forward; braking reaches a complete stop', () => {
  const state = fresh();
  for (let i = 0; i < 600; i++) updateRide(state, new Set(), 1 / 60);
  assert.ok(state.distance > 35 && state.speed > 4.8 && state.speed < 5.6);
  const before = state.distance, brakingSpeed = state.speed;
  for (let i = 0; i < 120; i++) updateRide(state, new Set(['ArrowDown']), 1 / 60);
  assert.equal(state.speed, 0);assert.ok(state.distance - before <= brakingSpeed ** 2 / (2 * 4.5) + .1);
});
test('pause freezes distance and steering; steering stays on the path', () => {
  const state = fresh();state.speed = 4;
  for (let i = 0; i < 600; i++) updateRide(state, new Set(['ArrowRight']), 1 / 60);
  assert.equal(state.lane, 1.55);
  state.paused = true;const snapshot = { ...state };
  updateRide(state, new Set(['ArrowLeft', 'ArrowUp']), 1);
  assert.deepEqual(state, snapshot);
});
test('manual mode coasts to a stop and pedaling accelerates', () => {
  const state = fresh();state.auto = false;
  for (let i = 0; i < 300; i++) updateRide(state, new Set(['w']), 1 / 60);
  assert.ok(state.speed > 8 && state.speed < 9.5);
  for (let i = 0; i < 1200; i++) updateRide(state, new Set(), 1 / 60);
  assert.equal(state.speed, 0);
});
test('terrain matches the road and stays continuous at chunk boundaries', () => {
  for (let i = -1; i < 100; i++) {
    const s = i * CHUNK_LENGTH;
    assert.equal(groundAt(centerAt(s), s), heightAt(s));
    assert.ok(Math.abs(centerAt(s + .001) - centerAt(s - .001)) < .001);
    assert.ok(Math.abs(heightAt(s + .001) - heightAt(s - .001)) < .001);
    const numerical = (centerAt(s + .001) - centerAt(s - .001)) / .002;
    assert.ok(Math.abs(numerical - tangentAt(s)) < 1e-7);
  }
});

test('the first avenue keeps its smooth, finite shade profile', () => {
  for (const s of [-100,0,96,256,512,1024,10000]) assert.equal(avenueShade(s),0);
  assert.equal(avenueShade(160),1);
  assert.ok(avenueShade(107)>0 && avenueShade(107)<1);
  assert.equal(avenueShade(107),avenueShade(245));
});
test('the additional avenues have distinct shelter and restore the side view at the lake approach',()=>{
  assert.ok(avenueShade(374)>.7);
  assert.equal(avenueShade(548),0);
  assert.ok(avenueShade(753)>.25 && avenueShade(753)<avenueShade(374));
  for(const s of [160,374,753])assert.ok(openingSideView(s,9.5)<=3.2);
  for(const s of [60,548,790,960])assert.equal(openingSideView(s,9.5),9.5);
  for(const s of [66,89,263,286,290,313,445,468,687,710,780,790]){
    assert.ok(Math.abs(openingSideView(s-.001,9.5)-openingSideView(s+.001,9.5))<.005,`side view at ${s}m`);
  }
});

test('the opening is smooth across the road, with rough shoulders gradually appearing at the avenue',()=>{
 for(const lane of [-1.55,-.78,0,.78,1.55]) {
  assert.equal(roadRelief(40,lane),0);
  assert.ok(roadSurface(40,lane).roughness<.05);
 }
 for(const s of [120,160,220,320,500]) {
  assert.ok(roadSurface(s,0).roughness<.1);
  for(const side of [-1.55,1.55])assert.ok(roadSurface(s,side).roughness>roadSurface(s,0).roughness+.4);
 }
 assert.ok(Math.abs(roadRelief(80.001,1.5)-roadRelief(79.999,1.5))<.00001);
});
test('the central route rolls faster than either shoulder under equal effort',()=>{
 for(const side of [-1.55,1.55]) {
  const middle={...fresh(),distance:140},edge={...fresh(),distance:140,lane:side};
  for(let i=0;i<360;i++){updateRide(middle,new Set(),1/60);updateRide(edge,new Set(),1/60);}
  assert.ok(middle.speed>edge.speed+.4);
 }
});
test('road relief is bounded, deterministic and continuous at streamed boundaries',()=>{
 for(let s=0;s<1000;s+=.7)for(const lane of [-1.55,-.78,0,.78,1.55]){
  const h=roadRelief(s,lane);assert.ok(h>=0 && h<.04);
  assert.equal(h,roadRelief(s,lane));
 }
 for(let s=64;s<1024;s+=64)assert.ok(Math.abs(roadRelief(s-.0001,.78)-roadRelief(s+.0001,.78))<.0001);
});
