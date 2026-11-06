import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {paintingMix,paintSurface} from './painterly.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {softenBark} from './bark-material.js';

// Quaternius / Ultimate Stylized Nature, CC0. See assets/nature/README.md.
const library = new Map();
const windTime = { value: 0 };
export function setPaintingVegetation(amount){paintingMix.value=amount;}
const transform = new THREE.Object3D(), tint = new THREE.Color();
export function updateVegetation(time) { windTime.value = time; }

function breeze(material) {
  material.onBeforeCompile = shader => {
    shader.uniforms.meadowWindTime = windTime;
    shader.vertexShader = 'uniform float meadowWindTime;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      #ifdef USE_INSTANCING
        float phase = instanceMatrix[3].x * .41 + instanceMatrix[3].z * .29;
        float bend = pow(clamp(position.y, 0.0, 1.0), 2.0);
        transformed.x += sin(meadowWindTime * 1.35 + phase + position.y) * bend * .035;
        transformed.z += cos(meadowWindTime * .9 + phase) * bend * .018;
      #endif
    `);
  };
  material.customProgramCacheKey = () => 'meadow-vegetation-wind-paint-v2';
}

export {breeze as applyVegetationBreeze};

// Original procedural broadleaf: three rising limbs and a broken, low canopy.
// Shared geometry is retained across streamed chunks just like the CC0 assets.
export function broadleafGeometry(){
 const wood=[],canopy=[];
 const limb=(a,b,r)=>{const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);const g=new THREE.CylinderGeometry(r*.62,r,delta.length(),7);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.clone().normalize()));g.translate(...start.add(end).multiplyScalar(.5).toArray());wood.push(g);};
 limb([0,0,0],[.025,.53,.015],.036);
 for(const [a,b]of [[[-.01,.32,0],[-.23,.68,.05]],[[.01,.40,0],[.25,.77,-.10]],[[.02,.46,.01],[.04,.88,.16]]])limb(a,b,.021);
 const lobes=[[-.25,.67,.05,.26,.21,.25],[.26,.76,-.11,.28,.22,.26],[.04,.88,.15,.27,.20,.25],[-.04,.72,-.20,.27,.22,.23],[.04,.63,.24,.25,.19,.25],[.30,.66,.17,.20,.18,.21],[-.27,.81,-.13,.19,.17,.20],[-.43,.69,.01,.12,.12,.13],[.19,.91,-.12,.13,.12,.13],[.15,.59,.33,.12,.13,.12]];
 const greens=['#6f8d4e','#89a862','#5c7e45','#779553','#91a66b'];
 lobes.forEach(([x,y,z,w,h,d],lobe)=>{
  const g=new THREE.IcosahedronGeometry(1,lobe<7?1:0);g.scale(w,h,d);g.rotateY(x*3+y);g.translate(x,y,z);
  // Green mass shades plus restrained per-face leaf marks break the pale,
  // smooth ceramic surface without introducing textures or new draw calls.
  const positions=g.attributes.position,colors=[],base=new THREE.Color(greens[lobe%greens.length]);
  for(let i=0;i<positions.count;i++){
   const face=Math.floor(i/3),shade=.89+.15*(.5+.5*Math.sin(face*2.399+lobe*1.71));
   const c=base.clone().multiplyScalar(shade);colors.push(c.r,c.g,c.b);
  }
  g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));canopy.push(g);
 });
 const trunk=mergeGeometries(wood),leaves=mergeGeometries(canopy);wood.forEach(g=>g.dispose());canopy.forEach(g=>g.dispose());
 trunk.computeBoundingBox();trunk.translate(0,-trunk.boundingBox.min.y,0);
 const shrub=leaves.clone();shrub.translate(0,-.42,0);shrub.scale(1,.86,1);shrub.computeBoundingBox();shrub.translate(0,-shrub.boundingBox.min.y,0);
 return {trunk,leaves,shrub};
}
function registerMeadowPlants(){
 if(library.has('MeadowBroadleaf'))return;
 const {trunk,leaves,shrub}=broadleafGeometry();
 const bark=new THREE.MeshStandardMaterial({color:'#8f886b',roughness:1});paintSurface(bark);
 const foliage=new THREE.MeshStandardMaterial({color:'#a3b889',vertexColors:true,roughness:1,envMapIntensity:.10});breeze(foliage);paintSurface(foliage,{foliage:true});
 for(const g of [trunk,leaves,shrub])g.userData.sharedVegetation=true;
 library.set('MeadowBroadleaf',[{geometry:trunk,material:bark},{geometry:leaves,material:foliage}]);
 library.set('MeadowShrub',[{geometry:shrub,material:foliage}]);
 const avenueTrunk=trunk.clone();
 const positions=avenueTrunk.attributes.position;
 for(let i=0;i<positions.count;i++){
  const taper=.63+.37*THREE.MathUtils.smoothstep(positions.getY(i),.12,.34);
  positions.setX(i,positions.getX(i)*taper);
  positions.setZ(i,positions.getZ(i)*taper);
 }
 avenueTrunk.computeVertexNormals();
 avenueTrunk.userData.sharedVegetation=true;
 library.set('AvenueBroadleaf',[{geometry:avenueTrunk,material:bark},{geometry:leaves,material:foliage}]);
}
export async function loadVegetation() {
 registerMeadowPlants();
  const urls = [
    new URL('../assets/nature/vendor/flowers.glb', import.meta.url).href,
    new URL('../assets/nature/vendor/grass.glb', import.meta.url).href,
    new URL('../assets/nature/vendor/birch.glb', import.meta.url).href,
  ];
  const sources = await Promise.all(urls.map(url => new GLTFLoader().loadAsync(url)));
  const names = [
    ['Flower_1_Clump','Flower_2_Clump','Flower_3_Clump','Flower_4_Clump','Flower_5_Clump'],
    ['Grass_Small','Grass_Large_Extruded'],
    ['BirchTree_1','BirchTree_2','BirchTree_3','BirchTree_4','BirchTree_5'],
  ];
  sources.forEach(({scene}, category) => {
    scene.updateMatrixWorld(true);
    const materials = new Map();
    for (const name of names[category]) {
      const root = scene.getObjectByName(name);
      if (!root) throw new Error(`Missing nature asset: ${name}`);
      const box = new THREE.Box3().setFromObject(root), center = box.getCenter(new THREE.Vector3());
      const height = box.max.y - box.min.y;
      if (!(height > 0)) throw new Error(`Invalid nature bounds: ${name}`);
      const parts = [];
      root.traverse(object => {
        if (!object.isMesh) return;
        const geometry = object.geometry.clone().applyMatrix4(object.matrixWorld);
        geometry.translate(-center.x, -box.min.y, -center.z).scale(1/height,1/height,1/height);
        geometry.userData.sharedVegetation = true;
        const sourceMaterials = Array.isArray(object.material) ? object.material : [object.material];
        const converted = sourceMaterials.map(source => {
          if (materials.has(source)) return materials.get(source);
          const material = source.clone();
          material.metalness = 0;material.roughness = .95;material.envMapIntensity = .12;
          material.transparent = false;material.opacity = 1;
          material.alphaTest = .42;material.side = THREE.DoubleSide;material.depthWrite = true;
          material.normalMap = null;
          if (category === 1) {
            material.map = null;
            material.emissive.set('#71894b');material.emissiveIntensity = .18;
          }
          material.color.set(category === 1 ? '#8ea16c' : category === 2 && /Bark/.test(source.name) ? '#e9e1cc' : '#e1e6c9');
          if (material.map) { material.map.colorSpace = THREE.SRGBColorSpace;material.map.anisotropy = 4; }
          breeze(material);
          if(category === 2 && /Bark/.test(source.name))softenBark(material);
          paintSurface(material,{foliage:true});materials.set(source,material);return material;
        });
        parts.push({geometry,material:Array.isArray(object.material)?converted:converted[0]});
      });
      library.set(name,parts);
    }
  });
}

export function plantInstances(group, name, points, {copyMaterial=false}={}) {
  const meshes=[];
  if (!points.length) return;
  const parts = library.get(name);
  if (!parts) throw new Error(`Nature assets are not loaded: ${name}`);
  for (const part of parts) {
    const {geometry}=part;
    const copy=m=>{const c=m.clone();breeze(c);if(c.userData.softBark)softenBark(c);paintSurface(c,{foliage:true});return c;};
    const material=copyMaterial?(Array.isArray(part.material)?part.material.map(copy):copy(part.material)):part.material;
    const mesh = new THREE.InstancedMesh(geometry,material,points.length);
    mesh.name = `Plants · ${name}`;
    points.forEach((point,i) => {
      transform.position.set(...point.pos);transform.rotation.set(...(point.rot || [0,0,0]));
      transform.scale.set(...point.scale);transform.updateMatrix();mesh.setMatrixAt(i,transform.matrix);
      mesh.setColorAt(i,tint.set(point.color || '#ffffff'));
    });
    mesh.receiveShadow = true;
    mesh.castShadow = name.startsWith('Birch') || name==='MeadowBroadleaf' || name==='AvenueBroadleaf';
    mesh.customDepthMaterial = new THREE.MeshDepthMaterial({
      depthPacking:THREE.RGBADepthPacking,
      map:(Array.isArray(material)?material[0]:material).map,
      alphaTest:.42,side:THREE.DoubleSide,
    });
    breeze(mesh.customDepthMaterial);
    group.add(mesh);meshes.push(mesh);
  }
  return meshes;
}

// Select an upward-facing point on the actual branch mesh, in normalized tree space.
export function branchAnchor(name,point) {
  let best=null,score=-Infinity;
  for(const part of library.get(name)||[]) {
    const mats=Array.isArray(part.material)?part.material:[part.material];
    if(!mats.some(m=>/Bark/.test(m.name)))continue;
    const p=part.geometry.attributes.position,n=part.geometry.attributes.normal;
    for(let i=0;i<p.count;i++){
      const y=p.getY(i),x=p.getX(i),z=p.getZ(i),radius=Math.hypot(x,z);
      if(y<.38||y>.70||radius<.035||n.getY(i)<.25)continue;
      const value=radius-Math.abs(y-.5)*.2;
      if(value>score){score=value;best=new THREE.Vector3(x,y,z);}
    }
  }
  if(!best)return null;
  const local=best.clone();
  const dummy=new THREE.Object3D();dummy.position.set(...point.pos);dummy.rotation.set(...point.rot);dummy.scale.set(...point.scale);dummy.updateMatrix();
  return {local,matrix:dummy.matrix.clone(),pos:best.applyMatrix4(dummy.matrix),tree:point};
}
