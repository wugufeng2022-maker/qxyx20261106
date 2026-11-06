import {courtyardExcludes} from './start-courtyard.js';
import {tunnelExcludes} from './flower-tunnel.js';
import {catYardExcludes} from './village-cat-site.js';
import {orchardPathExcludes} from './orchard-walk.js';
import {centerAt,CHUNK_LENGTH,rng,isDryLand,pondViewingGap,lakeViewOpening,summitVista,extendedLandscapeAt,extendedWaterAt} from './route.js';
import {inDuckCorridor} from './duck-event.js';
import {inGrassZone,visibleGroundAt} from './grass-tumble.js';
import {plantInstances} from './vegetation.js';

// Finite itinerary, in absolute metres. No modulo/chunk-driven scenic cycles.
// Region identity still comes from route.js; these are the small scenes within it.
export const SCENIC_BEATS=Object.freeze([
 [0,'cream verge','flowers'],[180,'deep avenue','grove'],[365,'left meadow drifts','flowers'],[585,'open grass shoulder','open'],
 [790,'willows before water','grove'],[1010,'lake window','water'],[1235,'rose verge','flowers'],[1450,'village garden','shrub'],[1675,'quiet orchard edge','open'],
 [1900,'green gate','grove'],[2115,'fern shoulder','shrub'],[2345,'high opening','open'],[2555,'crest flowers','flowers'],[2780,'downhill grove','grove'],[2980,'pond window','water'],[3210,'low blossom drift','flowers'],
 [3425,'orchard entrance','grove'],[3640,'orchard aisle','open'],[3865,'orchard rose hedge','shrub'],[4090,'orchard white verge','flowers'],
 [4310,'wheat horizon','open'],[4545,'wheat green margin','shrub'],[4770,'wheat flower hollow','flowers'],[4990,'wheat open bend','open'],
 [5220,'river alders','grove'],[5445,'river window','water'],[5670,'river low bank','shrub'],[5900,'river flower bank','flowers'],
 [6125,'valley gate','grove'],[6350,'valley clearing','open'],[6565,'valley broadleaf vault','grove'],[6790,'valley fern edge','shrub'],[7020,'valley light','flowers'],
 [7245,'terrace grass horizon','open'],[7470,'terrace rose sweep','flowers'],[7695,'terrace low scrub','shrub'],[7920,'terrace small copse','grove'],
 [8145,'ridge sky','open'],[8380,'ridge low blossom','flowers'],[8605,'ridge scrub saddle','shrub'],[8830,'ridge wide horizon','open'],[9050,'ridge sheltered copse','grove'],
 [9270,'bay window','water'],[9495,'bay flowering bank','flowers'],[9720,'bay shelter','grove'],[9940,'quiet last water','water'],[10160,'beyond the ride','open'],
].map(([s,name,type],i)=>Object.freeze({s,name,type,side:i%3===0?-1:1,flower:i%5,phase:i*1.731})));
const PRESETS={
 flowers:{trees:.32,shrubs:.30,flowers:1,spread:16},
 grove:{trees:1,shrubs:.38,flowers:.20,spread:9},
 open:{trees:.07,shrubs:.09,flowers:.09,spread:22},
 shrub:{trees:.16,shrubs:1,flowers:.40,spread:12},
 water:{trees:.10,shrubs:.14,flowers:.18,spread:8},
};
const smooth=t=>t*t*(3-2*t);
export function scenicProfile(s){
 let i=0;while(i<SCENIC_BEATS.length-2&&s>=SCENIC_BEATS[i+1].s)i++;
 const a=SCENIC_BEATS[i],b=SCENIC_BEATS[i+1],t=smooth(Math.max(0,Math.min(1,(s-a.s)/(b.s-a.s))));
 const out={beat:i,name:a.name,flower:a.flower,nextFlower:b.flower,flowerMix:t,phase:a.phase*(1-t)+b.phase*t};
 for(const key of ['trees','shrubs','flowers','spread'])out[key]=PRESETS[a.type][key]*(1-t)+PRESETS[b.type][key]*t;
 out.bias=a.side*(1-t)+b.side*t;return out;
}
// Shared exclusion for new vegetation, with a radius for large crowns. The old
// encounter footprints stay open; the grass resting strip gets an extra margin.
export function scenicClear(x,s,radius=0){
 if(courtyardExcludes(x,s,radius)||catYardExcludes(x,s,radius)||tunnelExcludes(x,s,radius)||orchardPathExcludes(x,s,radius))return false;
 const d=x-centerAt(s),margin=radius*1.2;
 if(Math.abs(d)<3.1+margin||inGrassZone(s)&&Math.abs(d)<5.5+margin)return false;
 for(const at of [s-radius,s,s+radius]){
  if(inGrassZone(at)&&Math.abs(x-centerAt(at))<5.5+margin)return false;
  if(!isDryLand(x,at)||pondViewingGap(x,at)||inDuckCorridor(x,at,margin))return false;
  const dx=x-centerAt(at);
  if(at>1040-radius&&at<1216+radius&&dx>2.2-radius&&dx<5.6+radius)return false;
 }
 const w=extendedWaterAt(s);if(w&&w.strength>.1&&d>0&&d<w.offset+w.halfWidth+radius+3)return false;
 return true;
}
export function scenicFlowerWeight(s,side,d){
 const p=scenicProfile(s);
 // Broad slanted ribbons, scalloped islands, and gaps follow world coordinates.
 const ribbon=8+Math.sin(s*.017+p.phase)*4+p.bias*side*3;
 const wave=.5+.5*Math.sin(s*.049+side*2.1+d*.29);
 return p.flowers*Math.max(.05,1-Math.abs(d-ribbon)/p.spread)*(.22+wave*.78)*(1+side*p.bias*.45);
}
// Set the foot against the actual triangulated terrain. A small sampled root
// footprint prevents an uphill root floating beside the centre contact point.
export function scenicPlantBase(x,s,radius=0){
 let y=visibleGroundAt(x,s);
 for(let i=0;i<8;i++){const a=i*Math.PI/4;y=Math.min(y,visibleGroundAt(x+Math.cos(a)*radius,s+Math.sin(a)*radius));}
 return y-.025;
}
export function scenicPlants(index){
 const random=rng(7831+index*19237),trees=[],shrubs=[],flowers=[];
 for(let i=0;i<150;i++){
  const s=(index+random())*CHUNK_LENGTH,p=scenicProfile(s),e=extendedLandscapeAt(s),side=i%2?1:-1;
  const ridge=e.ridge||0,wheat=e.wheat||0;
  const shrub=i%3!==0,h=shrub?.55+random()*.75:(3.8+random()*2.8)*(1-ridge*.48);
  const width=shrub?h*1.7:h;
  const d=shrub?6.7+random()*18:10+random()*26,x=centerAt(s)+side*d;
  const density=(shrub?p.shrubs*.40:p.trees*.47)*(1+side*p.bias*.55)*(1-wheat*.75)*(1-ridge*.55)*(1-summitVista(s)*(shrub?.24:.91));
 if(random()>density||!scenicClear(x,s,width*.57)||!shrub&&lakeViewOpening(x,s,width*.57))continue;
  (shrub?shrubs:trees).push({pos:[x,scenicPlantBase(x,s,width*(shrub?.28:.045)),-s],scale:[width,h,width],rot:[0,random()*6.28,0],color:shrub?['#b1bd91','#a9bc88','#c3c79c'][i%3]:['#a8bf94','#b8c99b','#96b195'][i%3]});
 }
 // Lower-budget flower islands supplement the sparse back-half regions, while
 // retaining the wheat/river/woodland setting and generous sky on the ridge.
 if(index*CHUNK_LENGTH>=3250)for(let i=0;i<500;i++){
  const s=(index+random())*CHUNK_LENGTH,p=scenicProfile(s),side=i%2?1:-1,d=4.5+random()*19,x=centerAt(s)+side*d,e=extendedLandscapeAt(s);
  if(random()>scenicFlowerWeight(s,side,d)*(.25+e.terraces*.50+e.bay*.2)||!scenicClear(x,s,.4))continue;
  const h=(.26+random()*.32)*(1-e.ridge*.35);
  flowers.push({kind:random()<p.flowerMix?p.nextFlower:p.flower,pos:[x,scenicPlantBase(x,s,h*.12),-s],scale:[h,h,h],rot:[0,random()*6.28,0],color:'#fff3df'});
 }
 return {trees,shrubs,flowers};
}
export function addScenicRhythm(group,index){
 const plants=scenicPlants(index);
 plantInstances(group,'MeadowBroadleaf',plants.trees);plantInstances(group,'MeadowShrub',plants.shrubs);
 for(let i=0;i<5;i++)plantInstances(group,`Flower_${i+1}_Clump`,plants.flowers.filter(p=>p.kind===i));
 group.userData.scenicBeat=scenicProfile(index*CHUNK_LENGTH+32).name;
}
