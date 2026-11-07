import * as THREE from 'three';
import {CLEAR_LAKE,CREEK_REACH,CHUNK_LENGTH,centerAt,extendedWaterAt} from './route.js';

const creekMaterial = new THREE.ShaderMaterial({
  fog: true,
  transparent: true,
  depthWrite: false,
  uniforms: {
    ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
    flowTime: {value: 0},
    shallow: {value: new THREE.Color('#a0b69b')},
    deep: {value: new THREE.Color('#487e70')},
    skyReflection: {value: new THREE.Color('#ccdfd0')},
  },
  vertexShader: `
    varying vec2 stream;
    varying vec3 worldPosition;
    #include <fog_pars_vertex>
    void main() {
      stream = uv;
      worldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
    }
  `,
  fragmentShader: `
    uniform float flowTime;
    uniform vec3 shallow, deep, skyReflection;
    varying vec2 stream;
    varying vec3 worldPosition;
    #include <fog_pars_fragment>
    void main() {
      float across = stream.x;
      float station = stream.y;
      float edge = min(across, 1.0 - across);
      float depth = smoothstep(0.04, 0.42, edge);
      float downstream = station - flowTime * 0.75;
      float bends = sin(across * 20.0 + downstream * 0.31 + sin(station * 0.43) * 1.6);
      float current = downstream + bends * 0.31 + sin(station * 0.93 + across * 9.0) * 0.13;
      float ripples = sin(current * 7.2 + across * 16.0) * sin(current * 2.7 - across * 23.0);
      float glints = smoothstep(0.42, 0.98, ripples) * (0.62 + 0.36 * sin(station * 0.55 + across * 34.0));
      vec3 towardEye = normalize(cameraPosition - worldPosition);
      float reflection = pow(1.0 - max(towardEye.y, 0.0), 4.0);
      vec3 water = mix(shallow, deep, depth);
      water = mix(water, skyReflection, reflection * (0.38 + 0.13 * bends) + glints * 0.14);

      // Surface stones follow the same stations and cross-stream coordinates as these wakes.
      float rockStation = floor((station + 2.0) / 15.0) * 15.0 + 6.0;
      float rockAcross = 0.5 + 0.20 * sin(rockStation * 0.19);
      float wakeDistance = station - rockStation;
      float wakeWidth = 0.06 + clamp(wakeDistance, 0.0, 2.5) * 0.035;
      float wake = 1.0 - smoothstep(0.009, 0.032, abs(abs(across - rockAcross) - wakeWidth));
      wake *= smoothstep(-0.55, 0.12, wakeDistance) * (1.0 - smoothstep(0.55, 2.3, wakeDistance));
      float foam = wake * (0.48 + 0.31 * sin(downstream * 11.0 + across * 80.0));
      float bankLine = (1.0 - smoothstep(0.008, 0.045, abs(edge - 0.035))) * glints * 0.26;
      water = mix(water, skyReflection, foam * 0.72 + bankLine);
      float opacity = mix(0.35, 0.90, max(depth, reflection * 0.47));
      gl_FragColor = vec4(water, max(opacity, foam * 0.78));
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      #include <fog_fragment>
    }
  `,
});

