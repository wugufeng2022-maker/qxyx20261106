import {RABBIT_HOME} from './start-courtyard.js';
import {DUCK_CROSSING} from './duck-event.js';
import {CAT_HOME} from './village-cat-site.js';
import {CLEAR_LAKE,CREEK_REACH,DOWNHILL_POND,FOREST_RIDE} from './route.js';
import {HILL_LOOKOUT} from './pond-stop.js';
import {WALKER} from './orchard-walk.js';
// Route distances are metres. The map deliberately spaces regions for legibility.
export const ROUTE_LENGTH = 10000;
export const ITINERARY = [
  ['起点小院',0,85],['林荫大道',85,290],['开阔草坡',290,790],['自然湖畔',790,1270],
  ['午后小村',1270,1850],['葱茏长上坡',1850,2550],['向阳长下坡',2550,3250],
  ['风过果园',3250,4200],['金色麦野',4200,CREEK_REACH.start],['溪边窄路',CREEK_REACH.start,CREEK_REACH.end],
  ['幽绿林谷',CREEK_REACH.end,7150],['层叠草坡',7150,8150],['开阔山脊',8150,9150],['晚霞湖湾',9150,10000],
].map(([name,start,end])=>({name,start,end}));
export const MAP_POINTS = Array.from({length:15},(_,i)=>{const row=Math.floor(i/5),col=i%5;return {x:70+(row%2?4-col:col)*175,y:85+row*155};});
export const ROUTE_EVENTS = [{at:DUCK_CROSSING,label:'湖边鸭群'}, {at:1123,label:'画家写生'}, {at:RABBIT_HOME,label:'起点小院 · 小兔'}, {at:CAT_HOME,label:'村口小猫'}, {at:DOWNHILL_POND.s,label:'下坡池塘 · 停看鸭子'}, {at:HILL_LOOKOUT,label:'坡脚远望'}, {at:WALKER.start,label:'果园邻居'}, {at:WALKER.end,label:'树下长椅'}, {at:FOREST_RIDE.rideStart,label:'森林入口'}, {at:CLEAR_LAKE.rideStart,label:'清湖入口'}].sort((a,b)=>a.at-b.at);
export const clampDistance = at => Number.isFinite(Number(at)) ? Math.min(ROUTE_LENGTH,Math.max(0,Number(at))) : 0;
export const km = at => (at/1000).toFixed(3);
export function regionAt(at){return ITINERARY.find(segment=>at<segment.end)||ITINERARY.at(-1);}
export function mapPoint(at){at=clampDistance(at);const index=ITINERARY.findIndex(segment=>at<segment.end),i=index<0?13:index,s=ITINERARY[i],a=MAP_POINTS[i],b=MAP_POINTS[i+1],t=(at-s.start)/(s.end-s.start);return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};}
