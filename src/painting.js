import * as THREE from 'three';
import {centerAt,groundAt,isDryLand,LAKE,rng} from './route.js';
import {plantInstances} from './vegetation.js';
export const PAINTING={start:1060,end:1240,length:180};
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function paintingWeight(s){return smooth((s-PAINTING.start)/20)*smooth((PAINTING.end-s)/32);}
// A lake study built from real branching silhouettes and small, broken pigment marks.
export function createPaintingWorld(scene){
 const group=new THREE.Group();group.name='Lake light impressionist study';scene.add(group);
 const random=rng(160104),materials=[],transform=new THREE.Object3D();
 function material(color,opacity=1){const m=new THREE.MeshStandardMaterial({color,roughness:1,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide});m.userData.paintOpacity=opacity;materials.push(m);return m;}
 const waterPalette=['#f5df9c','#d7c8bc','#8babc1','#607d99','#a5b7a8','#f6e8ba'].map(c=>material(c,.80));
 const grassPalette=['#d2cd86','#ebdca3','#b5bf82','#6f938e','#939bb2'].map(c=>material(c,.72));
 // A tapered, uneven brush mark; no spherical beads or hanging decorative strands.
 const stroke=new THREE.BufferGeometry();stroke.setAttribute('position',new THREE.Float32BufferAttribute([-.5,0,-.27,.38,0,-.35,.52,0,.18,-.38,0,.30],3));stroke.setIndex([0,2,1,0,3,2]);stroke.computeVertexNormals();
 function batch(points,m){if(!points.length)return;const mesh=new THREE.InstancedMesh(stroke,m,points.length);points.forEach((p,i)=>{transform.position.set(...p.pos);transform.rotation.set(0,p.angle,0);transform.scale.set(...p.scale);transform.updateMatrix();mesh.setMatrixAt(i,transform.matrix);});mesh.name='Broken lake / meadow brushwork';group.add(mesh);}
 const waterMarks=waterPalette.map(()=>[]),grassMarks=grassPalette.map(()=>[]);
 for(let i=0;i<2400;i++){
  const s=1050+random()*193,x=centerAt(s)+8+random()*69;if(groundAt(x,s)>LAKE.level-.2)continue;
  // Horizontal strokes live in the water plane, with a warm broken sun path.
  const sunPath=Math.abs(x-centerAt(s)-24+Math.sin(s*.015)*6)<7;
  const palette=sunPath&&random()<.6?(random()<.6?0:5):1+Math.floor(random()*4);
  waterMarks[palette].push({pos:[x,LAKE.level+.032+random()*.009,-s],angle:(random()-.5)*.16,scale:[.32+random()*1.32,1,.055+random()*.19]});
 }
 for(let i=0;i<3400;i++){
  const s=1058+random()*179,side=random()<.58?-1:1,x=centerAt(s)+side*(3.5+random()*28);if(!isDryLand(x,s))continue;
  grassMarks[i%grassPalette.length].push({pos:[x,groundAt(x,s)+.045,-s],angle:random()*.7-.35,scale:[.16+random()*.36,1,.06+random()*.13]});
 }
 waterMarks.forEach((p,i)=>batch(p,waterPalette[i]));grassMarks.forEach((p,i)=>batch(p,grassPalette[i]));
 group.userData.paintingMarks=waterMarks.flat().length+grassMarks.flat().length;
 let planted=false;
 return {group,plantTrees(){
  if(planted)return;planted=true;
  // Unequal gaps, heights and leaning trunks keep the lakeside open, with loose groves.
  const sites=[[1069,-15,7.9],[1074,-21,6.2],[1093,12,7.1],[1111,-12,8.8],[1116,-18,6.4],[1141,11,7.5],[1154,-17,8.2],[1159,-24,6.1],[1188,13,8.7],[1206,-14,7.4],[1213,-22,5.8]];
  sites.forEach(([s,offset,height],i)=>{
   const x=centerAt(s)+offset;if(!isDryLand(x,s))return;
   const meshes=plantInstances(group,`BirchTree_${1+i%5}`,[{pos:[x,groundAt(x,s)-.03,-s],rot:[(random()-.5)*.10,random()*6.28,(random()-.5)*.12],scale:[height*(.87+random()*.18),height,height*(.84+random()*.22)],color:['#e2d99b','#bec8ab','#d4c8a2','#b2c6ba'][i%4]}],{copyMaterial:true});
   for(const mesh of meshes){mesh.castShadow=false;for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material]){m.transparent=true;m.opacity=0;m.depthWrite=false;m.userData.paintOpacity=1;m.userData.paintAlphaTest=.42;materials.push(m);}}
  });
 },update(amount){group.visible=amount>.001;for(const m of materials){m.opacity=amount*m.userData.paintOpacity;if(m.userData.paintAlphaTest)m.alphaTest=amount*m.userData.paintAlphaTest;const solid=amount>.98;if(m.depthWrite!==solid){m.depthWrite=solid;}}}};
}
export function choosePainting(preference,choice){preference.choice=choice==='impressionist'?'impressionist':'off';preference.invitation=false;}
export function wantsPainting(preference,artistStatus,unlocked){return (preference.invitation&&['joining','active'].includes(artistStatus))||(unlocked&&preference.choice==='impressionist');}
