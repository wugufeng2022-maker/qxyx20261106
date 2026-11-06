import * as THREE from 'three';
import {centerAt,slopeAt,tangentAt} from './route.js';
import {visibleGroundAt} from './grass-tumble.js';
import {createRider} from './rider.js';

export const PASSING_START=1968;
const passingSpeed=12.9;
export function createPassingRide(){
  return {status:'unseen',side:-1,stations:[]};
}
export function updatePassingRide(event,{started,paused,distance,lane,dt}){
  if(!started||paused)return;
  if(event.status==='unseen'&&distance>=PASSING_START){
    if(distance>2025){event.status='done';return;}
    event.status='passing';
    event.side=lane<-.65?1:-1;
    event.stations=[distance-22,distance-37];
  }
  if(event.status!=='passing')return;
  event.stations=event.stations.map(s=>s+passingSpeed*dt);
  if(event.stations[1]>distance+80)event.status='done';
}

export function passingLane(event,i){
  return event.side*(2.65+i*.12);
}

export function passingViewWeight(event,distance){
  if(event.status!=='passing')return 0;
  const near=THREE.MathUtils.smoothstep(event.stations[0]-distance,-16,-5);
  const ahead=THREE.MathUtils.smoothstep(event.stations[1]-distance,24,48);
  return near*(1-ahead);
}

export function createPassingRiders(scene,sourceBike){
  const group=new THREE.Group();group.name='Two passing cyclists';group.visible=false;scene.add(group);
  const riders=['#4b807e','#b78752'].map((color,i)=>{
    const bike=sourceBike.clone(true);
    bike.getObjectByName('Steering__Honey_wicker')?.removeFromParent();
    group.add(bike);
    const rig=createRider(bike);
    bike.getObjectByName('Soft terracotta T-shirt').material.color.set(color);
    bike.getObjectByName('Trouser seat').material.color.set(i?'#65655b':'#8e9c93');
    bike.getObjectByName('Simple daypack').visible=false;
    for(const name of ['Shoulder strap','Strap adjuster']){
      for(const mesh of bike.getObjectsByProperty('name',name))mesh.visible=false;
    }
    const wheels=['Wheel_Rear','Wheel_Front'].map(name=>bike.getObjectByName(name));
    const crank=bike.getObjectByName('Crank'),pedals=['Pedal_Left','Pedal_Right'].map(name=>bike.getObjectByName(name));
    const materials=new Map();
    bike.traverse(mesh=>{
      if(!mesh.isMesh)return;
      if(!materials.has(mesh.material))materials.set(mesh.material,mesh.material.clone());
      mesh.material=materials.get(mesh.material);
      mesh.castShadow=true;
      mesh.receiveShadow=true;
    });
    let visibleLast=1;
    return {update(event,distance,time){
      const s=event.stations[i],lane=passingLane(event,i),x=centerAt(s)+lane;
      const gap=s-distance,opacity=(1-THREE.MathUtils.smoothstep(gap,52,77))*THREE.MathUtils.smoothstep(gap,-39,-19);
      bike.visible=opacity>.01;
      if(!bike.visible)return;
      if(Math.abs(visibleLast-opacity)>.005){
        for(const material of materials.values()){
          material.opacity=opacity;material.transparent=opacity<1;material.depthWrite=opacity>=1;
        }
        visibleLast=opacity;
      }
      bike.position.set(x,visibleGroundAt(x,s)+.002,-s);
      bike.rotation.set(0,Math.atan2(1,tangentAt(s)),Math.atan(slopeAt(s)),'YXZ');
      const wheel=-(s-PASSING_START)/.365,phase=wheel*.39+i*1.7;
      for(const node of wheels)node.rotation.z=wheel;
      crank.rotation.z=phase;
      for(const pedal of pedals)pedal.rotation.z=-phase;
      rig.update(phase,0,time,passingSpeed);
    }};
  });
  return {update(event,distance,time){
    group.visible=event.status==='passing';
    if(group.visible)for(const rider of riders)rider.update(event,distance,time);
  }};
}
