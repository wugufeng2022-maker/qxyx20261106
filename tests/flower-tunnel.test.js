import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FLOWER_TUNNEL,tunnelProfile,tunnelOpening,tunnelLayout,tunnelCameraOffset,tunnelWeight,tunnelExcludes,addFlowerTunnel} from '../src/flower-tunnel.js';
import {centerAt,heightAt,tangentAt} from '../src/route.js';
import {updateVegetation} from '../src/vegetation.js';
import {visibleGroundAt} from '../src/grass-tumble.js';
import {disposeChunk,VILLAGE_HOMES} from '../src/scenery.js';

test('one finite deterministic flower tunnel joins absolute-world runners across streamed seams',()=>{
 let total=0,roots=[];
 for(let i=0;i<157;i++){
  const data=tunnelLayout(i);assert.deepEqual(data,tunnelLayout(i));
  if((i<20||i>27))assert.deepEqual(data,{wood:[],vines:[],leaves:[],flowers:[],roots:[]});
  total+=data.leaves.length+data.flowers.length*6+data.vines.length+data.wood.length;roots.push(...data.roots);
  for(const line of [...data.vines,...data.wood])assert.ok(-line.a[2]>=i*64-.4&&-line.a[2]<(i+1)*64+.4);
 }
 assert.ok(roots.length>100);assert.ok(total<35000);
 const a=tunnelLayout(20).vines.filter(v=>v.a[2]===-1343&&v.b[2]===-1344),b=tunnelLayout(21).vines.filter(v=>v.a[2]===-1344&&v.b[2]===-1345);
 assert.equal(a.length,11);assert.equal(b.length,11);a.forEach((v,i)=>assert.deepEqual(v.b,b[i].a));
});
test('post roots touch actual terrain triangles and the flower roof leaves all riding lenses clear',()=>{
 for(const i of [20,21,22,23,24,25,26,27])for(const p of tunnelLayout(i).roots)assert.equal(p[1],visibleGroundAt(p[0],-p[2]));
 for(let s=1280;s<=1760;s+=.5)for(const aspect of [.32,.46,.8,1.8,2.4])for(const lane of [-1.55,0,1.55])for(const view of [0,1,2]){
  const f=new THREE.Vector3(tangentAt(s),0,-1).normalize(),r=new THREE.Vector3(-f.z,0,f.x),p=new THREE.Vector3(centerAt(s),heightAt(s)+.025,-s).addScaledVector(r,lane);
  if(view===0){p.addScaledVector(f,-6.1).addScaledVector(r,Math.min(2.5,Math.max(.7,aspect*1.45)));p.y+=3.1;}
  if(view===1){p.addScaledVector(f,.7).addScaledVector(r,tunnelCameraOffset(s,aspect));p.y+=1.65;}
  if(view===2){p.addScaledVector(f,-.4).addScaledVector(r,-.48);p.y+=1.4;}
  const at=-p.z,d=Math.abs(p.x-centerAt(at)),h=p.y-heightAt(at);
  // Conservatively reserve 0.8m for flowers/leaves inside the arch surface.
  assert.ok(d<5.8,`lens lateral clearance ${d}`);
  const roof=3.8+3.7*Math.sqrt(Math.max(0,1-(d/6.6)**2));assert.ok(h<roof-.8);
 }
 for(const s of [1250,1790,5000])assert.equal(tunnelCameraOffset(s,.32),3.8*.8/.32);
 for(const s of [1260,1280,1760,1780])assert.ok(Math.abs(tunnelCameraOffset(s-.0001,.32)-tunnelCameraOffset(s+.0001,.32))<.0001);
 assert.equal(tunnelWeight(1280),1);assert.equal(tunnelWeight(1760),1);
 for(const home of VILLAGE_HOMES)assert.ok(!tunnelExcludes(centerAt(home.s)+home.side*home.setback,home.s,5));
});
test('every instanced tunnel resource is chunk-owned, released once, and safely rebuilt',()=>{
 const group=new THREE.Group();addFlowerTunnel(group,20);const geometries=new Set(),materials=new Set(),instances=[];
 group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);if(o.isInstancedMesh)instances.push(o);});
 assert.equal(instances.length,5);assert.equal(materials.size,5);assert.equal(geometries.size,5);
 let disposedGeometry=0,disposedMaterial=0,disposedInstance=0,disposedDepth=0;
 for(const i of instances)if(i.customDepthMaterial)i.customDepthMaterial.addEventListener('dispose',()=>disposedDepth++);
 for(const g of geometries)g.addEventListener('dispose',()=>disposedGeometry++);
 for(const m of materials)m.addEventListener('dispose',()=>disposedMaterial++);
 for(const i of instances)i.addEventListener('dispose',()=>disposedInstance++);
 disposeChunk(group);assert.equal(disposedGeometry,5);assert.equal(disposedMaterial,5);assert.equal(disposedInstance,5);assert.equal(disposedDepth,1);
 const rebuilt=new THREE.Group();addFlowerTunnel(rebuilt,20);assert.equal(rebuilt.children[0].children.length,5);disposeChunk(rebuilt);
 // Layout is static; shader-only breeze uses the existing paused elapsed clock.
 assert.deepEqual(tunnelLayout(20),tunnelLayout(20));
});

