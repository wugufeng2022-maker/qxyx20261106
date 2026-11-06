import {centerAt} from './route.js';

export const CAT_HOME = 1520;
export const CAT_YARD = Object.freeze({startLane:-9.45, greetingLane:-2.95, doorstep:4, houseAt:1524, houseLane:-12.9});

export function catYardExcludes(x,s,radius=0) {
  const lane=x-centerAt(s);
  return s>=CAT_HOME-8-radius&&s<=CAT_HOME+13+radius&&lane>=-17-radius&&lane<=-2.2+radius;
}
