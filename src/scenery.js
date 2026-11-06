import {addStartCourtyard,courtyardExcludes} from './start-courtyard.js';
import {addOpeningScenery} from './opening-scenery.js';
import {CAT_HOME,CAT_YARD,catYardExcludes} from './village-cat-site.js';
import {addFlowerTunnel,tunnelExcludes} from './flower-tunnel.js';
import {addScenicRhythm,scenicProfile,scenicFlowerWeight} from './scenic-rhythm.js';
import {inGrassZone,visibleGroundAt} from './grass-tumble.js';
import {addRegionalScenery} from './regional-scenery.js';
import * as THREE from 'three';
import {addExtendedScenery} from './extended-scenery.js';
import {paintSurface} from './painterly.js';
import { inDuckCorridor } from './duck-event.js';
import { addWildlife } from './wildlife.js';
import { plantInstances } from './vegetation.js';
import { centerAt, heightAt, groundAt, CHUNK_LENGTH, rng, roadSurface, roadRelief, openingVista, climbGrove, summitVista, landscapeAt, LAKE, lakeOffsetAt, lakeViewOpening, isDryLand, pondViewingGap } from './route.js';

const inFootpath=(x,s)=>courtyardExcludes(x,s)||catYardExcludes(x,s)||(s>1040&&s<1216&&x-centerAt(s)>2.2&&x-centerAt(s)<5.6);
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 1, ...extra });
const materials = {
  water: mat('#8fbfc0', {roughness:.30, metalness:.18}),
  ground: mat('#9eae76', { vertexColors: true }),
  road: mat('#c4b18b', { vertexColors: true }),
  track: mat('#c7b590', {vertexColors:true}),
  bark: mat('#70684b'), leaf: mat('#ffffff', { flatShading: true }),
  grass: mat('#ffffff', { side: THREE.DoubleSide }),
  flower: mat('#ffffff'), fence: mat('#b4a480'),
  wall: mat('#e2d7b1'), roof: mat('#a37957'), window: mat('#5f796c'),
  petals: mat('#ffffff', { side: THREE.DoubleSide }),
  stem: mat('#69845a'), foundation: mat('#b4b098'), trim: mat('#f3e8cd'),
  meadow: mat('#ffffff', {vertexColors:true}), foliage: mat('#81965e',{side:THREE.DoubleSide}),
};
for(const name of ['ground','road','track','water','meadow','foliage'])paintSurface(materials[name],{terrain:name==='ground'});
const cottageWalls=['#e2d7b1','#e8dfc6','#d4d6bd','#d9c9ae'].map(c=>mat(c));
const cottageRoofs=['#a37957','#8b8570','#a68b72','#92735f'].map(c=>mat(c));
export const VILLAGE_HOMES=[
  {s:1300,side:1,setback:19,variant:0},
  {s:1412,side:-1,setback:24,variant:1},
  {s:CAT_YARD.houseAt,side:-1,setback:-CAT_YARD.houseLane,variant:2,catYard:true},
  {s:1636,side:-1,setback:19,variant:3},
  {s:1748,side:1,setback:24,variant:0},
];
const dummy = new THREE.Object3D();
const color = new THREE.Color();
function instances(group, geometry, material, points) {
  const mesh = new THREE.InstancedMesh(geometry, material, points.length);
  points.forEach((p, i) => {
    dummy.position.set(...p.pos); dummy.rotation.set(...(p.rot || [0, 0, 0])); dummy.scale.set(...p.scale);
    dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
    if (p.color) mesh.setColorAt(i, color.set(p.color));
  });
  mesh.receiveShadow = true; group.add(mesh); return mesh;
}
function terrain(index) {
  // Include exact road/verge columns so coarse terrain triangles never cover the road.
  const columns = [-150,-125,-105,-90,-78,-66,-56,-48,-40,-34,-28,-23,-19,-16,-13,-10,-8,-6,-4,-3,-2.2,0,2.2,3,4,6,8,10,13,16,19,23,28,34,40,48,56,66,78,90,105,125,150];
  const length = CHUNK_LENGTH, nx = columns.length - 1, nz = 32, positions = [], colors = [], indices = [];
  for (let j = 0; j <= nz; j++) {
    const s = index * length + j / nz * length;
    for (let i = 0; i <= nx; i++) {
      const x = centerAt(s) + columns[i];
      positions.push(x, groundAt(x, s) - .025, -s);
      const variation = .90 + .10 * Math.sin(x * .11 + s * .07) * Math.cos(s * .09 - x * .03);
      const field = .5 + .5 * Math.sin(x * .052 + s * .018);
      const e=landscapeAt(s),green=e.uphill;
      if(s>3250){
        const wheat=e.wheat||0,valley=e.valley||0,bay=e.bay||0;
        const p=scenicProfile(s),edge=Math.min(1,Math.abs(columns[i])/12),shade=(p.trees*.045-p.flowers*.020)*edge;
        colors.push(variation*(1.02+wheat*.25-valley*.17+bay*.06-shade),variation*(1-wheat*.04-valley*.06-shade*.5),variation*(.83-wheat*.24-valley*.03+bay*.05-shade*.8));
        continue;
      }
      const slopeLight = openingVista(s)*Math.min(1,Math.abs(columns[i])/16);
      const crest=summitVista(s)*Math.min(1,Math.abs(columns[i])/13);
      colors.push(variation * (.91 + field * .09)*(1-green*.10+slopeLight*.085+crest*.075), variation, variation * (.82 + field * .12)*(1-green*.10+slopeLight*.03-crest*.025));
    }
  }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const a = j * (nx + 1) + i, b = a + nx + 1;
    indices.push(a, a + 1, b, a + 1, b + 1, b);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geo.setIndex(indices); geo.computeVertexNormals();
  return new THREE.Mesh(geo, materials.ground);
}
function ribbon(index, offset, width, material, lift) {
  const positions=[],indices=[],colors=[],steps=128,across=offset===0?12:2;
  for(let j=0;j<=steps;j++) {
    const s=index*CHUNK_LENGTH+j*CHUNK_LENGTH/steps;
    for(let i=0;i<=across;i++) {
      const lane=offset+(i/across-.5)*width;
      const x=centerAt(s)+lane;
      positions.push(x,heightAt(s)+roadRelief(s,lane)+lift,-s);
      const rough=roadSurface(s,lane).roughness;
      const c=1-rough*.22+.025*Math.sin(s*2.1+lane*7);
      colors.push(c,c*.98,c*.93);
      if(j<steps&&i<across){const a=j*(across+1)+i,b=a+across+1;indices.push(a,a+1,b,a+1,b+1,b);}
    }
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();
  const mesh=new THREE.Mesh(geo,material);mesh.receiveShadow=true;return mesh;
}

function roadGravel(group,index) {
  const random=rng(index*901+319),stones=[];
  for(let i=0;i<650;i++) {
    const s=index*CHUNK_LENGTH+random()*CHUNK_LENGTH,lane=(random()-.5)*4.1;
    const rough=roadSurface(s,lane).roughness;
    if(random()>Math.max(0,(rough-.28)*1.4))continue;
    const size=.018+random()*.048;
    stones.push({pos:[centerAt(s)+lane,heightAt(s)+roadRelief(s,lane)+.023,-s],scale:[size,size*.32,size*.8],rot:[0,random()*6.28,0],color:['#a4977c','#c0b294','#8f876e'][i%3]});
  }
  instances(group,new THREE.IcosahedronGeometry(1,0),materials.flower,stones);
}

function cottage(group, x, s, random, variant=0, catYard=false) {
  const wall=cottageWalls[variant],roofMaterial=cottageRoofs[variant];
  const g = new THREE.Group();g.name = 'Distant cottage';g.position.set(x, groundAt(x, s) - .15, -s);g.rotation.y = random() * .5 - .25;
  const scale = .85 + random() * .35;g.scale.set(scale*(1+variant*.04),scale*(1-variant*.035),scale);
  if(catYard){
    g.name='Cottage at the cat garden';
    g.rotation.y=Math.PI*.5;
    g.scale.set(1,.96,1);
    // Anchor the road-facing doorstep to the visible slope at the front wall.
    g.position.y=visibleGroundAt(x+2.5,s)-.04;
  }
  const foundation = new THREE.Mesh(new THREE.BoxGeometry(6, 1.4, 4.7), materials.foundation);foundation.position.y = -.35;g.add(foundation);
  const house = new THREE.Mesh(new THREE.BoxGeometry(5.8, 3.3, 4.5), wall);house.position.y = 1.65;house.castShadow = true;house.receiveShadow = true;g.add(house);
  const roofGeometry = new THREE.BufferGeometry();
  roofGeometry.setAttribute('position', new THREE.Float32BufferAttribute([-3.25,3.3,2.65, 3.25,3.3,2.65, 3.25,3.3,-2.65, -3.25,3.3,-2.65, -3.25,4.9,0, 3.25,4.9,0],3));
  roofGeometry.setIndex([0,1,5,0,5,4,2,3,4,2,4,5,3,0,4,1,2,5]);roofGeometry.computeVertexNormals();
  const roof = new THREE.Mesh(roofGeometry, roofMaterial);roof.castShadow = true;g.add(roof);
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(.55, 1.7, .6), wall);chimney.position.set(-1.5, 4.6, -.7);g.add(chimney);
  for (const side of [-1, 1]) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.22, 1.32, .10), materials.trim);frame.position.set(side * 1.55, 1.9, 2.27);g.add(frame);
    const window = new THREE.Mesh(new THREE.BoxGeometry(1, 1.1, .06), materials.window);window.position.set(side * 1.55, 1.9, 2.28);g.add(window);
    window.position.z = 2.34;
    for (const shutterSide of [-1,1]) {
      const shutter = new THREE.Mesh(new THREE.BoxGeometry(.33,1.12,.10), materials.window);shutter.position.set(side * 1.55 + shutterSide * .74,1.9,2.3);g.add(shutter);
    }
    const cross = new THREE.Mesh(new THREE.BoxGeometry(.05,1.1,.04),materials.trim);cross.position.set(side*1.55,1.9,2.38);g.add(cross);
    const crossbar = new THREE.Mesh(new THREE.BoxGeometry(1,.05,.04),materials.trim);crossbar.position.set(side*1.55,1.9,2.38);g.add(crossbar);
  }
  const door = new THREE.Mesh(new THREE.BoxGeometry(.95, 2, .07), materials.bark);door.position.set(0, 1, 2.29);g.add(door);
  for (const side of [-1,1]) for (const z of [-1.1,1.1]) {
    const frame=new THREE.Mesh(new THREE.BoxGeometry(.1,1.25,1.05),materials.trim);frame.position.set(side*2.93,1.9,z);g.add(frame);
    const pane=new THREE.Mesh(new THREE.BoxGeometry(.07,1,.8),materials.window);pane.position.set(side*3,1.9,z);g.add(pane);
    const bar=new THREE.Mesh(new THREE.BoxGeometry(.04,1,.045),materials.trim);bar.position.set(side*3.045,1.9,z);g.add(bar);
  }
  const step = new THREE.Mesh(new THREE.BoxGeometry(1.5,.2,.8),materials.foundation);step.position.set(0,.1,2.6);g.add(step);
  group.add(g);
}

