import {test} from 'node:test';
import assert from 'node:assert/strict';
import {regionalPlants,swimmingDuckPose,REGIONAL_REACHES} from '../src/regional-scenery.js';
import {centerAt,groundAt,heightAt,DOWNHILL_POND,pondRadius,pondViewingGap,CHUNK_LENGTH} from '../src/route.js';

  const columns=[-150,-125,-105,-90,-78,-66,-56,-48,-40,-34,-28,-23,-19,-16,-13,-10,-8,-6,-4,-3,-2.2,0,2.2,3,4,6,8,10,13,16,19,23,28,34,40,48,56,66,78,90,105,125,150];
  function terrainY(x,s){
    const s0=Math.floor(s/2)*2,s1=s0+2,t=(s-s0)/2;
    // Each row follows centerAt; interpolate the row's center for barycentric coordinates.
    const c0=centerAt(s0),c1=centerAt(s1),d=x-(c0+(c1-c0)*t);
    const i=columns.findIndex((v,i)=>i<columns.length-1&&d>=v&&d<=columns[i+1]);
    const u=(d-columns[i])/(columns[i+1]-columns[i]);
    const h00=groundAt(c0+columns[i],s0)-.025,h10=groundAt(c0+columns[i+1],s0)-.025;
    const h01=groundAt(c1+columns[i],s1)-.025,h11=groundAt(c1+columns[i+1],s1)-.025;
    return u+t<=1?h00+(h10-h00)*u+(h01-h00)*t:h11+(h01-h11)*(1-u)+(h10-h11)*(1-t);
  }

test('near-shore family leaves body clearance and a flower-free observation opening',()=>{
  for(let t=0;t<180;t+=.1){
    const poses=Array.from({length:4},(_,i)=>swimmingDuckPose(t,i));
    for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)assert.ok(Math.hypot(poses[i].x-poses[j].x,poses[i].s-poses[j].s)>.95,'parent and young do not overlap');
  }
  for(let chunk=45;chunk<=46;chunk++)for(const flower of regionalPlants(chunk).flowers)assert.equal(pondViewingGap(flower.pos[0],-flower.pos[2]),false);
});

test('three reaches have bilateral, patchy planting with clear road and distinct tree heights',()=>{
  for(const reach of REGIONAL_REACHES){
    const plants={flowers:[],trees:[]};
    for(let i=Math.floor(reach.start/CHUNK_LENGTH);i<=Math.floor(reach.end/CHUNK_LENGTH);i++){
      const data=regionalPlants(i);for(const kind of ['flowers','trees'])plants[kind].push(...data[kind].filter(p=>p.region===reach.key));
    }
    for(const kind of ['flowers','trees']){
      assert.ok(plants[kind].length>(kind==='flowers'?300:4),`${reach.key} ${kind}`);
      assert.ok(plants[kind].some(p=>p.pos[0]<centerAt(-p.pos[2])));
      assert.ok(plants[kind].some(p=>p.pos[0]>centerAt(-p.pos[2])));
      for(const p of plants[kind]){
        const s=-p.pos[2],d=Math.abs(p.pos[0]-centerAt(s));
        // Conservative crown radius 0.60 normalized heights, plus bend margin.
        const radius=kind==='trees'?p.scale[0]*.6:p.scale[0];
        assert.ok(d-radius*1.2>2.95,`${reach.key} ${kind} at ${s}`);
        assert.ok(pondRadius(p.pos[0],s)>1.12);
        assert.ok(Math.abs(p.pos[1]-groundAt(p.pos[0],s))<.06);
        if(reach.key==='ridge'&&kind==='trees')assert.ok(p.scale[1]<4);
      }
    }
  }
});
test('pond is a finite carved basin; water and resident ducks stay well outside the dry road',()=>{
  const p=DOWNHILL_POND;
  for(let s=p.s-40;s<=p.s+40;s+=1){
    for(const d of [-2.15,0,2.15])assert.ok(Math.abs(groundAt(centerAt(s)+d,s)-heightAt(s))<.001);
  }
  for(let t=0;t<10000;t+=5)for(let i=0;i<4;i++){
    const pose=swimmingDuckPose(t,i);
    assert.ok(pondRadius(pose.x,pose.s)<.75);
    assert.ok(groundAt(pose.x,pose.s)<p.level-1);
    assert.ok(pose.x-centerAt(pose.s)>9&&pose.x-centerAt(pose.s)<12,'ducks remain visible in the near-shore band without entering the road');
    assert.deepEqual(pose,swimmingDuckPose(t,i),'same elapsed time freezes position and heading');
  }
  assert.ok(groundAt(centerAt(p.s)+p.offset+p.rx*1.15,p.s)>p.level);
});

