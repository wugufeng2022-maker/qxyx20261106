import {START_COURTYARD} from './start-courtyard.js';
import {tunnelCameraOffset,tunnelProfile} from './flower-tunnel.js';
import {createGrassTumble,updateGrassTumble,tumbleLocked,requestGetUp,safeGrassAt,applyGrassPose} from './grass-tumble.js';
import {createRegionalLife,swimmingDuckPose} from './regional-scenery.js';
import {canWatchPond,pondSightline} from './pond-stop.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import './style.css';
import './ride-hud.css';
import { createDuckEvent, updateDuckEvent, canChooseDuckWait, chooseDuckWait, leaveDuckWait, duckSurface, DUCK_CROSSING, DUCK_WAIT_FROM } from './duck-event.js';
import {createEncounterDirector,updateEncounterDirector} from './encounter-director.js';
import {createArtistEvent,createArtist,updateArtist,inviteArtist,leaveArtist,canInviteArtist} from './artist.js';
import {createPaintingWorld,paintingWeight,choosePainting,wantsPainting} from './painting.js';
import {applyStarrySky,canEnterStarry,createStarryEvent,createStarryPainter,createStarryWorld,enterStarry,leaveStarry,skipStarry,STARRY,STARRY_LIGHT,starryBend,starryRoadFrame,starryView,updateStarry} from './starry-village.js';
import {loadJourney,remember,unlockPainting,MEMORY_LABELS} from './journey.js';
import {createRabbitEvent,inviteRabbit,updateRabbitEvent,createRabbitHome,RABBIT_HOME} from './rabbit-event.js';
import {createRabbit} from './rabbit.js';
import {createAnimalSeatRigs,seatOccupant} from './animal-seats.js';
import {animalHolding,leaveAnimal} from './animal-interaction.js';
import {createAnimalSceneInteraction} from './animal-scene-interaction.js';
import {createCatEvent,updateCatEvent,inviteCat,canInviteCat,createCatHome,CAT_HOME} from './cat-event.js';
import {createWalkerEvent,createWalker,updateWalker,canInviteWalker,inviteWalkerWithWalking,releaseWalkerWalking,requestWalking,leaveWalker,WALKER} from './companions.js';
import { createDucks } from './ducks.js';
import { updateWildlife } from './wildlife.js';
import { createMusic } from './music.js';
import { createWindAudio } from './wind-audio.js';
import { centerAt, heightAt, groundAt, slopeAt, tangentAt, CHUNK_LENGTH, ROUTE_LENGTH, OPENING_AVENUES, LONG_HILL, updateRide, brakeRate, avenueShade, openingSideView, climbGrove, summitVista, roadSurface, roadRelief, landscapeAt } from './route.js';
import { createChunk, disposeChunk, makeSky, setPaintingScenery } from './scenery.js';
import { updateWaterside } from './creek.js';
import { CLEAR_LAKE, FOREST_RIDE, clearLakeViewWeight, creeksideWeight, forestGladeAt, forestGoldAt, forestRideWeight, roadHalfWidthAt } from './route.js';
import { createRider } from './rider.js';
import {createPassingRide,createPassingRiders,updatePassingRide,passingViewWeight} from './passing-riders.js';
import {translateRideCamera} from './camera-follow.js';
import {mountRouteMap} from './route-map.js';
import {mountTiltSteering} from './tilt-steering.js';
import { loadVegetation, updateVegetation, setPaintingVegetation } from './vegetation.js';

