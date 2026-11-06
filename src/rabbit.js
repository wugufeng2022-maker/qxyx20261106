import * as THREE from 'three';
export const RABBIT_BASKET={center:[.315,-.015,0],halfSize:[.13,.11],floor:.8702};
const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const gesture=(t,start,rise,hold,fall)=>ease((t-start)/rise)*(1-ease((t-start-rise-hold)/fall));
// Original procedural home rabbit; no imported or generated third-party assets.
export function createRabbit(parent,{basket=false}={}){
 const root=new THREE.Group();root.name=basket?'Rabbit basket cushion':'Home rabbit resting place';parent.add(root);
 const fur=new THREE.MeshStandardMaterial({color:'#e9dcc6',roughness:1}),cream=new THREE.MeshStandardMaterial({color:'#f5ebd7',roughness:1}),pink=new THREE.MeshStandardMaterial({color:'#d1aca1',roughness:1}),eye=new THREE.MeshStandardMaterial({color:'#514b43',roughness:.8}),cloth=new THREE.MeshStandardMaterial({color:'#aebbb0',roughness:1});
 function oval(name,pos,scale,material,group){const m=new THREE.Mesh(new THREE.SphereGeometry(1,16,10),material);m.name=name;m.position.set(...pos);m.scale.set(...scale);m.castShadow=true;group.add(m);return m;}
 const cushion=oval('Sage linen cushion',[0,.014,0],[.132,.025,.108],cloth,root);
 const bunny=new THREE.Group();bunny.name='Domestic rabbit';bunny.scale.setScalar(1);bunny.position.y=.020;root.add(bunny);if(basket)bunny.rotation.y=Math.PI;
 oval('Soft rabbit body',[-.015,.103,0],[.094,.091,.080],fur,bunny);
 oval('Rabbit chest',[.058,.126,0],[.059,.066,.061],cream,bunny);
 const head=new THREE.Group();head.position.set(.045,.228,0);bunny.add(head);
 oval('Round rabbit head',[0,0,0],[.065,.064,.060],fur,head);
 oval('Velvet muzzle',[.043,-.023,0],[.025,.024,.035],cream,head);
 oval('Small nose',[.070,-.010,0],[.007,.006,.009],pink,head);
 const eyes=[],ears=[];
 for(const side of [-1,1]){
  const pupil=oval('Rabbit eye',[.052,.014,side*.037],[.009,.012,.008],eye,head);
  const glint=oval('Eye glint',[.059,.018,side*.040],[.0025,.003,.0025],cream,head);eyes.push({pupil,glint});
  const ear=oval('Soft upright ear',[-.012,.085,side*.028],[.018,.064,.022],fur,head);ear.rotation.x=side*.18;ear.rotation.z=.10;
  const inner=oval('Blush ear lining',[-.001,.087,side*.029],[.006,.046,.012],pink,head);inner.rotation.x=side*.18;
  ears.push({ear,inner,side});
  oval('Resting hind paw',[-.050,.043,side*.059],[.045,.025,.029],cream,bunny);
  oval('Resting front paw',[.064,.042,side*.033],[.032,.020,.021],cream,bunny);
 }
 oval('Cotton tail',[-.101,.115,0],[.023,.026,.023],cream,bunny);
 if(basket)root.position.set(...RABBIT_BASKET.center);
 let lastTime;
 return {root,bunny,cushion,head,update(time,speed=0){
  if(time===lastTime)return;lastTime=time;
  const t=((time%19)+19)%19,look=gesture(t,2.2,.9,1.8,1.2)-gesture(t,11,.9,2,1.1);
  head.rotation.z=Math.sin(time*1.2)*.012;head.rotation.y=.18*look;
  const bt=((time%11.7)+11.7)%11.7,blink=Math.max(gesture(bt,2.1,.12,.04,.20),gesture(bt,7.8,.15,.04,.22));
  for(const {pupil,glint} of eyes){pupil.scale.y=.012*(1-.94*blink);glint.visible=blink<.45;}
  const wind=THREE.MathUtils.clamp(speed/7,0,1);
  for(const {ear,inner,side} of ears){
   const twitch=.065*gesture(t,side<0?5.1:5.6,.12,.06,.4);
   const bend=.10*wind+Math.sin(time*2.7+side*.7)*.025*wind+twitch;
   ear.rotation.x=side*(.18+bend);inner.rotation.x=ear.rotation.x;
   ear.rotation.z=.10+.055*wind+Math.sin(time*2.1)*.012*wind;inner.rotation.z=ear.rotation.z;
  }
  bunny.scale.y=(1+Math.sin(time*1.9)*.012);root.rotation.x=Math.sin(time*2.5)*.006*Math.min(speed/5,1);
 }};
}