const lakeMaterial = new THREE.ShaderMaterial({
  fog: true,
  transparent: true,
  depthWrite: false,
  uniforms: {
    ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
    flowTime: {value: 0},
    shallow: {value: new THREE.Color('#a1ded1')},
    deep: {value: new THREE.Color('#367e85')},
    sky: {value: new THREE.Color('#cededf')},
    sunlight: {value: new THREE.Color('#fff2c9')},
  },
  vertexShader: `
    attribute float waterWidth;
    varying vec3 lakeCoord;
    varying vec3 worldPosition;
    #include <fog_pars_vertex>
    void main() {
      lakeCoord = vec3(uv, waterWidth);
      worldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
    }
  `,
  fragmentShader: `
    uniform float flowTime;
    uniform vec3 shallow, deep, sky, sunlight;
    varying vec3 lakeCoord;
    varying vec3 worldPosition;
    #include <fog_pars_fragment>
    void main() {
      vec2 p = vec2(worldPosition.x, lakeCoord.y);
      float shore = max(0.0, min(lakeCoord.x, 1.0 - lakeCoord.x) * lakeCoord.z);
      float depth = smoothstep(1.3, 19.0, shore);
      float waveA = p.x * 2.1 + p.y * 1.35 + flowTime * 1.2 + 1.1 * sin(p.x * 0.43 + p.y * 0.15);
      float waveB = -p.x * 1.1 + p.y * 2.7 - flowTime * 0.85 + 0.9 * sin(p.x * 0.28 - p.y * 0.22);
      vec3 normal = normalize(vec3(0.043 * cos(waveA) - 0.025 * cos(waveB), 1.0,
        0.035 * cos(waveA) + 0.035 * cos(waveB)));
      vec3 eye = normalize(cameraPosition - worldPosition);
      float fresnel = pow(1.0 - clamp(dot(normal, eye), 0.0, 1.0), 4.5);
      vec3 skyTint = mix(sky, sunlight, 0.08 + 0.065 * sin(p.y * 0.13 + p.x * 0.17));
      float sparkle = pow(max(dot(normal, normalize(eye + normalize(vec3(-0.55, 0.81, -0.42)))), 0.0), 90.0);
      vec2 lightPattern = p * 2.6 + vec2(sin(waveB), sin(waveA)) * 0.90;
      float caustics = pow(1.0 - abs(sin(lightPattern.x) + sin(lightPattern.y)) * 0.5, 7.0);
      float edgeLight = caustics * smoothstep(0.8, 2.8, shore) * (1.0 - smoothstep(4.0, 13.0, shore));
      vec3 tint = mix(shallow, deep, depth);
      tint = mix(tint, skyTint, fresnel * 0.57);
      tint += sunlight * (edgeLight * 0.26 + sparkle * 0.42);
      float opacity = clamp(0.16 + depth * 0.73 + fresnel * 0.48 + edgeLight * 0.25, 0.0, 0.96);
      gl_FragColor = vec4(tint, opacity);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      #include <fog_fragment>
    }
  `,
});

export function updateWaterside(time) {
  creekMaterial.uniforms.flowTime.value = time;
  lakeMaterial.uniforms.flowTime.value = time;
}

function addWaterRibbon(group, index, reach, material, name) {
  const start = Math.max(index * CHUNK_LENGTH, reach.start);
  const end = Math.min((index + 1) * CHUNK_LENGTH, reach.end);
  if (start >= end) return;

  const positions = [], uv = [], widths = [], indices = [];
  for (let s = start; s <= end; s++) {
    const sample = Math.max(reach.start + .001, Math.min(reach.end - .001, s));
    const {offset, halfWidth, level} = extendedWaterAt(sample);
    for (const edge of [-1, 1]) {
      // Extend under the rising bank so the terrain defines the waterline.
      const padding=1.15;
      positions.push(centerAt(s) + offset + edge * (halfWidth + padding), level, -s);
      uv.push(.5 + edge * (.5 + padding / (2 * halfWidth)), s);
      widths.push(halfWidth * 2);
    }
    if (s < end) {
      const a = (s - start) * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setAttribute('waterWidth', new THREE.Float32BufferAttribute(widths, 1));
  geometry.setIndex(indices);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.renderOrder = 1;
  group.add(mesh);
}

export function addCreekWater(group, index) {
  addWaterRibbon(group, index, CREEK_REACH, creekMaterial, 'Creek current and shallows');
}

export function addClearLakeWater(group, index) {
  addWaterRibbon(group, index, CLEAR_LAKE, lakeMaterial, 'Clear lake and sunlit shallows');
}
