import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPassingRide,passingLane,PASSING_START,updatePassingRide} from '../src/passing-riders.js';
import {updateRide} from '../src/route.js';

test('fast riders pass in order at a separate shoulder and stop updating when paused or finished',()=>{
 for(const mode of ['leisure','brisk','joyful','chase']){
  const event=createPassingRide();
  const ride={started:true,paused:false,auto:true,distance:PASSING_START-10,speed:5,lane:0,turn:0,rideMode:mode};
  let bothAhead=false;
  for(let frame=0;frame<6000&&event.status!=='done';frame++){
   updateRide(ride,new Set(),.05);
   updatePassingRide(event,{...ride,dt:.05});
   if(event.status!=='passing')continue;
   assert.ok(Math.abs(event.stations[0]-event.stations[1]-15)<.0001);
   assert.ok(Math.abs(ride.lane-passingLane(event,0))>=1.09);
   const frozen=structuredClone(event);
   updatePassingRide(event,{...ride,paused:true,dt:10});
   assert.deepEqual(event,frozen);
   bothAhead ||= event.stations[1]>ride.distance;
  }
  assert.equal(bothAhead,true);
  assert.equal(event.status,'done');
 }
});
