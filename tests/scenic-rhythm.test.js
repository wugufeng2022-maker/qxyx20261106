import {RABBIT_HOME} from '../src/start-courtyard.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {SCENIC_BEATS,scenicProfile,scenicPlants,scenicFlowerWeight,scenicClear,scenicPlantBase} from '../src/scenic-rhythm.js';
import {broadleafGeometry} from '../src/vegetation.js';
import {centerAt,CHUNK_LENGTH,EXTENDED_REGIONS,groundAt} from '../src/route.js';
import {inGrassZone,visibleGroundAt} from '../src/grass-tumble.js';
import {disposeChunk} from '../src/scenery.js';

test('finite itinerary keeps 180–235 m rhythms and at least three small scenes in each extended region',()=>{
 assert.ok(SCENIC_BEATS.length>40);
 for(let i=1;i<SCENIC_BEATS.length;i++)assert.ok(SCENIC_BEATS[i].s-SCENIC_BEATS[i-1].s>=180&&SCENIC_BEATS[i].s-SCENIC_BEATS[i-1].s<=235);
 for(const region of EXTENDED_REGIONS){const types=new Set(SCENIC_BEATS.filter(b=>b.s>=region.start&&b.s<region.end).map(b=>b.type));assert.ok(types.size>=3,region.key);}
 assert.notEqual(scenicProfile(6565).trees,scenicProfile(6790).trees);
});
test('profiles and flower beds remain continuous at knots and chunk seams, without a 64m cycle',()=>{
 for(const s of [...SCENIC_BEATS.map(b=>b.s),...Array.from({length:156},(_,i)=>i*64)]){
  const a=scenicProfile(s-1e-4),b=scenicProfile(s+1e-4);
  for(const key of ['trees','shrubs','flowers','spread','bias','phase'])assert.ok(Math.abs(a[key]-b[key])<.0001,`${key} at ${s}`);
  assert.ok(Math.abs(scenicFlowerWeight(s-1e-4,1,9)-scenicFlowerWeight(s+1e-4,1,9))<.0001);
 }
 assert.notEqual(scenicFlowerWeight(3500,1,8),scenicFlowerWeight(3564,1,8));
});
test('all new near/mid-distance vegetation is deterministic, grounded, bounded and clears road and reserved footprints',()=>{
 let count=0;
 for(let chunk=0;chunk<157;chunk++){
  const plants=scenicPlants(chunk);assert.deepEqual(plants,scenicPlants(chunk));
  assert.ok(plants.trees.length+plants.shrubs.length<=150);assert.ok(plants.flowers.length<=500);
  for(const [kind,points]of Object.entries(plants))for(const p of points){
   count++;const s=-p.pos[2],d=Math.abs(p.pos[0]-centerAt(s)),radius=kind==='flowers'?.4:p.scale[0]*.57;
   assert.ok(s>=chunk*CHUNK_LENGTH&&s<(chunk+1)*CHUNK_LENGTH);
   assert.ok(scenicClear(p.pos[0],s,radius));
   assert.ok(d-radius*1.2>3.1);if(inGrassZone(s))assert.ok(d-radius*1.2>=5.5);
   const footprint=kind==='flowers'?p.scale[0]*.12:p.scale[0]*(kind==='shrubs'?.28:.045);
   assert.equal(p.pos[1],scenicPlantBase(p.pos[0],s,footprint));
   assert.ok(p.pos[1]<=visibleGroundAt(p.pos[0],s)-.024);
   // Transformed bottom trunk rim, not only the analytic centre height.
   if(kind==='trees')for(let i=0;i<8;i++){
    const angle=i*Math.PI/4,x=p.pos[0]+Math.cos(angle)*p.scale[0]*.036,at=s+Math.sin(angle)*p.scale[0]*.036;
    assert.ok(p.pos[1]<=visibleGroundAt(x,at)+.015,'trunk base clears visible mesh without floating');
   }
  }
 }
 // The lake reserves a broad vegetation-free sightline on one side of the road.
 assert.ok(count>4700);
 for(const s of [3554,RABBIT_HOME,1520,1100])assert.equal(scenicClear(centerAt(s)+(s===1100?4:-4),s,1),false);
 assert.equal(scenicClear(centerAt(2920)+12,2920,1),false);
});
test('original broadleaf geometry has three limbs and a broken crown within the declared placement radius; chunk cleanup respects shared ownership',()=>{
 const {trunk,leaves,shrub}=broadleafGeometry();
 for(const geometry of [trunk,leaves,shrub]){
  geometry.computeBoundingBox();const box=geometry.boundingBox;
  assert.ok(box.min.x>=-.57&&box.max.x<=.57&&box.min.z>=-.57&&box.max.z<=.57);
  assert.ok(box.min.y>=-1e-6);assert.ok(geometry.attributes.position.count<2000);
 }
 const group=new THREE.Group(),material=new THREE.MeshStandardMaterial(),mesh=new THREE.InstancedMesh(leaves,material,1);leaves.userData.sharedVegetation=true;
 group.add(mesh);let geoDisposed=0,matDisposed=0,instanceDisposed=0;
 leaves.addEventListener('dispose',()=>geoDisposed++);material.addEventListener('dispose',()=>matDisposed++);mesh.addEventListener('dispose',()=>instanceDisposed++);
 disposeChunk(group);assert.equal(geoDisposed,0);assert.equal(matDisposed,0);assert.equal(instanceDisposed,1);
 [trunk,leaves,shrub].forEach(g=>g.dispose());material.dispose();
});
