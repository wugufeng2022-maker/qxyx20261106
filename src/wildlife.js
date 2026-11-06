import * as THREE from 'three';
import {rng,centerAt,CHUNK_LENGTH,ROUTE_LENGTH,isDryLand,pondViewingGap} from './route.js';
import {branchAnchor} from './vegetation.js';
import {visibleGroundAt} from './grass-tumble.js';
import {tunnelExcludes} from './flower-tunnel.js';
import {courtyardExcludes} from './start-courtyard.js';
const sphere=new THREE.SphereGeometry(1,10,7),cone=new THREE.ConeGeometry(1,1,8);
for(const geometry of [sphere,cone])geometry.userData.sharedWildlife=true;
const mat=c=>new THREE.MeshStandardMaterial({color:c,roughness:.9});
const feather=mat('#918778'),breast=mat('#ddcbb0'),dark=mat('#393b31'),gold=mat('#c49b47');
const wingMat=new THREE.MeshStandardMaterial({color:'#e8f0e3',transparent:true,opacity:.42,roughness:.4,depthWrite:false,side:THREE.DoubleSide});
const butterflyColors=['#edc275','#d39881','#ccc9ed','#f5e7b0'].map(mat);
const gnatWing=mat('#cce0c1');
function ellipsoid(parent,material,pos,scale){const mesh=new THREE.Mesh(sphere,material);mesh.position.set(...pos);mesh.scale.set(...scale);parent.add(mesh);return mesh;}
function bird(){
  const g=new THREE.Group();g.name='Small perched songbird';
  ellipsoid(g,feather,[0,.11,0],[.10,.12,.17]);ellipsoid(g,breast,[0,.13,.08],[.078,.09,.10]);
  const head=new THREE.Group();head.position.set(0,.25,.08);g.add(head);ellipsoid(head,feather,[0,0,0],[.078,.078,.075]);
  for(const side of [-1,1]){ellipsoid(head,dark,[side*.061,.016,.037],[.012,.012,.012]);ellipsoid(g,dark,[side*.035,.01,.025],[.012,.022,.035]);}
  const beak=new THREE.Mesh(cone,gold);beak.scale.set(.022,.065,.022);beak.rotation.x=Math.PI/2;beak.position.set(0,-.012,.09);head.add(beak);
  const tail=ellipsoid(g,feather,[0,.12,-.19],[.055,.025,.12]);tail.rotation.x=-.25;
  const wings=[-1,1].map(side=>ellipsoid(g,feather,[side*.083,.13,-.025],[.025,.085,.13]));
  return {g,head,wings};
}
function bee(){
  const g=new THREE.Group();g.name='Flower visiting bee';
  ellipsoid(g,gold,[0,0,0],[.025,.026,.045]);
  for(const z of [-.02,.005])ellipsoid(g,dark,[0,0,z],[.0255,.0265,.008]);
  ellipsoid(g,dark,[0,0,.045],[.021,.022,.021]);
  const wings=[-1,1].map(side=>ellipsoid(g,wingMat,[side*.033,.02,-.002],[.042,.005,.023]));
  return {g,wings};
}
function vergeInsect(kind,color){
  const butterfly=kind==='butterfly';
  const g=new THREE.Group();g.name=butterfly?'Wayside butterfly':'Small verge insect';g.visible=false;
  ellipsoid(g,dark,[0,0,0],butterfly?[.014,.014,.067]:[.018,.018,.043]);
  const wings=[-1,1].map(side=>{
    const pivot=new THREE.Group();g.add(pivot);
    if(butterfly){
      ellipsoid(pivot,butterflyColors[color],[side*.071,0,.032],[.092,.012,.076]).rotation.y=side*.30;
      ellipsoid(pivot,butterflyColors[color],[side*.054,0,-.043],[.069,.012,.060]);
      ellipsoid(pivot,dark,[side*.122,.005,.030],[.020,.010,.016]);
    }else{
      ellipsoid(pivot,gnatWing,[side*.051,.012,.003],[.061,.009,.025]);
    }
    return pivot;
  });
  return {g,wings};
}

export function vergeInsectSites(index){
  const random=rng(index*1847+751),sites=[];
  for(const side of [-1,1])for(let slot=0;slot<3;slot++){
    const s=index*CHUNK_LENGTH+7+slot*20+random()*9,d=3.65+random()*1.95;
    const phase=random()*24,kind=random()<.74?'butterfly':'midge',color=Math.floor(random()*butterflyColors.length);
    const x=centerAt(s)+side*d;
    if(s<0||s>=ROUTE_LENGTH||tunnelExcludes(x,s)||courtyardExcludes(x,s,.75)||pondViewingGap(x,s))continue;
    if(![-1.4,0,1.4].every(ds=>isDryLand(centerAt(s+ds)+side*d,s+ds)))continue;
    sites.push({s,x,side,d,phase,kind,color,y:visibleGroundAt(x,s)+.23});
  }
  return sites;
}

