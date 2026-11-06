// World-space broken colour: marks stay attached to surfaces when the camera moves.
export const paintingMix={value:0};
export function paintSurface(material,{foliage=false,terrain=false}={}){
 const previous=material.onBeforeCompile;
 const previousKey=material.customProgramCacheKey();
 material.onBeforeCompile=shader=>{
  previous?.(shader);
  shader.uniforms.paintingMix=paintingMix;
  shader.vertexShader='varying vec3 paintWorld;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
   vec4 paintP=vec4(transformed,1.0);
   #ifdef USE_INSTANCING
   paintP=instanceMatrix*paintP;
   #endif
   paintWorld=(modelMatrix*paintP).xyz;`);
  shader.fragmentShader=`uniform float paintingMix;
  varying vec3 paintWorld;
  float pigmentHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float pigmentField(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(pigmentHash(i),pigmentHash(i+vec2(1,0)),f.x),mix(pigmentHash(i+vec2(0,1)),pigmentHash(i+vec2(1,1)),f.x),f.y);}
  `+shader.fragmentShader;
  if(terrain)shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>',`#include <normal_fragment_begin>
    vec3 originalFacetedNormal=normalize(cross(dFdx(vViewPosition),dFdy(vViewPosition)));
    normal=normalize(mix(originalFacetedNormal,normal,paintingMix));`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   if(paintingMix>.001){
   ${terrain?`#if defined(USE_COLOR) || defined(USE_COLOR_ALPHA)
   diffuseColor.rgb/=mix(vec3(1.0),max(vColor.rgb,vec3(.01)),paintingMix);
   #endif`:''}
   vec3 brushP=paintWorld*vec3(${foliage?'7.0,10.0,7.0':'6.0,2.0,15.0'});
   brushP.x+=sin(floor(brushP.z)*2.39)*.75+sin(brushP.z*1.7)*.12;
   vec3 cell=floor(brushP);
   float dab=fract(sin(dot(cell,vec3(127.1,311.7,74.7)))*43758.5453);
   vec2 fieldP=paintWorld.xz*.22;
   fieldP+=vec2(pigmentField(fieldP*.34),pigmentField(fieldP*.31+17.0))*2.2;
   float mass=pigmentField(fieldP)*.78+pigmentField(fieldP*2.8+5.0)*.22;
   float lightPatch=smoothstep(.29,.72,mass+(dab-.5)*.06);
   vec3 cool=vec3(.69,.77,1.15),warm=vec3(1.24,1.10,.76);
   vec2 bristle=fract(brushP.xz);
   float edge=smoothstep(0.0,.15,bristle.x)*smoothstep(0.0,.18,bristle.y)*(1.0-smoothstep(.82,1.0,bristle.x))*(1.0-smoothstep(.78,1.0,bristle.y));
   vec3 pigment=mix(cool,warm,lightPatch);
   diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*pigment*(.96+(dab-.5)*.18*edge),paintingMix*.90);
   }`);
 };
 material.customProgramCacheKey=()=>`${previousKey}-meadow-paint-strokes-v4-${foliage}-${terrain}`;
}
