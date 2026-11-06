import {OPENING_AVENUES, avenueWeight, centerAt, CHUNK_LENGTH, isDryLand, rng} from './route.js';
import {courtyardExcludes} from './start-courtyard.js';
import {inGrassZone} from './grass-tumble.js';
import {scenicPlantBase} from './scenic-rhythm.js';
import {plantInstances} from './vegetation.js';

const treePalettes = {
  birch:['#b8d1ac','#c7d9b4','#d1dfbe'],
  broadleaf:['#aec492','#bfce9a','#a8be93'],
  scattered:['#d5ddb4','#dce7c6','#c4d7af'],
};

export function openingTrees(index) {
  const begin = index*CHUNK_LENGTH, end = begin+CHUNK_LENGTH;
  const trees = [];
  for (const avenue of OPENING_AVENUES) {
    if (end<=avenue.start || begin>=avenue.end) continue;
    const broadleaf = avenue.kind==='broadleaf';
    const birch = avenue.kind==='birch';
    const spacing = birch ? 7.8 : broadleaf ? 10.6 : 12.8;
    for (let station=avenue.start+3; station<avenue.end; station+=spacing) {
      for (const side of [-1,1]) {
        const random = rng(Math.round(station*749)+8462+side*619);
        const at = station+(side>0 ? spacing*.43 : 0)+(random()-.5)*2.5;
        if (at<begin || at>=end || at<avenue.start || at>=avenue.end) continue;
        const fullness = avenueWeight(at,avenue);
        const d = (broadleaf ? 6.35 : birch ? 5.4 : 6.2)+(1-fullness)*2.3+random()*.85;
        const h = (broadleaf ? 9.8 : birch ? 8.2 : 9.1)+fullness*3.1+random()*(broadleaf ? 2.9 : 1.65);
        const width = h*(broadleaf ? 1.06+random()*.23 : birch ? 1.31 : .95);
        const x = centerAt(at)+side*d;
        if (courtyardExcludes(x,at,width*.65) || !isDryLand(x,at)) continue;
        const variant = Math.floor(random()*5)+1;
        trees.push({
          kind:avenue.kind,
          name:broadleaf ? 'AvenueBroadleaf' : `BirchTree_${variant}`,
          point:{
            pos:[x,scenicPlantBase(x,at,width*.045),-at],
            scale:[width,h,width],
            rot:[0,random()*Math.PI*2,0],
            color:treePalettes[avenue.kind][variant%3],
          },
        });
      }
    }
  }
  return trees;
}

// Each drift has its own shoulder, length and flower mix. Sampling stays in
// world metres so the patches do not restart at the streaming boundaries.
const drifts = [
  {s:22,length:27,side:1,d:5.9,width:3.4,flowers:[1,4]},
  {s:78,length:34,side:1,d:6.2,width:3.1,flowers:[2,4]},
  {s:102,length:19,side:-1,d:5.6,width:2.9,flowers:[2,5]},
  {s:276,length:31,side:-1,d:6.5,width:3.5,flowers:[1,5]},
  {s:302,length:28,side:1,d:8.5,width:4.5,flowers:[4,5]},
  {s:447,length:24,side:1,d:5.9,width:3.4,flowers:[1,4]},
  {s:527,length:45,side:1,d:11,width:6.2,flowers:[2,5]},
  {s:618,length:46,side:-1,d:12.5,width:6.5,flowers:[1,5]},
  {s:679,length:29,side:1,d:9.5,width:3.5,flowers:[4,5]},
  {s:770,length:19,side:-1,d:8,width:3.8,flowers:[2,4]},
];

export function openingFlowers(index) {
  const begin = index*CHUNK_LENGTH, end = begin+CHUNK_LENGTH;
  const flowers = [];
  for (const drift of drifts) {
    if (begin>=drift.s+drift.length || end<=drift.s-drift.length) continue;
    const random = rng(drift.s*617+29);
    for (let i=0; i<110; i++) {
      const along = 2*random()-1;
      const across = 2*random()-1;
      const s = drift.s+along*drift.length;
      const d = drift.d+Math.sin(along*2.8)*1.4+across*drift.width;
      const h = .29+random()*.31;
      const angle = random()*6.28;
      const name = `Flower_${drift.flowers[i%3===0 ? 1 : 0]}_Clump`;
      if (along*along+across*across>1 || s<Math.max(0,begin) || s>=Math.min(790,end)) continue;
      if (d<3.45 || inGrassZone(s, -2) && d<6) continue;
      const x = centerAt(s)+drift.side*d;
      if (courtyardExcludes(x,s,.65) || !isDryLand(x,s)) continue;
      flowers.push({name,point:{pos:[x,scenicPlantBase(x,s,h*.12),-s],scale:[h,h,h],rot:[0,angle,0],color:'#fff4e8'}});
    }
  }
  return flowers;
}

export function addOpeningScenery(group,index) {
  const trees = openingTrees(index), flowers = openingFlowers(index);
  const batches = new Map();
  for (const {name,point} of [...trees,...flowers]) {
    if (!batches.has(name)) batches.set(name,[]);
    batches.get(name).push(point);
  }
  for (const [name,points] of batches) plantInstances(group,name,points);
  group.userData.wildlifeTrees.push(...trees.filter(tree=>tree.name.startsWith('Birch')));
  const birches = trees.filter(tree=>tree.name.startsWith('Birch'));
  for (const {point} of birches.slice(0,2)) group.userData.birdPerches.push([point.pos[0],point.pos[1]+point.scale[1]*.55,point.pos[2]]);
  for (const {point} of flowers) {
    const [x,y,z] = point.pos;
    if (Math.abs(x-centerAt(-z))<6.5) group.userData.flowerVisits.push([x,y+point.scale[1]*.9,z]);
  }
}
