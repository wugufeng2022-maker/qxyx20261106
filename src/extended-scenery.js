import {scenicProfile,scenicFlowerWeight} from './scenic-rhythm.js';
import {inGrassZone,visibleGroundAt} from './grass-tumble.js';
import * as THREE from 'three';
import {centerAt,groundAt,heightAt,extendedLandscapeAt,extendedWaterAt,CHUNK_LENGTH,ROAD_HALF_WIDTH,rng} from './route.js';
import {plantInstances} from './vegetation.js';
import {paintSurface} from './painterly.js';
import {WALKER,walkerLane,smooth,orchardPathExcludes} from './orchard-walk.js';

// Original low-poly field props; vegetation uses the existing licensed CC0 library.
const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:1,...extra});
const bark=material('#82704e'), leaves=material('#ffffff',{flatShading:true}),fruit=material('#ffffff');
const wood=material('#b29a72'),stone=material('#a3a896'),crop=material('#ffffff',{side:THREE.DoubleSide});
const waterMaterial=material('#9fbfc0',{roughness:.35,metalness:.12});
paintSurface(waterMaterial);
const transform=new THREE.Object3D(),tint=new THREE.Color();
function batch(group,name,geometry,mat,points) {
  if(!points.length){geometry.dispose();return;}
  const mesh=new THREE.InstancedMesh(geometry,mat,points.length);mesh.name=name;
  points.forEach((p,i)=>{transform.position.set(...p.pos);transform.scale.set(...p.scale);transform.rotation.set(...(p.rot||[0,0,0]));transform.updateMatrix();mesh.setMatrixAt(i,transform.matrix);if(p.color)mesh.setColorAt(i,tint.set(p.color));});
  mesh.receiveShadow=true;group.add(mesh);return mesh;
}
const point=(x,s,w,h=w,color)=>({pos:[x,groundAt(x,s),-s],scale:[w,h,w],color});
function orchard(group,index) {
  const trunks=[],crowns=[],fruits=[],random=rng(index*313+19),start=index*CHUNK_LENGTH;
  // Globally aligned rows are intentional cultivation, broken by broad grassy aisles.
  for(let s=Math.ceil(start/12)*12;s<start+CHUNK_LENGTH;s+=12)for(const side of [-1,1])for(let row=0;row<4;row++) {
    const at=s+(row%2)*2;
    if(at>=start+CHUNK_LENGTH)continue;
    const p=scenicProfile(at),w=extendedLandscapeAt(at).orchard*(at<3696?.72+p.trees*.19:.25+p.trees*.75);
    if(random()>w)continue;
    const rowSetback=(1-smooth(3264,3405,at))*(8+Math.sin(s*.092+row)*4);
    const x=centerAt(at)+side*(9+row*11+rowSetback),y=visibleGroundAt(x,at),h=3.1+random()*.8;
    trunks.push({pos:[x,y+h*.37,-at],scale:[.20,h*.74,.20]});
    for(let n=0;n<3;n++)crowns.push({pos:[x+(n-1)*.95,y+h-.1+(n===1?.4:0),-at+(n%2)*.35],scale:[1.65,1.35,1.65],color:['#8ca76b','#a9b975','#9bb179'][row%3]});
    for(let n=0;n<7;n++){const a=n*2.4+random();fruits.push({pos:[x+Math.cos(a)*1.7,y+h-.35+random()*.75,-at+Math.sin(a)*1.45],scale:[.14,.16,.14],color:n%2?'#d3a25e':'#ba7962'});}
  }
  if(start<=WALKER.end&&start+CHUNK_LENGTH>WALKER.end){
    const s=WALKER.end-.4,x=centerAt(s)-7.25,y=visibleGroundAt(x,s);
    trunks.push({pos:[x,y+1.22,-s],scale:[.25,2.55,.25]});
    for(const [dx,dy,dz] of [[-.92,0,.2],[.21,.44,-.35],[1.08,0,.12]]){
      crowns.push({pos:[x+dx,y+3.25+dy,-s+dz],scale:[1.68,1.33,1.56],color:'#9eb57b'});
    }
  }
  batch(group,'Low fruit tree trunks',new THREE.CylinderGeometry(1,1.3,1,5),bark,trunks);
  const crown=batch(group,'Rounded orchard crowns',new THREE.IcosahedronGeometry(1,1),leaves,crowns);if(crown)crown.castShadow=true;
  batch(group,'Small orchard fruit',new THREE.IcosahedronGeometry(1,0),fruit,fruits);
  // One fixed collection shelter, not a repeated roadside reward prop.
  if(start<=3810&&start+CHUNK_LENGTH>3810){const s=3810,x=centerAt(s)-8,y=groundAt(x,s),props=[];for(let i=0;i<3;i++)props.push({pos:[x+i*.8,y+.3,-s],scale:[.65,.6,.6]});batch(group,'Orchard harvest crates',new THREE.BoxGeometry(1,1,1),wood,props);}
}
const gardenPath=material('#c5b695'),shedRoof=material('#8c8269'),shedDoor=material('#888e69');
function orchardWalkway(group,index){
  const chunkStart=index*CHUNK_LENGTH,chunkEnd=chunkStart+CHUNK_LENGTH;
  const begin=Math.max(chunkStart,WALKER.start-20),end=Math.min(chunkEnd,WALKER.end);
  if(begin<end){
    const positions=[],indices=[];
    for(let s=begin;s<=end;s++){
      const width=.40*smooth(WALKER.start-20,WALKER.start-12,s);
      for(const side of [-1,1]){
        const x=centerAt(s)+walkerLane(s)+side*width;
        positions.push(x,visibleGroundAt(x,s)+.012,-s);
      }
      if(s<end){const a=(s-begin)*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setIndex(indices);geometry.computeVertexNormals();
    const path=new THREE.Mesh(geometry,gardenPath);path.name='Orchard walking path';path.receiveShadow=true;group.add(path);
  }
  const s=3444;
  if(s<chunkStart||s>=chunkEnd)return;
  const x=centerAt(s)+13,y=visibleGroundAt(x,s);
  const shed=new THREE.Group();shed.name='Orchard tool shed';shed.position.set(x,y,-s);shed.rotation.y=-.38;group.add(shed);
  function box(w,h,d,x,y,z,mat){
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
    mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;shed.add(mesh);return mesh;
  }
  box(3.45,.45,2.75,0,.025,0,stone);
  box(3.3,2,2.60,0,1.18,0,wood);
  box(.91,1.67,.07,-.58,1.05,1.315,shedDoor);
  box(.74,.58,.08,.67,1.37,1.32,stone);
  for(const z of [-.72,.72])box(3.7,.12,1.58,0,2.34,z,shedRoof).rotation.x=z>0?.24:-.24;
}
function wheatGeometry(){
  const positions=[],indices=[];
  const vertex=(x,y,z)=>{positions.push(x,y,z);return positions.length/3-1;};
  // Three slightly splayed stalks per tuft, with rounded, short segmented ears.
  // A four-sided cross section gives body from every angle without flat arrow cards.
  for(const [dx,dz,dy] of [[-.18,.03,0],[.16,.12,-.08],[.02,-.18,.04]]) {
    for(const angle of [0,Math.PI/2]) {
      const a=Math.cos(angle)*.012,b=Math.sin(angle)*.012;
      const n=positions.length/3;
      vertex(dx-a,0,dz-b);vertex(dx+a,0,dz+b);vertex(dx+.05+a,.77+dy,dz+b);vertex(dx+.05-a,.77+dy,dz-b);
      indices.push(n,n+1,n+2,n,n+2,n+3);
    }
    const n=positions.length/3;
    for(const [y,r]of [[.68,.025],[.82,.075],[.98,.018]])for(let j=0;j<4;j++){
      const angle=j*Math.PI/2;vertex(dx+.05+Math.cos(angle)*r,y+dy,dz+Math.sin(angle)*r*.8);
    }
    for(let ring=0;ring<2;ring++)for(let j=0;j<4;j++){
      const a=n+ring*4+j,b=n+ring*4+(j+1)%4;indices.push(a,b,a+4,b,b+4,a+4);
    }
    indices.push(n,n+2,n+1,n,n+3,n+2,n+8,n+9,n+10,n+8,n+10,n+11);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
function fields(group,index) {
  const random=rng(index*617+57),wheat=[],bales=[];
  for(let i=0;i<6500;i++) {
    const s=(index+random())*CHUNK_LENGTH,e=extendedLandscapeAt(s);if(random()>e.wheat)continue;
    const side=i%2?1:-1,d=6+random()*64;
    // Plant strips leave visible winding green drainage gaps between fields.
    if(Math.sin(s*.014+d*.035)>.93||d>48&&side===-1)continue;
    const x=centerAt(s)+side*d,h=.72+.12*Math.sin(s*.07+d*.13)+random()*.18;
    wheat.push({...point(x,s,1.0+random()*.25,h,['#c6b47a','#d5c28a','#bda870'][i%3]),rot:[0,random()*Math.PI,0]});
  }
  batch(group,'Golden wheat fields',wheatGeometry(),crop,wheat);
  for(const [s,side,d]of [[4450,-1,16],[4585,1,25],[4850,-1,21],[5020,1,34]])if(Math.floor(s/CHUNK_LENGTH)===index) {
    const x=centerAt(s)+side*d,y=groundAt(x,s);bales.push({pos:[x,y+.85,-s],scale:[.85,1.8,.85],rot:[0,0,Math.PI/2]});
  }
  batch(group,'Gathered hay rolls',new THREE.CylinderGeometry(1,1,1,12),wood,bales);
}
function sideWater(group,index) {
  const positions=[],indices=[],reeds=[],stones=[],random=rng(index*727+81);
  for(let j=0;j<=32;j++){
    const s=index*CHUNK_LENGTH+j*2,w=extendedWaterAt(s);
    const offset=w?.offset||32,half=w?.halfWidth||0,level=w?.level||-1.8;
    positions.push(centerAt(s)+offset-half,level,-s,centerAt(s)+offset+half,level,-s);
    // In the ecotone the ground itself occludes the water until a continuous bank forms.
    if(j<32&&w){const n=j*2;indices.push(n,n+1,n+2,n+1,n+3,n+2);}
  }
  if(indices.length){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();const mesh=new THREE.Mesh(g,waterMaterial);mesh.name='Continuous side water';group.add(mesh);}
  for(let i=0;i<500;i++){
    const s=(index+random())*CHUNK_LENGTH,w=extendedWaterAt(s);if(!w||w.strength<.45)continue;
    const side=i%6===0?1:-1,x=centerAt(s)+w.offset+side*(w.halfWidth+random()*4-1),y=groundAt(x,s);
    if(y<w.level-.1)continue;
    if(w.kind==='river'&&side<0&&(Math.sin(s*.11)+.35*Math.sin(s*.27)<.4||random()>.42))continue;
    const h=w.kind==='river'?(side<0?.28+random()*.33:.9+random()*.55):.55+random()*.7;
    reeds.push({...point(x,s,h*.52,h,['#a6b47f','#b8ba87','#879d70'][i%3]),rot:[0,random()*6.28,0]});
    if(i%23===0)stones.push({pos:[x,y-.12,-s],scale:[.7,.45,.55],rot:[0,random()*6,0]});
  }
  plantInstances(group,'Grass_Large_Extruded',reeds);batch(group,'Worn river bank rocks',new THREE.IcosahedronGeometry(1,1),stone,stones);
}
function groves(group,index) {
  const random=rng(index*1277+67),trees=Array.from({length:5},()=>[]),grass=[[],[]],flowers=[[],[],[]];
  for(let i=0;i<125;i++){
    const s=(index+random())*CHUNK_LENGTH,e=extendedLandscapeAt(s);
    // Forest encloses the road; upland meadows leave wide views and a low skyline.
    const density=e.valley*.94+e.river*.16+e.terraces*.13+e.ridge*.012+e.bay*.10+e.wheat*.035;
    if(random()>density*(.14+scenicProfile(s).trees*.86))continue;
    const side=i%2?1:-1,d=7+random()**.7*70,x=centerAt(s)+side*d,w=extendedWaterAt(s);
    if(w&&groundAt(x,s)<w.level+.25)continue;
    if(w?.kind==='river'&&side>0&&d<w.offset+w.halfWidth+4)continue;
    const h=e.valley> .5?10+random()*8:3+random()*3.4;
    trees[i%5].push({...point(x,s,h*(e.valley>.5?.67:1.12),h,e.valley>.5?['#84a78f','#73977b','#9bb89b'][i%3]:'#b3c69a'),rot:[0,random()*6.28,0]});
  }
  trees.forEach((p,i)=>plantInstances(group,`BirchTree_${i+1}`,p));
  for(let i=0;i<760;i++){
    const s=(index+random())*CHUNK_LENGTH,e=extendedLandscapeAt(s),side=i%2?1:-1,d=2.7+random()**1.3*40,x=centerAt(s)+side*d,w=extendedWaterAt(s);
    if(w&&groundAt(x,s)<w.level+.18)continue;
    if(orchardPathExcludes(x,s,-.73))continue;
    // Sparse ridge grass and carpet-like valley understory have different silhouettes.
    if(random()>(.75-e.wheat*.40-e.ridge*.40))continue;
    const restingStrip=inGrassZone(s)&&d<5.5;
    const h=restingStrip?.07:.15+random()*(e.valley>.5?.38:.22);
    if(!restingStrip&&i%4===0&&random()<e.flowerDensity*3*scenicFlowerWeight(s,side,d)&&d<18){const f=.25+random()*.27;flowers[i%3].push({...point(x,s,f,f),rot:[0,random()*6.28,0]});}
    grass[!restingStrip&&i%8===0?1:0].push({...point(x,s,h,h,e.wheat>.5?'#c3c18c':e.valley>.5?'#8daf8a':'#bdd09d'),rot:[0,random()*6.28,0]});
  }
  plantInstances(group,'Grass_Small',grass[0]);plantInstances(group,'Grass_Large_Extruded',grass[1]);
  flowers.forEach((p,i)=>plantInstances(group,`Flower_${i+1}_Clump`,p));
  batch(group,'Valley and ridge weathered stones',new THREE.IcosahedronGeometry(1,1),stone,landscapeStones(index));
}

// Rocks have their own placement budget. Grass can approach the verge; rock
// bounds must clear the entire road, plus comfort space and the local road bend.
export function landscapeStones(index){
  const random=rng(index*3469+9127),rocks=[];
  for(let i=0;i<18;i++){
    const s=(index+random())*CHUNK_LENGTH,e=extendedLandscapeAt(s);
    if(random()>Math.min(1,e.valley+e.ridge))continue;
    const side=i%2?1:-1,radius=.5+random()*1.8,h=.4+random()*1.3;
    // |centerAt'(s)| <= .183; .20*radius covers longitudinal curvature.
    const minimum=ROAD_HALF_WIDTH+.8+radius*1.20;
    const d=minimum+random()**1.3*34,x=centerAt(s)+side*d;
    rocks.push({...point(x,s,radius,h),rot:[0,random()*6.28,0]});
  }
  return rocks;
}
function terraces(group,index){
  const positions=[],colors=[],indices=[];
  // Thin continuous contour bands on the hillsides, never crossing the cycling road.
  for(const side of [-1,1])for(const d of [15,29,45,64,86])for(let j=0;j<=32;j++){
    const s=index*CHUNK_LENGTH+j*2,e=extendedLandscapeAt(s),r=positions.length/3;
    for(const edge of [-.65,.65]){const x=centerAt(s)+side*(d+Math.sin(s*.002)*3+edge);positions.push(x,groundAt(x,s)+.035,-s);colors.push(.76,.80,.56);}
    if(j<32&&e.terraces>.02)indices.push(r,r+1,r+2,r+1,r+3,r+2);
  }
  if(!indices.length)return;
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();
  const mesh=new THREE.Mesh(g,terraceMaterial);mesh.name='Grass hillside contour paths';group.add(mesh);
}
const terraceMaterial=material('#c7c997',{vertexColors:true});
function landmarks(group,index){
  const props=[],stones=[];
  // Fixed ridge cairn, then a single lakeside bench: each gives the reach a destination.
  if(Math.floor(8680/CHUNK_LENGTH)===index){const s=8680,x=centerAt(s)-7,y=groundAt(x,s);for(let i=0;i<4;i++)stones.push({pos:[x,y+.2+i*.35,-s],scale:[.7-i*.11,.24,.6-i*.09]});}
  if(Math.floor(9770/CHUNK_LENGTH)===index){
    const s=9770,x=centerAt(s)+6.3,y=groundAt(x,s);
    // Bench faces the lake (+x); four feet are independently seated in the terrain.
    props.push({pos:[x,y+.55,-s],scale:[.65,.12,2.3]},{pos:[x-.28,y+.99,-s],scale:[.12,.65,2.3]});
    for(const dx of [-.22,.22])for(const ds of [-.85,.85]){const foot=groundAt(x+dx,s+ds);props.push({pos:[x+dx,(foot+y+.49)/2,-s-ds],scale:[.11,y+.49-foot,.11]});}
  }
  batch(group,'Lakeside rest bench',new THREE.BoxGeometry(1,1,1),wood,props);
  batch(group,'Mountain ridge cairn',new THREE.IcosahedronGeometry(1,1),stone,stones);
}
export function addExtendedScenery(group,index){
  group.name=`Countryside_${index}`;group.userData.landscape=extendedLandscapeAt(index*CHUNK_LENGTH+32).label;
  orchard(group,index);orchardWalkway(group,index);fields(group,index);sideWater(group,index);groves(group,index);terraces(group,index);landmarks(group,index);
}
