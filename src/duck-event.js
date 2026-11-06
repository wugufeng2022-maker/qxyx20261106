import { centerAt, heightAt, roadRelief, LAKE, ROAD_HALF_WIDTH } from './route.js';
import { visibleGroundAt } from './grass-tumble.js';

export const DUCK_CROSSING = 980;
export const DUCK_START = -7.5, DUCK_END = 19;
export const DUCK_SPACING = 1.12;
export const DUCK_NOTICE = 930, DUCK_WAIT_FROM = 948, DUCK_WAIT_TO = 974;
const approachFrom = 918, verge = 2.8;
const smooth = (a,b,x) => {
  const t=Math.max(0,Math.min(1,(x-a)/(b-a)));
  return t*t*(3-2*t);
};

export function createDuckEvent() {
  return {status:'unseen',waiting:false,witnessed:false,observedWait:0,positions:[0,1,2,3].map(i=>DUCK_START-i*DUCK_SPACING),time:0,swimTime:0,yielding:false,resumeRequested:false};
}

export function inDuckCorridor(x,s,padding=0) {
  const d=x-centerAt(s);
  return s>DUCK_CROSSING-7-padding && s<DUCK_CROSSING+7+padding && d>-12-padding && d<26+padding;
}

function pathAt(lane) {
  // The family approaches from the grass, crosses squarely, then turns toward the inlet.
  const s=DUCK_CROSSING-5*(1-smooth(-10,-verge,lane))+3.6*smooth(3,19,lane);
  return {x:centerAt(s)+lane,s};
}

export function duckGroundAt(x,s) {
  const lane=x-centerAt(s);
  return Math.abs(lane)<=ROAD_HALF_WIDTH ? heightAt(s)+roadRelief(s,lane)+.018 : visibleGroundAt(x,s);
}

export function duckSurface(lane,swimTime=0) {
  const p=pathAt(lane), ahead=pathAt(lane+.03);
  const dry=duckGroundAt(p.x,p.s);
  const immersion=1-smooth(LAKE.level-.12,LAKE.level+.12,dry);
  // After the last duck has entered, the family keeps paddling out together.
  const glide=5*(-Math.expm1(-swimTime*.12));
  const dx=ahead.x-p.x, ds=ahead.s-p.s;
  return {...p,x:p.x+glide,s:p.s+.17*glide*glide,y:Math.max(dry,LAKE.level-.10),
    heading:Math.atan2(1,-ds/dx-.34*glide),swimming:immersion>=1,immersion};
}

export function canChooseDuckWait(event,distance,speed=0,braking=4.5) {
  return (event.status==='available'||event.status==='active')&&!event.waiting&&
    distance>=DUCK_WAIT_FROM&&distance+speed*speed/(2*braking)<=DUCK_WAIT_TO;
}

export function chooseDuckWait(event,distance,speed=0,braking=4.5) {
  if(!canChooseDuckWait(event,distance,speed,braking))return;
  event.observedWait=0;
  event.status='active';event.waiting=true;event.resumeRequested=false;
}

const onRoad = lane => lane > -verge && lane < verge;

export function leaveDuckWait(event) {
  event.observedWait=0;
  if(event.waiting&&event.positions.some(onRoad))event.resumeRequested=true;
  else {event.waiting=false;event.resumeRequested=false;}
}

export function updateDuckEvent(event,{distance,speed=0,dt=0,paused=false,started=true}) {
  if(paused||!started||distance<approachFrom)return event;
  if(event.status==='unseen'&&distance>=DUCK_NOTICE)event.status=distance>1004?'skipped':'available';
  if(event.status==='complete'||(event.status==='skipped'&&event.time===0)){
    if(event.status==='complete'&&distance<DUCK_CROSSING+90)event.swimTime+=dt;
    return event;
  }
  if(distance>1020){event.status='skipped';event.waiting=false;event.resumeRequested=false;}
  const riderPassed=distance>DUCK_CROSSING+5;
  if(event.status==='available'&&riderPassed)event.status='active';

  const observing=event.waiting&&!event.resumeRequested&&distance>=DUCK_WAIT_FROM&&distance<=DUCK_WAIT_TO&&speed<.25;
  event.observedWait=observing?Math.min(8,event.observedWait+dt):0;
  const stoppedForFamily=observing&&speed<.08;
  const canCross=!event.resumeRequested&&(stoppedForFamily||riderPassed);
  event.time+=dt;event.yielding=false;
  for(let i=0;i<event.positions.length;i++) {
    const lane=event.positions[i];
    const pace=1.12-.38*smooth(9,15,lane)+.15*smooth(15,18,lane);
    let next=Math.min(DUCK_END-i*DUCK_SPACING,lane+pace*dt);
    if(i>0)next=Math.min(next,event.positions[i-1]-DUCK_SPACING);
    if(lane<=-verge && next>-verge && !canCross){next=-verge;event.yielding=true;}
    event.positions[i]=next;
  }
  if(event.resumeRequested&&!event.positions.some(onRoad)){event.waiting=false;event.resumeRequested=false;}
  if(event.positions.at(-1)>=DUCK_END-3*DUCK_SPACING-.001){
    if(event.status==='skipped'){
      if(distance<DUCK_CROSSING+90)event.swimTime+=dt;
    }else{
      event.status='complete';event.witnessed=observing&&event.observedWait>=8;
    }
    event.waiting=false;
  }
  return event;
}
