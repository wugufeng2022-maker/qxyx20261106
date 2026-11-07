export const AVENUE_START = 96, AVENUE_END = 256;
export const OPENING_AVENUES = Object.freeze([
  {kind:'birch', label:'白桦林荫', start:AVENUE_START, end:AVENUE_END, fade:22, shade:1},
  {kind:'broadleaf', label:'阔叶林荫', start:320, end:438, fade:24, shade:.88},
  {kind:'scattered', label:'湖前疏林', start:717, end:789, fade:20, shade:.47},
]);
export function avenueWeight(s, avenue) {
  const t = Math.max(0, Math.min(1, (s - avenue.start) / avenue.fade, (avenue.end - s) / avenue.fade));
  return t * t * (3 - 2 * t);
}
export function avenueShade(s) {
  return Math.max(...OPENING_AVENUES.map(avenue=>avenueWeight(s,avenue)*avenue.shade));
}
export const ROUTE_LENGTH = 10000;
export const ROAD_HALF_WIDTH = 2.15;
export const CHUNK_LENGTH = 64;
const smooth = (a,b,x) => {const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
export const CREEK_REACH = Object.freeze({start:5150,end:6550});
export const CLEAR_LAKE = Object.freeze({start:6740,end:7230,rideStart:6730});
export const FOREST_RIDE = Object.freeze({start:6000,end:6790,rideStart:5980});
export const forestRideWeight = s => smooth(FOREST_RIDE.start,6070,s)*(1-smooth(6710,FOREST_RIDE.end,s));
export const forestGladeAt = s => Math.max(
  smooth(6135,6165,s)*(1-smooth(6190,6235,s))*.72,
  smooth(6370,6410,s)*(1-smooth(6440,6500,s)),
);
export const forestGoldAt = s => Math.max(
  smooth(6200,6265,s)*(1-smooth(6320,6390,s))*.85,
  smooth(6520,6575,s)*(1-smooth(6690,6750,s)),
);
export const creeksideWeight = s => smooth(5270,5390,s)*(1-smooth(6300,6450,s));
export const clearLakeViewWeight = s => smooth(6750,6830,s)*(1-smooth(7100,7210,s));
export const roadHalfWidthAt = s => ROAD_HALF_WIDTH-.78*creeksideWeight(s);
export const openingVista = s => smooth(446,520,s)*(1-smooth(676,718,s));
export function openingSideView(s, offset) {
  for (const {start,end} of OPENING_AVENUES) {
    const clearEnd = Math.min(790,end+30);
    if (s<start-30 || s>=clearEnd) continue;
    const clearance = smooth(start-30,start-7,s)*(1-smooth(Math.min(780,end+7),clearEnd,s));
    return offset+(Math.min(offset,3.15)-offset)*clearance;
  }
  return offset;
}
// One continuous itinerary, with broad overlapping ecological transitions.
export function landscapeAt(s) {
  const forest=smooth(65,120,s)*(1-smooth(235,315,s));
  const meadow=smooth(260,380,s)*(1-smooth(740,850,s));
  const lake=smooth(740,850,s)*(1-smooth(1190,1320,s));
  const village=smooth(1230,1400,s)*(1-smooth(1750,1880,s));
  const uphill=smooth(1850,1970,s)*(1-smooth(2430,2580,s));
  const downhill=smooth(2530,2660,s)*(1-smooth(3180,3310,s));
  const flowers=((1-smooth(60,130,s))+smooth(1800,1940,s))*(1-uphill*.92);

  const extended=extendedLandscapeAt(s);
  return {forest,meadow,lake,village,flowers,uphill,downhill,...extended,
    flowerDensity:Math.min(1,.10+flowers*.9+village*.40+meadow*.09),
    treeDensity:Math.max(.12,Math.min(1,.28+forest*.72+flowers*.40+village*.20+uphill*.62-downhill*.50)),
    ...(s>3250?{flowerDensity:(1-smooth(3250,3430,s))*Math.min(1,.10+flowers*.9+village*.40+meadow*.09)+smooth(3250,3430,s)*extended.flowerDensity,treeDensity:(1-smooth(3250,3430,s))*Math.max(.12,Math.min(1,.28+forest*.72+flowers*.40+village*.20+uphill*.62-downhill*.50))+smooth(3250,3430,s)*extended.treeDensity}:{}),
    label:s>3250?extended.label:s<85?'风吹花田':s<290?'林荫大道':s<790?'开阔草坡':s<1270?'湖畔微风':s<1840?'午后小村':s<1950?'绿坡山脚':s<2500?'葱茏长坡':s<2620?'山顶微风':s<3250?'向阳下坡':'坡下花野'};
}
// Fixed, non-repeating second half. Weights overlap across 180 m ecotones.
export const EXTENDED_REGIONS=Object.freeze([
  {key:'orchard',start:3250,end:4200,label:'风过果园'},
  {key:'wheat',start:4200,end:5150,label:'金色麦野'},
  {key:'river',start:5150,end:CREEK_REACH.end,label:'溪边窄路'},
  {key:'valley',start:CREEK_REACH.end,end:7150,label:'幽绿林谷'},
  {key:'terraces',start:7150,end:8150,label:'层叠草坡'},
  {key:'ridge',start:8150,end:9150,label:'开阔山脊'},
  {key:'bay',start:9150,end:10000,label:'晚霞湖湾'},
]);
export function extendedLandscapeAt(s) {
  const out={};
  EXTENDED_REGIONS.forEach((r,i)=>{out[r.key]=(i===0?smooth(3250,3400,s):smooth(r.start-90,r.start+90,s))*(i===6?1:1-smooth(r.end-90,r.end+90,s));});
  const r=EXTENDED_REGIONS.find(r=>s<r.end)||EXTENDED_REGIONS[6];
  return {...out,label:r.label,treeDensity:.40*out.orchard+.035*out.wheat+.13*out.river+.96*out.valley+.14*out.terraces+.018*out.ridge+.12*out.bay,
    flowerDensity:.08*out.orchard+.015*out.wheat+.02*out.river+.025*out.valley+.13*out.terraces+.045*out.ridge+.10*out.bay};
}
// Analytic C2 road profile: gentle long waves, never stepped terrace roads.
const EXTENDED_HEIGHTS=[[3250,0],[3650,2.2],[4200,1.1],[4700,3.5],[5150,2.0],[5650,2.5],[6150,3.0],[6650,5.0],[7150,7.0],[7650,24.0],[8150,52.0],[8650,66.0],[9150,27.0],[9600,3.0],[10000,3.0]];
function extendedHeight(s) {
  const datum=oldHeight(LONG_HILL.start);
  for(let i=1;i<EXTENDED_HEIGHTS.length;i++) {
    const [a,ha]=EXTENDED_HEIGHTS[i-1],[b,hb]=EXTENDED_HEIGHTS[i];
    if(s<=b){const t=Math.max(0,(s-a)/(b-a));return {height:datum+ha+(hb-ha)*ease5(t),slope:(hb-ha)/(b-a)*ease5Derivative(t)};}
  }
  return {height:datum+3,slope:0};
}
// A meandering creek replaces the broad river strip, with a dry shelf beside the road.
export function extendedWaterAt(s) {
  const river=smooth(CREEK_REACH.start,5320,s)*(1-smooth(6380,CREEK_REACH.end,s));
  const lake=smooth(CLEAR_LAKE.start,6840,s)*(1-smooth(7130,CLEAR_LAKE.end,s));
  const bay=smooth(9150,9350,s);
  if(river>0){
    const near=5.95+1.10*Math.sin(s*.027)+.62*Math.sin(s*.061)+15*smooth(6375,6520,s);
    const halfWidth=2.65+.66*Math.sin(s*.042)+.28*Math.sin(s*.083);
    return {kind:'river',level:heightAt(5650)-1.22,offset:near+halfWidth,halfWidth,strength:river};
  }
  if(lake>0){
    const near=6.4+1.35*Math.sin(s*.026)+.55*Math.sin(s*.063);
    const halfWidth=5+34*lake+3*lake*Math.sin(s*.032);
    return {kind:'clearLake',level:heightAt(6960)-1.62,offset:near+halfWidth,halfWidth,strength:lake};
  }
  if(bay>0)return {kind:'bay',level:-1.5,offset:78,halfWidth:65,strength:bay};
  return null;
}
export const LAKE = { x: centerAt(1020)+70, s:1020, rx:66, rz:185, level:-1.4 };
// The north inlet curls toward the rider before it joins the existing lake.
export const lakeOffsetAt = s => 74-22*smooth(835,866,s)*(1-smooth(883,951,s));
export function lakeRadius(x,s) {return Math.hypot((x-centerAt(s)-lakeOffsetAt(s))/LAKE.rx,(s-LAKE.s)/LAKE.rz);}
export function lakeViewOpening(x,s,margin=0) {
  const d=x-centerAt(s);
  return s>790&&s<952+margin&&d>2.4-margin&&d<52+margin;
}
export function isDryLand(x,s) {if(pondRadius(x,s)<1.12)return false;const water=extendedWaterAt(s);return groundAt(x,s)>(water?water.level+.15:LAKE.level+.22);}

export function centerAt(s) { return Math.sin(s * .008) * 15 + Math.sin(s * .021) * 3; }
export const LONG_HILL = Object.freeze({start:1850,crest:2550,end:3250,rise:48});
export const summitVista = s => smooth(2400,2490,s)*(1-smooth(2655,2750,s));
export const climbGrove = s => smooth(1845,1970,s)*(1-smooth(2360,2465,s));
const oldHeight=s=>.15+Math.sin(s*.009)*.8+Math.sin(s*.025)*.18;
const oldSlope=s=>Math.cos(s*.009)*.0072+Math.cos(s*.025)*.0045;
const ease5=t=>t*t*t*(10+t*(-15+6*t));
const ease5Derivative=t=>30*t*t*(1-t)*(1-t);
// Shared analytic profile: C2 at the feet and crest, 700 m on either side.
// Fade the old tiny undulations into a level datum without changing the lake/village.
export function hillAt(s) {
  const {start,crest,end,rise}=LONG_HILL;
  if(s<=start||s>=end)return {height:0,slope:0};
  const ascending=s<crest,length=ascending?crest-start:end-crest;
  const t=(s-(ascending?start:crest))/length;
  return {height:rise*(ascending?ease5(t):1-ease5(t)),slope:(ascending?1:-1)*rise/length*ease5Derivative(t)};
}
function hillBase(s) {
  const t=Math.max(0,Math.min(1,(s-LONG_HILL.start)/120));
  const blend=ease5(t),derivative=ease5Derivative(t)/120;
  const old=oldHeight(s),datum=oldHeight(LONG_HILL.start);
  return {height:old+(datum-old)*blend,slope:oldSlope(s)*(1-blend)+(datum-old)*derivative};
}
export function heightAt(s) { return s>3250?extendedHeight(s).height:hillBase(s).height+hillAt(s).height; }
// A finite downhill hollow, wholly outside the dry road corridor.
// Short enough that its downstream shore closes above the horizontal water on the steeper hill.
export const DOWNHILL_POND=Object.freeze({s:2940,offset:14,rx:8,rz:20,level:heightAt(2940)-3});
export function pondRadius(x,s){
  const p=DOWNHILL_POND;
  return Math.hypot((x-centerAt(s)-p.offset)/p.rx,(s-p.s)/p.rz);
}
// Keep tall flowers out of the approach-side view into the little pond.
export function pondViewingGap(x,s){
  const d=x-centerAt(s);
  return s>DOWNHILL_POND.s-85&&s<DOWNHILL_POND.s+25&&d>2.5&&d<DOWNHILL_POND.offset+DOWNHILL_POND.rx+9;
}

export function slopeAt(s) { return s>3250?extendedHeight(s).slope:hillBase(s).slope+hillAt(s).slope; }
// An effort/grade target model, deliberately bounded for comfortable riding.
// Only the added hill changes speeds; manual idle remains a deliberate stop.
export function gradeSpeed(effort,s,maxSpeed=10) {
  if(effort===0)return 0;
  const grade=slopeAt(s)*smooth(LONG_HILL.start,LONG_HILL.start+120,s);
  return Math.min(maxSpeed,effort/(1+Math.max(0,grade)*6)+Math.max(0,-grade)*34);
}
export function tangentAt(s) { return Math.cos(s * .008) * .12 + Math.cos(s * .021) * .063; }
export function groundAt(x, s) {
  const verge = Math.max(0, Math.abs(x - centerAt(s)) - 3);
  if(s>3250&&verge===0)return heightAt(s);
  const shoulder = 1 - Math.exp(-verge * .10);
  const hills = (1 - Math.exp(-Math.max(0, verge - 8) * .045)) ** 2;
  let base = heightAt(s)
    + shoulder * (Math.sin(x * .07 + s * .011) * .7 + Math.cos(x * .035 - s * .016) * .6)
    + hills * (5.5 + Math.sin(x * .038 + s * .009) * 3.2 + Math.cos(x * .027 - s * .014) * 2.4);
  const d=x-centerAt(s);
  base-=summitVista(s)*smooth(9,74,Math.abs(d))*13;
  if(s>3250) {
    const e=extendedLandscapeAt(s),blend=smooth(3250,3450,s);
    const d=x-centerAt(s),v=Math.abs(d),outside=Math.max(0,v-3);
    const ramp=1-Math.exp(-outside*.06);
    const valley=ramp*ramp*(17+6*Math.sin(s*.008+d*.045));
    const ridge=-ramp*ramp*(15+5*Math.cos(s*.006+d*.025));
    const terrace=ramp*(3.8+2.3*Math.tanh(Math.sin(v*.16+s*.002)*3)+v*.065);
    const rolling=ramp*(1.5+1.2*Math.sin(d*.048+s*.007));
    const extra=e.valley*valley+e.ridge*ridge+e.terraces*terrace;
    const specialized=heightAt(s)+rolling*(1-e.valley*.7-e.ridge*.7)+extra;
    base=base*(1-blend)+specialized*blend;
    const water=extendedWaterAt(s);
    if(water&&(water.kind==='river'||water.kind==='clearLake')&&d>3) {
      const near=water.offset-water.halfWidth,far=water.offset+water.halfWidth;
      const shore=water.level+.13;
      const bank=heightAt(s)+(shore-heightAt(s))*smooth(3,near,d);
      const bed=water.kind==='river'
        ? shore-1.29*Math.sin(Math.PI*smooth(near,far,d))
        : shore-3.8*smooth(0,19,Math.min(d-near,far-d));
      const channel=d<near?bank:bed;
      const influence=(1-smooth(far,far+(water.kind==='river'?3.2:10),d))*water.strength;
      base+=(channel-base)*influence;
    } else if(water?.kind==='bay') {
      const cross=(1-smooth(water.halfWidth-2.5,water.halfWidth+3.5,Math.abs(d-water.offset)))*water.strength;
      base=base*(1-cross)+(water.level-1.6)*cross;
    }
  }
  const inlet=smooth(2880,2918,s)*(1-smooth(2947,2958,s))*smooth(3.7,6.4,d)*(1-smooth(7.7,11,d));
  // Lower the viewing bank and keep a lip above the flat water mesh.
  base-=inlet*Math.max(0,base-(DOWNHILL_POND.level+.29));
  const pond=1-smooth(.75,1.10,pondRadius(x,s));
  base=base*(1-pond)+(DOWNHILL_POND.level-1.6)*pond;
  // A level lake in a continuous basin; the riding surface stays untouched.
  const basin=(1-smooth(.82,1.06,lakeRadius(x,s)))*smooth(4,10,x-centerAt(s));
  return base*(1-basin)+(LAKE.level-2)*basin;
}
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a += 0x6D2B79F5; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
// A continuous field shared by appearance, rolling resistance and wheel motion.
function roadTransition(s) {
  const t=Math.max(0,Math.min(1,(s-(AVENUE_START-16))/38));
  return t*t*(3-2*t);
}
export function roadSurface(s, lane) {
  const transition=roadTransition(s);
  // Keep a broad, comfortable central line. Rough shoulders begin near the trees.
  const normalLane=Math.abs(lane)*ROAD_HALF_WIDTH/roadHalfWidthAt(s);
  const edge=Math.max(0,Math.min(1,(normalLane-.5)/1.05));
  const shoulder=edge*edge*(3-2*edge);
  const patch=.65+.35*Math.sin(s*.085+.7)**2;
  const roughness=.045+transition*(.015+shoulder*patch*.70);
  return {roughness, speedFactor:1.12-.42*roughness,
    label:roughness>.5?'路边碎石 · 稍有颠簸':roughness<.18?'平顺土路 · 轻松骑行':'乡间土路'};
}
export function roadRelief(s,lane) {
  const r=roadSurface(s,lane).roughness;
  // No high-frequency bumps on the opening stretch; central relief stays tiny.
  return roadTransition(s)*r*(.012+.008*Math.sin(s*3.8+lane*1.4)+.004*Math.sin(s*8.1-lane));
}
export function brakeRate(state) {
  if(state.grassSlowing)return 4;
  if(state.walkRequested!==undefined&&!!state.walkRequested!==!!state.walking)return 2.2;
  return state.walking?1.2:state.pondWatching?2.8:4.5;
}
export function updateRide(state, input, dt) {
  if (state.paused || !state.started || state.tumbleLocked) return 0;
  const braking = input.has('ArrowDown') || input.has('s');
  const brakingRate = brakeRate(state);
  const pedaling = input.has('ArrowUp') || input.has('w') || !!state.fastRequested;
  const surface = roadSurface(state.distance,state.lane);
  const mounting = state.walkRequested !== undefined && !!state.walkRequested !== !!state.walking;
  if (mounting && state.speed < .04) state.walking = !!state.walkRequested;
  const walking = !!state.walking;
  const posing = state.walkBlend !== undefined && Math.abs(state.walkBlend-(walking?1:0))>.005;
  const chasing=state.rideMode==='chase';
  const maxSpeed=chasing&&state.weaveSafe!==false?42/3.6:10;
  const chaseEffort=state.weaveSafe===false?7:9.4;
  const surfaceTarget = (mounting || posing ? 0 : walking ? (braking ? 0 : pedaling ? 1.55 : state.auto ? 1.05 : 0) / surface.speedFactor : braking ? 0 : gradeSpeed(pedaling ? (chasing?(state.weaveSafe===false?8.5:10.2):8.5) : state.auto ? (chasing?chaseEffort:state.rideMode==='brisk'?7:5) : 0,state.distance,maxSpeed)) * surface.speedFactor;
  const remaining=Math.max(0,ROUTE_LENGTH-state.distance);
  const target = Math.min(maxSpeed,state.grassSlowing?2.2:Infinity,surfaceTarget,Math.sqrt(remaining*1.2));
  const rate = braking||state.grassSlowing||mounting||walking ? brakingRate : pedaling ? 1.8 : state.auto ? 1.1 : .45 + surface.roughness * .6;
  state.speed += Math.sign(target - state.speed) * Math.min(Math.abs(target - state.speed), rate * dt);
  const keySteer = Number(input.has('ArrowRight') || input.has('d')) - Number(input.has('ArrowLeft') || input.has('a'));
  const mouseSteer=state.pointerSteer||0;
  const joyful=state.rideMode==='joyful'&&!walking&&!mounting&&!posing;
  // A relaxed figure-eight rhythm: broader arcs and a visible change of lean
  // every half cycle, with clearance inside the normal road steering bounds.
  const roadLimit=1.55-.78*creeksideWeight(state.distance);
  const weaveTarget=state.weaveSafe===false?0:(roadLimit-.13)*Math.sin(state.distance*Math.PI/26);
  const weaveLimit=state.weaveSafe===false?.35:.70;
  const weave=joyful?Math.max(-weaveLimit,Math.min(weaveLimit,(weaveTarget-state.lane)*1.4)):0;
  const manualSteer=input.has('ArrowRight')||input.has('d')||input.has('ArrowLeft')||input.has('a');
  const steer = manualSteer ? keySteer : state.tiltEnabled ? (state.tiltSteer||0) : mouseSteer || weave;
  const oldLane = state.lane;
  const nextLane=state.lane + steer * Math.min(state.speed * .33, 1.8) * dt;
  const guide=state.laneGuide;
  if(guide){
    const lo=guide.min,hi=guide.max;
    state.lane=state.lane<lo?state.lane+Math.min(lo-state.lane,dt*1.6):state.lane>hi?state.lane-Math.min(state.lane-hi,dt*1.6):Math.max(lo,Math.min(hi,nextLane));
  }else{
    const limit=state.shoulderAllowed?3.1:roadLimit;
    // Return gently when leaving a safe reach; never snap a shoulder rider inward.
    state.lane = Math.abs(state.lane)>limit ? state.lane-Math.sign(state.lane)*Math.min(Math.abs(state.lane)-limit,dt*1.6) : Math.max(-limit,Math.min(limit,nextLane));
  }
  state.turn += ((state.lane - oldLane) / Math.max(dt, .001) - state.turn) * (1 - Math.exp(-6 * dt));
  const distance = Math.min(remaining,state.speed * dt);
  state.distance = Math.min(ROUTE_LENGTH,state.distance+distance);
  if(state.distance>=ROUTE_LENGTH)state.speed=0;
  return distance;
}