test('resident duck bodies clear the actual coarse terrain triangles, not just analytic ground',()=>{
  for(let t=0;t<400;t+=.7)for(let i=0;i<4;i++){
    const p=swimmingDuckPose(t,i);
    assert.ok(terrainY(p.x,p.s)<DOWNHILL_POND.level-.45,`duck ${i} ground collision`);
  }
});

test('pond water faces upward and per-chunk material ownership is explicit',async()=>{
  const THREE=await import('three');
  const {addPondWater}=await import('../src/regional-scenery.js');
  const group=new THREE.Group();addPondWater(group,Math.floor(DOWNHILL_POND.s/CHUNK_LENGTH));
  const mesh=group.children[0],normal=mesh.geometry.attributes.normal;
  let count=0;for(let i=0;i<normal.count;i++)if(normal.getY(i)!==0){count++;assert.ok(normal.getY(i)>.999);}
  assert.ok(count>30);assert.equal(group.userData.ownedMaterials[0],mesh.material);
});
test('cloud shade preserves actual terrain triangles and excludes the road',async()=>{
  const THREE=await import('three');
  const {addCloudShade}=await import('../src/regional-scenery.js');
  const group=new THREE.Group(),g=new THREE.BufferGeometry(),s=8450;
  const positions=[];
  for(const at of [s,s+2])for(const d of [-16,-6,-3,0,3,6,16]){const x=centerAt(at)+d;positions.push(x,groundAt(x,at)-.025,-at);}
  g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));const indices=[];
  for(let i=0;i<6;i++)indices.push(i,i+1,i+7,i+1,i+8,i+7);g.setIndex(indices);g.computeVertexNormals();
  group.add(new THREE.Mesh(g));addCloudShade(group,132);
  const shade=group.children[1].geometry,p=shade.attributes.position;
  for(let i=0;i<p.count;i++)assert.ok(Math.abs(p.getY(i)-g.attributes.position.getY(i)-.03)<.00001);
  for(const id of shade.index.array)assert.ok(Math.abs(p.getX(id)-centerAt(-p.getZ(id)))>3.01);
  const normals=shade.attributes.normal;for(let i=0;i<normals.count;i++)assert.ok(normals.getY(i)>0);
  assert.equal(group.userData.ownedMaterials[0],group.children[1].material);
});

test('stronger descent keeps the pond horizontal with unchanged near-shore duck and road separation',async()=>{
 const p=DOWNHILL_POND;
 assert.equal(p.level,heightAt(p.s)-3);
 const THREE=await import('three');
 const {addPondWater}=await import('../src/regional-scenery.js');
 const group=new THREE.Group();addPondWater(group,Math.floor(p.s/CHUNK_LENGTH));
 const positions=group.children[0].geometry.attributes.position;
 for(let i=0;i<positions.count;i++)assert.ok(Math.abs(positions.getY(i)-p.level)<.00001);
 for(let s=p.s-p.rz*1.2;s<=p.s+p.rz*1.2;s+=.5){
  for(const d of [-2.15,0,2.15]){
   assert.ok(pondRadius(centerAt(s)+d,s)>1.12);
   assert.equal(groundAt(centerAt(s)+d,s),heightAt(s));
   assert.ok(p.offset-p.rx*1.2>2.15+2,'finite water mesh leaves at least two metres of lateral road clearance');
  }
 }
});

test('all actual pond water boundary edges are buried in the rendered terrain bank',async()=>{
 const THREE=await import('three');
 const {addPondWater}=await import('../src/regional-scenery.js');
 const p=DOWNHILL_POND;
 const edges=new Map();
 for(let chunk=Math.floor((p.s-p.rz*1.2)/CHUNK_LENGTH);chunk<=Math.floor((p.s+p.rz*1.2)/CHUNK_LENGTH);chunk++){
  const group=new THREE.Group();addPondWater(group,chunk);
  const g=group.children[0].geometry,positions=g.attributes.position;
  const point=id=>[positions.getX(id),positions.getY(id),positions.getZ(id)];
  for(let i=0;i<g.index.count;i+=3){
   const ids=[g.index.getX(i),g.index.getX(i+1),g.index.getX(i+2)];
   for(let j=0;j<3;j++){
    const a=point(ids[j]),b=point(ids[(j+1)%3]);
    const key=[a.join(','),b.join(',')].sort().join('|');
    const edge=edges.get(key);if(edge)edge.count++;else edges.set(key,{a,b,count:1});
   }
  }
 }
 let boundary=0;
 for(const {a,b,count}of edges.values())if(count===1){
  boundary++;
  for(const t of [0,.25,.5,.75,1]){
   const x=a[0]*(1-t)+b[0]*t,s=-a[2]*(1-t)-b[2]*t;
   assert.ok(terrainY(x,s)>p.level+.02,`exposed water edge at ${s}, offset ${x-centerAt(s)}`);
  }
 }
 assert.ok(boundary>40,'finite pond has a complete sampled boundary');
});
