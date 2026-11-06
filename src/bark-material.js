// Original CC0 birch colour texture has broad black rings baked into it.
// Replace that colour layer, retaining the asset's geometry and matte lighting.
export function softenBark(material) {
  material.map = null;
  material.normalMap = null;
  material.roughness = .97;
  material.metalness = 0;
  material.userData.softBark = true;
  const previous = material.onBeforeCompile;
  const previousKey = material.customProgramCacheKey();
  material.onBeforeCompile = shader => {
    previous?.(shader);
    shader.vertexShader = 'varying vec3 barkP;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      vec4 barkWorld = vec4(position, 1.0);
      #ifdef USE_INSTANCING
      barkWorld = instanceMatrix * barkWorld;
      #endif
      barkP = (modelMatrix * barkWorld).xyz;
    `);
    shader.fragmentShader = `varying vec3 barkP;
      float barkHash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float barkNoise(vec2 p) {
        vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(barkHash(i),barkHash(i+vec2(1,0)),f.x),
                   mix(barkHash(i+vec2(0,1)),barkHash(i+vec2(1,1)),f.x),f.y);
      }
    ` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `
      #include <color_fragment>
      // World coordinates vary naturally between instances, without extra materials.
      // Long, softly wandering fibres and irregular small pores; no periodic rings.
      vec2 barkPlane = vec2(barkP.x + barkP.z*.73, barkP.y);
      float mottle = barkNoise(barkPlane*vec2(1.8,.85));
      float fibre = barkNoise(barkPlane*vec2(24.0,1.7)+mottle*.8);
      float pore = smoothstep(.74,.92,barkNoise(barkPlane*vec2(17.0,36.0)));
      float barkShade = .89 + (mottle-.5)*.16 + (fibre-.5)*.16 - pore*.065;
      diffuseColor.rgb *= vec3(barkShade, barkShade*.986, barkShade*.956);
    `);
  };
  material.customProgramCacheKey = () => `${previousKey}-soft-bark-v1`;
}
