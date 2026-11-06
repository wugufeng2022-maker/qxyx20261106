import * as THREE from 'three';
import {centerAt,heightAt,tangentAt,roadRelief,groundAt} from './route.js';
import {createRider} from './rider.js';
export const ARTIST={start:1068,end:1208};
export function createArtistEvent(){return {status:'unseen',s:ARTIST.start,lane:3.15,speed:0,pose:1,phase:0,wheel:0,time:0};}
export function canInviteArtist(e,distance,speed=0){return e.status==='available'&&Math.abs(distance-e.s)<=14&&distance+speed*1.2<=e.s+4;}
export function inviteArtist(e,distance,speed=0){if(!canInviteArtist(e,distance,speed))return false;e.status='joining';e.time=0;return true;}
export function leaveArtist(e){if(['joining','active'].includes(e.status))e.status='departing';}
export function updateArtist(e,{started,paused,distance,lane,speed,dt}){
 if(!started||paused)return;
 if(e.status==='unseen'&&distance>=ARTIST.start-25)e.status=distance>ARTIST.start+20?'skipped':'available';
 if(e.status==='available'&&distance>ARTIST.start+20)e.status='skipped';
 if(e.status==='joining'){e.pose=Math.max(0,e.pose-dt/1.2);if(e.pose===0)e.status='active';}
 if(e.status==='active'){
  const target=Math.max(0,Math.min(10,Math.sqrt(5.6*Math.max(0,ARTIST.end-e.s)),speed+(distance+1.8-e.s)*.7));
  e.speed+=Math.sign(target-e.speed)*Math.min(Math.abs(target-e.speed),(target<e.speed?4.5:2.2)*dt);
  const toSketch=THREE.MathUtils.smoothstep(e.s,ARTIST.end-22,ARTIST.end-4),targetLane=THREE.MathUtils.lerp(lane+1.7,3.65,toSketch);
  const next=e.lane+(targetLane-e.lane)*(1-Math.exp(-dt*5));e.lane=Math.max(lane+1.35,next);
  const move=Math.min(e.speed*dt,ARTIST.end-e.s);e.s+=move;e.phase-=move/.365*.45;e.wheel-=move/.365;
  if(Math.abs(distance-e.s)>28)e.status='departing';
  if(e.s>=ARTIST.end-.015&&e.speed<.35){e.s=ARTIST.end;e.speed=0;e.status='arrived';e.time=0;}
 }
 if(['departing','arrived'].includes(e.status)){e.speed=Math.max(0,e.speed-4.5*dt);if(e.status==='departing'){const move=Math.min(e.speed*dt,ARTIST.end-e.s);e.s+=move;e.phase-=move/.365*.45;e.wheel-=move/.365;}if(e.speed===0)e.pose=Math.min(1,e.pose+dt/1.2);e.time+=dt;}
}
export function createArtist(scene,bike){
 const root=new THREE.Group();root.name='Lakeside artist bicycle';root.add(bike);scene.add(root);
 const rider=createRider(bike);bike.getObjectByName('Soft terracotta T-shirt').material.color.set('#829ca7');bike.getObjectByName('Hair back').material.color.set('#706962');
 const cap=new THREE.Mesh(new THREE.SphereGeometry(1,14,8),new THREE.MeshStandardMaterial({color:'#8c8b96',roughness:1}));cap.scale.set(.116,.042,.111);cap.position.set(-.01,.10,0);bike.getObjectByName('Young face and short hair').add(cap);
 const wheels=['Wheel_Rear','Wheel_Front'].map(n=>bike.getObjectByName(n)),crank=bike.getObjectByName('Crank'),pedals=['Pedal_Left','Pedal_Right'].map(n=>bike.getObjectByName(n));
 for(const s of [ARTIST.start,ARTIST.end]){
  const easel=new THREE.Group(),x=centerAt(s)+4.8,y=groundAt(x,s)-.025;easel.name='Lakeside sketching easel';easel.position.set(x,y,-s);scene.add(easel);
  const wood=new THREE.MeshStandardMaterial({color:'#b1a18c',roughness:1});
  for(const z of [-.3,.3]){const leg=new THREE.Mesh(new THREE.BoxGeometry(.045,1.1,.045),wood);leg.position.set(0,.55,z);leg.rotation.x=-z*.4;easel.add(leg);}
  const canvas=new THREE.Mesh(new THREE.BoxGeometry(.035,.62,.68),new THREE.MeshStandardMaterial({color:'#d4dacb',roughness:1}));canvas.position.set(0,.91,0);easel.add(canvas);
  const paint=new THREE.Mesh(new THREE.BoxGeometry(.04,.17,.55),new THREE.MeshStandardMaterial({color:'#a4bcc1',roughness:1}));paint.position.set(-.025,.83,0);easel.add(paint);
 }
 return {root,update(e,elapsed){root.visible=!['unseen','skipped'].includes(e.status);const x=centerAt(e.s)+e.lane,blend=THREE.MathUtils.smoothstep(Math.abs(e.lane),2.05,2.55),road=heightAt(e.s)+.025+roadRelief(e.s,e.lane);root.position.set(x,THREE.MathUtils.lerp(road,groundAt(x,e.s)-.015,blend),-e.s);root.rotation.y=Math.atan2(1,tangentAt(e.s));rider.update(e.phase,0,elapsed,e.speed,e.pose,0);wheels.forEach(w=>w.rotation.z=e.wheel);crank.rotation.z=e.phase;pedals.forEach(p=>p.rotation.z=-e.phase);}};
}
