import * as THREE from 'three';
import {duckSurface, duckGroundAt, DUCK_CROSSING} from './duck-event.js';
import {LAKE} from './route.js';
const geometry=new THREE.SphereGeometry(1,16,10);
const material=c=>new THREE.MeshStandardMaterial({color:c,roughness:.92});
const cream=material('#d8c9a5'),brown=material('#99836b'),wing=material('#b7a181'),gold=material('#deb45d'),eye=material('#3c4237'),fluff=material('#eadb9d');
function oval(g,m,p,s){const o=new THREE.Mesh(geometry,m);o.position.set(...p);o.scale.set(...s);o.castShadow=true;g.add(o);return o;}
export function createDuckModel(small){
  const g=new THREE.Group();g.name=small?'Lake duckling':'Lake mother duck';
  const body=new THREE.Group(),head=new THREE.Group();g.add(body);body.add(head);
  head.position.set(0,.45,.16);
  const feather=small?fluff:cream;
  oval(body,feather,[0,.36,0],[.29,.30,.43]);
  oval(head,small?fluff:brown,[0,.20,.11],[.21,.23,.22]);
  oval(head,gold,[0,.15,.34],[.14,.045,.16]);
  oval(body,feather,[0,.42,-.39],[.14,.09,.18]);
  for(const side of [-1,1]){
    oval(body,small?fluff:wing,[side*.25,.39,-.03],[.07,.17,.29]);
    oval(head,eye,[side*.179,.25,.21],[.027,.029,.025]);
    oval(head,cream,[side*.19,.262,.225],[.007,.009,.008]);
  }
  const feet=[-1,1].map(side=>{const f=new THREE.Group();f.position.x=side*.13;g.add(f);oval(f,gold,[0,.075,.03],[.035,.075,.035]);oval(f,gold,[0,.025,.10],[.095,.025,.13]);return f;});
  if(small)g.scale.setScalar(.53);
  g.rotation.y=Math.PI/2;
  return {g,body,head,feet};
}

const wakeGeometry=new THREE.RingGeometry(.94,1,24,1,Math.PI*1.17,Math.PI*.66);
export function createDucks(scene){
  const group=new THREE.Group();group.name='One lake duck family';scene.add(group);
  const family=[false,true,true,true].map((small,i)=>{
    const duck=createDuckModel(small);
    duck.g.scale.setScalar(small ? .62+i*.018 : 1.12);
    const wake=new THREE.Group();
    for(const size of [1,1.42]){
      const mat=new THREE.MeshBasicMaterial({color:'#e4f0dd',transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide});
      const wave=new THREE.Mesh(wakeGeometry,mat);
      wave.rotation.x=Math.PI/2;
      wave.scale.set(size*.38,size*.30,1).multiplyScalar(duck.g.scale.x);
      wave.position.z=-.19-size*.26;
      wake.add(wave);
    }
    group.add(duck.g,wake);
    return {...duck,wake,lastLane:NaN,motion:0};
  });
  return {update(event,distance,dt){
    group.visible=distance>DUCK_CROSSING-100&&distance<DUCK_CROSSING+90&&(event.status!=='skipped'||event.time>0);
    if(!group.visible)return;
    family.forEach((d,i)=>{
      const lane=event.positions[i],p=duckSurface(lane,event.swimTime);
      const moved=lane-d.lastLane>.00001;
      d.motion=THREE.MathUtils.damp(d.motion,moved?1:0,10,dt);
      const scale=d.g.scale.x,stride=.38*scale;
      const gait=lane/stride;
      const stepping=d.motion*(1-p.immersion);
      const ripple=Math.sin((event.time+event.swimTime)*3.5-i*.9);
      d.g.position.set(p.x,p.y,-p.s+i*.09);
      d.g.rotation.y=p.heading;
      d.body.rotation.z=Math.sin(gait*2*Math.PI)*.07*stepping;
      d.body.rotation.x=.16*Math.sin(Math.PI*p.immersion);
      d.body.position.y=.016*Math.cos(gait*4*Math.PI)*stepping+p.immersion*(.019*ripple-.15);
      d.head.rotation.x=.09*Math.sin(gait*2*Math.PI+.5)*stepping+.12*Math.sin(Math.PI*p.immersion);
      d.head.rotation.y=.24*Math.sin(event.time*1.6-i*1.3)*(1-d.motion)*(1-p.immersion);
      d.feet.forEach((f,j)=>{
        f.visible=p.immersion<1;
        f.scale.setScalar(1-p.immersion);
        const phase=THREE.MathUtils.euclideanModulo(gait+j*.5,1);
        const swing=Math.max(0,phase*2-1);
        f.position.z=(phase<.5?.25-phase:-.25+.5*swing*swing*(3-2*swing))*.38*stepping;
        let plant=0;
        if(f.visible){
          const cos=Math.cos(p.heading),sin=Math.sin(p.heading);
          const x=p.x+cos*f.position.x*scale,s=p.s-i*.09+sin*f.position.x*scale;
          const heel=(f.position.z-.025*f.scale.z)*scale,toe=(f.position.z+.22*f.scale.z)*scale;
          plant=(Math.max(duckGroundAt(x+sin*heel,s-cos*heel),duckGroundAt(x+sin*toe,s-cos*toe))-p.y)/scale;
        }
        f.position.y=plant+.085*Math.sin(swing*Math.PI)*stepping;
      });
      d.wake.visible=p.immersion>.8;
      d.wake.position.set(p.x,LAKE.level+.012,-p.s+i*.09);
      d.wake.rotation.y=p.heading;
      d.wake.children.forEach((wave,j)=>{wave.material.opacity=(p.immersion-.8)*(.96-j*.17)*(.8+.2*ripple);});
      d.lastLane=lane;
    });
  }};
}
