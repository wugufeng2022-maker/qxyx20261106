import * as THREE from 'three';
import {centerAt,brakeRate} from './route.js';
import {visibleGroundAt} from './grass-tumble.js';
import {WALKER,walkerLane} from './orchard-walk.js';
export {WALKER};
export function createWalkerEvent(){return {status:'unseen',s:WALKER.start,phase:0,invited:false,speed:0,arrivalTime:0};}
export function canInviteWalker(e,state){
 const {distance,speed=0}=state;
 const brake=brakeRate({...state,walkRequested:true});
 return e.status==='available'&&Math.abs(distance-e.s)<=16&&distance+speed**2/(2*brake)<=e.s+3;
}
export function inviteWalker(e,distance=e.s){if(e.status!=='available'||Math.abs(distance-e.s)>16)return false;e.status='active';e.invited=true;return true;}
// Only release the posture request that the invitation itself introduced.
export function requestWalking(state,requested){state.walkRequested=requested;state.walkFromWalker=false;}
export function inviteWalkerWithWalking(e,state){
 if(!canInviteWalker(e,state)||!inviteWalker(e,state.distance))return false;
 state.walkFromWalker=!state.walkRequested;state.walkRequested=true;state.auto=true;state.fastRequested=false;return true;
}
export function releaseWalkerWalking(e,state){
 if(state.walkFromWalker&&e.status!=='active'){state.walkRequested=false;state.walkFromWalker=false;return true;}
 return false;
}
export function leaveWalker(e){if(e.status==='active')e.status='departing';}
export function updateWalker(e,{started,paused,distance,dt}){
 if(!started||paused)return;
 if(e.status==='arrived')e.arrivalTime+=dt;
 if(e.status==='unseen'&&distance>=WALKER.start-24)e.status=distance>WALKER.end+16?'skipped':'available';
 if(['available','active','departing'].includes(e.status)){
  const pace=e.status==='active'?Math.max(0,Math.min(WALKER.speed,WALKER.speed+(distance-e.s+4)*.45)):WALKER.speed;
  const step=Math.min(WALKER.end-e.s,pace*dt);e.s+=step;e.speed=step/dt||0;e.phase+=step/.62*Math.PI*2;
  if(e.s>=WALKER.end){e.accompanied=e.status==='active'&&Math.abs(distance-e.s)<=9;e.status='arrived';e.speed=0;}
  else if(e.status==='available'&&distance>e.s+20)e.status='departing';
  else if(e.status==='active'&&Math.abs(distance-e.s)>22)e.status='departing';
 }
}
const mat=color=>new THREE.MeshStandardMaterial({color,roughness:.95});
export function createWalker(scene){
 const bench=new THREE.Group();bench.name='Orchard bench';scene.add(bench);
 const bx=centerAt(WALKER.end)-5.05,by=visibleGroundAt(bx,WALKER.end);bench.position.set(bx,by,-WALKER.end);
 const wood=mat('#b5a58b');
 function plank(x,y,z,w,h,d){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),wood);o.position.set(x,y,z);o.castShadow=true;bench.add(o);}
 for(const z of [-.52,.52]){
  const foot=visibleGroundAt(bx,WALKER.end-z)-by-.035;
  plank(0,(foot+.46)/2,z,.09,.46-foot,.09);
  plank(-.23,(foot+.92)/2,z,.08,.92-foot,.08);
 }
 for(const x of [-.17,0,.17])plank(x,.46,0,.14,.07,1.5);
 for(const y of [.68,.86])plank(-.25,y,0,.07,.13,1.5);
 const root=new THREE.Group();root.name='Village neighbour';scene.add(root);
 const skin=mat('#d6ad8c'),shirt=mat('#a7b1a0'),pants=mat('#797e73'),shoe=mat('#d8cfb8'),hair=mat('#d2ccc1');
 function ellipsoid(name,x,y,z,sx,sy,sz,m){const o=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),m);o.name=name;o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;root.add(o);return o;}
 function limb(m,r,name){const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r*.9,1,8),m);o.name=name;o.castShadow=true;root.add(o);return o;}
 function segment(o,a,b){o.position.copy(a).add(b).multiplyScalar(.5);o.scale.y=a.distanceTo(b);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize());}
 ellipsoid('Linen shirt',0,1.04,0,.14,.28,.19,shirt);ellipsoid('Neighbour face',.01,1.43,0,.103,.13,.105,skin);ellipsoid('Silver hair',-.035,1.48,0,.095,.105,.11,hair);
 for(const s of [-1,1]){ellipsoid('Kind eye',.101,1.452,s*.046,.006,.008,.006,mat('#55534b'));ellipsoid('Ear',0,1.43,s*.105,.026,.034,.014,skin);}
 const limbs=[-1,1].map(side=>({side,thigh:limb(pants,.06,'Neighbour thigh'),shin:limb(pants,.045,'Neighbour shin'),upper:limb(shirt,.045,'Neighbour sleeve'),arm:limb(skin,.026,'Neighbour forearm'),foot:ellipsoid('Walking shoe',0,.045,side*.11,.11,.045,.055,shoe)}));
 return {root,update(e,elapsed=0){
  const distance=scene.userData.playerS??e.s;
  root.visible=e.status!=='unseen'&&e.status!=='skipped'&&Math.abs(e.s-distance)<120;
  bench.visible=Math.abs(WALKER.end-distance)<180;
  const s=e.s,x=centerAt(s)+walkerLane(s),ahead=centerAt(s+.08)+walkerLane(s+.08);
  const y=visibleGroundAt(x,s)+.014;
  root.position.set(x,y,-s);
  const turn=THREE.MathUtils.smoothstep(e.arrivalTime,0,1.4);
  const yaw=THREE.MathUtils.lerp(Math.atan2(.08,ahead-x),-.48,turn);
  root.rotation.y=yaw;
  const moving=THREE.MathUtils.smoothstep(e.speed,0,.35);
  for(const l of limbs){const c=((e.phase/(2*Math.PI)+(l.side>0?0:.5))%1+1)%1,t=Math.max(0,(c-.5)*2);const x=(c<.5?.155-.62*c:-.155+.31*t*t*(3-2*t))*moving, lift=Math.sin(t*Math.PI)*.085*moving;
   const shoeX=x+.025,shoeZ=l.side*.11;
   const worldX=root.position.x+Math.cos(yaw)*shoeX+Math.sin(yaw)*shoeZ;
   const worldS=s+Math.sin(yaw)*shoeX-Math.cos(yaw)*shoeZ;
   const contact=visibleGroundAt(worldX,worldS)+.016-y;
   const hip=new THREE.Vector3(0,.81,l.side*.11),foot=new THREE.Vector3(x,.075+lift+contact,l.side*.11),mid=hip.clone().lerp(foot,.5);const delta=foot.clone().sub(hip),pole=new THREE.Vector3(-delta.y,delta.x,0).normalize();mid.addScaledVector(pole,Math.sqrt(Math.max(0,.385**2-hip.distanceTo(foot)**2/4)));
   segment(l.thigh,hip,mid);segment(l.shin,mid,foot);l.foot.position.set(shoeX,.045+lift+contact,shoeZ);
   const shoulder=new THREE.Vector3(0,1.21,l.side*.19),hand=new THREE.Vector3(Math.sin(e.phase)*l.side*.06,.81,l.side*.22),elbow=shoulder.clone().lerp(hand,.5);elbow.x-=.075;
   const wave=e.accompanied?THREE.MathUtils.smoothstep(e.arrivalTime,0,.6)*(1-THREE.MathUtils.smoothstep(e.arrivalTime,3,4)):0;
   if(l.side>0&&wave>0){hand.lerp(new THREE.Vector3(.10+Math.sin(e.arrivalTime*7)*.025,1.48,.34),wave);}
   const direction=hand.clone().sub(shoulder).normalize(),bend=new THREE.Vector3(-1,0,0);bend.addScaledVector(direction,-bend.dot(direction)).normalize();
   elbow.copy(shoulder).lerp(hand,.5).addScaledVector(bend,Math.sqrt(Math.max(0,.24**2-shoulder.distanceTo(hand)**2/4)));
   segment(l.upper,shoulder,elbow);segment(l.arm,elbow,hand);
  }
 }};
}
