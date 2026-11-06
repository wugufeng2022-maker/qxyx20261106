import {brakeRate,DOWNHILL_POND} from './route.js';

export const POND_STOP = Object.freeze({from:DOWNHILL_POND.s-44,to:DOWNHILL_POND.s+4});
export const HILL_LOOKOUT = 3100;

export function canWatchPond(state) {
  if(!state.started||state.paused||state.pondWatching||state.distance<POND_STOP.from)return false;
  const braking=brakeRate({...state,pondWatching:true});
  return state.distance+state.speed**2/(2*braking)<=POND_STOP.to;
}

export function pondSightline(s) {
  const ramp=(a,b)=>{const t=Math.max(0,Math.min(1,(s-a)/(b-a)));return t*t*(3-2*t);};
  return ramp(2876,2914)*(1-ramp(2930,2964));
}