test('curved leaf sprigs stay low-poly, show varied blossom clusters, and share paused wind time with shadow depth',()=>{
 let triangles=0,leafArea=0;
 for(const index of [20,21,22,23,24,25,26,27]){
  const g=new THREE.Group();addFlowerTunnel(g,index);
  g.traverse(mesh=>{if(mesh.isInstancedMesh)triangles+=(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3*mesh.count;});
  const mesh=g.children[0].children.find(m=>m.name==='Curved folded vine leaves');
  assert.equal(mesh.geometry.index.count/3,62);assert.equal(mesh.castShadow,true);
  const shade={vertexShader:'#include <begin_vertex>',uniforms:{}},depth={vertexShader:'#include <begin_vertex>',uniforms:{}};
  mesh.material.onBeforeCompile(shade);mesh.customDepthMaterial.onBeforeCompile(depth);
  assert.equal(shade.uniforms.meadowWindTime,depth.uniforms.meadowWindTime);
  updateVegetation(5);assert.equal(shade.uniforms.meadowWindTime.value,5);
  updateVegetation(5);assert.equal(shade.uniforms.meadowWindTime.value,5);
  updateVegetation(5.02);assert.equal(shade.uniforms.meadowWindTime.value,5.02);
  assert.ok(shade.vertexShader.includes('clamp(position.y, 0.0, 1.0)'));
  leafArea+=tunnelLayout(index).leaves.reduce((sum,p)=>sum+p.size*p.size,0);
  disposeChunk(g);
 }
 assert.ok(triangles<=1100000,`triangles ${triangles}`);assert.ok(leafArea>2000);
});

test('expanded leaf vertices preserve rider and lens clearance in every lane and view',()=>{
 const buckets=new Map(),matrix=new THREE.Matrix4(),v=new THREE.Vector3();
 for(const index of [20,21,22,23,24,25,26,27]){
  const group=new THREE.Group();addFlowerTunnel(group,index);
  const mesh=group.children[0].children.find(m=>m.name==='Curved folded vine leaves');
  for(let i=0;i<mesh.count;i++){
   mesh.getMatrixAt(i,matrix);
   for(let j=0;j<mesh.geometry.attributes.position.count;j++){
    v.fromBufferAttribute(mesh.geometry.attributes.position,j).applyMatrix4(matrix);
    const key=Math.floor(-v.z/2);if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(v.clone());
    // Actual wide canopy remains outside the cycling body envelope.
    assert.ok(Math.abs(v.x-centerAt(-v.z))>2.2||v.y-heightAt(-v.z)>3.1);
   }
  }
  disposeChunk(group);
 }
 for(let s=1280;s<=1760;s+=2)for(const aspect of [.32,.46,.8,1.8,2.4])for(const lane of [-1.55,0,1.55])for(const view of [0,1,2]){
  const f=new THREE.Vector3(tangentAt(s),0,-1).normalize(),r=new THREE.Vector3(-f.z,0,f.x),p=new THREE.Vector3(centerAt(s),heightAt(s)+.025,-s).addScaledVector(r,lane);
  if(view===0){p.addScaledVector(f,-6.1).addScaledVector(r,Math.min(2.5,Math.max(.7,aspect*1.45)));p.y+=3.1;}
  if(view===1){p.addScaledVector(f,.7).addScaledVector(r,tunnelCameraOffset(s,aspect));p.y+=1.65;}
  if(view===2){p.addScaledVector(f,-.4).addScaledVector(r,-.48);p.y+=1.4;}
  const key=Math.floor(-p.z/2);
  for(let b=key-1;b<=key+1;b++)for(const point of buckets.get(b)||[])assert.ok(point.distanceToSquared(p)>.50*.50,`lens near leaf at ${s}/${view}/${lane}`);
 }
});


test('the main arbor stays early summer with a bright open garden and gradual edges',()=>{
 assert.equal(FLOWER_TUNNEL.end-FLOWER_TUNNEL.start,480);
 for(const s of [1280,1340,1460,1580,1700,1760])assert.equal(tunnelProfile(s).name,'summer');
 for(let s=1200;s<1850;s+=.2){
  const a=tunnelProfile(s),b=tunnelProfile(s+.001);
  assert.ok(Math.abs(a.shade-b.shade)<.0002);assert.ok(Math.abs(a.density-b.density)<.0002);
  assert.ok(a.shade>=0&&a.shade<=.58);
 }
 for(const s of [0,1208,1250,1780,1850,10000])assert.equal(tunnelProfile(s).shade,0);
 for(const home of [1520]){
  assert.equal(tunnelOpening(home),1);
  assert.ok(tunnelProfile(home).shade<.17);
  for(let index=20;index<=27;index++)for(const root of tunnelLayout(index).roots)assert.ok(Math.abs(-root[2]-home)>14);
 }
 assert.ok(tunnelProfile(1300).shade>tunnelProfile(1270).shade);
 assert.ok(tunnelProfile(1520).shade<tunnelProfile(1580).shade);
});

test('any six streamed chunks stay inside the million-triangle incremental tunnel budget',()=>{
 const counts=[];
 for(let i=19;i<=28;i++){
  const group=new THREE.Group();addFlowerTunnel(group,i);let triangles=0;
  group.traverse(m=>{if(m.isInstancedMesh)triangles+=(m.geometry.index?.count??m.geometry.attributes.position.count)/3*m.count;});
  counts.push(triangles);disposeChunk(group);
 }
 for(let i=0;i<counts.length;i++)assert.ok(counts.slice(i,i+6).reduce((a,b)=>a+b,0)<=1000000);
});