export function vergeInsectPose(site,time){
  const t=(time+site.phase)%11.7;
  const u=Math.max(0,Math.min(1,(t-3.6)/8.1));
  const flight=Math.sin(Math.PI*u)**2;
  const s=site.s+Math.sin(u*Math.PI*4)*flight*1.4;
  const d=site.d+Math.sin(u*Math.PI*2+.4)*flight*.57;
  return {x:centerAt(s)+site.side*d,y:site.y+flight*(.79+.16*Math.sin(u*18)),z:-s,flight,heading:u*5+site.phase};
}
export function beePosition(targets,time,seed=0){
  const duration=7.5,t=Math.max(0,time+seed),cycle=Math.floor(t/duration),phase=t%duration;
  const a=targets[cycle%targets.length],b=targets[(cycle+1)%targets.length];
  const flying=phase>4.5,u=flying?(phase-4.5)/3:0,e=u*u*(3-2*u);
  return {x:a[0]+(b[0]-a[0])*e,y:a[1]+(b[1]-a[1])*e+.035+Math.sin(u*Math.PI)*.35,
    z:a[2]+(b[2]-a[2])*e,flying,heading:Math.atan2(b[0]-a[0],b[2]-a[2])};
}
export function addWildlife(group,index){
  const random=rng(index*761+82),birds=[],bees=[];
  const trees=(group.userData.wildlifeTrees||[]).sort((a,b)=>Math.abs(a.point.pos[0]-centerAt(-a.point.pos[2]))-Math.abs(b.point.pos[0]-centerAt(-b.point.pos[2])));
  for(const tree of trees){
    const anchor=branchAnchor(tree.name,tree.point);if(!anchor)continue;
    if(birds.some(b=>b.anchor.pos.distanceTo(anchor.pos)<12))continue;
    const b=bird();b.anchor=anchor;b.phase=random()*6.28;b.g.position.copy(anchor.pos);b.g.rotation.y=random()*6.28;
    group.add(b.g);birds.push(b);if(birds.length===2)break;
  }
  const flowers=group.userData.flowerVisits||[];
  for(const side of [-1,1]){
    const candidates=flowers.filter(p=>Math.sign(p[0]-centerAt(-p[2]))===side);
    for(let i=0;i<2&&candidates.length;i++){
      const first=candidates[Math.floor(random()*candidates.length)];
      const close=candidates.filter(p=>Math.hypot(p[0]-first[0],p[2]-first[2])<2.5);
      if(close.length<2)continue;
      const b=bee();b.targets=close.slice(0,4);b.phase=random()*15;group.add(b.g);bees.push(b);
    }
  }
  const insects=vergeInsectSites(index).map(site=>{
    const insect=vergeInsect(site.kind,site.color);
    group.add(insect.g);
    return {...insect,site};
  });
  group.userData.wildlife={birds,bees,insects};
  delete group.userData.wildlifeTrees;delete group.userData.flowerVisits;
}
const local=new THREE.Vector3();
const vergePhase=Math.random()*11.7;
export function updateWildlife(chunks,time,camera){
  const visibleBirds=[],visibleBees=[],visibleInsects=[];
  for(const chunk of chunks){
    const life=chunk.userData.wildlife;if(!life)continue;
    for(const b of life.birds){
      const {anchor}=b,p=anchor.local,phase=anchor.tree.pos[0]*.41+anchor.tree.pos[2]*.29,bend=Math.min(1,p.y)**2;
      local.copy(p);local.x+=Math.sin(time*1.35+phase+p.y)*bend*.035;local.z+=Math.cos(time*.9+phase)*bend*.018;
      b.g.position.copy(local.applyMatrix4(anchor.matrix));b.head.rotation.y=Math.sin(time*.6+b.phase)*.35;
      b.g.visible=false;const distance=b.g.position.distanceTo(camera);if(distance<42)visibleBirds.push({b,distance});
    }
    for(const b of life.bees){
      const p=beePosition(b.targets,time,b.phase);b.g.position.set(p.x,p.y,p.z);b.g.rotation.y=p.heading;
      b.wings.forEach((w,i)=>w.rotation.z=(i?1:-1)*(p.flying?Math.sin(time*95+b.phase)*.85:.12));
      b.g.visible=false;const distance=b.g.position.distanceTo(camera);if(distance<18)visibleBees.push({b,distance});
    }
    for(const insect of life.insects){
      insect.g.visible=false;
      if(Math.abs(insect.site.s+camera.z)>25)continue;
      const p=vergeInsectPose(insect.site,time+vergePhase);
      if(p.flight<.018||p.z>camera.z+1.5)continue;
      insect.g.position.set(p.x,p.y,p.z);
      insect.g.rotation.y=p.heading;
      const flap=.32+Math.sin(time*(insect.site.kind==='butterfly'?43:74)+insect.site.phase)*.76;
      insect.wings[0].rotation.z=-flap;
      insect.wings[1].rotation.z=flap;
      visibleInsects.push({insect,distance:insect.g.position.distanceTo(camera)});
    }
  }
  visibleBirds.sort((a,b)=>a.distance-b.distance).slice(0,2).forEach(({b})=>b.g.visible=true);
  visibleBees.sort((a,b)=>a.distance-b.distance).slice(0,4).forEach(({b})=>b.g.visible=true);
  visibleInsects.sort((a,b)=>a.distance-b.distance).slice(0,6).forEach(({insect})=>insect.g.visible=true);
  return {birds:Math.min(2,visibleBirds.length),bees:Math.min(4,visibleBees.length),insects:Math.min(6,visibleInsects.length)};
}
