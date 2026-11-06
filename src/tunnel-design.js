// Reconstructed runtime design parameters from the actual editable Spline scene.
// Source: assets/design/spline-four-season-design.json (design data, not a GLB).
// Keep game-scaled density/shade separate from the reference's 8 m sample counts.
export const TUNNEL_DESIGN_SOURCE=Object.freeze({
 url:'https://app.spline.design/file/7a6f62f2-ff2a-45ac-bf89-983fbb897f7c',
 json:'assets/design/spline-four-season-design.json',
});
export const TUNNEL_LEAF_SHAPE=Object.freeze({edgeExponent:.85,midribLift:.036,curveRatio:.22,tipLift:.09});
export const TUNNEL_VINE_COLORS=Object.freeze({natural:'#52613a',winter:'#B1AFA4'});
export const TUNNEL_SEASONS=Object.freeze([
 {name:'spring',leaf:['#94B77B','#B3CD94','#799C67'],bloom:['#F2B8CB','#FFF2E8'],referenceDensity:.5435,density:.78,bloomRate:.34,shade:.10},
 {name:'summer',leaf:['#42664C','#648663','#829B70'],bloom:['#E8EBCB','#C9DAB2'],referenceDensity:1,density:1,bloomRate:.055,shade:.58},
 {name:'autumn',leaf:['#C8A24E','#B86943','#9C6746'],bloom:['#EBC47A','#BB674D'],referenceDensity:.6033,density:.74,bloomRate:.075,shade:.32},
 {name:'winter',leaf:['#C8D7D4','#E2E9E2','#AEBFB9'],bloom:['#F6F8F0','#DDE7EC'],referenceDensity:.0739,density:.18,bloomRate:.035,shade:.04},
].map(season=>Object.freeze({...season,leaf:Object.freeze(season.leaf),bloom:Object.freeze(season.bloom)})));
