import {assertJSON, validateState, validateSchema, statePath} from './schema.js';
import {fullToolURL} from './codec.js';
const name = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const fail = message => { throw new Error(message); };
const text = (value, label, max = 2000) => {
  if(typeof value !== 'string' || !value.trim() || value.length > max) fail('The tool definition needs ' + label + '.');
  return value;
};

export function definitionMetadata(definition){
  if(typeof definition.id !== 'string' || !name.test(definition.id) || definition.id.length > 80) fail('Invalid tool identity.');
  if(!Number.isSafeInteger(definition.version) || definition.version < 1) fail('Invalid tool version.');
  for(const field of ['title', 'description']) text(definition[field], field);
  if(!['active', 'archived', 'merged'].includes(definition.status)) fail('Invalid tool catalogue status.');
  const state = validateState(definition, definition.initialState);
  const controls = definition.controls ?? {};
  if(!controls || Array.isArray(controls) || typeof controls !== 'object') fail('Tool controls must be named.');
  if(Object.keys(controls).length > 64) fail('Too many tool controls.');
  for(const [id, control] of Object.entries(controls)){
    if(!name.test(id)) fail('Invalid control identity: ' + id);
    text(control.label, 'a control label', 200);
    if(!['range', 'number', 'select', 'text', 'textarea', 'checkbox', 'action'].includes(control.type)) fail('Unsupported control type.');
    if(control.type === 'action'){
      if(typeof definition.actions?.[control.action] !== 'function') fail('A control names a missing action.');
    }else statePath(state, control.path);
    if(['range', 'number'].includes(control.type)){
      if(!Number.isFinite(control.min) || !Number.isFinite(control.max) || control.min > control.max || !(control.step > 0)) fail('Numeric controls need finite bounds and a positive step.');
    }
    if(['text', 'textarea'].includes(control.type) && (!Number.isSafeInteger(control.maxLength) || control.maxLength < 1 || control.maxLength > 131072)) fail('Text controls need a bounded length.');
    if(control.type === 'select'){
      if(!Array.isArray(control.options) || !control.options.length || control.options.length > 128) fail('Select controls need bounded options.');
      for(const option of control.options){
        text(option.label, 'an option label', 200);
        if(!['string', 'number', 'boolean'].includes(typeof option.value)) fail('Select options must be scalar values.');
      }
      if(new Set(control.options.map(option => JSON.stringify(option.value))).size !== control.options.length) fail('Select options must be distinct.');
    }
  }
  const views = {};
  for(const [id, view] of Object.entries(definition.views ?? {})){
    if(!name.test(id) || typeof view.render !== 'function') fail('Each named view needs a renderer.');
    text(view.title, 'a view title', 200);
    text(view.description, 'a view description');
    if(!Array.isArray(view.controls) || new Set(view.controls).size !== view.controls.length || view.controls.some(control => !Object.hasOwn(controls, control))) fail('The view names invalid controls.');
    if(view.defaultControls !== undefined && (!Array.isArray(view.defaultControls) || new Set(view.defaultControls).size !== view.defaultControls.length || view.defaultControls.some(control => !view.controls.includes(control)))) fail('The view names invalid default controls.');
    views[id] = {title:view.title, description:view.description, controls:view.controls, ...(view.defaultControls === undefined ? {} : {defaultControls:view.defaultControls})};
  }
  if(!Object.hasOwn(views, definition.defaultView)) fail('The tool needs a default view.');
  fullToolURL(definition, state);
  const metadata = {id:definition.id, version:definition.version, title:definition.title, description:definition.description,
    status:definition.status, defaultView:definition.defaultView, stateSchema:definition.stateSchema,
    initialState:state, controls, views, fullTool:definition.fullTool};
  if(definition.stateLimits) metadata.stateLimits = definition.stateLimits;
  assertJSON(metadata, {maxBytes:524288,maxNodes:60000});
  return metadata;
}

export function selectView(definition, view = definition.defaultView, controls){
  if(typeof view !== 'string' || !Object.hasOwn(definition.views, view)) fail('Unsupported tool view.');
  const available = definition.views[view].controls;
  const selected = controls === undefined ? (definition.views[view].defaultControls ?? available) : controls;
  if(!Array.isArray(selected) || new Set(selected).size !== selected.length || selected.some(id => typeof id !== 'string' || !available.includes(id))) fail('The example names unsupported or duplicate controls.');
  return {id:view, view:definition.views[view], controls:[...selected]};
}

