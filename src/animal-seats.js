import {createRabbit,RABBIT_BASKET} from './rabbit.js';
import {createCat,CAT_SEAT} from './cat.js';
export const ANIMAL_SEATS=['front','rear'];
export function seatOccupant(events,seat){return events.find(e=>e.seat===seat&&['boarding','active'].includes(e.status))||null;}
export function canChooseAnimalSeat(events,seat){return ANIMAL_SEATS.includes(seat)&&!seatOccupant(events,seat);}
// Seat geometry is anchored to the actual GLB basket and rear rack, independently of species.
export function createAnimalSeatRigs(model,steering){
 const rabbitFront=createRabbit(steering,{basket:true}),catRear=createCat(model,{carrier:true});
 const rabbitRear=createRabbit(model);rabbitRear.root.position.set(CAT_SEAT.center[0],CAT_SEAT.center[1]+.008,0);rabbitRear.bunny.rotation.y=Math.PI;
 const catFront=createCat(steering);catFront.root.position.set(...RABBIT_BASKET.center);catFront.cat.scale.setScalar(.84);catFront.cat.position.y=.065;
 const pad=rabbitFront.cushion.clone();pad.name='Front cat sage linen cushion';pad.position.y=.020;pad.scale.y=.045;catFront.root.add(pad);
 const rigs={rabbit:{front:rabbitFront,rear:rabbitRear},cat:{front:catFront,rear:catRear}};
 return {rigs,update(events,time,speed,{rabbit=false,cat=false}={}){
  const previews={rabbit,cat};
  for(const [id,seats] of Object.entries(rigs))for(const [seat,rig] of Object.entries(seats)){
   const event=events[id],chosen=event.seat|| (id==='rabbit'?'front':'rear');
   rig.root.visible=(chosen===seat&&(event.status==='active'||event.status==='boarding'&&event.time>=(id==='rabbit'?.55:.60)))||(previews[id]&&seat===(id==='rabbit'?'front':'rear')&&event.status!=='active'&&event.status!=='boarding'&&!seatOccupant(Object.values(events),seat));
   if(rig.root.visible)rig.update(time,speed);
  }
 }};
}
