import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {softenBark} from '../src/bark-material.js';
import {paintSurface} from '../src/painterly.js';

test('soft bark replaces baked rings and composes with wind and painting', () => {
  const material = new THREE.MeshStandardMaterial({map:new THREE.Texture(),roughness:.3});
  material.onBeforeCompile = shader => {shader.uniforms.wind={value:1};};
  material.customProgramCacheKey = () => 'wind';
  softenBark(material);
  paintSurface(material,{foliage:true});
  const shader = {uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};
  material.onBeforeCompile(shader);
  assert.equal(material.map,null);
  assert.equal(material.roughness,.97);
  assert.equal(shader.uniforms.wind.value,1);
  assert.ok(shader.uniforms.paintingMix);
  assert.match(shader.vertexShader,/barkWorld = instanceMatrix \* barkWorld/);
  assert.match(shader.fragmentShader,/barkShade/);
  assert.match(shader.fragmentShader,/paintingMix/);
  const leaves = new THREE.MeshStandardMaterial({map:new THREE.Texture(),alphaTest:.42});
  const map=leaves.map;
  leaves.customProgramCacheKey=()=> 'wind';
  paintSurface(leaves,{foliage:true});
  assert.notEqual(material.customProgramCacheKey(),leaves.customProgramCacheKey());
  assert.equal(leaves.map,map);
  assert.equal(leaves.alphaTest,.42);
});
