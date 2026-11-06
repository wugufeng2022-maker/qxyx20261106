import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import asset from '../assets/rider/hand-mesh.js';
import { createRider } from '../src/rider.js';

test('Blender skin is one closed connected surface, not overlapping hand parts',()=>{
  const edges=new Map(),neighbors=Array.from({length:asset.positions.length/3},()=>[]);
  for(let i=0;i<asset.indices.length;i+=3){
    const tri=asset.indices.slice(i,i+3);
    for(let j=0;j<3;j++){
      const a=tri[j],b=tri[(j+1)%3],key=a<b?`${a}:${b}`:`${b}:${a}`;
      edges.set(key,(edges.get(key)||0)+1);neighbors[a].push(b);neighbors[b].push(a);
    }
  }
  for(const count of edges.values())assert.equal(count,2,'every skin edge must have two incident faces');
  const visited=new Set([0]),stack=[0];
  while(stack.length)for(const neighbor of neighbors[stack.pop()])if(!visited.has(neighbor)){visited.add(neighbor);stack.push(neighbor);}
  assert.equal(visited.size,neighbors.length,'thumb, fingers, wrist and forearm must be connected');
});

test('forearm deformation leaves the hand contact region unchanged in every view',()=>{
  const bike=new THREE.Group(),rig=createRider(bike);
  for(const firstPerson of [true,false])for(const steer of [-.2,0,.2]){
    rig.setFirstPerson(firstPerson);rig.update(2.1,steer,4,4);bike.updateMatrixWorld(true);
    for(const side of [-1,1]){
      const skin=bike.getObjectByName(`Hand around grip ${side}`).children[0];
      const positions=skin.geometry.attributes.position;
      for(let i=0;i<positions.count;i++){
        assert.ok(Number.isFinite(positions.getX(i))&&Number.isFinite(positions.getY(i))&&Number.isFinite(positions.getZ(i)));
        if(asset.positions[i*3]>=-.10){
          assert.ok(Math.abs(positions.getX(i)-asset.positions[i*3])<1e-7);
          assert.ok(Math.abs(positions.getY(i)-asset.positions[i*3+1])<1e-7);
          assert.ok(Math.abs(positions.getZ(i)-side*asset.positions[i*3+2])<1e-7);
        }
      }
    }
  }
});
