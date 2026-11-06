import {writeFileSync} from 'node:fs';
import {windSamples,windLevel} from '../src/wind-audio.js';
const rate=22050, data=windSamples(rate,32), frames=rate*16, wav=Buffer.alloc(44+frames*4);
wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(2,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*4,28);wav.writeUInt16LE(4,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(frames*4,40);
for(let i=0;i<frames;i++)for(let ch=0;ch<2;ch++){
 const fade=Math.min(1,i/rate,(frames-i)/rate);
 wav.writeInt16LE(Math.round(Math.max(-1,Math.min(1,data[ch][i]*windLevel(3.8)*fade))*32767),44+i*4+ch*2);
}
writeFileSync(new URL('../assets/audio/wind-preview.wav',import.meta.url),wav);
