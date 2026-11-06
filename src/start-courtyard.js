import * as THREE from 'three';
import {centerAt,CHUNK_LENGTH} from './route.js';
import {visibleGroundAt} from './grass-tumble.js';

// One source for the home, garden footprint and greeting shoulder, in metres.
export const RABBIT_HOME=60;
export const RABBIT_CARE=Object.freeze({lane:-3.25,firstHop:.50,secondHop:.15});
export const START_COURTYARD=Object.freeze({from:0,to:85,left:-20,right:-1.8,houseAt:29,houseLane:-11});
export function courtyardExcludes(x,s,radius=0){
 const {from,to,left,right}=START_COURTYARD;
 const d=x-centerAt(s);
 return s>=from-radius&&s<=to+radius&&d>=left-radius&&d<=right+radius;
}
// Each piece belongs to one streamed chunk. All geometry/materials are locally
// owned, so the normal chunk disposal path releases and rebuilds them safely.
export function addStartCourtyard(parent,index){
 if(index*CHUNK_LENGTH>START_COURTYARD.to||(index+1)*CHUNK_LENGTH<=START_COURTYARD.from)return;
 const yard=new THREE.Group();yard.name='Start courtyard';parent.add(yard);
 const palette={wall:'#e4d7ba',roof:'#a78068',wood:'#b4a082',sage:'#94aa8b',pane:'#728a80',stone:'#b7b39d',petal:'#e9c9af',cream:'#f1e6ca'};
 const materials=Object.fromEntries(Object.entries(palette).map(([k,color])=>[k,new THREE.MeshStandardMaterial({color,roughness:1})]));
 parent.userData.ownedMaterials??=[];parent.userData.ownedMaterials.push(...Object.values(materials));
 const owns=s=>Math.floor(s/CHUNK_LENGTH)===index;
 function box(name,lane,s,y,w,h,d,material){
  const x=centerAt(s)+lane,mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),materials[material]);
  mesh.name=name;mesh.position.set(x,visibleGroundAt(x,s)+y,-s);mesh.castShadow=true;mesh.receiveShadow=true;yard.add(mesh);return mesh;
 }
 if(owns(START_COURTYARD.houseAt)){
  const s=START_COURTYARD.houseAt,lane=START_COURTYARD.houseLane,x=centerAt(s)+lane;
  // Deep foundation meets uneven ground; wall and roof remain upright.
  let high=-Infinity,low=Infinity;
  for(const dx of [-3,0,3])for(const ds of [-2.3,0,2.3]){const y=visibleGroundAt(x+dx,s+ds);high=Math.max(high,y);low=Math.min(low,y);}
  const base=high+.03,origin=visibleGroundAt(x,s);
  box('Courtyard stone footing',lane,s,(base+low)/2-origin-.08,6.2,base-low+.16,4.8,'stone');
  box('Warm plaster cottage',lane,s,base-origin+1.6,5.8,3.2,4.5,'wall');
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([-3.3,3.2,2.65,3.3,3.2,2.65,3.3,3.2,-2.65,-3.3,3.2,-2.65,-3.3,4.7,0,3.3,4.7,0],3));g.setIndex([0,1,5,0,5,4,2,3,4,2,4,5,3,0,4,1,2,5]);g.computeVertexNormals();
  const roof=new THREE.Mesh(g,materials.roof);roof.name='Terracotta pitched roof';roof.position.set(x,base,-s);roof.castShadow=true;yard.add(roof);
  // Road-facing front door and windows on the right wall.
  box('Sage front door',lane+2.94,s,base-origin+1,.10,2,1,'sage');
  for(const ds of [-1.45,1.45]){
   const pane=box('Cream window frame',lane+2.96,s+ds,1.95,.12,1.1,.8,'cream');pane.position.y=base+1.95;
   const glass=box('Quiet blue window',lane+3.04,s+ds,1.95,.04,.86,.60,'pane');glass.position.y=base+1.95;
  }
  // A framed end-wall window is visible while departing from the start.
  const frontS=s-2.31;
  const frame=box('Arrival-facing window frame',lane,frontS,1.85,1.25,1.25,.12,'cream');frame.position.y=base+1.85;
  const pane=box('Arrival-facing blue window',lane,frontS-.07,1.85,1.02,1.02,.04,'pane');pane.position.y=base+1.85;
  const cross=box('Arrival window mullion',lane,frontS-.10,1.85,.055,1.04,.03,'cream');cross.position.y=base+1.85;
  const bar=box('Arrival window crossbar',lane,frontS-.10,1.85,1.04,.055,.03,'cream');bar.position.y=base+1.85;
  box('Low doorstep',lane+3.45,s,.10,.8,.20,1.35,'stone');
  box('Chimney',lane-1.5,s+1,base-origin+4.4,.5,1.3,.55,'wall');
 }
 // Low boundaries stay well behind the care point. The 8m entrance is open.
 for(let s=8;s<=78;s+=5){
  if(!owns(s)||s>=48&&s<=66)continue;
  box('Garden fence post',-6.8,s,.38,.12,.88,.12,'wood');
  if(s+5<80&&!(s<48&&s+5>=48))for(const y of [.3,.62]){
   const a=new THREE.Vector3(centerAt(s)-6.8,visibleGroundAt(centerAt(s)-6.8,s)+y,-s);
   const b=new THREE.Vector3(centerAt(s+5)-6.8,visibleGroundAt(centerAt(s+5)-6.8,s+5)+y,-s-5);
   const rail=new THREE.Mesh(new THREE.BoxGeometry(.065,.065,a.distanceTo(b)),materials.wood);rail.name='Low garden rail';rail.position.copy(a).add(b).multiplyScalar(.5);rail.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),b.sub(a).normalize());yard.add(rail);
  }
 }
 if(owns(43)){
  box('Garden bench seat',-9,43,.47,1.7,.12,.52,'wood');
  for(const lane of [-9.65,-8.35])box('Bench grounded leg',lane,43,.21,.12,.52,.44,'wood');
  box('Garden bench back',-9,43.24,.83,1.7,.50,.09,'sage');
  box('Watering can',-10.4,44,.2,.28,.4,.25,'sage');
 }
 // Three small planted pots soften the wall and lived-in interior, with open soil between.
 for(const [lane,s] of [[-12.1,25.8],[-9.5,25.9],[-10.5,40.2]])if(owns(s)){
  box('Terracotta garden pot',lane,s,.14,.38,.30,.38,'roof');
  const x=centerAt(s)+lane,y=visibleGroundAt(x,s);
  const leaves=new THREE.Mesh(new THREE.IcosahedronGeometry(1,0),materials.sage);leaves.name='Potted leafy plant';leaves.position.set(x,y+.38,-s);leaves.scale.set(.28,.25,.25);yard.add(leaves);
  const bloom=new THREE.Mesh(new THREE.IcosahedronGeometry(.1,0),materials.petal);bloom.name='Potted cream flower';bloom.position.set(x+.03,y+.61,-s);yard.add(bloom);
 }
 // Small irregular planted beds, leaving the rabbit path and courtyard entrance bare.
 for(let i=0;i<24;i++){
  const s=12+i*2.7,lane=-7.7-(i%3)*.65;
  if(!owns(s)||s>46&&s<69)continue;
  const x=centerAt(s)+lane,y=visibleGroundAt(x,s);
  const plant=new THREE.Mesh(new THREE.IcosahedronGeometry(1,0),materials.sage);plant.name='Courtyard garden foliage';plant.position.set(x,y+.16,-s);plant.scale.set(.26,.23,.24);yard.add(plant);
  if(i%3!==1){const flower=new THREE.Mesh(new THREE.IcosahedronGeometry(.095,0),materials[i%2?'cream':'petal']);flower.name='Small garden blossom';flower.position.set(x,y+.36,-s);yard.add(flower);}
 }
 return yard;
}
