import * as THREE from 'three';
// Original domestic tabby. Dimensions match the bicycle's actual 0.50 x 0.20 m rack.
export const CAT_SEAT={center:[-.675,.842,0],halfSize:[.177,.112]};
// Smooth bounded gestures with actual still intervals, independent of frame rate.
const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
function gesture(t,start,rise,hold,fall){return ease((t-start)/rise)*(1-ease((t-start-rise-hold)/fall));}
export function createCat(parent,{carrier=false}={}) {
 const root=new THREE.Group();root.name=carrier?'Padded rear cat seat':'Village cat resting place';parent.add(root);
 const mat=color=>new THREE.MeshStandardMaterial({color,roughness:.95});
 const ginger=mat('#ca9a67'),cream=mat('#eee0c4'),pink=mat('#bd8b81'),stripe=mat('#a77650'),eye=mat('#6c805e'),dark=mat('#444637'),cloth=mat('#b8c7ac'),wood=mat('#a79b79');
 const sphere=new THREE.SphereGeometry(1,16,12);
 function oval(name,pos,scale,material,group=root){const o=new THREE.Mesh(sphere,material);o.name=name;o.position.set(...pos);o.scale.set(...scale);o.castShadow=true;o.receiveShadow=true;group.add(o);return o;}
 if(carrier){
  root.position.set(...CAT_SEAT.center);
  const cushion=oval('Rear seat linen pad',[0,.022,0],[.173,.025,.104],cloth);
  function rail(pos,size){const o=new THREE.Mesh(new THREE.BoxGeometry(...size),wood);o.position.set(...pos);o.castShadow=true;root.add(o);}
  for(const side of [-1,1])rail([0,.066,side*.109],[.36,.033,.012]);
  rail([-.177,.066,0],[.012,.033,.23]);
  // Front stop stays behind the rider's pedaling envelope; a soft, low carrier rim.
  rail([.177,.066,0],[.012,.033,.23]);
  cushion.name='Rear cat cushion on actual rack';
 }
 const cat=new THREE.Group();cat.name='Sitting home tabby';cat.position.y=carrier?.041:0;root.add(cat);
 // Face gently backwards, toward the following camera; never sit on the saddle.
 oval('Cat seated haunches',[.030,.091,0],[.103,.093,.074],ginger,cat);
 const chest=oval('Cream cat bib',[-.037,.122,0],[.059,.069,.064],cream,cat);
 for(const side of [-1,1]){
  oval('Cat tucked hind paw',[.061,.027,side*.055],[.054,.027,.027],ginger,cat);
  oval('Cat front paw',[-.072,.020,side*.035],[.038,.020,.023],cream,cat);
 }
 const head=new THREE.Group();head.position.set(-.068,.213,0);cat.add(head);
 oval('Tabby round face',[0,0,0],[.080,.073,.069],ginger,head);
 // Thin curved colour patches follow the head ellipsoid instead of floating beads.
 function facePatch(name,y,z,ry,rz,material,group=head,lift=.0005){
  const vertices=[],indices=[],segments=24;
  const point=(py,pz)=>[-.080*Math.sqrt(Math.max(.001,1-(py/.073)**2-(pz/.069)**2))-lift,py-y,pz-z];
  vertices.push(...point(y,z));
  for(let i=0;i<=segments;i++){
   const angle=i/segments*Math.PI*2;
   vertices.push(...point(y+ry*Math.sin(angle),z+rz*Math.cos(angle)));
   if(i<segments)indices.push(0,i+1,i+2);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  const patch=new THREE.Mesh(geometry,material);patch.name=name;patch.position.set(0,y,z);group.add(patch);return patch;
 }
 oval('Cat soft muzzle',[-.063,-.025,0],[.024,.022,.043],cream,head);
 const ears=[],eyes=[];
 for(const side of [-1,1]){
  const earRoot=new THREE.Group();earRoot.name='Cat ear root';earRoot.position.set(.008,.054,side*.046);head.add(earRoot);ears.push(earRoot);
  const ear=new THREE.Mesh(new THREE.ConeGeometry(.038,.075,3),ginger);ear.name='Triangular cat ear';ear.position.set(0,.024,0);ear.rotation.x=side*.17;ear.rotation.z=.10;earRoot.add(ear);
  const inner=new THREE.Mesh(new THREE.ConeGeometry(.024,.048,3),pink);inner.position.set(-.012,.026,0);inner.rotation.copy(ear.rotation);earRoot.add(inner);
  const eyeRoot=new THREE.Group();eyeRoot.name='Cat blinking eye';eyeRoot.position.set(0,.012,side*.034);head.add(eyeRoot);eyes.push(eyeRoot);
  for(const [name,y,z,ry,rz,material,lift] of [
   ['Cat almond eye',.012,side*.034,.010,.014,eye,.0006],
   ['Cat vertical pupil',.012,side*.034,.008,.0035,dark,.0010],
   ['Cat eye glint',.016,side*.032,.002,.002,cream,.0014],
  ]){
   const patch=facePatch(name,y,z,ry,rz,material,eyeRoot,lift);
   patch.position.y-=eyeRoot.position.y;patch.position.z-=eyeRoot.position.z;
   patch.userData.faceLift=lift;
   // Keep the tiny animated patch conservatively visible throughout a blink.
   patch.geometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(),.12);
  }
  facePatch('Tabby cheek stripe',-.003,side*.060,.004,.005,stripe);
 }
 oval('Cat rose nose',[-.082,-.012,0],[.010,.007,.011],pink,head);
 for(const z of [-.022,0,.022])facePatch('Tabby forehead marking',.049,z,.012,.0035,stripe);
 // A tucked tail with a fixed root. Only its outer tip uncurls slightly.
 const tailPoints=[[.103,.060,-.039],[.132,.033,-.068],[.082,.021,-.077],[.015,.023,-.077],[-.020,.039,-.070]].map(p=>new THREE.Vector3(...p));
 const tailCurve=new THREE.CatmullRomCurve3(tailPoints);
 const tailGeometry=new THREE.TubeGeometry(tailCurve,28,.014,8,false);
 const tail=new THREE.Mesh(tailGeometry,ginger);tail.name='Curled tail inside carrier';tail.castShadow=true;cat.add(tail);
 // Cache the rest mesh: a smooth tip displacement preserves shared tube rings and normals.
 const rest=tailGeometry.attributes.position.array.slice();
 const weights=Float32Array.from({length:29},(_,ring)=>ease((ring/28-.42)/.58));
 // Conservative fixed bounds cover the complete tip range [-.55, 1], including returns.
 tailGeometry.computeBoundingBox();
 tailGeometry.boundingBox.min.y-=.014*.55;tailGeometry.boundingBox.max.y+=.014;
 tailGeometry.boundingBox.min.z-=.007*.55;tailGeometry.boundingBox.max.z+=.007;
 tailGeometry.boundingSphere=new THREE.Sphere();tailGeometry.boundingBox.getBoundingSphere(tailGeometry.boundingSphere);
 let lastTip=0;
 let lastBlink=0;
 let lastTime;
 function update(time,speed=0){
  // Paused game calls with the same elapsed time: freeze even if speed changes externally.
  if(time===lastTime)return;lastTime=time;
  const t=((time%43)+43)%43;
  const left=gesture(t,3.2,1.3,2.8,1.7),right=gesture(t,16.5,1.7,3.6,1.5),peek=gesture(t,33.2,1.2,1.5,1.6);
  head.rotation.y=.33*left-.38*right+.20*peek;
  head.rotation.z=-.025*left+.020*right-.035*peek;
  head.rotation.x=.018*left-.025*right;
  // Ground contacts stay fixed; breath is confined to the soft chest.
  chest.scale.y=.069*(1+Math.sin(time*1.45)*.012);
  const earTime=((time%29)+29)%29;
  ears[0].rotation.y=.23*gesture(earTime,7.1,.15,.08,.42)-.13*gesture(earTime,22.0,.24,.2,.5);
  ears[0].rotation.x=-.08*left;
  ears[1].rotation.y=-.26*gesture(earTime,11.5,.18,.10,.48)+.12*gesture(earTime,22.4,.2,.1,.5);
  ears[1].rotation.x=.06*right;
  // A little airstream response while riding; the ears stay rooted to the head.
  const wind=THREE.MathUtils.clamp(speed/7,0,1);
  for(let i=0;i<ears.length;i++)ears[i].rotation.z=.045*wind+Math.sin(time*2.3+i*.8)*.018*wind;
  const blinkTime=((time%17.3)+17.3)%17.3;
  const blink=Math.max(gesture(blinkTime,5.2,.16,.06,.23),gesture(blinkTime,12.7,.25,.08,.32));
  if(blink!==lastBlink){
   lastBlink=blink;
   const squint=1-.94*blink;
   for(const eyeRoot of eyes){
    eyeRoot.scale.y=squint;
    for(const patch of eyeRoot.children){
     const positions=patch.geometry.attributes.position;
     for(let i=0;i<positions.count;i++){
      const y=eyeRoot.position.y+(patch.position.y+positions.getY(i))*squint;
      const z=eyeRoot.position.z+patch.position.z+positions.getZ(i);
      positions.setX(i,-.080*Math.sqrt(Math.max(.001,1-(y/.073)**2-(z/.069)**2))-patch.userData.faceLift);
     }
     positions.needsUpdate=true;patch.geometry.computeVertexNormals();
    }
   }
  }
  const tailTime=((time%31)+31)%31;
  const tip=gesture(tailTime,8.6,1.8,1.2,2.6)-.55*gesture(tailTime,23.1,1.4,.6,2.0);
  if(tip!==lastTip){
  lastTip=tip;
  const positions=tailGeometry.attributes.position;
  for(let ring=0;ring<=28;ring++){
   const influence=weights[ring];
   for(let side=0;side<=8;side++){
    const i=(ring*9+side)*3;
    positions.array[i]=rest[i];
    positions.array[i+1]=rest[i+1]+.014*tip*influence;
    positions.array[i+2]=rest[i+2]+.007*tip*influence;
   }
  }
  positions.needsUpdate=true;tailGeometry.computeVertexNormals();
  }
  // Cushion, paws and haunches do not sway through the rim or saddle.
 }
 update(0);
 return {root,cat,head,update};
}