const $ = id => document.getElementById(id);
let preview={at:0,painting:false,natural:false,rabbit:false,cat:false,starry:false};
let previewModule;
const routeParams=new URLSearchParams(location.search);
const rideEntry={
  creek:{at:5280,label:'出发，去溪边骑一段 →'},
  lake:{at:CLEAR_LAKE.rideStart,label:'出发，去清湖边骑一段 →'},
  forest:{at:FOREST_RIDE.rideStart,label:'出发，去森林里骑一段 →'},
  starry:{at:STARRY.promptStart+8,label:'出发，去麦野看画 →'},
};
const ride=routeParams.get('ride');
const entry=Object.hasOwn(rideEntry,ride)?rideEntry[ride]:null;
const previewLake=import.meta.env.DEV&&routeParams.has('previewLake');
if(import.meta.env.DEV){previewModule=await import('./dev-preview.js');preview=previewModule.readPreview(location.search);}
function storageUnavailable(){$('memory-storage-status').textContent='暂时无法保存 · 本次旅程仍会记得';}
const memoryStorage={getItem(key){try{return localStorage.getItem(key);}catch(e){storageUnavailable();throw e;}},setItem(key,value){try{localStorage.setItem(key,value);}catch(e){storageUnavailable();throw e;}}};
const journey=loadJourney(memoryStorage);
const paintingPreference={choice:'off',invitation:false};let paintBlend=0;try{if(localStorage.getItem('meadow-painting-choice')==='impressionist'&&journey.themes.impressionist)paintingPreference.choice='impressionist';}catch{}
$('painting-options').hidden=!journey.themes.impressionist;$('painting-select').value=paintingPreference.choice;
$('painting-select').addEventListener('change',()=>{choosePainting(paintingPreference,$('painting-select').value);try{localStorage.setItem('meadow-painting-choice',paintingPreference.choice);}catch{}});
if(import.meta.env.DEV&&new URLSearchParams(location.search).has('previewMemories'))for(const key of Object.keys(MEMORY_LABELS))journey.memories[key]=true;
function refreshMemories(){const entries=Object.keys(MEMORY_LABELS).filter(k=>journey.memories[k]);$('memory-list').textContent=entries.length?entries.map(k=>MEMORY_LABELS[k]).join('\n'):'相遇会留在这本小册子里。';}
refreshMemories();
const music=createMusic($('background-music'),$('music'));
const state = { started: false, paused: false, auto: true, speed: 0, distance: entry?.at??0, lane: 0, turn: 0, view: 0, walking:false, walkRequested:false, rideMode:'leisure', fastRequested:false, pointerSteer:0, pondWatching:false };
// Preview selection is transient and never changes saved theme preferences.
if(import.meta.env.DEV&&(!entry||routeParams.has('previewAt'))){state.distance=preview.at;paintBlend=preview.painting?1:0;}
let soundEnabled = true;
try { soundEnabled = localStorage.getItem('meadow-sound') !== 'off'; } catch {}
const windAudio = createWindAudio(({enabled,state:audioState}) => {
  $('sound').dataset.audioState = audioState;
  $('sound').setAttribute('aria-pressed', String(enabled));
  $('sound').textContent = audioState === 'unavailable' ? '声音重试' : enabled ? '自然声 · 开' : '自然声 · 关';
});
if (!soundEnabled) windAudio.setEnabled(false);
const tumble=createGrassTumble();
let comfortContext,comfortBuffer,comfortSource,comfortPlayed=false;
async function unlockComfort(){
 try{
  comfortContext ||= new (window.AudioContext||window.webkitAudioContext)();
  await comfortContext.resume();
  if(!comfortBuffer)comfortBuffer=await comfortContext.decodeAudioData(await (await fetch(new URL('../assets/audio/fall-comfort.mp3',import.meta.url))).arrayBuffer());
 }catch{/* The subtitle remains complete if audio is unavailable. */}
}
function stopComfort(){if(comfortSource){try{comfortSource.stop();}catch{}comfortSource=null;}}
function playComfort(){
 if(comfortPlayed||!soundEnabled||!comfortBuffer||comfortContext?.state!=='running')return;
 comfortPlayed=true;
 const source=comfortContext.createBufferSource(),gain=comfortContext.createGain();
 source.buffer=comfortBuffer;gain.gain.value=.36;source.connect(gain);gain.connect(comfortContext.destination);source.start();comfortSource=source;
}
const keys = new Set();
function clearRideInput(){keys.clear();state.pointerSteer=0;state.tiltSteer=0;tiltSteering.interrupt();}
let routeMapOpen=false,tiltPanelWasPaused=false;
const tiltSteering=mountTiltSteering({
  getBlocked:()=>tumbleLocked(tumble)||!state.started||state.paused||document.hidden||routeMapOpen||!!animalDialogEntry||animalHolding(rabbitEvent)||animalHolding(catEvent)||duckEvent.waiting||state.pondWatching,
  onOpen(){tiltPanelWasPaused=state.paused;pause(true);$('pause-layer').hidden=true;},
  onClose(){pause(tiltPanelWasPaused||document.hidden);},
});
const routeMap=mountRouteMap({
  getState:()=>state,
  onOpen(){routeMapOpen=true;keys.clear();state.pointerSteer=0;pause(true);$('pause-layer').hidden=true;},
  onClose(wasPaused){routeMapOpen=false;pause(wasPaused||document.hidden);},
});
if(import.meta.env.DEV)previewModule.mountPreviewPanel({preview,onInteract(){keys.clear();state.pointerSteer=0;}});
const scene = new THREE.Scene();scene.background = new THREE.Color('#dce7d0');scene.fog = new THREE.Fog('#dce7d0', 65, 220);
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas: $('world'), antialias: true, powerPreference: 'high-performance' });
} catch (error) {
  $('load-status').textContent = '浏览器暂时无法启用 3D 画面，请开启硬件加速后刷新。';document.body.classList.add('error');throw error;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
renderer.shadowMap.enabled = true;renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;renderer.toneMappingExposure = .98;
const pmrem = new THREE.PMREMGenerator(renderer);
const environment = new RoomEnvironment();
environment.position.y = 0; // Keep the original height of the lighting rig.
const envTarget = pmrem.fromScene(environment, .04);scene.environment = envTarget.texture;scene.environmentIntensity = .38;
environment.dispose();pmrem.dispose();
const ambientLight = new THREE.HemisphereLight('#fff2d4', '#829363', 2.1);scene.add(ambientLight);
const starryBackground=new THREE.Color(STARRY_LIGHT.background),starryAmbient=new THREE.Color(STARRY_LIGHT.ambient),starryGround=new THREE.Color(STARRY_LIGHT.ground),starryMoonColor=new THREE.Color(STARRY_LIGHT.moon),starryMoon=new THREE.Vector3(),starryAhead=new THREE.Vector3();
const sun = new THREE.DirectionalLight('#fff0ce', 3);sun.position.set(-30, 45, -25);sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);sun.shadow.camera.left = -24;sun.shadow.camera.right = 24;sun.shadow.camera.top = 24;sun.shadow.camera.bottom = -24;sun.shadow.camera.near = 1;sun.shadow.camera.far = 130;sun.shadow.normalBias = .035;sun.shadow.bias = -.0001;
scene.add(sun, sun.target);
const duckEvent=createDuckEvent(),ducks=createDucks(scene);
const walkerEvent=createWalkerEvent(),walker=createWalker(scene);
const rabbitEvent=createRabbitEvent(),rabbitHome=createRabbitHome(scene);
const catEvent=createCatEvent(),catHome=createCatHome(scene);
const paintingWorld=createPaintingWorld(scene),artistEvent=createArtistEvent();
const starryEvent=createStarryEvent(),starryWorld=createStarryWorld(scene);
let artist,starryPainter;
if(import.meta.env.DEV&&preview.starry)Object.assign(starryEvent,{status:'active',entered:true,entryAt:Math.max(STARRY.sight,state.distance-150),attention:true});
const director=createEncounterDirector();let mainEncounter=null;
if(import.meta.env.DEV&&new URLSearchParams(location.search).has('previewArtistEnd'))Object.assign(artistEvent,{status:'active',pose:0,s:1206,speed:2});
if(import.meta.env.DEV){const at=Number(new URLSearchParams(location.search).get('previewWalkerAt'));if(at>=WALKER.start&&at<=WALKER.end)walkerEvent.s=at;}
const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, .1, 1100);
function resizeScene(){
  const canvas=$('world'),width=canvas.clientWidth,height=canvas.clientHeight;
  if(!width||!height)return;
  renderer.setSize(width,height,false);
  camera.aspect=width/height;
  camera.updateProjectionMatrix();
}
resizeScene();
new ResizeObserver(resizeScene).observe($('world'));
const sky = makeSky(scene), chunks = new Map();
const regionalLife=createRegionalLife(scene);
const passingRide=createPassingRide();
let passingRiders;
function updateChunks() {
  const current = Math.floor(state.distance / CHUNK_LENGTH);
  for (const [index, chunk] of chunks) if (index < current - 1 || index > current + 4) { scene.remove(chunk);disposeChunk(chunk);chunks.delete(index); }
  for (let index = current - 1; index <= current + 4; index++) if (!chunks.has(index)) { const chunk = createChunk(index);chunks.set(index, chunk);scene.add(chunk); }
}
const vehicle = new THREE.Group();vehicle.name = 'Ride';scene.add(vehicle);
let model, wheels, crank, pedals, steering, rider, animalSeatRigs,bicycleStand;
let wheelAngle = 0, crankAngle = 0, elapsed = 0, walkBlend=0, walkPhase=0;
const bikeURL = new URL('../assets/bicycle/meadow-bicycle.glb', import.meta.url).href;
Promise.all([new GLTFLoader().loadAsync(bikeURL), loadVegetation()]).then(([gltf]) => {
  updateChunks();paintingWorld.plantTrees();
  model = gltf.scene;artist=createArtist(scene,model.clone(true));starryPainter=createStarryPainter(scene,model.clone(true));passingRiders=createPassingRiders(scene,model);vehicle.add(model);
  model.traverse(o => { if (o.isMesh) { o.castShadow = true;o.receiveShadow = true;if (o.material) o.material.envMapIntensity = .45; } });
  wheels = ['Wheel_Rear', 'Wheel_Front'].map(n => model.getObjectByName(n));
  crank = model.getObjectByName('Crank');pedals = ['Pedal_Left', 'Pedal_Right'].map(n => model.getObjectByName(n));steering = model.getObjectByName('Steering');
  if ([...wheels, crank, ...pedals, steering].some(n => !n)) throw new Error('自行车缺少运动节点');
  rider = createRider(model);rider.update(0);
  bicycleStand=new THREE.Mesh(new THREE.CylinderGeometry(.016,.022,.58,7),new THREE.MeshStandardMaterial({color:'#7b806e',roughness:.9}));
  bicycleStand.name='Grass rest bicycle support';bicycleStand.position.set(-.24,.23,.25);bicycleStand.rotation.x=.38;bicycleStand.visible=false;model.add(bicycleStand);
  animalSeatRigs=createAnimalSeatRigs(model,steering);
  $('start').disabled = false;$('start').textContent = entry?.label??'出发，去吹吹风 →';
  $('world').dataset.modelLoaded = 'true';
}).catch(error => {
  console.error(error);document.body.classList.add('error');$('load-status').textContent = '场景加载失败，请刷新页面再试。';$('start').textContent = '刷新重试';$('start').disabled = false;$('start').onclick = () => location.reload();
});

