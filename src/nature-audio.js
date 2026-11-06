import { centerAt, roadSurface } from './route.js';
// CC0 field-recorded birds by isaiah658; see assets/audio/README.md.
export function nearbyPerches(perches,position,radius=38) {
  return perches.map(p=>({p,d:Math.hypot(p[0]-position.x,p[1]-position.y,p[2]-position.z)}))
    .filter(({d})=>d<radius).sort((a,b)=>a.d-b.d);
}

export function roadsideBirds(perches,position,ride={distance:0,lane:0}) {
  const nearby=nearbyPerches(perches,position);
  const shoulder=Math.abs(ride.lane)>1 && roadSurface(ride.distance,ride.lane).roughness>.35;
  if(!shoulder)return {candidates:nearby,interval:10};
  const sameSide=nearby.filter(({p})=>Math.sign(p[0]-centerAt(-p[2]))===Math.sign(ride.lane));
  return {candidates:sameSide.length?sameSide:nearby,interval:8};
}

export function createBirdAmbience(context) {
  const bus=context.createGain();bus.gain.value=0;bus.connect(context.destination);
  let buffers=[];
  const urls=[new URL('../assets/audio/bird-1.wav',import.meta.url),new URL('../assets/audio/bird-2.wav',import.meta.url),new URL('../assets/audio/bird-3.wav',import.meta.url)];
  Promise.all(urls.map(async url=>{
    const response=await fetch(url);if(!response.ok)throw new Error('Bird audio unavailable');
    return context.decodeAudioData(await response.arrayBuffer());
  })).then(loaded=>{buffers=loaded;}).catch(error=>console.warn('Bird ambience unavailable',error));
  let nextCall=context.currentTime+5,call=0;
  const voices=new Set();
  function silence(){bus.gain.setTargetAtTime(0,context.currentTime,.08);nextCall=context.currentTime+5;}
  return {
    silence,
    update(active,position,forward,up,perches,ride){
      const now=context.currentTime,listener=context.listener;
      if(listener.positionX){
        for(const [axis,value] of [['X',position.x],['Y',position.y],['Z',position.z]])listener['position'+axis].setTargetAtTime(value,now,.05);
        for(const [axis,value] of [['X',forward.x],['Y',forward.y],['Z',forward.z]])listener['forward'+axis].setTargetAtTime(value,now,.05);
        for(const [axis,value] of [['X',up.x],['Y',up.y],['Z',up.z]])listener['up'+axis].setTargetAtTime(value,now,.05);
      }else{listener.setPosition(position.x,position.y,position.z);listener.setOrientation(forward.x,forward.y,forward.z,up.x,up.y,up.z);}
      bus.gain.setTargetAtTime(active?1:0,now,.15);
      if(!active){nextCall=now+5;return;}
      if(now<nextCall || !buffers.length)return;
      const {candidates,interval}=roadsideBirds(perches,position,ride);
      nextCall=now+interval+(Math.sin(call*9.13)*.5+.5)*8;
      if(!candidates.length)return;
      const {p}=candidates[call%Math.min(3,candidates.length)];
      const source=context.createBufferSource(),panner=context.createPanner(),volume=context.createGain(),air=context.createBiquadFilter();
      source.buffer=buffers[call++%buffers.length];
      panner.panningModel='HRTF';panner.distanceModel='inverse';panner.refDistance=3;panner.maxDistance=65;panner.rolloffFactor=1.5;
      panner.setPosition(...p);volume.gain.value=.45;
      air.type='lowpass';air.frequency.value=6200;
      source.connect(air).connect(volume).connect(panner).connect(bus);voices.add(source);
      source.onended=()=>{source.disconnect();air.disconnect();volume.disconnect();panner.disconnect();voices.delete(source);};
      source.start();
    },
  };
}
