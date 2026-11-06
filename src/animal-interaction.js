import {canChooseAnimalSeat} from './animal-seats.js';
// Shared, bounded domestic-animal encounter. Merely riding past never requests a stop.
export const ANIMAL_REACH=12;
export const animalHolding=e=>['stopping','talking','boarding'].includes(e.status);
export function withinAnimalReach(e,home,distance,margin=0){
 return distance>=home-(e.approachReach??ANIMAL_REACH)-margin&&distance<=home+ANIMAL_REACH+margin;
}
export function canStopForAnimal(e,home,distance,speed,braking=4.5){
 return e.status==='available'&&withinAnimalReach(e,home,distance)&&distance+speed*speed/(2*braking)<=home+ANIMAL_REACH;
}
export function stopForAnimal(e,home,distance,speed,braking){
 if(!canStopForAnimal(e,home,distance,speed,braking))return false;
 e.status='stopping';return true;
}
export function leaveAnimal(e){
 if(!['stopping','talking'].includes(e.status))return false;
 e.status='available';e.time=0;return true;
}
export function inviteAnimal(e,home,distance,speed,seat='front',events=[e]){
 if(e.status!=='talking'||speed>=.04||!withinAnimalReach(e,home,distance)||!canChooseAnimalSeat(events,seat))return false;
 e.status='boarding';e.seat=seat;e.time=0;return true;
}
export function updateAnimalEncounter(e,home,boardingDuration,{started,paused,distance,speed,dt}){
 if(!started||paused)return;
 if(e.status==='unseen'&&distance>=home-65)e.status=distance>home+18?'skipped':'available';
 if(e.status==='available'&&distance>home+18)e.status='skipped';
 if(animalHolding(e)&&!withinAnimalReach(e,home,distance,.5)){e.status='skipped';e.time=0;return;}
 if(e.status==='stopping'&&speed<.04)e.status='talking';
 if(e.status==='boarding'&&speed<.04){e.time+=dt;if(e.time>=boardingDuration)e.status='active';}
}
// Screen-space padding remains bounded around the animal, including on touch screens.
export function withinAnimalHit({x,y},bounds,padding=12){
 return x>=bounds.minX-padding&&x<=bounds.maxX+padding&&y>=bounds.minY-padding&&y<=bounds.maxY+padding;
}
