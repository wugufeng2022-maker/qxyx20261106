import * as THREE from 'three';
import handAsset from '../assets/rider/hand-mesh.js';

// Bicycle space: +X forward, +Y up, Z across the bike.
export function createRider(bicycle) {
  const rider=new THREE.Group();rider.name='Rider';bicycle.add(rider);
  const material=(color,roughness=.9)=>new THREE.MeshStandardMaterial({color,roughness});
  const m={shirt:material('#bc8c70'),hem:material('#d4a68b'),pants:material('#c9c5ac'),pantSeam:material('#aca98f'),skin:material('#dcb18b'),blush:material('#cf9c86'),eye:material('#413c32'),hair:material('#59483e'),hairLight:material('#715746'),shoe:material('#e7e3ce'),sole:material('#cfccba'),lace:material('#faf5e4'),bag:material('#7c8865'),bagEdge:material('#697653'),bagLight:material('#919a76'),hardware:material('#bdb69a',.55)};
  const v=(x,y,z)=>new THREE.Vector3(x,y,z),up=v(0,1,0);
  const sphereGeometry=new THREE.SphereGeometry(1,16,10),cylinderGeometry=new THREE.CylinderGeometry(.85,1,1,10);
  function mesh(name,geometry,mat,parent=rider){const o=new THREE.Mesh(geometry,mat);o.name=name;o.castShadow=true;parent.add(o);return o;}
  function oval(name,pos,scale,mat,parent=rider){const o=mesh(name,sphereGeometry,mat,parent);o.position.set(...pos);o.scale.set(...scale);return o;}
  function place(o,a,b,r){o.position.copy(a).add(b).multiplyScalar(.5);o.scale.set(r,a.distanceTo(b),r);o.quaternion.setFromUnitVectors(up,b.clone().sub(a).normalize());}
  function rod(name,a,b,r,mat,parent=rider){const o=mesh(name,cylinderGeometry,mat,parent);place(o,a,b,r);return o;}
  // Bend towards a preferred elbow/knee position while keeping both limb lengths.
  function jointBetween(start,end,l1,l2,pole){
    const direction=end.clone().sub(start),distance=direction.length();direction.divideScalar(distance);
    const along=(l1*l1-l2*l2+distance*distance)/(2*distance);
    const bend=pole.clone().sub(start);bend.addScaledVector(direction,-bend.dot(direction)).normalize();
    return start.clone().addScaledVector(direction,along).addScaledVector(bend,Math.sqrt(Math.max(0,l1*l1-along*along)));
  }
  function line(name,points,r,mat,parent=rider){return mesh(name,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>v(...p))),12,r,5,false),mat,parent);}
  function pouch(name,pos,size,r,mat,parent=rider){
    const shape=new THREE.Shape(),w=size[0]/2,h=size[1]/2;
    shape.moveTo(-w+r,-h);shape.lineTo(w-r,-h);shape.quadraticCurveTo(w,-h,w,-h+r);shape.lineTo(w,h-r);shape.quadraticCurveTo(w,h,w-r,h);shape.lineTo(-w+r,h);shape.quadraticCurveTo(-w,h,-w,h-r);shape.lineTo(-w,-h+r);shape.quadraticCurveTo(-w,-h,-w+r,-h);
    const g=new THREE.ExtrudeGeometry(shape,{depth:size[2],steps:1,bevelEnabled:true,bevelThickness:.006,bevelSize:.005,bevelSegments:2,curveSegments:4});g.translate(0,0,-size[2]/2);
    const o=mesh(name,g,mat,parent);o.position.set(...pos);return o;
  }
  const hip=v(-.29,1.13,0),shoulder=v(-.095,1.49,0);
  const seat=oval('Trouser seat',[-.285,1.125,0],[.13,.085,.14],m.pants);
  const body=new THREE.Group();body.name='Relaxed upper body';rider.add(body);
  const rings=[[-.285,1.15,.107,.133],[-.24,1.22,.12,.145],[-.18,1.35,.115,.16],[-.11,1.47,.10,.165],[-.075,1.53,.064,.075]],positions=[],indices=[];
  rings.forEach(([x,y,rx,rz])=>{for(let i=0;i<16;i++){const t=i/16*Math.PI*2;positions.push(x+rx*Math.cos(t),y,rz*Math.sin(t));}});
  for(let j=0;j<rings.length-1;j++)for(let i=0;i<16;i++){const a=j*16+i,b=j*16+(i+1)%16;indices.push(a,a+16,b,b,a+16,b+16);}
  const shirtGeometry=new THREE.BufferGeometry();shirtGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));shirtGeometry.setIndex(indices);shirtGeometry.computeVertexNormals();
  mesh('Soft terracotta T-shirt',shirtGeometry,m.shirt,body);
  for(const [name,x,y,rx,rz] of [['Shirt hem',-.28,1.165,.111,.137],['Crew neck',-.075,1.531,.067,.078]])line(name,Array.from({length:25},(_,i)=>[x+rx*Math.cos(i/24*Math.PI*2),y,rz*Math.sin(i/24*Math.PI*2)]),.007,m.hem,body);
  const pocket=pouch('Shirt patch pocket',[-.023,1.375,-.075],[.073,.075,.006],.011,m.hem,body);pocket.rotation.y=Math.PI/2;pocket.rotation.z=-.35;
  rod('Neck',v(-.065,1.50,0),v(-.022,1.605,0),.045,m.skin,body);
  const head=new THREE.Group();head.name='Young face and short hair';head.position.set(.005,1.675,0);head.rotation.z=-.04;body.add(head);
  oval('Face',[0,0,0],[.100,.122,.092],m.skin,head);oval('Jaw',[.014,-.051,0],[.069,.054,.072],m.skin,head);oval('Nose',[.097,.001,0],[.016,.020,.016],m.skin,head);
  for(const s of [-1,1]){
    oval('Ear',[-.012,-.007,s*.086],[.023,.033,.013],m.skin,head);oval('Ear inner',[-.004,-.009,s*.097],[.011,.016,.003],m.blush,head);
    oval('Eye',[.084,.025,s*.043],[.007,.009,.006],m.eye,head);oval('Eye glint',[.089,.028,s*.044],[.002,.0025,.002],m.lace,head);
    line('Eyebrow',[[.081,.047,s*.027],[.082,.049,s*.044],[.072,.047,s*.059]],.0026,m.hair,head);
    oval('Cheek',[.075,-.024,s*.056],[.006,.011,.014],m.blush,head);
    line('Soft smile',[[.083,-.044,s*.006],[.082,-.046,s*.021],[.077,-.041,s*.030]],.0016,m.blush,head);
  }
  // Short, softly tousled hair. The character has no headwear.
  oval('Hair back',[-.047,.024,0],[.070,.104,.090],m.hair,head);
  const locks=[[-.039,.099,0,.080,.037,.090],[.013,.104,-.032,.072,.035,.060],[.051,.087,.022,.055,.037,.062],[.070,.062,-.035,.035,.047,.036],[-.049,.057,-.065,.043,.057,.036],[-.049,.057,.065,.043,.057,.036],[.014,.106,.040,.064,.033,.054],[.073,.046,.041,.025,.044,.035]];
  locks.forEach(([x,y,z,sx,sy,sz],i)=>{const o=oval('Hair lock '+i,[x,y,z],[sx,sy,sz],i===1||i===6?m.hairLight:m.hair,head);o.rotation.z=-.2+i*.09;});
  for(const s of [-1,1])oval('Hair at temple',[-.022,.024,s*.081],[.017,.020,.012],m.hair,head);
  const bag=new THREE.Group();bag.name='Simple daypack';bag.position.set(-.365,1.365,0);bag.rotation.z=-.36;body.add(bag);
  pouch('Daypack main pouch',[0,0,0],[.235,.285,.105],.055,m.bag,bag).rotation.y=Math.PI/2;
  pouch('Daypack front pocket',[-.065,-.065,0],[.18,.105,.033],.025,m.bagLight,bag).rotation.y=Math.PI/2;
  line('Pocket zipper',[[-.086,-.025,-.075],[-.088,-.019,0],[-.086,-.025,.075]],.003,m.bagEdge,bag);
  rod('Zipper pull',v(-.09,-.025,.045),v(-.091,-.047,.043),.003,m.hardware,bag);
  line('Carry loop',[[0,.135,-.035],[-.015,.170,-.028],[-.015,.170,.028],[0,.135,.035]],.007,m.bagEdge,bag);
  for(const s of [-1,1]){
    line('Shoulder strap',[[-.345,1.485,s*.085],[-.12,1.52,s*.125],[-.075,1.40,s*.143],[-.23,1.235,s*.135],[-.35,1.25,s*.08]],.012,m.bagEdge,body);
    pouch('Strap adjuster',[-.15,1.32,s*.15],[.023,.027,.009],.004,m.hardware,body).rotation.y=Math.PI/2;
  }
  // CC0 WRAD hands posed and softened in Blender, with one continuous skin surface.
  // Only the proximal forearm deforms; the hand and all five fingers stay on
  // the grip. There are no separate thumb, finger or wrist intersection meshes.
  const arms=[-1,1].map(side=>{
    const sh=shoulder.clone().add(v(0,0,side*.143)),elbow=v(.06,1.26,side*.19);
    const gripAxis=v(-side*.060,-side*.024,.055).normalize();
    const top=up.clone().addScaledVector(gripAxis,-up.dot(gripAxis)).normalize();
    const across=top.clone().cross(gripAxis).normalize();
    const orientation=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(across,top,gripAxis));
    const handRoot=new THREE.Group();handRoot.name=`Hand around grip ${side}`;body.add(handRoot);
    const rest=new Float32Array(handAsset.positions);
    for(let i=2;i<rest.length;i+=3)rest[i]*=side;
    const indices=handAsset.indices.slice();
    if(side<0)for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.BufferAttribute(rest.slice(),3).setUsage(THREE.DynamicDrawUsage));
    geometry.setIndex(indices);geometry.computeVertexNormals();
    const skin=mesh('Continuous hand and forearm',geometry,m.skin,handRoot);
    skin.frustumCulled=false;
    const weights=new Float32Array(rest.length/3);
    for(let i=0;i<weights.length;i++){
      const t=THREE.MathUtils.clamp((-rest[i*3]-.10)/(-handAsset.elbow[0]-.10),0,1);
      // Ease only near the wrist; a broad smoothstep would bow the forearm.
      weights[i]=1.12*t*t/(t+.12);
    }
    return{side,sh,handRoot,orientation,skin,rest,weights,
      restElbow:v(handAsset.elbow[0],handAsset.elbow[1],side*handAsset.elbow[2]),
      sleeve:rod('Short sleeve',sh,elbow,.058,m.shirt,body),cuff:rod('Sleeve edge',sh,elbow,.059,m.hem,body),
      upper:rod('Upper arm',sh,elbow,.033,m.skin,body),
      joint:oval('Elbow',elbow.toArray(),[.021,.024,.021],m.skin,body)};
  });
  const legs=[-1,1].map(side=>{
    const upper=rod('Trouser thigh',hip,v(0,.8,side*.12),.068,m.pants),lower=rod('Tapered trouser leg',v(0,.8,side*.12),v(0,.5,side*.16),.047,m.pants),cuff=rod('Trouser cuff',v(0,.5,side*.16),v(0,.53,side*.16),.044,m.pantSeam);
    const shoe=new THREE.Group();shoe.name=`Canvas sneaker ${side}`;rider.add(shoe);
    oval('Sneaker upper',[.024,.012,0],[.105,.044,.048],m.shoe,shoe);oval('Rubber sole',[.026,-.019,0],[.107,.015,.050],m.sole,shoe);oval('Toe cap',[.092,.002,0],[.043,.029,.047],m.lace,shoe);
    for(let j=0;j<3;j++)rod('Sneaker laces',v(.005+j*.019,.047,-.026),v(.012+j*.019,.047,.026),.0025,m.lace,shoe);
    const kneeCover=oval('Soft trouser knee',[0,.8,0],[.053,.058,.052],m.pants);
    return{side,upper,lower,cuff,shoe,kneeCover};
  });
  const steeringPivot=v(.405,.91,0),yAxis=v(0,1,0);
  const inverseBody=new THREE.Matrix4(),euler=new THREE.Euler(),soleContact=v(-.015,-.034,0),zAxis=v(0,0,1);
  const firstPersonParts=new Set(arms.map(a=>a.skin));
  const riderMeshes=[];rider.traverse(o=>{if(o.isMesh)riderMeshes.push(o);});
  let firstPerson=false;
  return{
    root:rider,
    setFirstPerson(enabled){
      if(enabled===firstPerson)return;
      firstPerson=enabled;
      // Retain the animated forearms and grip; keep head, torso and pack out of the lens.
      for(const mesh of riderMeshes)mesh.visible=!enabled||firstPersonParts.has(mesh);
    },
    update(angle,steerAngle=0,time=0,speed=0,walk=0,walkPhase=0,fall=0){
    const pace=THREE.MathUtils.smoothstep(speed,0,4);
    const breath=Math.sin(time*1.7)*.0015;
    const hipBob=Math.sin(angle*2)*.002*pace;
    const pitch=Math.sin(angle*2+.3)*.013*pace;
    const sway=Math.sin(angle)*.005*pace;
    // Rotate around the seated hips so the upper body can move without sliding off the saddle.
    body.quaternion.setFromEuler(euler.set(Math.sin(angle)*.008*pace*(1-walk),0,pitch*(1-walk)*(1-fall)+.48*Math.max(walk,fall)));
    body.position.copy(hip).sub(hip.clone().applyQuaternion(body.quaternion));
    body.position.add(v(0,breath+hipBob+(1-Math.cos(angle*2))*.003*pace,sway));
    body.position.add(v(.20*walk,-.24*walk,-.48*walk));
    body.updateMatrix();inverseBody.copy(body.matrix).invert();
    seat.position.set(-.285+.20*walk,1.125+hipBob-.24*walk,sway*.2+-.48*walk);
    head.rotation.z=-.04-pitch*.45+fall*.08*Math.sin(time*3.5);
    // Small shoulder breaths and the existing soft smile carry the laugh.
    body.position.y+=fall*Math.sin(time*5)*.006;head.rotation.y=Math.sin(time*.4)*.012*pace;
    bag.rotation.z=-.36+Math.sin(angle*2-.4)*.008*pace;
    bag.rotation.x=Math.sin(angle-.35)*.008*pace;
    for(const a of arms){
      const grip=v(.30,1.115,a.side*.263).sub(steeringPivot).applyAxisAngle(yAxis,steerAngle).add(steeringPivot);
      const handOrientation=new THREE.Quaternion().setFromAxisAngle(yAxis,steerAngle).multiply(a.orientation);
      // Walking puts the body at Z=-.48: +Z is the inner arm, -Z the free arm.
      // Hold the near (-Z) grip rather than reaching across the whole bicycle.
      if(a.side>0&&walk>0){
        const nearGrip=v(.30,1.115,-.263).sub(steeringPivot).applyAxisAngle(yAxis,steerAngle).add(steeringPivot);
        grip.lerp(nearGrip,walk);
      }else if(walk>0){
        const stride=THREE.MathUtils.smoothstep(speed,0,.35);
        // The same-side foot is leg +1 (legs use the opposite Z sign).
        // Its forward stance starts at phase zero, so this arm starts behind.
        const swing=-Math.cos(walkPhase)*.045*stride;
        grip.lerp(v(-.14+swing,.62,-.70),walk);
        // Keep the approved hand mesh, but let the forearm hang vertically:
        // its grip curl now faces the thigh instead of pointing at an absent bar.
        const hanging=a.orientation.clone();
        const forearm=a.restElbow.clone().applyQuaternion(hanging).normalize();
        hanging.premultiply(new THREE.Quaternion().setFromUnitVectors(forearm,v(-.13,1,0).normalize()));
        handOrientation.slerp(hanging,walk);
      }
      if(fall>0){
        // Release both grips with the same approved hand mesh; hands rest by
        // the hips instead of stretching from the ground to the handlebar.
        grip.lerp(v(-.20,.97,a.side*.29),fall);
      }
      const hand=grip.clone().applyMatrix4(inverseBody);
      const wrist=grip.clone().add(v(handAsset.wrist[0],handAsset.wrist[1],a.side*handAsset.wrist[2]).applyQuaternion(handOrientation)).applyMatrix4(inverseBody);
      const pole=v(.02,1.20,a.side*(.205+.003*Math.sin(angle)*pace));
      if(walk>0)pole.lerp(v(-.36,1.18,a.side*.2),walk);
      if(a.side<0&&walk>0)pole.lerp(v(-.14,1.0,-.72).applyMatrix4(inverseBody),walk);
      const elbow=jointBetween(a.sh,wrist,.31,.32,pole),sleeveEnd=a.sh.clone().lerp(elbow,.63),cuffStart=a.sh.clone().lerp(elbow,.60);
      if(a.side<0&&walk>0){
        // Solve the wrist and elbow first, then rotate the hanging hand around
        // that fixed wrist. Matching the original forearm axis avoids a kink
        // where the undeformed wrist joins the deforming forearm.
        const restWrist=v(...handAsset.wrist);restWrist.z*=a.side;
        const originalAxis=a.restElbow.clone().sub(restWrist).applyQuaternion(handOrientation).normalize();
        const solvedAxis=elbow.clone().sub(wrist).transformDirection(body.matrix);
        const correction=new THREE.Quaternion().setFromUnitVectors(originalAxis,solvedAxis);
        correction.slerp(new THREE.Quaternion(),1-walk);
        handOrientation.premultiply(correction);
        hand.copy(wrist).sub(restWrist.applyQuaternion(body.quaternion.clone().invert().multiply(handOrientation)));
      }
      place(a.upper,a.sh,elbow,.033);place(a.sleeve,a.sh,sleeveEnd,.058);place(a.cuff,cuffStart,sleeveEnd,.059);
      // In the close lens, continue the forearms below the frame rather than
      // exposing elbow caps or clipping the shoulder sleeves into the camera.
      const armStart=firstPerson?v(-.30,1.00,a.side*.26-.48*walk).applyMatrix4(inverseBody):elbow;
      a.joint.position.copy(elbow);
      a.handRoot.position.copy(hand);
      a.handRoot.quaternion.copy(body.quaternion).invert()
        .multiply(handOrientation);
      const localEnd=armStart.clone().sub(hand).applyQuaternion(a.handRoot.quaternion.clone().invert());
      const delta=localEnd.sub(a.restElbow),attribute=a.skin.geometry.attributes.position;
      for(let i=0;i<a.weights.length;i++){
        const offset=i*3,w=a.weights[i];
        attribute.setXYZ(i,a.rest[offset]+delta.x*w,a.rest[offset+1]+delta.y*w,a.rest[offset+2]+delta.z*w);
      }
      attribute.needsUpdate=true;a.skin.geometry.computeVertexNormals();
    }
    for(const{side,upper,lower,cuff,shoe,kneeCover}of legs){
      const px=side*.055,py=side*.14;
      const pedal=v(-.1+px*Math.cos(angle)-py*Math.sin(angle),.385+px*Math.sin(angle)+py*Math.cos(angle),-side*.16);
      if(fall>0)pedal.lerp(v(-.25,.28,-side*.15),fall);
      if(walk>0){
        const cycle=((walkPhase/(Math.PI*2)+(side===1?0:.5))%1+1)%1;
        const swing=Math.max(0,(cycle-.5)*2);
        const x=cycle<.5?.155-.62*cycle:-.155+.31*(swing*swing*(3-2*swing));
        const stride=THREE.MathUtils.smoothstep(speed,0,.35);
        const ground=v(-.09+x*stride,-.010+Math.sin(swing*Math.PI)*.09*stride,-.48-side*.12);
        pedal.lerp(ground,walk);
      }
      const anklePitch=(1-walk)*Math.sin(angle+(side===1?0:Math.PI)+.4)*.075*pace;
      shoe.rotation.z=anklePitch;shoe.position.copy(pedal).sub(soleContact.clone().applyAxisAngle(zAxis,anklePitch));
      const foot=v(-.03,.04,0).applyAxisAngle(zAxis,anklePitch).add(shoe.position);
      const start=hip.clone().add(v(.20*walk,hipBob-.24*walk,-side*.10+sway*.2+-.48*walk));
      const pole=v(.24,.77,-side*(.15+.008*Math.sin(angle)*pace));
      const knee=jointBetween(start,foot,.425,.435,pole);
      place(upper,start,knee,.065);place(lower,knee,foot,.044);kneeCover.position.copy(knee);
      place(cuff,foot.clone().lerp(knee,.035),foot.clone().lerp(knee,.115),.043);
    }
  }};
}