function start() {
  if (!model) return;
  if (soundEnabled) void windAudio.unlock();
  void music.resume();
  if(soundEnabled)void unlockComfort();
  state.started = true;$('welcome').hidden = true;$('ride-ui').hidden = false;state.speed = 1.2;
  $('ride-tools').append(document.querySelector('.route-map-toggle'));
  if(import.meta.env.DEV)$('ride-tools').append($('dev-preview'));
  document.body.classList.add('ride-started');
  resizeScene();
}
function pause(value = !state.paused) {
  if (!state.started) return;
  const resumeHadFocus=document.activeElement===$('resume');
  tiltSteering.interrupt();state.pointerSteer=0;state.paused = value;
  $('ride-bottom').classList.toggle('ride-paused',value);
  $('ride-actions').inert=value;
  if(value)stopComfort();else if(soundEnabled)void unlockComfort();$('pause-layer').hidden = !value;keys.clear();
  if(value)music.pause(document.hidden);else void music.resume();
  if (value) { windAudio.silence();$('resume').focus(); }
  else {
    if(resumeHadFocus)$('pause').focus({preventScroll:true});
    if(soundEnabled)void windAudio.unlock();
  }
}
$('artist-invite').addEventListener('click',()=>{if(!state.paused&&mainEncounter==='artist'&&inviteArtist(artistEvent,state.distance,state.speed)){paintingPreference.invitation=true;requestWalking(state,false);refreshWalkingControl();}});
$('artist-leave').addEventListener('click',()=>{if(!state.paused)leaveArtist(artistEvent);});
$('starry-enter').addEventListener('click',()=>{if(!state.paused&&mainEncounter==='starry')enterStarry(starryEvent,state.distance);});
$('starry-skip').addEventListener('click',()=>{if(!state.paused&&mainEncounter==='starry')skipStarry(starryEvent);});
$('starry-leave').addEventListener('click',()=>{if(!state.paused)leaveStarry(starryEvent,state.distance);});
const animalEntries=[{id:'rabbit',event:rabbitEvent,home:RABBIT_HOME,site:rabbitHome.site,animal:rabbitHome.bunny.bunny},{id:'cat',event:catEvent,home:CAT_HOME,site:catHome.site,animal:catHome.home.cat}];
let animalDialogEntry=null;
const animalSceneInteraction=createAnimalSceneInteraction({canvas:$('world'),camera,scene,state,entries:animalEntries,getOwner:()=>mainEncounter,onStop(){tiltSteering.interrupt();keys.clear();state.pointerSteer=0;}});
for(const seat of ['front','rear'])$('animal-invite-'+seat).addEventListener('click',()=>{
 if(state.paused||!animalDialogEntry)return;
 const {id,event}=animalDialogEntry,events=[rabbitEvent,catEvent];
 if(id==='rabbit')inviteRabbit(event,state.distance,state.speed,seat,events);else inviteCat(event,state.distance,state.speed,seat,events);
});
function closeAnimalDialog(){if(state.paused||!animalDialogEntry)return;leaveAnimal(animalDialogEntry.event);keys.clear();state.pointerSteer=0;}
$('animal-leave').addEventListener('click',closeAnimalDialog);
function refreshAnimalDialog(){
 const entry=animalEntries.find(e=>mainEncounter===e.id&&['talking','boarding'].includes(e.event.status));
 const wasHidden=$('animal-dialog').hidden;
 animalDialogEntry=entry||null;$('animal-dialog').hidden=!entry||!state.started;
 if(!entry)return;
 const isCat=entry.id==='cat',boarding=entry.event.status==='boarding';
 $('animal-title').textContent=isCat?'小院里的小猫':'起点小院的小兔';
 $('animal-message').textContent=boarding?(entry.event.seat==='rear'?'你轻轻把它抱到后座的软垫上。':'你轻轻把它抱进前篮的软垫。'):(isCat?'你轻声说：“一起去吹吹风吗？”\n小猫抬起头，尾尖轻轻动了一下。':'你轻声说：“要不要一起看看前面的路？”\n小兔转了转耳朵，在你身旁停住了脚。');
 for(const seat of ['front','rear']){
  const button=$('animal-invite-'+seat),occupant=seatOccupant([rabbitEvent,catEvent],seat),label=seat==='front'?'前篮':'后座';
  button.textContent=occupant?`${label} · ${occupant===rabbitEvent?'小兔':'小猫'}在坐`:`邀请坐${label}`;button.disabled=!!occupant;button.hidden=boarding;
 }
 $('animal-leave').hidden=boarding;
 if(wasHidden&&!state.paused)($('animal-invite-front').disabled?$('animal-invite-rear').disabled?$('animal-leave'):$('animal-invite-rear'):$('animal-invite-front')).focus({preventScroll:true});
}
function refreshWalkingControl(){$('walk').textContent=state.walkRequested?'重新上车':'下车推行';$('walk').setAttribute('aria-pressed',String(state.walkRequested));}
$('walker-invite').addEventListener('click',()=>{
 if(!state.paused&&mainEncounter==='walker'&&inviteWalkerWithWalking(walkerEvent,state)){
  clearRideInput();
  $('accelerate').setAttribute('aria-pressed','false');
  refreshWalkingControl();
 }
});
$('walker-leave').addEventListener('click',()=>{if(!state.paused){leaveWalker(walkerEvent);releaseWalkerWalking(walkerEvent,state);refreshWalkingControl();}});
$('duck-wait').addEventListener('click',()=>{if(!state.paused&&mainEncounter==='duck')chooseDuckWait(duckEvent,state.distance,state.speed,brakeRate(state));});
$('duck-leave').addEventListener('click',()=>{if(!state.paused)leaveDuckWait(duckEvent);});
$('pond-watch').addEventListener('click',()=>{
  if(!canWatchPond(state))return;
  state.pondWatching=true;
  clearRideInput();
  $('pond-resume').hidden=false;
  $('pond-resume').focus({preventScroll:true});
});
$('pond-resume').addEventListener('click',()=>{if(!state.paused)state.pondWatching=false;});
$('start').addEventListener('click', start);
$('sound').addEventListener('click', () => {
  soundEnabled = $('sound').dataset.audioState === 'unavailable' ? true : !soundEnabled;
  windAudio.setEnabled(soundEnabled);
  if(soundEnabled)void unlockComfort();else stopComfort();
  try { localStorage.setItem('meadow-sound', soundEnabled ? 'on' : 'off'); } catch {}
});
$('get-up').addEventListener('click',()=>{if(!state.paused&&requestGetUp(tumble))clearRideInput();});
$('pause').addEventListener('click', () => pause());$('resume').addEventListener('click', () => pause(false));
function setRideMode(mode){
  if(state.paused||tumbleLocked(tumble))return;
  state.rideMode=mode;state.auto=true;state.fastRequested=false;
  document.querySelectorAll('button[data-ride-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.rideMode===mode)));
  $('accelerate').setAttribute('aria-pressed','false');
}
document.querySelectorAll('button[data-ride-mode]').forEach(b=>b.addEventListener('click',()=>setRideMode(b.dataset.rideMode)));
function toggleAcceleration(){if(!state.started||state.paused||tumbleLocked(tumble))return;state.pondWatching=false;state.fastRequested=!state.fastRequested;$('accelerate').setAttribute('aria-pressed',String(state.fastRequested));if(duckEvent.waiting)leaveDuckWait(duckEvent);}
$('accelerate').addEventListener('click',toggleAcceleration);
$('world').addEventListener('pointermove',e=>{if(e.pointerType==='touch'||!state.started||state.paused||tumbleLocked(tumble))return;const rect=$('world').getBoundingClientRect(),x=(e.clientX-rect.left)/rect.width*2-1;state.pointerSteer=Math.abs(x)<.12?0:Math.sign(x)*(Math.abs(x)-.12)/.88;});
$('world').addEventListener('pointerleave',()=>{state.pointerSteer=0;});
$('walk').addEventListener('click',()=>{if(!state.paused&&!tumbleLocked(tumble)&&!duckEvent.waiting&&!state.pondWatching&&!animalHolding(catEvent)&&!animalHolding(rabbitEvent)){
 if(state.walkRequested)leaveWalker(walkerEvent);
 requestWalking(state,!state.walkRequested);refreshWalkingControl();
}});
$('view').addEventListener('click', () => { if(tumbleLocked(tumble))return;state.view = (state.view + 1) % 3;$('view').title = ['跟随视角', '人物近景', '车把视角'][state.view]; });
const recognized = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd']);
window.addEventListener('keydown', e => {
  if(routeMapOpen||tiltSteering.isOpen())return;
  if(tumbleLocked(tumble)&&!['Escape',' '].includes(e.key)){if(recognized.has(e.key))e.preventDefault();return;}
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if(e.target.closest?.('select,input,textarea'))return;
  if(key===' '&&e.target.closest?.('button,summary'))return;
  if (recognized.has(key) || key === ' ') e.preventDefault();
  if(key==='ArrowUp'||key==='w'){if(!e.repeat)toggleAcceleration();return;}
  if (recognized.has(key)) keys.add(key);
  if(key==='Escape'&&animalDialogEntry&&!state.paused){closeAnimalDialog();return;}
  if ((key === ' ' || key === 'Escape') && !e.repeat) pause();
});
window.addEventListener('keyup', e => keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key));
window.addEventListener('blur', () => { keys.clear();if (state.started) pause(true); });
document.addEventListener('visibilitychange', () => { if (document.hidden && state.started) pause(true); });
document.querySelectorAll('[data-key]').forEach(button => {
  button.addEventListener('pointerdown', e => { e.preventDefault();if(tumbleLocked(tumble)||state.paused)return;button.setPointerCapture(e.pointerId);keys.add(button.dataset.key);if(!state.paused&&button.dataset.key==='ArrowUp'&&duckEvent.waiting)leaveDuckWait(duckEvent); });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(event, () => keys.delete(button.dataset.key));
});

