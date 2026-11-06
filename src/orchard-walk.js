import {centerAt} from './route.js';

export const WALKER = Object.freeze({start:3550,end:3630,lane:-3.2,speed:1.05});
export const smooth = (a,b,s) => {
  const t=Math.max(0,Math.min(1,(s-a)/(b-a)));
  return t*t*(3-2*t);
};
export const walkerLane = s => WALKER.lane-.95*smooth(WALKER.end-6,WALKER.end,s);
export function orchardPathExcludes(x,s,margin=0) {
  return s>=WALKER.start-20-margin&&s<=WALKER.end+4+margin&&
    Math.abs(x-centerAt(s)-walkerLane(s))<1.55+margin;
}
