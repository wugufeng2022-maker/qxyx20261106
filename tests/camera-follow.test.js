import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {translateRideCamera} from '../src/camera-follow.js';
import {heightAt} from '../src/route.js';
test('speed and hill translation cannot push a handlebar camera behind the rear companion',()=>{
 const ride=new Vector3(0,heightAt(2800),-2800),previous=ride.clone();
 const camera=ride.clone().add(new Vector3(0,1.4,.4)),look=ride.clone().add(new Vector3(0,1.12,-15));
 for(let i=0;i<1200;i++){
  const dt=[1/60,1/30,.05][i%3];ride.z-=10*dt;ride.y=heightAt(-ride.z);
  translateRideCamera(camera,look,previous,ride);
  camera.lerp(ride.clone().add(new Vector3(0,1.4,.4)),1-Math.exp(-5*dt));
  assert.ok(Math.abs(camera.z-ride.z-.4)<1e-8);
  assert.ok(Math.abs(camera.y-ride.y-1.4)<1e-8);
  // Local rear x=-.675 corresponds to world z=+.675 on a straight road.
  assert.ok(ride.z+.675>camera.z,'rear cat stays behind the forward-looking camera');
 }
});
test('camera view switches remain smooth while travelling and pause adds no translation',()=>{
 const ride=new Vector3(),previous=ride.clone(),camera=new Vector3(2.5,3.1,6.1),look=new Vector3(0,.85,-5);
 for(let i=0;i<120;i++){
  ride.z-=8/60;translateRideCamera(camera,look,previous,ride);
  const before=camera.clone(),desired=ride.clone().add(new Vector3(0,1.4,.4));
  camera.lerp(desired,1-Math.exp(-5/60));assert.ok(camera.distanceTo(before)<.6);
 }
 assert.ok(Math.abs(camera.z-ride.z-.4)<.001);
 const saved=camera.clone();translateRideCamera(camera,look,previous,ride);assert.ok(camera.distanceTo(saved)<1e-10);
});
