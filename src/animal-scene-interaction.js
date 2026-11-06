import * as THREE from 'three';
import {brakeRate,groundAt} from './route.js';
import {canStopForAnimal,stopForAnimal,withinAnimalHit} from './animal-interaction.js';
// Only domestic animals are registered; vegetation and scenery never become actions.
export function createAnimalSceneInteraction({canvas,camera,scene,state,entries,getOwner,onStop}){
 const ray=new THREE.Raycaster(),box=new THREE.Box3(),point=new THREE.Vector3(),center=new THREE.Vector3();
 let hover=null,lastPointer=null,lastHitAt=-Infinity,pressed=null;
 const visible=o=>{for(let n=o;n;n=n.parent)if(!n.visible)return false;return true;};
 for(const entry of entries){
  const material=new THREE.MeshBasicMaterial({color:'#f4e9b7',transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide});
  const glow=new THREE.Mesh(new THREE.RingGeometry(.29,.38,40),material);glow.rotation.x=-Math.PI/2;glow.position.y=.015;entry.site.add(glow);entry.glow=glow;
  const materials=new Set();entry.site.traverse(o=>{if(o.material&&o!==glow)for(const m of [o.material].flat())materials.add(m);});entry.materials=materials;
 }
 function eligible(entry){return state.started&&!state.paused&&getOwner()===entry.id&&canStopForAnimal(entry.event,entry.home,state.distance,state.speed,brakeRate(state))&&visible(entry.animal);}
 function hit(e){
  const rect=canvas.getBoundingClientRect();
  for(const entry of entries){
   if(!eligible(entry))continue;
   entry.animal.updateWorldMatrix(true,true);box.setFromObject(entry.animal);box.getCenter(center);
   point.copy(center).project(camera);if(point.z< -1||point.z>1)continue;
   const bounds={minX:Infinity,minY:Infinity,maxX:-Infinity,maxY:-Infinity};
   for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
    point.set(x,y,z).project(camera);const px=rect.left+(point.x+1)*rect.width/2,py=rect.top+(1-point.y)*rect.height/2;
    bounds.minX=Math.min(bounds.minX,px);bounds.maxX=Math.max(bounds.maxX,px);bounds.minY=Math.min(bounds.minY,py);bounds.maxY=Math.max(bounds.maxY,py);
   }
   if(!withinAnimalHit({x:e.clientX,y:e.clientY},bounds,e.pointerType==='touch'?22:10))continue;
   // The padded target cannot click through a cottage, tree, or the rider.
   ray.set(camera.position,point.copy(center).sub(camera.position).normalize());
   const range=camera.position.distanceTo(center);
   ray.far=range-.40;
   const blocker=ray.intersectObjects(scene.children.filter(visible),true).find(h=>h.object.isMesh&&visible(h.object)&&h.object.material?.opacity!==0&&h.object!==entry.glow&&!entry.animal.getObjectById(h.object.id));
   if(blocker)continue;
   return entry;
  }
  return null;
 }
 canvas.addEventListener('pointermove',e=>{lastPointer={clientX:e.clientX,clientY:e.clientY,pointerType:e.pointerType};if(performance.now()-lastHitAt>100){hover=hit(e);lastHitAt=performance.now();}canvas.style.cursor=hover?'pointer':'';if(hover)state.pointerSteer=0;});
 canvas.addEventListener('pointerleave',()=>{lastPointer=null;hover=null;canvas.style.cursor='';});
 canvas.addEventListener('pointerdown',e=>{pressed={id:e.pointerId,x:e.clientX,y:e.clientY,entry:hit(e)};});
 canvas.addEventListener('pointercancel',()=>{pressed=null;});
 canvas.addEventListener('pointerup',e=>{
  const down=pressed;pressed=null;if(!down||down.id!==e.pointerId||Math.hypot(e.clientX-down.x,e.clientY-down.y)>12)return;
  const entry=hit(e);if(entry!==down.entry)return;if(entry&&stopForAnimal(entry.event,entry.home,state.distance,state.speed,brakeRate(state))){state.pointerSteer=0;onStop(entry);canvas.style.cursor='';}
 });
 return {update(){
  for(const entry of entries){
   // Animal and care point emerge together in the distance, remaining life-sized.
   const ahead=entry.home-state.distance,opacity=THREE.MathUtils.smoothstep(95-ahead,0,25);
   entry.site.visible=ahead<95&&ahead> -45;
   for(const material of entry.materials){material.transparent=opacity<1;material.opacity=opacity;material.depthWrite=opacity>=1;}
   entry.animal.getWorldPosition(point);entry.site.worldToLocal(point);
   entry.glow.position.x=point.x;entry.glow.position.z=point.z;
   entry.glow.position.y=groundAt(entry.site.position.x+point.x,entry.home-point.z)-entry.site.position.y+.015;
   entry.glow.material.opacity=eligible(entry)?.26:0;
   if(import.meta.env.DEV){
    const rect=canvas.getBoundingClientRect();
    entry.animal.updateWorldMatrix(true,true);box.setFromObject(entry.animal).getCenter(point);point.project(camera);
    canvas.dataset[entry.id+'Screen']=`${(rect.left+(point.x+1)*rect.width/2).toFixed(1)},${(rect.top+(1-point.y)*rect.height/2).toFixed(1)}`;
   }
  }
  if(lastPointer&&performance.now()-lastHitAt>100){hover=hit(lastPointer);lastHitAt=performance.now();canvas.style.cursor=hover?'pointer':'';}
 }};
}
