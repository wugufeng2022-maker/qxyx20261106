import * as THREE from 'three';
import {centerAt,groundAt,isDryLand,slopeAt,ROAD_HALF_WIDTH} from './route.js';
export const GRASS_ZONES=Object.freeze([[560,710],[4400,4950]]);
// The full footprint is reserved from stones in scenery, and stays inside the
// open meadow / crop setback. Neither water banks nor steep reaches qualify.
export function inGrassZone(s,margin=0){return GRASS_ZONES.some(([a,b])=>s>=a+margin&&s<=b-margin);}
export function safeGrassAt(s,lane){
 if(!inGrassZone(s,8)||Math.abs(slopeAt(s))>.035)return false;
 const side=Math.sign(lane)||1;
 for(const ds of [-3,0,3])for(const d of [2.2,3.1,4.4]){
  const x=centerAt(s+ds)+side*d;
  if(!isDryLand(x,s+ds)||Math.abs(groundAt(x,s+ds)-groundAt(centerAt(s+ds)+side*2.2,s+ds))>.22)return false;
 }
 return true;
}
export function createGrassTumble(){return {phase:'riding',time:0,grassTime:0,blend:0,side:1,cooldown:0,recoveredAt:0};}
export function tumbleLocked(t){return ['tipping','resting','gettingUp'].includes(t.phase);}
export function requestGetUp(t){if(t.phase!=='resting')return false;t.phase='gettingUp';t.time=0;return true;}
export function updateGrassTumble(t,state,dt,{blocked=false}={}){
 if(!state.started||state.paused)return;
 if(t.phase==='cooldown'){
  t.cooldown=Math.max(0,t.cooldown-dt);
  if(t.cooldown===0&&state.distance-t.recoveredAt>=12&&Math.abs(state.lane)<ROAD_HALF_WIDTH)t.phase='riding';
 }
 if(t.phase==='riding'||t.phase==='slowing'){
  const onGrass=Math.abs(state.lane)>ROAD_HALF_WIDTH+.12;
  if(onGrass&&state.speed>.45&&!state.walking&&!state.walkRequested&&!blocked&&safeGrassAt(state.distance,state.lane)){
   t.grassTime+=dt;t.phase='slowing';t.side=Math.sign(state.lane);
   if(t.grassTime>=2.6&&state.speed<2.8){t.phase='tipping';t.time=0;t.grassTime=0;state.speed=0;state.turn=0;state.fastRequested=false;}
  }else {t.grassTime=0;t.phase='riding';}
 }else if(t.phase==='tipping'){
  t.time+=dt;t.blend=Math.min(1,t.time/2.8);
  if(t.time>=2.8){t.phase='resting';t.time=0;t.blend=1;}
 }else if(t.phase==='gettingUp'){
  t.time+=dt;t.blend=Math.max(0,1-t.time/3.4);
  // Roll back toward the road while standing, without changing route distance.
  if(t.time>2.2)state.lane+=(t.side*1.15-state.lane)*(1-Math.exp(-dt*3.2));
  if(t.time>=3.4){t.phase='cooldown';t.cooldown=12;t.recoveredAt=state.distance;t.blend=0;state.speed=.6;state.turn=0;}
 }
 state.tumbleLocked=tumbleLocked(t);state.grassSlowing=t.phase==='slowing';
}

// Same columns, row spacing and triangle diagonal as scenery. A falling body
// touches the visible terrain surface rather than an unsampled analytic hill.
const TERRAIN_COLUMNS=[-150,-125,-105,-90,-78,-66,-56,-48,-40,-34,-28,-23,-19,-16,-13,-10,-8,-6,-4,-3,-2.2,0,2.2,3,4,6,8,10,13,16,19,23,28,34,40,48,56,66,78,90,105,125,150];
export function visibleGroundAt(x,s,cache){
 const a=Math.floor(s/2)*2,b=a+2,t=(s-a)/2,c0=centerAt(a),c1=centerAt(b),d=x-c0-(c1-c0)*t;
 const i=TERRAIN_COLUMNS.findIndex((v,i)=>i<TERRAIN_COLUMNS.length-1&&d>=v&&d<=TERRAIN_COLUMNS[i+1]);
 if(i<0)return groundAt(x,s)-.025;
 const l=TERRAIN_COLUMNS[i],r=TERRAIN_COLUMNS[i+1],u=(d-l)/(r-l);
 const at=(c,d,s)=>{const key=s+':'+d;if(cache?.has(key))return cache.get(key);const h=groundAt(c+d,s)-.025;cache?.set(key,h);return h;};
 const h00=at(c0,l,a),h10=at(c0,r,a),h01=at(c1,l,b),h11=at(c1,r,b);
 return u+t<=1?h00+(h10-h00)*u+(h01-h00)*t:h11+(h01-h11)*(1-u)+(h10-h11)*(1-t);
}
export function applyGrassPose(root,blend,side){
 const b=blend*blend*(3-2*blend);
 root.rotation.z=b*Math.PI/2;root.position.set(b*.72,b*.55,side*b*1.02);
 if(!blend)return;
 root.updateWorldMatrix(true,true);
 const point=new THREE.Vector3(),cache=new Map();let lift=-Infinity;
 root.traverse(mesh=>{
  if(!mesh.isMesh)return;
  const a=mesh.geometry.attributes.position;
  for(let i=0;i<a.count;i++){
   point.fromBufferAttribute(a,i).applyMatrix4(mesh.matrixWorld);
   lift=Math.max(lift,visibleGroundAt(point.x,-point.z,cache)+.012-point.y);
  }
 });
 // Allow the final resting body to settle down onto the grass as well as
 // lifting it clear. Blend the downward correction only near the ground so
 // dismounting begins continuously from the saddle.
 const settle=THREE.MathUtils.smoothstep(blend,.65,1);
 root.position.y+=lift>0?lift:lift*settle;root.updateWorldMatrix(true,true);
}
