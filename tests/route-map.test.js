import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ITINERARY,mapPoint,regionAt,clampDistance} from '../src/itinerary.js';
import {parseNotes,notesExport} from '../src/route-map.js';
test('itinerary covers 10 km with contiguous regions and stable shared boundaries',()=>{
 assert.equal(ITINERARY[0].start,0);assert.equal(ITINERARY.at(-1).end,10000);
 ITINERARY.forEach((s,i)=>{assert.ok(s.end>s.start);if(i)assert.equal(s.start,ITINERARY[i-1].end);const p=mapPoint(s.start),q=mapPoint(s.end);assert.ok(Number.isFinite(p.x)&&Number.isFinite(q.y));});
 assert.equal(regionAt(1490).name,'午后小村');assert.equal(regionAt(10000).name,'晚霞湖湾');assert.equal(clampDistance(Infinity),0);
});
test('damaged or malicious storage is bounded and exports exact metre positions',()=>{
 for(const bad of ['broken','null','{}','[null,3,{}]'])assert.deepEqual(parseNotes(bad),[]);
 const notes=parseNotes(JSON.stringify([{id:'a',at:1490,text:'<img onerror=evil()> 山坡太陡'},{id:'b',at:-1,text:'bad'},{id:'c',at:Infinity,text:'bad'},{id:'d',at:200,text:' '} ]));
 assert.equal(notes.length,1);assert.equal(notes[0].at,1490);assert.ok(notes[0].text.includes('<img'));
 const exported=JSON.parse(notesExport(notes));assert.equal(exported.notes[0].km,'1.490');assert.equal(exported.notes[0].place,'午后小村');assert.equal(exported.units,'metres');
});
