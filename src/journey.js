export const JOURNEY_KEY='meadow-journey-v1';
export const MEMORY_LABELS={walker:'邻居 · 一段慢步',ducks:'湖边 · 看鸭群入水',rabbit:'起点小院 · 熟悉的小兔',cat:'村口小院 · 熟悉的小猫',artist:'湖畔画家 · 一起看光影',starry:'麦野 · 星夜彩石村'};
export function loadJourney(storage){try{const v=JSON.parse(storage.getItem(JOURNEY_KEY));if(v?.version===1)return {version:1,memories:Object.fromEntries(Object.keys(MEMORY_LABELS).filter(k=>v.memories?.[k]===true).map(k=>[k,true])),themes:{impressionist:v.themes?.impressionist===true}};}catch{}return {version:1,memories:{},themes:{impressionist:false}};}
export function remember(journey,id,storage){if(!(id in MEMORY_LABELS)||journey.memories[id])return false;journey.memories[id]=true;try{storage.setItem(JOURNEY_KEY,JSON.stringify(journey));}catch{}return true;}
export function unlockPainting(journey,storage){if(journey.themes.impressionist)return false;journey.themes.impressionist=true;try{storage.setItem(JOURNEY_KEY,JSON.stringify(journey));}catch{}return true;}
