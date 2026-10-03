/* Published Flow v1 compatibility belongs to Tools, not each article consumer. */
const object=value=>!!value && typeof value==='object' && !Array.isArray(value);
export const isLegacyExample=value=>object(value) && value.tool==='flow' && value.version===1;
export function validateLegacyExample(value){
  if(!isLegacyExample(value) || value.view!=='waiting-time' || Object.hasOwn(value,'state'))throw Error('Unsupported legacy tool, version or view.');
  const p=value.params;
  if(!object(p) || Object.keys(p).some(key=>!['demandPerWeek','itemDays','team','wipLimit','cov'].includes(key)))throw Error('Invalid Flow inputs.');
  const range=(n,min,max,step=1)=>typeof n==='number' && Number.isFinite(n) && n>=min && n<=max && Number.isInteger(n/step);
  if(!range(p.demandPerWeek,.5,10,.5) || !range(p.itemDays,1,15) || !range(p.team,1,10) || !(range(p.wipLimit,1,20)||p.wipLimit===40) || !['low','med','high'].includes(p.cov))throw Error('Invalid Flow inputs: use the ranges supported by the full tool.');
  if(value.seed!==61709)throw Error('Flow v1 uses the fixed seed 61709.');
  if(!Array.isArray(value.controls) || !(value.controls.length===0 || value.controls.length===1 && value.controls[0]==='demand'))throw Error('Flow v1 controls must be [] or [demand].');
  return value;
}
export function legacyExampleURLs(value,origin='https://tools.matthewgarner.me'){
  validateLegacyExample(value);
  const url=new URL(origin);
  if(url.origin!==origin || !(origin==='https://tools.matthewgarner.me' || url.protocol==='http:' && ['localhost','127.0.0.1'].includes(url.hostname)))throw Error('Invalid tool origin.');
  const {params:p,seed,controls}=value;
  return {
    embedUrl:origin+'/embed/v1/flow/#'+encodeURIComponent(JSON.stringify({params:p,seed,controls})),
    fullToolUrl:origin+'/flow/#'+btoa(JSON.stringify({d:p.demandPerWeek,s:p.itemDays,t:p.team,w:p.wipLimit===40?21:p.wipLimit,v:p.cov}))
  };
}
