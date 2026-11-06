import {test} from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';import {readFileSync} from 'node:fs';import {createRabbit} from '../src/rabbit.js';
function actualBasketBounds(){const b=readFileSync(new URL('../assets/bicycle/meadow-bicycle.glb',import.meta.url)),d=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));const node=d.nodes.find(n=>n.name==='Steering__Honey wicker'),a=d.accessors[d.meshes[node.mesh].primitives[0].attributes.POSITION],box=new THREE.Box3();for(const x of [a.min[0],a.max[0]])for(const y of [a.min[1],a.max[1]])for(const z of [a.min[2],a.max[2]])box.expandByPoint(new THREE.Vector3(x,y,z).applyQuaternion(new THREE.Quaternion(...node.rotation)).add(new THREE.Vector3(...node.translation)).add(new THREE.Vector3(.405,.91,0)));return box;}
test('rabbit cushion sits inside actual transformed GLB basket below eye level',()=>{const basket=actualBasketBounds(),steering=new THREE.Group();steering.position.set(.405,.91,0);const rig=createRabbit(steering,{basket:true});for(let i=0;i<60;i++){rig.update(i,8);steering.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(rig.root),pad=new THREE.Box3().setFromObject(rig.cushion);assert.ok(box.min.x>basket.min.x&&box.max.x<basket.max.x);assert.ok(box.min.z>basket.min.z&&box.max.z<basket.max.z);assert.ok(pad.min.y>basket.min.y&&pad.min.y-basket.min.y<.025);assert.ok(box.max.y<1.32);}});
test('head and nose clear the actual wicker inner wall throughout breathing and turning',async()=>{
 const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');const bytes=readFileSync(new URL('../assets/bicycle/meadow-bicycle.glb',import.meta.url));
 const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const rig=createRabbit(gltf.scene.getObjectByName('Steering'),{basket:true}),basket=gltf.scene.getObjectByName('Steering__Honey_wicker');basket.material.side=THREE.DoubleSide;
 for(let t=0;t<80;t++){
  rig.update(t*.25,8);gltf.scene.updateMatrixWorld(true);const wicker=new THREE.Box3().setFromObject(basket);
  for(const name of ['Round rabbit head','Velvet muzzle','Small nose']){
   const mesh=rig.root.getObjectByName(name),box=new THREE.Box3().setFromObject(mesh),p=mesh.getWorldPosition(new THREE.Vector3()),radius=p.x-box.min.x;
   // Probe the part below the rim; the raised face itself can be above the basket.
   for(const y of [box.min.y+.002,p.y]){
    if(y>wicker.max.y)continue;
    // The basket is open weave: a single ray can pass through a hole as the
    // head turns. Sample neighbouring strands and use the closest surface.
    const hits=[-.008,0,.008].flatMap(dy=>new THREE.Raycaster(new THREE.Vector3(p.x,y+dy,p.z),new THREE.Vector3(-1,0,0),0,.2).intersectObject(basket,false).slice(0,1));
    assert.ok(hits.length&&Math.min(...hits.map(h=>h.distance))>radius+.003,`${name} must clear wicker inside wall at ${y}`);
   }
  }
 }
});
