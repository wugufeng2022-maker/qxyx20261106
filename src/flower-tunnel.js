import * as THREE from 'three';
import {TUNNEL_SEASONS as SEASONS,TUNNEL_LEAF_SHAPE,TUNNEL_VINE_COLORS} from './tunnel-design.js';
import {centerAt,heightAt,CHUNK_LENGTH,rng} from './route.js';
import {visibleGroundAt} from './grass-tumble.js';
import {applyVegetationBreeze} from './vegetation.js';
import {CAT_HOME} from './village-cat-site.js';

// Early summer along the main road. The seasonal design remains in tunnel-design.js.
export const FLOWER_TUNNEL=Object.freeze({start:1280,end:1760,halfWidth:6.6,spring:3.8,rise:3.7,spacing:8});
const gardenOpening={start:CAT_HOME-24,end:CAT_HOME+24};
const summer=SEASONS[1];
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function tunnelWeight(s){return smooth((s-1260)/20)*smooth((1780-s)/20);}
export function tunnelCameraOffset(s,aspect){const normal=3.8*Math.max(1,.8/aspect);return normal+(Math.min(normal,3.65)-normal)*tunnelWeight(s);}
export function tunnelExcludes(x,s,radius=0){return s+radius>=1277&&s-radius<=1763&&Math.abs(x-centerAt(s))<7.5+radius;}
export function tunnelOpening(s){
 const yard=1-smooth((Math.abs(s-CAT_HOME)-24)/19);
 const skylights=.55*Math.max(1-smooth(Math.abs(s-1391)/21),1-smooth(Math.abs(s-1658)/26));
 return Math.max(yard,skylights);
}
export function tunnelProfile(s){
 const opening=tunnelOpening(s);
 const canopy=.82+.09*Math.sin((s-1290)*.041)+.05*Math.cos(s*.09);
 return {name:summer.name,opening,density:canopy*(1-opening*.82),bloomRate:.105,
  shade:.35*canopy*tunnelWeight(s)*(1-opening),
  leaf:summer.leaf,bloom:['#f0e7c8','#d9e4bd']};
}
function crown(s,a){return [centerAt(s)+Math.cos(a)*FLOWER_TUNNEL.halfWidth,heightAt(s)+FLOWER_TUNNEL.spring+Math.sin(a)*FLOWER_TUNNEL.rise,-s];}
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
export function tunnelLayout(index){
 const start=index*CHUNK_LENGTH,end=start+CHUNK_LENGTH,wood=[],vines=[],leaves=[],flowers=[],roots=[];
 const segment=(list,a,b,r)=>{
  const item={a,b,r};
  if(list===vines)item.color=TUNNEL_VINE_COLORS.natural;
  list.push(item);
 };
 for(let s=1280;s<=1760;s+=8){
  if(s<start||s>=end||s>gardenOpening.start&&s<gardenOpening.end)continue;
  for(const side of [-1,1]){
   const x=centerAt(s)+side*6.6,y=visibleGroundAt(x,s),top=crown(s,side<0?Math.PI:0);
   roots.push([x,y,-s]);segment(wood,[x,y-.10,-s],top,.095);
  }
  for(let j=0;j<20;j++)segment(wood,crown(s,j/20*Math.PI),crown(s,(j+1)/20*Math.PI),.085);
 }
 // Longitudinal runners physically join the timber arches. Ownership is by
 // absolute segment start, so a chunk seam never resets or doubles a vine.
 for(let s=1280;s<1760;s+=1){
  if(s<start||s>=end||s>=gardenOpening.start&&s<gardenOpening.end)continue;
  const random=rng(s*7789+23),profile=tunnelProfile(s),density=(.25+.75*smooth((s-1280)/20)*smooth((1760-s)/20))*profile.density;
  for(let rail=0;rail<11;rail++){
   const a=.055+rail*(Math.PI-.11)/10;
   const wobble=(at)=>.028*Math.sin(at*.65+rail*2);
   const p=crown(s,a+wobble(s)),q=crown(s+1,a+wobble(s+1));
   segment(vines,p,q,.028);
   // Small branches all start on a runner; the leaves and blossoms terminate
   // on those branches rather than being whole upside-down meadow plants.
   for(let k=0;k<2;k++){
    if(random()>density || rail===5&&s%9<3 || profile.opening>.4&&rail>7)continue; // skylight pockets
    const t=(k+.25+random()*.45)/2,anchor=mix(p,q,t),side=k%2?1:-1;
    const tip=[anchor[0]+side*(.20+random()*.30),anchor[1]-.05-random()*.30,anchor[2]+(random()-.5)*.7];
    segment(vines,anchor,tip,.012);
    leaves.push({p:tip,angle:random()*Math.PI*2,tilt:1.05+random()*.9,size:.76+random()*.35,color:profile.leaf[Math.floor(random()*3)]});
    // Irregular blossom colonies, not one repeated pendant on every runner.
    const patch=.5+.5*Math.sin(s*.39+rail*1.81)*Math.cos(s*.16-rail*.7);
    if(patch>.62&&random()<profile.bloomRate){
     const colour=profile.bloom[random()<.65?0:1];
     for(let bloom=0;bloom<2+Math.floor(random()*3);bloom++){
      const at=mix(anchor,tip,.48+bloom*.09),p=[at[0]+(random()-.5)*.24,at[1]-.02-random()*.13,at[2]+(random()-.5)*.28];
      segment(vines,at,p,.009);
      flowers.push({p,angle:random()*6.28,size:.13+random()*.11,color:colour});
     }
    }
   }
  }
 }
 // Climbing growth spirals around each post from the terrain to the spring.
 for(const root of roots){
  const s=-root[2],profile=tunnelProfile(s),side=Math.sign(root[0]-centerAt(s)),top=heightAt(s)+3.8,random=rng(s*187+side+33);
  let prior=[root[0]+.1,root[1],root[2]];
  for(let j=1;j<=22;j++){
   const a=j*.9,p=[root[0]+Math.cos(a)*.13,root[1]+(top-root[1])*j/22,root[2]+Math.sin(a)*.13];
   segment(vines,prior,p,.025);prior=p;
   const tip=[p[0]+Math.cos(a)*.25,p[1]+.08,p[2]+Math.sin(a)*.25];segment(vines,p,tip,.012);
   if(random()<profile.density)leaves.push({p:tip,angle:a,tilt:.5,size:.47,color:profile.leaf[j%3]});
   if(j%3===0&&random()<profile.bloomRate*3)flowers.push({p:tip,angle:a,size:.16+random()*.04,color:profile.bloom[0]});
  }
 }
 return {wood,vines,leaves,flowers,roots};
}
function leafGeometry(){
 // Five elliptical leaflets with curved margins, folded veins and lifted tips.
 // Four quads per blade form a cupped surface (62 triangles per connected sprig).
 const points=[],indices=[];
 const blade=(bx,by,tx,ty,width)=>{
  const dx=tx-bx,dy=ty-by,len=Math.hypot(dx,dy),nx=-dy/len,ny=dx/len;
  const base=points.length/3;points.push(bx,by,0);
  for(let row=1;row<=3;row++){
   const t=row/4,w=Math.pow(Math.sin(t*Math.PI),TUNNEL_LEAF_SHAPE.edgeExponent)*width,x=bx+dx*t,y=by+dy*t,z=len*TUNNEL_LEAF_SHAPE.curveRatio*Math.sin(t*Math.PI)+TUNNEL_LEAF_SHAPE.tipLift*t*t;
   points.push(x+nx*w,y+ny*w,z-TUNNEL_LEAF_SHAPE.midribLift,x,y,z+TUNNEL_LEAF_SHAPE.midribLift,x-nx*w,y-ny*w,z-TUNNEL_LEAF_SHAPE.midribLift);
  }
  points.push(tx,ty,TUNNEL_LEAF_SHAPE.tipLift);
  indices.push(base,base+1,base+2,base,base+2,base+3);
  for(let row=0;row<2;row++)for(let side=0;side<2;side++){
   const i=base+1+row*3+side,j=i+3;indices.push(i,j,i+1,i+1,j,j+1);
  }
  indices.push(base+7,base+10,base+8,base+8,base+10,base+9);
 };
 for(const y of [.30,.78])for(const side of [-1,1])blade(0,y,side*(.61-y*.1),y+.29,.19);
 blade(0,1.02,0,1.55,.21);
 points.push(-.012,0,0,.012,0,0,-.012,1.45,0,.012,1.45,0);
 const i=points.length/3-4;indices.push(i,i+1,i+2,i+1,i+3,i+2);
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function addFlowerTunnel(group,index){
 const data=tunnelLayout(index);if(!data.wood.length&&!data.vines.length)return;
 const tunnel=new THREE.Group();tunnel.name='Early summer village arbor';tunnel.userData.roots=data.roots;group.add(tunnel);
 const materials=[['#978064',false],['#ffffff',false],['#ffffff',true],['#ffffff',false],['#d3ab65',false]].map(([color,double])=>new THREE.MeshStandardMaterial({color,roughness:1,side:double?THREE.DoubleSide:THREE.FrontSide}));
 applyVegetationBreeze(materials[2]);
 (group.userData.ownedMaterials??=[]).push(...materials);
 const dummy=new THREE.Object3D(),up=new THREE.Vector3(0,1,0),direction=new THREE.Vector3(),tint=new THREE.Color();
 const batch=(name,geo,material,items,pose)=>{
  if(!items.length){geo.dispose();return;}
  const mesh=new THREE.InstancedMesh(geo,material,items.length);mesh.name=name;
  items.forEach((item,i)=>{dummy.position.set(0,0,0);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);pose(item,dummy);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);if(item.color)mesh.setColorAt(i,tint.set(item.color));});
  if(name==='Curved folded vine leaves'){mesh.customDepthMaterial=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});applyVegetationBreeze(mesh.customDepthMaterial);}
  mesh.receiveShadow=true;mesh.castShadow=name==='Timber arch ribs'||name==='Curved folded vine leaves';mesh.computeBoundingSphere();tunnel.add(mesh);
 };
 const line=(v,o)=>{o.position.fromArray(mix(v.a,v.b,.5));direction.fromArray(v.b).sub(new THREE.Vector3().fromArray(v.a));o.quaternion.setFromUnitVectors(up,direction.clone().normalize());o.scale.set(v.r,direction.length(),v.r);};
 batch('Timber arch ribs',new THREE.CylinderGeometry(1,1,1,7),materials[0],data.wood,line);
 batch('Connected climbing vine runners',new THREE.CylinderGeometry(1,1,1,5),materials[1],data.vines,line);
 batch('Curved folded vine leaves',leafGeometry(),materials[2],data.leaves,(v,o)=>{o.position.fromArray(v.p);o.rotation.set(v.tilt??1.4,v.angle,.25*Math.sin(v.angle));o.scale.setScalar(v.size);});
 const petals=[],centres=[];
 for(const flower of data.flowers){
  // Five rounded petals share one centre, facing down into the flower aisle.
  const rotation=new THREE.Euler(.35*Math.sin(flower.angle),flower.angle,.2),q=new THREE.Quaternion().setFromEuler(rotation);
  for(let i=0;i<5;i++){
   const a=i*Math.PI*2/5,offset=new THREE.Vector3(Math.cos(a)*flower.size*.63,-.015,Math.sin(a)*flower.size*.63).applyQuaternion(q);
   petals.push({p:new THREE.Vector3().fromArray(flower.p).add(offset).toArray(),size:flower.size,angle:a+flower.angle,color:flower.color});
  }
  centres.push({p:[flower.p[0],flower.p[1]-.035,flower.p[2]],size:flower.size*.24});
 }
 batch('Early summer five petal blossoms',new THREE.SphereGeometry(1,6,3),materials[3],petals,(v,o)=>{o.position.fromArray(v.p);o.rotation.y=-v.angle;o.scale.set(v.size*.75,v.size*.27,v.size*.50);});
 batch('Warm small flower centres',new THREE.IcosahedronGeometry(1,0),materials[4],centres,(v,o)=>{o.position.fromArray(v.p);o.scale.set(v.size,v.size*.55,v.size);});
}