const cameraDesired = new THREE.Vector3(), look = new THREE.Vector3(), lookSmooth = new THREE.Vector3(), previousRidePosition=new THREE.Vector3();
const forward = new THREE.Vector3(), right = new THREE.Vector3();
const duckCamera = new THREE.Vector3(), rideDirection = new THREE.Vector3(), duckDirection = new THREE.Vector3();
const duckTurn = new THREE.Quaternion(), straight = new THREE.Quaternion();
const audioForward=new THREE.Vector3(),audioUp=new THREE.Vector3();
let last = performance.now(), firstFrame = true, hudTick = 0, lastChunk = 0, duckWatchBlend = 0, watchingPondLens = false;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, .05);last = now;
  // Only the explicit encounter choice adds braking; ordinary riding inputs are untouched.
  const rideKeys=state.pondWatching||duckEvent.waiting||animalHolding(rabbitEvent)||animalHolding(catEvent)?new Set([...keys,'ArrowDown']):keys;
  const tilt=tiltSteering.update();state.tiltEnabled=tilt.enabled;state.tiltSteer=tilt.value;
  state.walkBlend=walkBlend;
  const starryRiding=starryEvent.status==='active'||starryEvent.status==='departing';
  const attention=mainEncounter&&mainEncounter!=='walker'&&!(mainEncounter==='starry'&&starryRiding);
  state.weaveSafe=!attention&&!['active','joining'].includes(artistEvent.status)&&walkerEvent.status!=='active'&&!(state.distance>922&&state.distance<1000)&&!(state.distance>CAT_HOME-76&&state.distance<CAT_HOME+22);
  $('world').dataset.rideMode=state.rideMode;$('world').dataset.fastRequested=String(state.fastRequested);$('world').dataset.lane=state.lane.toFixed(3);
  const fallBlocked=(!!mainEncounter&&!(mainEncounter==='starry'&&starryRiding))||animalHolding(rabbitEvent)||animalHolding(catEvent)||['joining','active'].includes(artistEvent.status)||walkerEvent.status==='active';
  state.shoulderAllowed=!fallBlocked&&safeGrassAt(state.distance,state.lane)&&safeGrassAt(state.distance+28,state.lane);
  const previousTumblePhase=tumble.phase;
  updateGrassTumble(tumble,state,dt,{blocked:fallBlocked});
  if(tumble.phase!==previousTumblePhase&&tumbleLocked(tumble))clearRideInput();
  if(tumble.phase==='tipping'&&previousTumblePhase!=='tipping'){comfortPlayed=false;$('accelerate').setAttribute('aria-pressed','false');}
  if(tumble.phase==='resting'&&previousTumblePhase!=='resting')playComfort();
  if(tumble.phase==='gettingUp')stopComfort();
  const locked=tumbleLocked(tumble);
  $('grass-rest').hidden=tumble.phase!=='resting';
  $('get-up').disabled=state.paused;
  for(const id of ['accelerate','walk','view'])$(id).disabled=locked;
  $('walk').disabled=locked||state.pondWatching||duckEvent.waiting||animalHolding(catEvent)||animalHolding(rabbitEvent);
  document.querySelectorAll('[data-ride-mode],[data-key]').forEach(b=>b.disabled=locked);
  $('world').dataset.tumblePhase=tumble.phase;$('world').dataset.tumbleBlend=tumble.blend.toFixed(3);
  $('world').dataset.shoulderAllowed=String(state.shoulderAllowed);
  const traveled = updateRide(state, rideKeys, dt);
  const pondStopAvailable=canWatchPond(state.paused?{...state,paused:false}:state);
  $('pond-lookout').hidden=!pondStopAvailable&&!state.pondWatching;
  $('pond-watch').hidden=!pondStopAvailable;
  $('pond-resume').hidden=!state.pondWatching;
  if(import.meta.env.DEV)$('world').dataset.pondWatching=String(state.pondWatching);
  const encounterState=locked?{...state,paused:true}:state;
  updateDuckEvent(duckEvent,{...encounterState,dt});
  updateWalker(walkerEvent,{...encounterState,dt});
  if(releaseWalkerWalking(walkerEvent,state))refreshWalkingControl();
  // Advance independent lives first; schedule only one invitation/major encounter.
  updateArtist(artistEvent,{...encounterState,dt});if(artist)artist.update(artistEvent,elapsed);
  updateStarry(starryEvent,{...encounterState,dt});
  updateCatEvent(catEvent,{...encounterState,dt});catHome.update(catEvent,elapsed);
  if(!locked)mainEncounter=updateEncounterDirector(director,{walker:walkerEvent,duck:duckEvent,artist:artistEvent,rabbit:rabbitEvent,cat:catEvent,starry:starryEvent},state);
  $('world').dataset.mainEncounter=mainEncounter||'none';
  $('artist-encounter').hidden=mainEncounter!=='artist'||!state.started||(!['available','joining','active'].includes(artistEvent.status)&&!(artistEvent.status==='arrived'&&artistEvent.time<4&&Math.abs(state.distance-artistEvent.s)<24));
  $('artist-invite').hidden=!canInviteArtist(artistEvent,state.distance,state.speed);
  $('artist-leave').hidden=!['joining','active'].includes(artistEvent.status);
  $('artist-message').textContent=artistEvent.status==='arrived'?'我在这里再画一会儿。回头见。':artistEvent.status==='available'?'湖边画家收起画笔，想沿水边骑一小段。':'湖光在前面，你可以随时独自往前。';
  $('world').dataset.artistState=artistEvent.status;$('world').dataset.artistGap=(artistEvent.lane-state.lane).toFixed(2);
  const starryChoosing=mainEncounter==='starry'&&starryEvent.status==='available';
  const starryGoodbye=mainEncounter==='starry'&&starryEvent.status==='farewell';
  $('starry-encounter').hidden=!state.started||!(starryChoosing||starryRiding||starryGoodbye);
  $('starry-enter').hidden=!starryChoosing||!canEnterStarry(starryEvent,state.distance);
  $('starry-skip').hidden=!starryChoosing;
  $('starry-leave').hidden=starryEvent.status!=='active';
  $('starry-message').textContent=starryEvent.status==='farewell'?'画家在前面的写生点收笔，向你点了点头。':starryEvent.status==='departing'?'色彩退开了，麦野还在。':starryEvent.status==='active'?'脚下还是这条路。想出来的话，随时可以。':'路边的画家支着画架。画里是一条奶白色的弯路。';
  $('world').dataset.starryState=starryEvent.status;
  updateRabbitEvent(rabbitEvent,{...encounterState,dt});rabbitHome.update(rabbitEvent,elapsed);
  refreshAnimalDialog();
  $('world').dataset.rabbitState=rabbitEvent.status;$('world').dataset.catState=catEvent.status;$('world').dataset.rabbitSeat=rabbitEvent.seat||'none';$('world').dataset.catSeat=catEvent.seat||'none';
  let memoryChanged=false;
  if(catEvent.status==='active')memoryChanged=remember(journey,'cat',memoryStorage)||memoryChanged;
  if(rabbitEvent.status==='active')memoryChanged=remember(journey,'rabbit',memoryStorage)||memoryChanged;
  if(walkerEvent.status==='arrived'&&walkerEvent.accompanied)memoryChanged=remember(journey,'walker',memoryStorage)||memoryChanged;
  if(duckEvent.status==='complete'&&duckEvent.witnessed)memoryChanged=remember(journey,'ducks',memoryStorage)||memoryChanged;
  if(artistEvent.status==='arrived'){memoryChanged=remember(journey,'artist',memoryStorage)||memoryChanged;if(unlockPainting(journey,memoryStorage)){paintingPreference.choice='impressionist';$('painting-options').hidden=false;$('painting-select').value=paintingPreference.choice;try{localStorage.setItem('meadow-painting-choice',paintingPreference.choice);}catch{}}}
  if(starryEvent.journal)memoryChanged=remember(journey,'starry',memoryStorage)||memoryChanged;
  if(memoryChanged)refreshMemories();
  scene.userData.playerS=state.distance;walker.update(walkerEvent,elapsed);
  $('walker-encounter').hidden=mainEncounter!=='walker'||!state.started||!['available','active'].includes(walkerEvent.status)&&!(walkerEvent.status==='arrived'&&walkerEvent.accompanied&&walkerEvent.arrivalTime<5&&Math.abs(state.distance-walkerEvent.s)<25);
  $('walker-message').textContent=walkerEvent.status==='arrived'?'我到啦，在这儿坐一会儿。下回见。':walkerEvent.status==='active'?'我去前面树下坐坐。咱们慢慢走。':'邻居沿着果园小径散步。';
  $('walker-invite').hidden=!canInviteWalker(walkerEvent,state);$('walker-leave').hidden=walkerEvent.status!=='active';
  $('world').dataset.walkerState=walkerEvent.status;$('world').dataset.walkerS=walkerEvent.s.toFixed(2);
  if(!state.paused&&!locked)ducks.update(duckEvent,state.distance,dt);
  const encounter=$('duck-encounter');
  encounter.hidden=mainEncounter!=='duck'||!state.started||!['available','active'].includes(duckEvent.status)||state.distance>DUCK_CROSSING+5;
  $('duck-wait').hidden=!canChooseDuckWait(duckEvent,state.distance,state.speed,brakeRate(state));
  $('duck-leave').hidden=!duckEvent.waiting;
  $('duck-leave').disabled=duckEvent.resumeRequested;
  $('duck-leave').textContent=duckEvent.resumeRequested?'等最后一只走过…':'继续骑行 →';
  $('duck-message').textContent=duckEvent.waiting?(duckEvent.resumeRequested?'等路上的小鸭走到草边。':duckEvent.yielding?'鸭妈妈在路边张望。':'一家四口，慢慢走向湖水。'):state.distance<DUCK_WAIT_FROM?'留意左边草地，鸭妈妈带着小鸭过来了。':'鸭群在草边等着，可以停看，也可以慢慢经过。';
  $('world').dataset.duckState=duckEvent.status;
  $('world').dataset.duckWaiting=String(duckEvent.waiting);
  $('world').dataset.duckWitnessed=String(duckEvent.witnessed);
  $('world').dataset.duckYielding=String(duckEvent.yielding);
  $('world').dataset.duckResumeRequested=String(duckEvent.resumeRequested);
  $('world').dataset.duckPositions=duckEvent.positions.map(v=>v.toFixed(2)).join(',');
  if(import.meta.env.DEV){
    const samples=frame.samples||(frame.samples=[]);samples.push((now-frame.previous)||0);frame.previous=now;
    if(samples.length>120)samples.shift();
    $('world').dataset.meanFrameMs=(samples.reduce((a,b)=>a+b,0)/samples.length).toFixed(2);
    $('world').dataset.frameCount=String((frame.count=(frame.count||0)+1));
  }
  if (!state.paused) elapsed += dt;
  updateVegetation(elapsed);
  updateWaterside(elapsed);
  regionalLife.update(elapsed,state.distance,chunks.values());
  const viewportAspect=innerWidth/innerHeight;
  const s = state.distance, roadX = centerAt(s), y = heightAt(s);
  updatePassingRide(passingRide,{...state,dt});
  if(!state.paused)passingRiders?.update(passingRide,s,elapsed);
  if(import.meta.env.DEV)$('world').dataset.passingRide=passingRide.stations.map(at=>at.toFixed(2)).join(',');
  const forest=forestRideWeight(s);
  const glade=forest*forestGladeAt(s);
  const gold=forest*forestGoldAt(s);
  const forestShade=forest-glade*.75;
  const treeShade = Math.max(avenueShade(s),climbGrove(s)*.43,forestShade*.84);
  const lakeLook=clearLakeViewWeight(s);
  const crestLight=summitVista(s),pondLook=pondSightline(s),creekLook=Math.max(creeksideWeight(s),lakeLook*.89),grade=slopeAt(s);
  const creekPan=creekLook*Math.min(1,.60+viewportAspect*.25);
  const creekPortrait=creekLook*(1-THREE.MathUtils.smoothstep(viewportAspect,.46,.95));
  const orchardLook=THREE.MathUtils.smoothstep(s,WALKER.start-38,WALKER.start-15)*(1-THREE.MathUtils.smoothstep(s,WALKER.end-1,WALKER.end+13));
  const farewellLook=walkerEvent.accompanied?1-THREE.MathUtils.smoothstep(walkerEvent.arrivalTime,1.8,4):0;
  const orchardCompanionLook=viewportAspect<.8?orchardLook*Math.max(walkBlend,farewellLook):0;
  windAudio.update({...state,shelter:treeShade});
  const paintingRequested=(import.meta.env.DEV&&preview.painting)||(!(import.meta.env.DEV&&preview.natural)&&wantsPainting(paintingPreference,artistEvent.status,journey.themes.impressionist));
  if(!state.paused)paintBlend=THREE.MathUtils.damp(paintBlend,paintingRequested?1:0,1.2,dt);
  const paintingAmount=paintingWeight(s)*paintBlend;paintingWorld.update(paintingAmount);setPaintingScenery(paintingAmount);setPaintingVegetation(paintingAmount);
  const starry=starryView(starryEvent,s);
  const landscape=landscapeAt(s),bayLight=landscape.bay||0,valleyLight=landscape.valley||0,tunnel=tunnelProfile(s);
  scene.background.set('#dce7d0').lerp(new THREE.Color('#dce1de'),paintingAmount).lerp(new THREE.Color('#ecdfcd'),bayLight*.65);scene.background.lerp(new THREE.Color('#c9dfe0'),lakeLook*.65).lerp(new THREE.Color('#b3c0ae'),tunnel.shade*.30);
  scene.background.lerp(new THREE.Color('#afc4a9'),forestShade*.72).lerp(new THREE.Color('#e4d3a6'),gold*.28).lerp(starryBackground,starry.distant);
  scene.fog.color.copy(scene.background);
  scene.fog.near=THREE.MathUtils.lerp(65-forestShade*42,THREE.MathUtils.lerp(34,STARRY_LIGHT.fogNear,starry.village),starry.distant);
  scene.fog.far=THREE.MathUtils.lerp(220-forestShade*107,THREE.MathUtils.lerp(STARRY_LIGHT.blueFogFar,STARRY_LIGHT.fogFar,starry.village),starry.distant);
  sky.cloud.material.color.set('#faf5db').lerp(new THREE.Color('#f2dfce'),paintingAmount);
  $('world').dataset.paintingAmount=paintingAmount.toFixed(3);
  $('world').dataset.starryConnect=starry.connect.toFixed(3);$('world').dataset.starryDistant=starry.distant.toFixed(3);$('world').dataset.starryVillage=starry.village.toFixed(3);
  if (model && Math.floor(s / CHUNK_LENGTH) !== lastChunk) { updateChunks();lastChunk = Math.floor(s / CHUNK_LENGTH); }
  forward.set(tangentAt(s), 0, -1).normalize();right.set(-forward.z, 0, forward.x);
  const rideBend=starryBend(s)*starry.village,rideFrame=starryRoadFrame(s,state.lane+rideBend);
  if(starry.village>.001){
    const next=starryRoadFrame(s+2,state.lane+starryBend(s+2)*starry.village);
    starryAhead.set(next.x-rideFrame.x,0,next.z-rideFrame.z);
    if(starryAhead.lengthSq()>1e-8)forward.lerp(starryAhead.normalize(),starry.village).normalize();
    right.set(-forward.z,0,forward.x);
  }
  const frontHeight=roadRelief(s+.52,state.lane),rearHeight=roadRelief(s-.52,state.lane);
  vehicle.position.set(rideFrame.x, y + .025 + (frontHeight+rearHeight)*.5, rideFrame.z);
  starryWorld.update(starry,{x:roadX,y,s},chunks.values());starryPainter?.update(starryEvent,s,starry,elapsed);
  if(Math.abs(state.lane)>roadHalfWidthAt(s))vehicle.position.y=groundAt(vehicle.position.x,-vehicle.position.z)+.025;
  const yaw = Math.atan2(-forward.z, forward.x) - state.turn * .10;
  vehicle.rotation.set(0, yaw, 0);
  if (model) {
    const joyfulLean=state.rideMode==='joyful'&&!state.walking&&!state.walkRequested;
    const lean=joyfulLean?THREE.MathUtils.clamp(-state.turn*.22,-.18,.18):-state.turn*.045;
    const rollTarget=lean+(state.grassSlowing?Math.sin(elapsed*5)*.015:0);
    const roll=state.paused?model.rotation.x:THREE.MathUtils.damp(model.rotation.x,rollTarget,7,dt);
    model.rotation.set(roll, 0, Math.atan(grade+(frontHeight-rearHeight)/1.04));
    const coasting=s>LONG_HILL.crest&&s<LONG_HILL.end&&!state.fastRequested
      ? .9*THREE.MathUtils.smoothstep(-grade,.022,.092)*THREE.MathUtils.smoothstep(state.speed,5,8) : 0;
    wheelAngle -= traveled / .365;crankAngle -= traveled / .365 * .45*(1-walkBlend)*(1-coasting);
    if(!state.paused){walkBlend=THREE.MathUtils.damp(walkBlend,state.walking?1:0,5,dt);walkPhase+=traveled/.62*Math.PI*2;}
    wheels.forEach(w => { w.rotation.z = wheelAngle; });crank.rotation.z = crankAngle;pedals.forEach(p => { p.rotation.z = -crankAngle; });
    steering.rotation.y = -state.turn * .12;
    rider.update(crankAngle, steering.rotation.y, elapsed, state.speed,walkBlend,walkPhase,tumble.blend);
    // The rider has an independent transform; seat rigs remain on the supported bicycle.
    applyGrassPose(rider.root,tumble.blend,tumble.side);
    bicycleStand.visible=locked;
    animalSeatRigs.update({rabbit:rabbitEvent,cat:catEvent},elapsed,state.speed,import.meta.env.DEV?preview:{});
  }
  let sideZoom = 1;
  if (!state.started) {
    vehicle.position.x += .5;
    cameraDesired.set(roadX + 7.9, y + 3.1, -s + 5.5);
    look.set(roadX - 1.3, y + .95, -s - 3);
  } else if (state.view === 0) {
    const pondPullback=viewportAspect<.8?4.3*pondLook+1.8*orchardLook:0;
    cameraDesired.copy(vehicle.position).addScaledVector(forward,-6.1-pondPullback).addScaledVector(right,Math.min(2.5,Math.max(.7,viewportAspect*1.45)));cameraDesired.y += 3.1;
    // Keep the follow lens level relative to the rider so it reveals the grade
    // instead of pitching parallel to the road and visually flattening the hill.
    look.copy(vehicle.position).addScaledVector(forward,5+5*pondLook+2*creekLook).addScaledVector(right,3.4*pondLook-1.25*orchardLook+2.45*creekPan);look.y += .85;
    cameraDesired.y+=.60*pondLook+.40*creekLook;
  } else if (state.view === 1) {
    const normalOffset = tunnelCameraOffset(s,viewportAspect);
    const openingOffset = openingSideView(s,normalOffset);
    const groveOffset=THREE.MathUtils.lerp(openingOffset,Math.min(openingOffset,4.1),climbGrove(s));
    const offset=THREE.MathUtils.lerp(groveOffset,Math.min(groveOffset,2.9),THREE.MathUtils.smoothstep(forest,0,.34));
    sideZoom = Math.hypot(normalOffset,.7,.63)/Math.hypot(offset,.7,.63);
    const villageLook=THREE.MathUtils.smoothstep(s,CAT_HOME-84,CAT_HOME-61)*(1-THREE.MathUtils.smoothstep(s,CAT_HOME-11,CAT_HOME+20));
    const passingLook=passingViewWeight(passingRide,s);
    const narrowFrame=1-THREE.MathUtils.smoothstep(viewportAspect,.70,1.20);
    const creekSideAim=THREE.MathUtils.lerp(creekLook,creekLook**1.5,narrowFrame);
    const forwardLook=Math.max(villageLook,pondLook,.7*crestLight,orchardLook,passingLook,creekSideAim);
    // Pull back before looking down the creek so a narrow frame still includes the cyclist.
    const sidePullback=Math.max(forwardLook,narrowFrame*THREE.MathUtils.smoothstep(creekLook,0,.40));
    const sideOffset=THREE.MathUtils.lerp(offset,Math.min(2.6,Math.max(1.1,viewportAspect*1.8)),sidePullback);
    cameraDesired.copy(vehicle.position).addScaledVector(forward,THREE.MathUtils.lerp(.7,-5.5,sidePullback)).addScaledVector(right,sideOffset);
    cameraDesired.y+=1.65+sidePullback*1.10+.55*pondLook;
    if(viewportAspect<.8)cameraDesired.y=Math.max(cameraDesired.y,groundAt(cameraDesired.x,-cameraDesired.z)+1.2);
    const creekSidePan=2.2*creekPan*THREE.MathUtils.lerp(1,.75*Math.sqrt(creekLook),narrowFrame);
    look.copy(vehicle.position).addScaledVector(forward,7.4*forwardLook)
      .addScaledVector(right,4.8*pondLook-1.4*orchardLook+passingRide.side*1.5*passingLook+creekSidePan);look.y += 1.02;
  } else {
    cameraDesired.copy(vehicle.position).addScaledVector(forward, -.4).addScaledVector(right,-.48*walkBlend);cameraDesired.y += 1.40;
    look.copy(vehicle.position).addScaledVector(forward,15).addScaledVector(right,4.6*pondLook-1.4*orchardLook+3.1*creekPan-1.45*creekPortrait);look.y += 1.12+heightAt(s+15)-y;
    cameraDesired.y+=.20*pondLook;
  }
  if(orchardCompanionLook>0){
    const laneRoom=Math.max(0,state.lane)*farewellLook;
    const pullback=(state.view===2?5.2:state.view===1?2.6:1.4)+laneRoom*1.7;
    cameraDesired.addScaledVector(forward,-pullback*orchardCompanionLook);
    if(state.view===2){
      cameraDesired.addScaledVector(right,-.7*orchardCompanionLook);
      cameraDesired.y+=1.3*orchardCompanionLook;
    }
    look.addScaledVector(right,-(1.7+laneRoom*.48)*orchardCompanionLook);
  }
  const watchingDucks=(duckEvent.waiting||state.pondWatching)&&state.speed<.25;
  if(watchingDucks)watchingPondLens=state.pondWatching;
  const watchRate=watchingDucks?2.3:state.view===1?1.6:3.2;
  if(!state.paused)duckWatchBlend=THREE.MathUtils.damp(duckWatchBlend,watchingDucks?1:0,watchRate,dt);
  if(duckWatchBlend>.001){
    const familyCenter=(duckEvent.positions[0]+duckEvent.positions.at(-1))*.5;
    const ducksAt=watchingPondLens?swimmingDuckPose(elapsed,1.5):duckSurface(familyCenter,duckEvent.swimTime);
    const shoreLook=watchingPondLens?1:THREE.MathUtils.smoothstep(familyCenter,3,11);
    duckCamera.copy(vehicle.position).addScaledVector(forward,-7.2).addScaledVector(right,1.2);
    duckCamera.y+=3.5+shoreLook*2.25;
    rideDirection.subVectors(look,cameraDesired).normalize();
    cameraDesired.lerp(duckCamera,duckWatchBlend);
    duckDirection.set(ducksAt.x,ducksAt.y+.52,-ducksAt.s).sub(cameraDesired).normalize();
    // Blend the angle instead of pulling the gaze toward a more distant point.
    duckTurn.setFromUnitVectors(rideDirection,duckDirection).slerp(straight,1-duckWatchBlend);
    look.copy(cameraDesired).addScaledVector(rideDirection.applyQuaternion(duckTurn),10);
  }
  // Development-only shore inspection; never changes the riding camera or saved preferences.
  if(previewLake){cameraDesired.set(roadX+12,y+9,-s+7);look.set(roadX+39,-1.4,-s-14);}
  if(locked){
    cameraDesired.copy(vehicle.position).addScaledVector(forward,-3.5).addScaledVector(right,tumble.side*5.8*Math.max(1,.8/viewportAspect));cameraDesired.y+=3.4;
    cameraDesired.y=Math.max(cameraDesired.y,groundAt(cameraDesired.x,-cameraDesired.z)+1.2);
    look.copy(vehicle.position).addScaledVector(right,tumble.side*.9);look.y+=.55;
  }
  if (rider) rider.setFirstPerson(state.started && state.view === 2&&!locked&&duckWatchBlend<.42&&orchardCompanionLook<.45);
  const follow = firstFrame ? 1 : 1 - Math.exp(-dt * 5);
  const baseFov = (state.started && state.view === 2&&!locked ? 58 : 48)+Math.max(0,Math.min(2,(state.speed-6)*.6));
  const ridingFov = sideZoom===1 || locked ? baseFov : THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(baseFov*.5))*sideZoom));
  const nearPondFov=watchingPondLens?8*THREE.MathUtils.smoothstep(s,2935,2944):0;
  const watchFov=viewportAspect<.8?53+nearPondFov:49;
  const creekPortraitFov=creekPortrait*(state.view===2?11:5);
  const fieldOfView = THREE.MathUtils.lerp(ridingFov+pondLook*(viewportAspect<.8?13:2)+orchardLook*(viewportAspect<.8?7:2)+5*orchardCompanionLook+creekPortraitFov,watchFov,duckWatchBlend);
  if (Math.abs(camera.fov-fieldOfView)>.001) { camera.fov = fieldOfView;camera.updateProjectionMatrix(); }
  if(firstFrame)previousRidePosition.copy(vehicle.position);
  else translateRideCamera(camera.position,lookSmooth,previousRidePosition,vehicle.position);
  camera.position.lerp(cameraDesired, follow);lookSmooth.lerp(look, follow);camera.lookAt(lookSmooth);firstFrame = false;
  sky.group.position.set(roadX * .4, y*.7, -s);sky.cloud.rotation.y = elapsed * .0005;
  sky.ridgeClouds.material.opacity=Math.max(0,Math.min(1,(s-8080)/150,(9220-s)/150))*.72*(1-starry.distant);
  applyStarrySky(sky,starry.distant);
  sky.ridgeClouds.rotation.y=elapsed*.00012;
  ambientLight.color.set('#fff2d4').lerp(starryAmbient,starry.distant);
  ambientLight.intensity = THREE.MathUtils.lerp(2.1 - treeShade*.65 - landscape.uphill*.28 - valleyLight*.40 - paintingAmount*.40 - tunnel.shade*.68 + crestLight*.11,STARRY_LIGHT.ambientLevel,starry.distant);
  ambientLight.groundColor.set('#829363').lerp(new THREE.Color('#8995b6'),paintingAmount).lerp(starryGround,starry.distant);
  sun.color.set('#fff0ce').lerp(new THREE.Color('#ffe1a6'),paintingAmount).lerp(new THREE.Color('#ffd7aa'),bayLight*.65).lerp(new THREE.Color('#ffd28a'),gold*.57+glade*.18).lerp(starryMoonColor,starry.distant);
  sun.intensity=THREE.MathUtils.lerp((3+paintingAmount*.45)*(1-tunnel.shade*.60)*(1-treeShade*.08)*(1-forestShade*.14+glade*.18+gold*.08),STARRY_LIGHT.sunLevel,starry.distant);
  renderer.toneMappingExposure=THREE.MathUtils.lerp(.98*(1-tunnel.shade*.14),STARRY_LIGHT.exposure,starry.distant);
  if(import.meta.env.DEV){$('world').dataset.tunnelSeason=tunnel.name;$('world').dataset.tunnelShade=tunnel.shade.toFixed(3);}
  sun.position.set(roadX - 30 - gold*6, y + 45 - gold*14, -s - 25 + forest*6*Math.sin(s*.015));sun.target.position.copy(vehicle.position);
  if(starry.distant>0){starryMoon.set(roadX-46,y+64,-s-16);sun.position.lerp(starryMoon,starry.distant);}
  hudTick += dt;
  if (hudTick > .15) {
    routeMap.update(s);
    const avenue = OPENING_AVENUES.find(({start,end})=>s>=start && s<end);
    const place = starry.village>.45?'星夜彩石村':starry.distant>.4?'画里的弯路':s<START_COURTYARD.to ? '起点小院' : lakeLook>.25 ? '清湖岸边' : forest>.30 ? '森林小径' : avenue?.label ?? landscape.label;
    if(import.meta.env.DEV)$('world').dataset.sky=scene.background.getHexString();
    $('place-name').textContent=tumble.phase==='slowing'?'草地松软 · 可以回到小路':s>=ROUTE_LENGTH?'抵达湖湾 · 10 km':place+' · '+(roadSurface(s,state.lane).roughness>.5?'路边碎石':'慢慢骑行');
    $('speed').textContent = Math.round(state.speed * 3.6);$('distance').innerHTML = `${(s / 1000).toFixed(2)} <small>km</small>`;
    $('world').dataset.walking=String(state.walking);$('world').dataset.walkBlend=walkBlend.toFixed(3);
    $('world').dataset.distance = s.toFixed(2);$('world').dataset.speed = state.speed.toFixed(2);$('world').dataset.paused = String(state.paused);$('world').dataset.chunks = chunks.size;
    hudTick = 0;
  }
  camera.getWorldDirection(audioForward);audioUp.set(0,1,0).applyQuaternion(camera.quaternion);
  windAudio.updateScene(camera.position,audioForward,audioUp,[...chunks.values()].flatMap(chunk=>chunk.userData.birdPerches || []),state);
  const wildlife=updateWildlife(chunks.values(),elapsed,camera.position);
  $('world').dataset.birds=wildlife.birds;$('world').dataset.bees=wildlife.bees;
  if(import.meta.env.DEV)$('world').dataset.vergeInsects=String(wildlife.insects);
  animalSceneInteraction.update();
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
