import {scenicFlowerWeight,scenicProfile} from './scenic-rhythm.js';
import {inGrassZone,visibleGroundAt} from './grass-tumble.js';
import * as THREE from 'three';
import {centerAt,tangentAt,groundAt,rng,CHUNK_LENGTH,DOWNHILL_POND,pondRadius,pondViewingGap,summitVista} from './route.js';
import {plantInstances} from './vegetation.js';
import {createDuckModel} from './ducks.js';
import {HILL_LOOKOUT} from './pond-stop.js';

export const REGIONAL_REACHES=Object.freeze([
  {key:'meadow',start:300,end:775,flowers:190,trees:7},
  {key:'downhill',start:2580,end:3240,flowers:110,trees:4},
  {key:'ridge',start:8170,end:9110,flowers:115,trees:2},
]);
// Deterministic patches, alternating open views and small groves. Tree bounds
// remain at least 5 m from the cycling road even at the largest crown width.
export function regionalPlants(index){
  const random=rng(index*7919+4301),flowers=[],trees=[];
  const start=index*CHUNK_LENGTH;
  for(const reach of REGIONAL_REACHES){
    if(start+CHUNK_LENGTH<reach.start||start>reach.end)continue;
    for(let i=0;i<reach.flowers;i++){
      const s=start+random()*CHUNK_LENGTH;if(s<reach.start||s>reach.end)continue;
      const side=i%2?1:-1,d=3.8+random()**1.4*(reach.key==='meadow'?18:9);
      const patch=.3+.7*scenicFlowerWeight(s,side,d);
      if(random()>patch*.8+.12)continue;
      const x=centerAt(s)+side*d;if(pondRadius(x,s)<1.15||pondViewingGap(x,s)||inGrassZone(s)&&d<5.5)continue;
      const h=reach.key==='ridge'?.22+random()*.22:.32+random()*.40;
      const profile=scenicProfile(s);
      flowers.push({kind:random()<profile.flowerMix?profile.nextFlower:profile.flower,pos:[x,groundAt(x,s)-.015,-s],scale:[h,h,h],rot:[0,random()*6.28,0],region:reach.key});
    }
    for(let i=0;i<reach.trees;i++){
      const s=start+random()*CHUNK_LENGTH;if(s<reach.start||s>reach.end)continue;
      if(random()>(.25+scenicProfile(s).trees*.75)*(1-summitVista(s)*.7))continue;
      const side=i%2?1:-1,d=reach.key==='ridge'?16+random()*18:12+random()*20,x=centerAt(s)+side*d;
      if(pondRadius(x,s)<1.5||pondViewingGap(x,s))continue;
      const h=reach.key==='ridge'?2.4+random()*1.4:4.0+random()*2.8;
      trees.push({kind:i%5,pos:[x,groundAt(x,s)-.04,-s],scale:[h*1.05,h,h*1.05],rot:[0,random()*6.28,0],color:reach.key==='ridge'?'#b9c5a0':reach.key==='meadow'?'#b3c99b':'#bdcaa0',region:reach.key});
    }
  }
  // One recognisable pair of old birches on the outer grass slope.
  if(Math.floor(586/CHUNK_LENGTH)===index)for(const [s,d,h]of [[586,-12,8.4],[590,-15,6.5]]){
    const x=centerAt(s)+d;trees.push({kind:3,pos:[x,groundAt(x,s)-.04,-s],scale:[h,h,h],rot:[0,.6,0],color:'#c4d4a8',region:'meadow'});
  }
  return {flowers,trees};
}
export function addRegionalScenery(group,index){
  const {flowers,trees}=regionalPlants(index);
  for(let i=0;i<5;i++){
    plantInstances(group,`Flower_${i+1}_Clump`,flowers.filter(p=>p.kind===i));
    plantInstances(group,`BirchTree_${i+1}`,trees.filter(p=>p.kind===i));
  }
  const start=index*CHUNK_LENGTH;
  if(start<DOWNHILL_POND.s+DOWNHILL_POND.rz*1.2&&start+CHUNK_LENGTH>DOWNHILL_POND.s-DOWNHILL_POND.rz*1.2)addPondWater(group,index);
  if(start<=HILL_LOOKOUT&&start+CHUNK_LENGTH>HILL_LOOKOUT)addFootLookout(group);
  if(start>=8150&&start<9150)addCloudShade(group,index);
}
function addFootLookout(group) {
  const s=HILL_LOOKOUT,x=centerAt(s)+4.4;
  const wood=new THREE.MeshStandardMaterial({color:'#a28b65',roughness:.96});
  const stone=new THREE.MeshStandardMaterial({color:'#c0b69b',roughness:1});
  (group.userData.ownedMaterials??=[]).push(wood,stone);
  const y=Math.max(visibleGroundAt(x,s-.72),visibleGroundAt(x,s+.72))+.42;
  const seat=new THREE.Mesh(new THREE.BoxGeometry(.48,.11,1.8),wood);
  seat.name='Small bench overlooking the lower slope';seat.position.set(x,y,-s);
  seat.castShadow=true;group.add(seat);
  for(const at of [s-.65,s+.65]){
    const ground=visibleGroundAt(x,at)-.07;
    const leg=new THREE.Mesh(new THREE.BoxGeometry(.38,y-ground,.19),stone);
    leg.position.set(x,(y+ground)/2,-at);group.add(leg);
  }
}
export function addPondWater(group,index){
  const positions=[],indices=[],p=DOWNHILL_POND;
  // The rectangular tessellation is submerged or hidden by the sculpted bank;
  // only the irregular oval opening in the continuous terrain is visible.
  for(let j=0;j<=32;j++){
    const s=index*CHUNK_LENGTH+j*2;
    for(let k=0;k<=16;k++){const x=centerAt(s)+p.offset+(k/16*2-1)*p.rx*1.2;positions.push(x,p.level,-s);}
  }
  for(let j=0;j<32;j++)for(let k=0;k<16;k++){
    const s=index*CHUNK_LENGTH+j*2+1,x=centerAt(s)+p.offset+((k+.5)/16*2-1)*p.rx*1.2;
    if(pondRadius(x,s)>1.15)continue;
    const a=j*17+k;indices.push(a,a+1,a+17,a+1,a+18,a+17);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();
  const mesh=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:'#83b6b5',roughness:.42,metalness:.06}));(group.userData.ownedMaterials??=[]).push(mesh.material);mesh.name='Small downhill pond in continuous basin';group.add(mesh);
}
export function addCloudShade(group,index){
  // Reuse the rendered terrain triangulation exactly: independent sampling
  // would cause a transparent plane to float above or disappear in the hillside.
  const g=group.children[0].geometry.clone(),p=g.attributes.position,uv=[];
  for(let i=0;i<p.count;i++){
    p.setY(i,p.getY(i)+.03);uv.push(p.getX(i)*.014,-p.getZ(i)*.014);
  }
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  const indices=[],source=g.index.array;
  for(let i=0;i<source.length;i+=3){
    const ids=[source[i],source[i+1],source[i+2]];
    // Preserve the cycling surface and its shoulders, including the winding edge.
    if(ids.some(id=>Math.abs(p.getX(id)-centerAt(-p.getZ(id)))<3.01))continue;
    indices.push(...ids);
  }
  g.setIndex(indices);
  const m=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv;uniform float time;void main(){float f=sin(vUv.x*.8+vUv.y*.32+time*.006)*sin(vUv.y*.7-time*.004);float edge=smoothstep(8150.,8210.,vUv.y/.014)*(1.-smoothstep(9090.,9150.,vUv.y/.014));gl_FragColor=vec4(.38,.48,.48,smoothstep(.1,.9,f)*.085*edge);}'});
  (group.userData.ownedMaterials??=[]).push(m);
  const mesh=new THREE.Mesh(g,m);mesh.name='Slow diffuse ridge cloud shade';group.add(mesh);group.userData.cloudShade=m;
}
export function swimmingDuckPose(time,i){
  const p=DOWNHILL_POND,a=time*.16+i*.09;
  // Nearly parallel lanes leave a full body length between the parent and young.
  const s=p.s-3.5+Math.sin(a)*2.25+i*1.4;
  const x=centerAt(s)+p.offset-3.7+Math.cos(a)*.80;
  const ds=Math.cos(a)*2.25,dx=tangentAt(s)*ds-Math.sin(a)*.80;
  return {x,s,y:p.level-(i===0?.21:.12)+Math.sin(time*2.4-i)*.012,heading:Math.atan2(dx,-ds)};
}
export function createRegionalLife(scene){
  const group=new THREE.Group();group.name='Resident downhill pond ducks';scene.add(group);
  const rippleGeometry=new THREE.RingGeometry(.89,1,24,1,Math.PI*1.19,Math.PI*.62);
  const ducks=[false,true,true,true].map((small,i)=>{
    const d=createDuckModel(small);d.g.scale.setScalar(small?.63+i*.014:1.19);
    const ripple=new THREE.Mesh(rippleGeometry,new THREE.MeshBasicMaterial({color:'#eef4de',transparent:true,opacity:.25,depthWrite:false,side:THREE.DoubleSide}));
    const wake=new THREE.Group();ripple.rotation.x=Math.PI*.5;
    ripple.scale.set(.55*d.g.scale.x,.43*d.g.scale.x,1);
    ripple.position.z=-.52*d.g.scale.x;
    wake.add(ripple);group.add(d.g,wake);d.feet.forEach(f=>f.visible=false);
    return {...d,wake,ripple};
  });
  return {update(time,distance,chunks){
    group.visible=Math.abs(distance-DOWNHILL_POND.s)<170;
    if(group.visible)ducks.forEach((d,i)=>{
      const p=swimmingDuckPose(time,i);
      d.g.position.set(p.x,p.y,-p.s);d.g.rotation.set(0,p.heading,0);
      d.head.rotation.x=.075*Math.sin(time*1.25-i*.7);
      d.wake.position.set(p.x,DOWNHILL_POND.level+.018,-p.s);
      d.wake.rotation.y=p.heading;
      d.ripple.material.opacity=.16+.08*Math.sin(time*2.5-i);
    });
    for(const chunk of chunks){if(chunk.userData.cloudShade)chunk.userData.cloudShade.uniforms.time.value=time;}
  }};
}
