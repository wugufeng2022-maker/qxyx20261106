import {updateCatGreeting,catGreetingPose,approachEase} from './animal-approach.js';
import {inviteAnimal,updateAnimalEncounter,withinAnimalReach} from './animal-interaction.js';
import * as THREE from 'three';
import {centerAt} from './route.js';
import {visibleGroundAt} from './grass-tumble.js';
import {CAT_HOME,CAT_YARD} from './village-cat-site.js';
import {createCat} from './cat.js';
export {CAT_HOME};
export function createCatEvent(){return {status:'unseen',time:0,seat:null,approachReach:22};}
export function canInviteCat(e,distance,speed){return e.status==='talking'&&speed<.04&&withinAnimalReach(e,CAT_HOME,distance);}
export function inviteCat(e,distance,speed,seat='rear',events=[e]){return inviteAnimal(e,CAT_HOME,distance,speed,seat,events);}
export function updateCatEvent(e,state){updateAnimalEncounter(e,CAT_HOME,1.2,state);updateCatGreeting(e,CAT_HOME,state);}
export function createCatHome(scene){
 const site=new THREE.Group();site.name='Village cottage cat doorstep';scene.add(site);
 const doorAt=CAT_HOME+CAT_YARD.doorstep;
 const x=centerAt(doorAt)+CAT_YARD.startLane;site.position.set(x,visibleGroundAt(x,doorAt),-CAT_HOME);
 const linen=new THREE.MeshStandardMaterial({color:'#b6bb92',roughness:1}),wood=new THREE.MeshStandardMaterial({color:'#b5a283',roughness:1});
 const mat=new THREE.Mesh(new THREE.BoxGeometry(.76,.024,.70),linen);mat.position.set(0,-.003,-CAT_YARD.doorstep);mat.receiveShadow=true;site.add(mat);
 const home=createCat(site);home.cat.scale.setScalar(1.55);
 const bowl=new THREE.Mesh(new THREE.CylinderGeometry(.12,.10,.065,16),wood);bowl.position.set(-.23,.033,-CAT_YARD.doorstep-.51);bowl.castShadow=true;site.add(bowl);
 const paws=[];home.cat.traverse(o=>{if(o.name.includes('paw'))paws.push({mesh:o,rest:o.position.clone()});});
 const haunches=home.cat.getObjectByName('Cat seated haunches'),restHaunches=haunches.scale.clone();
 const tuckedTail=home.cat.getObjectByName('Curled tail inside carrier');
 const uprightTail=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[.103,.06,-.039],[.14,.16,-.04],[.14,.31,-.035],[.10,.39,-.03]].map(p=>new THREE.Vector3(...p))),24,.014,8,false),tuckedTail.material);
 uprightTail.name='Home cat greeting tail';uprightTail.castShadow=true;home.cat.add(uprightTail);
 const chest=home.cat.getObjectByName('Cream cat bib');
 const legs=paws.map(({mesh,rest})=>{
  const leg=new THREE.Mesh(new THREE.CylinderGeometry(.016,.019,1,8),mesh.material);
  leg.name='Home cat walking leg';leg.castShadow=true;home.cat.add(leg);
  return {mesh:leg,rest};
 });
 return {site,home,update(event,time){
  home.update(time);
  const {attention=0,offset,depth,standing,yaw,travel=0,moving}=event.approach||catGreetingPose(0);
  const phase=travel/.45*Math.PI*2;
  const at=CAT_HOME+depth,catX=centerAt(at)+CAT_YARD.startLane+offset;
  const mat=.009*(1-approachEase((offset-.23)/.24));
  const floor=visibleGroundAt(catX,at)+mat;
  home.root.position.set(catX-x,floor-site.position.y,-depth);
  // Unfold into a horizontal body with four planted/trotting feet. The home
  // rig alone gets legs; the carrier cat keeps its existing seated silhouette.
  haunches.scale.set(restHaunches.x*(1+.25*standing),restHaunches.y*(1-.30*standing),restHaunches.z);
  haunches.position.set(.030+.018*standing,.091+.065*standing,0);
  chest.position.set(-.037-.022*standing,.122+.025*standing,0);
  home.head.position.set(-.068-.050*standing,.213+.015*standing,0);
  for(const [i,paw] of paws.entries()){
   const front=paw.mesh.name==='Cat front paw';
   const side=Math.sign(paw.rest.z);
   const wave=Math.sin(phase+(front?(side>0?0:Math.PI):(side>0?Math.PI:0)));
   paw.mesh.position.copy(paw.rest);
   paw.mesh.position.x+=(front?-.025:.025)*standing+wave*.045*moving;
   const scale=home.cat.scale.x,cos=Math.cos(yaw),sin=Math.sin(yaw);
   const pawX=catX+(cos*paw.mesh.position.x+sin*paw.mesh.position.z)*scale;
   const pawAt=at+(sin*paw.mesh.position.x-cos*paw.mesh.position.z)*scale;
   const aboveMat=Math.abs(pawX-x)<.45&&Math.abs(pawAt-doorAt)<.42;
   const contact=Math.max(visibleGroundAt(pawX,pawAt)+.006,aboveMat?site.position.y+.009:-Infinity);
   paw.mesh.position.y+=(contact-floor)/scale+Math.max(0,wave)*.036*moving;
   const hip=new THREE.Vector3(front?-.075:.075,.135,paw.rest.z);
   const foot=paw.mesh.position.clone();
   const delta=hip.clone().sub(foot),leg=legs[i].mesh;
   leg.visible=standing>.01;leg.position.copy(hip).add(foot).multiplyScalar(.5);
   leg.scale.set(1,delta.length(),1);leg.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
  }
  home.root.rotation.y=yaw;
  home.head.rotation.y=attention*.12;
  home.head.rotation.z=attention*.10;
  uprightTail.visible=attention>0;uprightTail.scale.y=attention;uprightTail.position.y=.06*(1-attention);tuckedTail.scale.y=1-attention;tuckedTail.visible=attention<1;
  home.root.visible=event.status!=='active'&&event.time<.60;
 }};
}
