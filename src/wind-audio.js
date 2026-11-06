import { createBirdAmbience } from './nature-audio.js';
// Original procedural stereo wind: no external samples or licensing dependencies.
export function windSamples(sampleRate = 22050, seconds = 32) {
  const length = Math.round(sampleRate * seconds), channels = [];
  for (let ch = 0; ch < 2; ch++) {
    let seed = 98217 + ch * 713, low = 0, body = 0, dc = 0;
    const noise = new Float32Array(length), out = new Float32Array(length);
    for (let i=0;i<length;i++) { seed=(Math.imul(seed,1664525)+1013904223)>>>0;noise[i]=seed/2147483648-1; }
    const a=1-Math.exp(-2*Math.PI*1400/sampleRate), b=1-Math.exp(-2*Math.PI*180/sampleRate), hp=1-Math.exp(-2*Math.PI*40/sampleRate);
    // Warm the filters with a full cycle so the loop boundary has no transient.
    for (let pass=0;pass<2;pass++) for (let i=0;i<length;i++) {
      low+=a*(noise[i]-low);body+=b*(low-body);const air=body*.96+low*.04;
      dc+=hp*(air-dc);
      const phase=i/length*Math.PI*2;
      const gust=.50+.28*Math.sin(phase*3+ch*.45)+.18*Math.sin(phase*7+ch*.8);
      out[i]=(air-dc)*gust*1.7;
    }
    channels.push(out);
  }
  return channels;
}

export function windLevel(speed, shelter=0) {
  const moving=Math.max(0,Math.min(1,speed/7));
  return (.012 + .14 * Math.pow(moving,.85)) * (1-.2*shelter);
}

export function createWindAudio(onState = () => {}) {
  let context, master, filter, panner, birds, enabled=true, active=false;
  const report=()=>onState({enabled,state:context?.state || 'idle'});
  async function unlock() {
    try {
      if (!context) {
        const AudioContext=window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) throw new Error('Web Audio unavailable');
        context=new AudioContext();
        birds=createBirdAmbience(context);
        const samples=windSamples();
        const buffer=context.createBuffer(2,samples[0].length,22050);
        samples.forEach((data,i)=>buffer.copyToChannel(data,i));
        const source=context.createBufferSource();source.buffer=buffer;source.loop=true;
        filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=1200;filter.Q.value=.5;
        panner=context.createStereoPanner();master=context.createGain();master.gain.value=0;
        source.connect(filter).connect(panner).connect(master).connect(context.destination);source.start();
        context.onstatechange=report;
      }
      await context.resume();report();
    } catch (error) { onState({enabled:false,state:'unavailable'});console.warn('Wind audio unavailable',error); }
  }
  function silence() {
    active=false;birds?.silence();
    if(master)master.gain.setTargetAtTime(0,context.currentTime,.09);
  }
  return {
    unlock,
    updateScene(position,forward,up,perches,ride) { birds?.update(active,position,forward,up,perches,ride); },
    setEnabled(value) { enabled=value;if(!value)silence();else void unlock();report(); },
    silence,
    update({speed,paused,started,shelter=0,turn=0}) {
      active=started&&!paused&&enabled;
      if(!context)return;
      const t=context.currentTime;
      master.gain.setTargetAtTime(active?windLevel(speed,shelter):0,t,.5);
      filter.frequency.setTargetAtTime(900+Math.min(speed,7)*170,t,.7);
      panner.pan.setTargetAtTime(Math.max(-.3,Math.min(.3,Math.sin(t*.31)*.14+turn*.08)),t,.5);
    },
  };
}