export function validateControls(definition, state, ids){
  for(const id of ids){
    const control=definition.controls[id];
    if(!control)fail('Unsupported example control.');
    if(control.type==='action')continue;
    const value=statePath(state,control.path);
    if(['range','number'].includes(control.type))validateSchema(value,{type:'number',minimum:control.min,maximum:control.max,multipleOf:control.step},control.label);
    else if(control.type==='checkbox')validateSchema(value,{type:'boolean'},control.label);
    else if(control.type==='select')validateSchema(value,{enum:control.options.map(option=>option.value)},control.label);
    else validateSchema(value,{type:'string',maxLength:control.maxLength},control.label);
  }
}

export function readExampleState(definition, hash){
  if(!hash || hash === '#'){
    const state=validateState(definition,definition.initialState),selection=selectView(definition);
    validateControls(definition,state,selection.controls);
    return {state,...selection};
  }
  if(typeof hash !== 'string' || hash.length > 800000) fail('The example link is too large.');
  let value;
  try { value = JSON.parse(decodeURIComponent(hash.replace(/^#/, ''))); }
  catch { fail('The example settings could not be read.'); }
  assertJSON(value);
  if(!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !['state', 'view', 'controls'].includes(key)) || !Object.hasOwn(value, 'state')) fail('Invalid example settings.');
  const state=validateState(definition,value.state),selection=selectView(definition,value.view,value.controls);
  validateControls(definition,state,selection.controls);
  return {state,...selection};
}

export function embedFragment({state, view, controls}){
  return '#' + encodeURIComponent(assertJSON({state, view, controls}));
}

/* Validate a portable catalogue without importing a renderer or model engine.
   Domain parsing still belongs to the frozen definition and example command. */
export function validateCatalogue(catalogue){
  assertJSON(catalogue,{maxBytes:16777216,maxNodes:1000000,maxDepth:40});
  if(!catalogue || catalogue.schemaVersion!==1 || !Array.isArray(catalogue.tools) || !catalogue.tools.length || catalogue.tools.length>4096 || Object.keys(catalogue).some(key=>!['schemaVersion','tools'].includes(key)))fail('Invalid tool catalogue.');
  const seen=new Set();
  const allowed=['id','version','title','description','status','defaultView','stateSchema','initialState','controls','views','fullTool','stateLimits','route','modelDigest','definition','fonts'];
  for(const entry of catalogue.tools){
    if(!entry || Object.keys(entry).some(key=>!allowed.includes(key)))fail('Invalid tool catalogue metadata.');
    const identity=entry.id+'/'+entry.version;
    if(seen.has(identity))fail('Duplicate tool version in catalogue.');
    seen.add(identity);
    if(entry.route!==`/embed/${entry.id}/v${entry.version}/`)fail('Invalid versioned embed route.');
    if(typeof entry.modelDigest!=='string' || !/^[a-f0-9]{64}$/.test(entry.modelDigest))fail('Invalid frozen model digest.');
    if(entry.definition!==`embed/releases/${entry.modelDigest}/embed/definitions/${entry.id}.js`)fail('Invalid frozen definition path.');
    const actions=Object.fromEntries(Object.values(entry.controls??{}).filter(c=>c.type==='action').map(c=>[c.action,state=>state]));
    const views=Object.fromEntries(Object.entries(entry.views??{}).map(([id,view])=>[id,{...view,render:()=>{}}]));
    definitionMetadata({...entry,views,actions});
    const selection=selectView(entry);
    validateControls(entry,entry.initialState,selection.controls);
    if(entry.fonts!==undefined){
      if(!Array.isArray(entry.fonts)||entry.fonts.length>16)fail('Invalid font metadata.');
      for(const font of entry.fonts){
        if(!font || typeof font.family!=='string' || typeof font.weight!=='string' || typeof font.unicodeRange!=='string' || typeof font.file!=='string' || !font.file.startsWith(`embed/releases/${entry.modelDigest}/`) || font.file.includes('..') || !font.file.endsWith('.woff2'))fail('Invalid frozen font path.');
      }
    }
  }
  return catalogue;
}
