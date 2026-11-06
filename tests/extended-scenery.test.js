import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {landscapeStones} from '../src/extended-scenery.js';
import {centerAt,ROAD_HALF_WIDTH,CHUNK_LENGTH,ROUTE_LENGTH} from '../src/route.js';

test('every valley and ridge rock vertex clears the curved road plus 80 cm of comfort space',()=>{
  const geometry=new THREE.IcosahedronGeometry(1,1),vertices=geometry.getAttribute('position');
  const object=new THREE.Object3D(),vertex=new THREE.Vector3();
  let count=0;
  // Use the exact deterministic placement function consumed by the renderer,
  // then inspect the actual transformed mesh vertices, including rotation.
  for(let index=0;index<=Math.floor(ROUTE_LENGTH/CHUNK_LENGTH);index++){
    for(const rock of landscapeStones(index)){
      count++;object.position.set(...rock.pos);object.scale.set(...rock.scale);object.rotation.set(...rock.rot);object.updateMatrix();
      for(let i=0;i<vertices.count;i++){
        vertex.fromBufferAttribute(vertices,i).applyMatrix4(object.matrix);
        const clearance=Math.abs(vertex.x-centerAt(-vertex.z))-ROAD_HALF_WIDTH;
        assert.ok(clearance>=.8,`rock at ${-rock.pos[2]} m, vertex ${i}: ${clearance.toFixed(3)} m clearance`);
      }
    }
  }
  assert.ok(count>300,'covers both populated forest valley and ridge chunks');geometry.dispose();
});
