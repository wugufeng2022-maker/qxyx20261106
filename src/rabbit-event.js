import {updateAnimalApproach,approachEase} from './animal-approach.js';
import {inviteAnimal,updateAnimalEncounter} from './animal-interaction.js';
import * as THREE from 'three';
import {centerAt} from './route.js';
import {visibleGroundAt} from './grass-tumble.js';
import {RABBIT_HOME,RABBIT_CARE} from './start-courtyard.js';
export {RABBIT_HOME} from './start-courtyard.js';
import {createRabbit} from './rabbit.js';
export function createRabbitEvent(){return {status:'unseen',time:0,seat:null};}
export function canInviteRabbit(e,distance,speed){return e.status==='talking'&&speed<.04&&Math.abs(distance-RABBIT_HOME)<=12;}
export function inviteRabbit(e,distance,speed,seat='front',events=[e]){return inviteAnimal(e,RABBIT_HOME,distance,speed,seat,events);}
export function updateRabbitEvent(e,state){updateAnimalEncounter(e,RABBIT_HOME,1,state);updateAnimalApproach(e,RABBIT_HOME,state,2.8);}
export function createRabbitHome(scene){
 const site=new THREE.Group();site.name='Start courtyard rabbit care point';scene.add(site);const x=centerAt(RABBIT_HOME)+RABBIT_CARE.lane;site.position.set(x,visibleGroundAt(x,RABBIT_HOME),-RABBIT_HOME);
 const wood=new THREE.MeshStandardMaterial({color:'#c2b093',roughness:1}),green=new THREE.MeshStandardMaterial({color:'#aabb94',roughness:1});
 function box(x,y,z,w,h,d,m){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;site.add(o);return o;}
 box(0,.22,0,.55,.44,.7,wood);box(0,.45,0,.65,.06,.8,green);
 // Open home pen and a bowl identify a cared-for domestic animal.
 for(const z of [-.8,.8]){box(-.6,.25,z,.07,.5,.07,wood);box(.6,.25,z,.07,.5,.07,wood);box(0,.35,z,1.2,.06,.06,wood);}
 const bowl=new THREE.Mesh(new THREE.CylinderGeometry(.13,.11,.07,16),green);bowl.position.set(.39,.035,.25);site.add(bowl);
 const bunny=createRabbit(site);bunny.root.position.y=.48;bunny.bunny.scale.setScalar(1.5);
 const ears=bunny.head.children.filter(o=>o.name==='Soft upright ear'||o.name==='Blush ear lining').map(mesh=>({mesh,restY:mesh.scale.y}));
 return {site,bunny,update(event,time){
  bunny.update(time);
  const {attention=0,progress=0}=event.approach||{};
  // Two complete hops: first off the open platform, then onto the road shoulder.
  const hop=Math.min(1,progress*2),second=Math.max(0,progress*2-1);
  const travel=RABBIT_CARE.firstHop*approachEase(hop)+RABBIT_CARE.secondHop*approachEase(second);
  const lift=.16*Math.sin(Math.PI*hop)+.16*Math.sin(Math.PI*second);
  const floor=visibleGroundAt(x+travel,RABBIT_HOME)-site.position.y;
  bunny.bunny.position.set(travel,-.033+(.48-floor)*(1-approachEase((hop-.9)/.1))+floor-.48+lift,0);
  bunny.bunny.scale.set(1.5,1.5*(1+Math.sin(time*1.9)*.012),1.5);
  const turn=approachEase((progress-.70)/.30);
  bunny.bunny.rotation.y=-Math.PI*.5*(attention*(1-approachEase(progress/.20))+turn);
  bunny.head.rotation.y=attention*.14;
  bunny.head.rotation.z=-attention*.10;
  for(const {mesh,restY} of ears){mesh.scale.y=restY*(1+.17*attention);mesh.rotation.z=.10-.18*attention;}
  bunny.root.visible=event.status!=='active'&&event.time<.55;
 }};
}
