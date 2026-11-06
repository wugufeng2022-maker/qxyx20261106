import {CAT_YARD} from './village-cat-site.js';

// A finite greeting at the animal's own home. Distance starts it; time animates
// the gesture, so stopping or pausing cannot repeatedly replay the welcome.
export const APPROACH_NOTICE=65;
export const APPROACH_MOVE=45;
export const approachEase=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function updateAnimalApproach(event,home,{started,paused,distance,dt},duration){
 if(!started||paused)return;
 const previous=event.approach||{attention:0,progress:0};
 const ahead=home-distance;
 const greeting=['available','stopping','talking'].includes(event.status)&&ahead>=-8&&ahead<=APPROACH_NOTICE;
 const step=Math.max(0,Math.min(dt||0,.1));
 event.approach={
  attention:Math.max(0,Math.min(1,previous.attention+(greeting?step:-step)*1.8)),
  // Once the rider passes, finish this short path and wait there. Never follow.
  progress:Math.min(1,previous.progress+((greeting&&ahead<=APPROACH_MOVE)||previous.progress>0&&previous.progress<1?step/duration:0)),
 };
}

// The cat leaves its doorstep once and settles at the shoulder.
export const CAT_GREETING_DURATION=3.35;
export function catGreetingPose(progress){
 const t=progress*CAT_GREETING_DURATION;
 const run=approachEase((t-.38)/2.57);
 const standing=approachEase((t-.23)/.34)*(1-approachEase((t-2.87)/.48));
 return {offset:(CAT_YARD.greetingLane-CAT_YARD.startLane)*run,
  depth:CAT_YARD.doorstep*(1-run),standing,
  yaw:Math.PI*(.5+.26*standing),moving:standing*Math.min(1,Math.sin(Math.PI*run)*3)};
}
export function updateCatGreeting(event,home,{started,paused,distance,dt=0}){
 if(!started||paused)return;
 const a=event.approach||{attention:0,progress:0,...catGreetingPose(0)};
 const ahead=home-distance,step=Math.max(0,Math.min(dt,.1));
 const visible=['available','stopping','talking'].includes(event.status)&&ahead>=-8&&ahead<=APPROACH_NOTICE;
 a.attention=Math.max(0,Math.min(1,a.attention+(visible?step:-step)*1.8));
 if(a.progress===0&&visible&&ahead<25){
  // A nearby preview starts at the greeting spot instead of popping into a run.
  a.progress=1;Object.assign(a,catGreetingPose(1));
 }else if(a.progress<1&&(visible&&ahead<=43||a.progress>0)){
  const next=Math.min(1,a.progress+step/CAT_GREETING_DURATION);
  const pose=catGreetingPose(next);
  a.travel=(a.travel||0)+Math.hypot(pose.offset-a.offset,pose.depth-a.depth);
  a.progress=next;Object.assign(a,pose);
 }
 event.approach=a;
}
