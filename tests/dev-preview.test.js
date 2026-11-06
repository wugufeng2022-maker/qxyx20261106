import {CAT_HOME} from '../src/village-cat-site.js';
import {RABBIT_HOME} from '../src/start-courtyard.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PREVIEW_DESTINATIONS,readPreview,previewURL} from '../src/dev-preview.js';
import {createDuckEvent,updateDuckEvent} from '../src/duck-event.js';
import {createArtistEvent,updateArtist} from '../src/artist.js';
test('preview route uses metres in URLs and bounds kilometre input destinations',()=>{
 assert.deepEqual(PREVIEW_DESTINATIONS.map(d=>d.at),[0,RABBIT_HOME-45,RABBIT_HOME-6,76,170,374,480,548,753,780,917,1123,1209,1274,1362,CAT_HOME-68,CAT_HOME-18,1754,2160,2550,2820,2890,3100,3220,3516,3630,3650,4650,5650,6650,7650,8650,9650]);
 for(const [value,expected] of [['-3',0],['99999',10000],['NaN',0],['',0],['170',170]])assert.equal(readPreview('?previewAt='+value).at,expected);
 const url=new URL(previewURL('http://localhost/?keep=yes&previewMemories=1&previewArtistEnd=1&previewPainting=1',{at:960}));
 assert.equal(url.searchParams.get('previewAt'),'960');assert.equal(url.searchParams.has('previewNatural'),true);
 assert.equal(url.searchParams.has('previewPainting'),false);assert.equal(url.searchParams.has('previewArtistEnd'),false);assert.equal(url.searchParams.has('previewMemories'),false);assert.equal(url.searchParams.get('keep'),'yes');
});
test('painting and rabbit previews are explicit temporary URL choices',()=>{
 const art=readPreview(new URL(previewURL('http://localhost/',{at:1123,painting:true,rabbit:true})).search);
 assert.deepEqual(art,{at:1123,painting:true,natural:false,rabbit:true,cat:false});
 assert.deepEqual(readPreview(''),{at:0,painting:false,natural:false,rabbit:false,cat:false});
});
test('jumping past encounters skips them without pretending they completed',()=>{
 const duck=createDuckEvent(),artist=createArtistEvent();
 for(let i=0;i<60;i++){const state={started:true,paused:false,distance:1450,speed:0,lane:0,dt:1/60};updateDuckEvent(duck,state);updateArtist(artist,state);}
 assert.equal(duck.status,'skipped');assert.equal(artist.status,'skipped');
});
