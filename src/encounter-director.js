export const QUIET_METRES=35;
export function createEncounterDirector(){return {owner:null,quietUntil:0};}
function presenting(id,e,distance){
 if(!e)return false;
 if(id==='walker')return ['available','active'].includes(e.status)||(e.status==='arrived'&&e.accompanied&&e.arrivalTime<5&&Math.abs(distance-e.s)<25);
 if(id==='artist')return ['available','joining','active'].includes(e.status)||(e.status==='arrived'&&e.time<4&&Math.abs(distance-e.s)<24);
 if(id==='rabbit'||id==='cat')return ['available','stopping','talking','boarding'].includes(e.status);
 if(id==='starry')return !!e.attention;
 return ['available','active'].includes(e.status);
}
// A passive basket companion is not a major event. Wildlife keeps its own destination
// even while a prompt is suppressed; this director only owns invitations and attention.
export function updateEncounterDirector(director,events,{distance,started=true,paused=false}){
 if(!started)return null;if(paused)return director.owner;
 if(director.owner&&!presenting(director.owner,events[director.owner],distance)){director.owner=null;director.quietUntil=distance+QUIET_METRES;}
 if(!director.owner&&distance>=director.quietUntil)director.owner=['walker','duck','artist','rabbit','cat','starry'].find(id=>presenting(id,events[id],distance))||null;
 return director.owner;
}