const flowerNames=['Flower_1_Clump','Flower_2_Clump','Flower_3_Clump','Flower_4_Clump','Flower_5_Clump'];
function villageGardens(group,index) {
  const random=rng(index*518+879),flowers=[],stones=[];
  const owns=s=>Math.floor(s/CHUNK_LENGTH)===index;
  for(let i=0;i<100;i++){
    const at=1209+random()*82,lane=-4.1-random()*4.2;
    if(!owns(at)||Math.sin(at*.27+lane*.5)>.43)continue;
    const x=centerAt(at)+lane,h=.23+random()*.23;
    flowers.push({pos:[x,visibleGroundAt(x,at),-at],scale:[h,h,h],rot:[0,random()*6.28,0],color:'#f6eed4'});
  }
  for(let i=0;i<10;i++){
    const at=CAT_HOME+5.5+i*.25,lane=-8.5-i*.56;
    if(!owns(at))continue;
    const x=centerAt(at)+lane;
    stones.push({pos:[x,visibleGroundAt(x,at)+.08,-at],scale:[.24+random()*.12,.22,.22],rot:[0,random()*6.28,0]});
  }
  for(let i=0;i<30;i++){
    const at=CAT_HOME-6+random()*3.9,lane=-3.8-random()*3;
    if(!owns(at))continue;
    const x=centerAt(at)+lane,h=.18+random()*.20;
    flowers.push({pos:[x,visibleGroundAt(x,at),-at],scale:[h,h,h],rot:[0,random()*6.28,0],color:'#eef2cd'});
  }
  plantInstances(group,'Flower_4_Clump',flowers);
  if(stones.length)instances(group,new THREE.IcosahedronGeometry(1,0),materials.foundation,stones);
  if(!owns(CAT_HOME))return;
  const positions=[],indices=[];
  for(let i=0;i<=16;i++){
    const t=-.12+1.12*i/16,at=CAT_HOME+CAT_YARD.doorstep*(1-t),lane=CAT_YARD.startLane+(CAT_YARD.greetingLane-CAT_YARD.startLane)*t;
    for(const side of [-1,1]){
      const x=centerAt(at)+lane+side*(.36+.09*Math.sin(t*Math.PI));
      positions.push(x,visibleGroundAt(x,at)+.012,-at);
    }
    if(i<16){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  const path=new THREE.Mesh(geometry,materials.foundation);path.name='Cat garden path';path.receiveShadow=true;group.add(path);
}
function flowerFields(group,index) {
  const random=rng(index*9409+36431),beds=flowerNames.map(()=>[]);
  // Irregular drifts: overlapping patches with grass gaps instead of a grid.
  for(let side of [-1,1]) {
    for(let i=0;i<1350;i++) {
      const s=(index+random())*CHUNK_LENGTH,lateral=4+random()*19;
      if(random()>scenicFlowerWeight(s,side,lateral)*landscapeAt(s).flowerDensity)continue;
      const x=centerAt(s)+side*lateral,y=groundAt(x,s);
      if(tunnelExcludes(x,s,.6)||pondViewingGap(x,s)||!isDryLand(x,s)||inDuckCorridor(x,s)||inFootpath(x,s)||inGrassZone(s)&&Math.abs(x-centerAt(s))<5.5)continue;
      const h=.30+random()*.42,wide=h*(.82+random()*.32),p=scenicProfile(s);
      const variety=random()<p.flowerMix?p.nextFlower:p.flower;
      beds[variety].push({pos:[x,y-.012,-s],scale:[wide,h,wide],rot:[0,random()*Math.PI*2,0],color:'#fff4e8'});
    }
    // A few individual clumps make the transition into the verge less abrupt.
    for(let i=0;i<24;i++){
      const s=index*CHUNK_LENGTH+random()*CHUNK_LENGTH,x=centerAt(s)+side*(2.8+random()*2.5),h=.22+random()*.20;
      if(tunnelExcludes(x,s,.6)||pondViewingGap(x,s)||!isDryLand(x,s)||inDuckCorridor(x,s)||inFootpath(x,s)||inGrassZone(s)&&Math.abs(x-centerAt(s))<5.5)continue;
      beds[i%flowerNames.length].push({pos:[x,groundAt(x,s),-s],scale:[h,h,h],rot:[0,random()*6.28,0]});
    }
  }
  beds.forEach((points,i)=>plantInstances(group,flowerNames[i],points));
  group.userData.flowerVisits=beds.flat().filter(p=>Math.abs(p.pos[0]-centerAt(-p.pos[2]))<6.5).map(p=>[p.pos[0],p.pos[1]+p.scale[1]*.9,p.pos[2]]);
}

// Irregular, layered green shoulders on the ascent; the crest opens onto meadow.
function hillGroves(group,index) {
  const random=rng(index*6287+8851),trees=Array.from({length:5},()=>[]),broadleaf=[];
  for(let i=0;i<62;i++) {
    const s=(index+random())*CHUNK_LENGTH,green=climbGrove(s);
    const side=i%2?1:-1;
    const pocket=.64+.32*Math.sin(s*.038+side*1.7)**2;
    if(random()>green*pocket*.85)continue;
    const x=centerAt(s)+side*(7.5+random()**1.3*19),h=7+random()*5;
    const point={pos:[x,visibleGroundAt(x,s)-.09,-s],scale:[h*1.11,h,h*1.11],rot:[0,random()*6.28,side*.014],color:['#8ec09a','#a8cba5','#79b48b'][i%3]};
    if(i%3===0)broadleaf.push(point);
    else trees[i%5].push(point);
  }
  trees.forEach((points,i)=>plantInstances(group,`BirchTree_${i+1}`,points));
  plantInstances(group,'MeadowBroadleaf',broadleaf);
}

function distantGroves(group,index) {
  const random=rng(index*5107+9301),distant=new THREE.Group();distant.name='Distant hillside groves';
  const trees=Array.from({length:5},()=>[]);
  for(let grove=0;grove<6;grove++) {
    const middle=index*CHUNK_LENGTH+random()*CHUNK_LENGTH;
    const side=grove%2?1:-1,setback=62+random()*60;
    for(let j=0;j<4;j++) {
      const s=Math.max(index*CHUNK_LENGTH+.1,Math.min((index+1)*CHUNK_LENGTH-.1,middle+(random()-.5)*16));
      const x=centerAt(s)+side*(setback+(random()-.5)*15),h=5+random()*4;
      const presence=(1-openingVista(s)*(side>0?.76:.34))*(1-summitVista(s)*.50);
      if(!isDryLand(x,s)||inDuckCorridor(x,s)||inFootpath(x,s)||random()>(.25+scenicProfile(s).trees*.75)*presence)continue;
      trees[(grove+j)%5].push({pos:[x,groundAt(x,s)-.06,-s],scale:[h*1.1,h,h*1.1],rot:[0,random()*6.28,0],color:['#a4bca7','#bccbb0','#afc3ac'][grove%3]});
    }
  }
  trees.forEach((points,i)=>plantInstances(distant,`BirchTree_${i+1}`,points));
  distant.traverse(object=>{object.castShadow=false;});group.add(distant);
}

function lakeShore(group,index) {
  const start=Math.max(index*CHUNK_LENGTH,LAKE.s-LAKE.rz);
  const end=Math.min((index+1)*CHUNK_LENGTH,LAKE.s+LAKE.rz);
  if(end<=start)return;
  // Every streamed strip uses the same absolute ellipse and water level.
  const positions=[],indices=[],steps=Math.ceil((end-start)/2);
  for(let j=0;j<=steps;j++) {
    const s=start+(end-start)*j/steps;
    const half=LAKE.rx*Math.sqrt(Math.max(0,1-((s-LAKE.s)/LAKE.rz)**2));
    const middle=centerAt(s)+lakeOffsetAt(s);
    positions.push(middle-half,LAKE.level,-s,middle+half,LAKE.level,-s);
    if(j<steps){const a=j*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  const water=new THREE.Mesh(geometry,materials.water);water.name='Quiet lake';group.add(water);
  const reeds=[],rocks=[],random=rng(index*911+34);
  for(let i=0;i<720;i++) {
    const angle=i/720*Math.PI*2;
    const s=LAKE.s+Math.sin(angle)*LAKE.rz*.99;
    if(s<start||s>=end)continue;
    const x=centerAt(s)+lakeOffsetAt(s)+Math.cos(angle)*LAKE.rx*.99,y=visibleGroundAt(x,s);
    if(y<LAKE.level || random()>.65||inDuckCorridor(x,s)||inFootpath(x,s))continue;
    const h=(lakeViewOpening(x,s)?.32:.5)+random()*.60;
    reeds.push({pos:[x,y,-s],scale:[h*.65,h,h*.65],rot:[0,random()*6.28,0],color:'#a3af7a'});
    if(i%5===0)rocks.push({pos:[x,y-.1,-s],scale:[.5,.32,.4],rot:[0,random()*6,0]});
  }
  plantInstances(group,'Grass_Large_Extruded',reeds);
  instances(group,new THREE.IcosahedronGeometry(1,1),materials.foundation,rocks);
}

export function createChunk(index) {
  const group = new THREE.Group();group.name = `Meadow_${index}`;
  const random = rng(index * 7177 + 51839);
  group.add(terrain(index), ribbon(index, 0, 4.3, materials.road, .015));
  group.add(ribbon(index, -.71, .46, materials.track, .018), ribbon(index, .71, .46, materials.track, .018));
  roadGravel(group,index);
  addStartCourtyard(group,index);
  addRegionalScenery(group,index);
  addScenicRhythm(group,index);
  addFlowerTunnel(group,index);
  if(index*CHUNK_LENGTH>=3250){addExtendedScenery(group,index);addWildlife(group,index);return group;}
  const posts=[],rails=[],stones=[];
  const trees=Array.from({length:5},()=>[]);
  for(let grove=0;grove<8;grove++) {
    const mid=index*CHUNK_LENGTH+random()*CHUNK_LENGTH,side=grove%2?1:-1;
    const setback=16+random()*32;
    for(let j=0;j<5;j++){
      const s=Math.max(index*CHUNK_LENGTH+.5,Math.min((index+1)*CHUNK_LENGTH-.5,mid+(random()-.5)*17));
      const x=centerAt(s)+side*(setback+(random()-.5)*12),h=6.5+random()*5.5;
      const presence=(1-openingVista(s)*(side>0?.88:.44))*(1-summitVista(s)*.93);
      if(courtyardExcludes(x,s,h*.7)||tunnelExcludes(x,s,h*.65)||random()>landscapeAt(s).treeDensity*(.2+.8*scenicProfile(s).trees)*presence || !isDryLand(x,s)||inDuckCorridor(x,s,10)||inFootpath(x,s))continue;
      if(lakeViewOpening(x,s,h*.65)||pondViewingGap(x,s))continue;
      const variety=(grove+j)%5;
      trees[variety].push({pos:[x,groundAt(x,s)-.04,-s],scale:[h*(1.0+random()*.20),h,h*(1.0+random()*.20)],rot:[0,random()*Math.PI*2,0],color:['#e4e8c5','#cbdcae','#f1edcc'][j%3]});
      if(j===0 && grove<3){
        const youngX=x-side*2.3,youngH=2.8+random()*1.5;
        if(!courtyardExcludes(youngX,s+2,youngH*.7)&&!tunnelExcludes(youngX,s+2,youngH*.65)&&!lakeViewOpening(youngX,s+2,youngH*.65)&&isDryLand(youngX,s+2))trees[(variety+2)%5].push({pos:[youngX,groundAt(youngX,s+2)-.03,-s-2],scale:[youngH,youngH,youngH],rot:[0,random()*6.28,0],color:'#c5d7ab'});
      }
    }
  }
  trees.forEach((points,i)=>plantInstances(group,`BirchTree_${i+1}`,points));
  group.userData.wildlifeTrees ??= [];
  trees.forEach((points,i)=>points.forEach(point=>group.userData.wildlifeTrees.push({name:`BirchTree_${i+1}`,point})));
  group.userData.birdPerches ??= [];
  trees.forEach(points=>{
    const nearRoad=[...points].sort((a,b)=>Math.abs(a.pos[0]-centerAt(-a.pos[2]))-Math.abs(b.pos[0]-centerAt(-b.pos[2]))).slice(0,2);
    nearRoad.forEach(tree=>group.userData.birdPerches.push([tree.pos[0],tree.pos[1]+tree.scale[1]*.55,tree.pos[2]]));
  });
  const grasses=[[],[]];
  // Layer short roadside tufts and taller, scattered meadow grasses.
  for(let i=0;i<1050;i++){
    const s=index*CHUNK_LENGTH+random()*CHUNK_LENGTH,side=random()>.5?1:-1;
    const lateral=2.45+random()**1.8*28;
    const patch=.5+.5*Math.sin(s*.7+lateral*.8)*Math.cos(lateral*.55-s*.18);
    if(random()> .45+patch*.5)continue;
    const x=centerAt(s)+side*lateral,h=(lateral<4?.13:.20)+random()*.26;
    if(!isDryLand(x,s)||inDuckCorridor(x,s)||inFootpath(x,s))continue;
    // Keep low cover but leave the reserved resting shoulder readable.
    const restingStrip=inGrassZone(s)&&lateral<5.5;
    const variety=restingStrip?0:random()<.83?0:1;
    grasses[variety].push({pos:[x,groundAt(x,s)-.018,-s],scale:restingStrip?[h,.07,h]:[h,h,h],rot:[0,random()*6.28,0],color:['#c5d49b','#d9dfb2','#a9c085'][i%3]});
  }
  plantInstances(group,'Grass_Small',grasses[0]);plantInstances(group,'Grass_Large_Extruded',grasses[1]);
  flowerFields(group,index);
  addOpeningScenery(group,index);
  hillGroves(group,index);
  distantGroves(group,index);
  // Fence sections are deliberately intermittent so the countryside stays open.
  if (index % 3 !== 2 && landscapeAt(index*CHUNK_LENGTH+32).village>.25) {
    const side = index % 2 ? -1 : 1;
    for (let i = 0; i < 16; i++) {
      const s = index * CHUNK_LENGTH + i * 2.7 + 7;
      if(s>=1274&&s<=1405||side<0&&Math.abs(s-CAT_HOME)<24)continue;
      const x = centerAt(s) + side * 4.8, y = groundAt(x, s);
      posts.push({ pos: [x, y + .46, -s], scale: [.12, .92, .13], rot: [0, 0, (random() - .5) * .09] });
      if (i < 15) for (const level of [.33, .72]) {
        const nextX = centerAt(s + 2.7) + side * 4.8;
        rails.push({ pos: [(x + nextX) / 2, y + level, -s - 1.35], scale: [.075, .075, 2.77], rot: [0, -Math.atan2(nextX - x, 2.7), 0] });
      }
    }
    instances(group, new THREE.BoxGeometry(1, 1, 1), materials.fence, posts).castShadow = true;
    instances(group, new THREE.BoxGeometry(1, 1, 1), materials.fence, rails);
  }
  for (let i = 0; i < 14; i++) {
    const s = index * CHUNK_LENGTH + random() * CHUNK_LENGTH;
    const x = centerAt(s) + (random() > .5 ? 1 : -1) * (3.2 + random() * 8);
    if(!isDryLand(x,s)||inDuckCorridor(x,s)||inFootpath(x,s)||inGrassZone(s)&&Math.abs(x-centerAt(s))<6)continue;
    stones.push({ pos: [x, groundAt(x, s), -s], scale: [.14 + random() * .25, .12 + random() * .17, .13 + random() * .2], rot: [random(), random(), random()] });
  }
  instances(group, new THREE.IcosahedronGeometry(1, 0), materials.fence, stones);
  for(const home of VILLAGE_HOMES)if(Math.floor(home.s/CHUNK_LENGTH)===index)cottage(group,centerAt(home.s)+home.side*home.setback,home.s,random,home.variant,home.catYard);
  if(index*CHUNK_LENGTH<=CAT_HOME+15&&(index+1)*CHUNK_LENGTH>=1209)villageGardens(group,index);
  lakeShore(group,index);
  addWildlife(group,index);
  return group;
}

export function disposeChunk(group) {
  for(const material of group.userData.ownedMaterials||[])material.dispose();
  group.traverse(obj => { if (obj.geometry && !obj.geometry.userData.sharedVegetation && !obj.geometry.userData.sharedWildlife) obj.geometry.dispose(); if (obj.isInstancedMesh) { obj.customDepthMaterial?.dispose(); obj.dispose(); } });
}

export function makeSky(scene) {
  const group = new THREE.Group();scene.add(group);
  const random = rng(24), clouds = [];
  for (let i = 0; i < 28; i++) {
    const x = (random() - .5) * 420, z = (random() - .5) * 420, y = 38 + random() * 27;
    for (let j = 0; j < 4; j++) clouds.push({ pos: [x + j * 4, y + Math.sin(j) * 2, z], scale: [6 + random() * 4, 2 + random() * 1.5, 4 + random() * 2] });
  }
  const cloud = instances(group, new THREE.IcosahedronGeometry(1, 2), new THREE.MeshBasicMaterial({ color: '#faf5db', fog: false }), clouds);
  const highWisps=[];
  for(let i=0;i<12;i++){
    const side=i%2?1:-1,x=side*(35+random()*110),z=-40-random()*190;
    for(let j=0;j<3;j++)highWisps.push({pos:[x+j*6,36+random()*9,z+j*2],scale:[13+random()*9,1.7+random()*1.2,5+random()*5]});
  }
  const ridgeClouds=instances(group,new THREE.IcosahedronGeometry(1,2),new THREE.MeshBasicMaterial({color:'#f3f1df',fog:false,transparent:true,opacity:0,depthWrite:false}),highWisps);
  ridgeClouds.name='Layered high ridge cloud ribbons';
  // Broad low silhouettes leave sky above the route; distant bands lose contrast.
  const layers=[
    {radius:720,base:-14,height:68,width:175,colors:['#cfddd7','#c9d9d5']},
    {radius:510,base:-16,height:54,width:135,colors:['#bdcfc5','#c5d5c9']},
    {radius:335,base:-18,height:40,width:105,colors:['#aebf9e','#b8c8a8']},
  ];
  layers.forEach((layer,level)=>{
    const hills=[];
    for(let i=0;i<22;i++){
      const t=i/22*Math.PI*2;
      hills.push({pos:[Math.sin(t)*layer.radius,layer.base,Math.cos(t)*layer.radius],
        scale:[layer.width+random()*45,layer.height*(.65+random()*.45),85+random()*45],
        rot:[0,-t+random()*.25,0],color:layer.colors[i%2]});
    }
    const ridge=instances(group,new THREE.IcosahedronGeometry(1,4),new THREE.MeshBasicMaterial({color:'#ffffff',fog:false}),hills);
    ridge.name=['Hazy far horizon','Soft blue-green ridges','Low open hills'][level];
  });
  return { group, cloud, ridgeClouds };
}

export function setPaintingScenery(amount){materials.water.color.set('#8fbfc0').lerp(new THREE.Color('#759fac'),amount);materials.ground.color.set('#9eae76').lerp(new THREE.Color('#a8b985'),amount*.7);}
