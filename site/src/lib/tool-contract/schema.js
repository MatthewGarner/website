/* A bounded JSON-schema subset shared by the tool host and article publisher.
   Domain validators remain tool-owned; this module never coerces authored input. */
export const STATE_LIMITS = Object.freeze({maxBytes:131072, maxDepth:32, maxNodes:20000});
const unsafeKeys = new Set(['__proto__', 'prototype', 'constructor']);
const fail = message => { throw new Error(message); };

export function assertJSON(value, limits = {}){
  const {maxBytes, maxDepth, maxNodes} = {...STATE_LIMITS, ...limits};
  const ancestors = new Set();
  let count = 0;
  function walk(item, depth){
    if(++count > maxNodes) fail('Example state contains too many values.');
    if(depth > maxDepth) fail('Example state is nested too deeply.');
    if(item === null || typeof item === 'string' || typeof item === 'boolean') return;
    if(typeof item === 'number'){
      if(!Number.isFinite(item)) fail('Example numbers must be finite.');
      return;
    }
    if(typeof item !== 'object') fail('Example state must contain only JSON values.');
    if(ancestors.has(item)) fail('Example state cannot contain circular references.');
    if(!Array.isArray(item) && ![Object.prototype, null].includes(Object.getPrototypeOf(item)))
      fail('Example state must contain plain objects.');
    ancestors.add(item);
    if(Array.isArray(item)){
      for(let i = 0; i < item.length; i++) walk(item[i], depth + 1);
    }else{
      for(const key of Object.keys(item)){
        if(unsafeKeys.has(key)) fail('Unsupported example property: ' + key);
        const descriptor = Object.getOwnPropertyDescriptor(item, key);
        if(!descriptor || !('value' in descriptor)) fail('Example properties cannot be accessors.');
        walk(descriptor.value, depth + 1);
      }
    }
    ancestors.delete(item);
  }
  walk(value, 0);
  const json = JSON.stringify(value);
  if(new TextEncoder().encode(json).byteLength > maxBytes) fail('Example state is too large.');
  return json;
}

export function validateSchema(value, schema, label = 'state'){
  if(schema === true || schema === undefined) return;
  if(schema === false || !schema || typeof schema !== 'object' || Array.isArray(schema))
    fail(label + ' is not supported.');
  if(schema.anyOf){
    if(!schema.anyOf.some(candidate => { try { validateSchema(value, candidate, label); return true; } catch { return false; } }))
      fail(label + ' does not match an allowed form.');
  }
  if(Object.hasOwn(schema, 'const') && JSON.stringify(value) !== JSON.stringify(schema.const)) fail(label + ' must equal its declared value.');
  if(schema.enum && !schema.enum.some(option => JSON.stringify(option) === JSON.stringify(value))) fail(label + ' must be one of the declared values.');
  const type = schema.type;
  const matches = expected => expected === 'null' ? value === null :
    expected === 'array' ? Array.isArray(value) :
    expected === 'object' ? value !== null && typeof value === 'object' && !Array.isArray(value) :
    expected === 'integer' ? Number.isSafeInteger(value) : typeof value === expected;
  if(type && !(Array.isArray(type) ? type.some(matches) : matches(type))) fail(label + ' must be ' + String(type) + '.');
  if(typeof value === 'number'){
    if(!Number.isFinite(value)) fail(label + ' must be finite.');
    if(schema.minimum !== undefined && value < schema.minimum) fail(label + ' is below its minimum.');
    if(schema.maximum !== undefined && value > schema.maximum) fail(label + ' exceeds its maximum.');
    if(schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) fail(label + ' must exceed its minimum.');
    if(schema.exclusiveMaximum !== undefined && value >= schema.exclusiveMaximum) fail(label + ' must be below its maximum.');
    if(schema.multipleOf !== undefined){
      const ratio = value / schema.multipleOf;
      if(!(schema.multipleOf > 0) || !Number.isFinite(ratio) || Math.abs(ratio - Math.round(ratio)) > 1e-9)
        fail(label + ' must use the declared step.');
    }
  }
  if(typeof value === 'string'){
    const length = [...value].length;
    if(schema.minLength !== undefined && length < schema.minLength) fail(label + ' is too short.');
    if(schema.maxLength !== undefined && length > schema.maxLength) fail(label + ' is too long.');
  }
  if(Array.isArray(value)){
    if(schema.minItems !== undefined && value.length < schema.minItems) fail(label + ' has too few items.');
    if(schema.maxItems !== undefined && value.length > schema.maxItems) fail(label + ' has too many items.');
    if(schema.uniqueItems && new Set(value.map(item => JSON.stringify(item))).size !== value.length) fail(label + ' must not repeat items.');
    for(let i = 0; i < value.length; i++){
      const childSchema = schema.prefixItems?.[i] ?? schema.items;
      validateSchema(value[i], childSchema, label + '[' + i + ']');
    }
  }else if(value && typeof value === 'object'){
    const keys = Object.keys(value);
    if(schema.minProperties !== undefined && keys.length < schema.minProperties) fail(label + ' has too few properties.');
    if(schema.maxProperties !== undefined && keys.length > schema.maxProperties) fail(label + ' has too many properties.');
    for(const key of schema.required ?? []) if(!Object.hasOwn(value, key)) fail(label + ' needs ' + key + '.');
    for(const key of keys){
      if(unsafeKeys.has(key)) fail(label + ' contains an unsupported property.');
      const childSchema = Object.hasOwn(schema.properties ?? {}, key) ? schema.properties[key] : schema.additionalProperties;
      if(childSchema === false) fail(label + ' has an unknown property: ' + key);
      validateSchema(value[key], childSchema, label + '.' + key);
    }
  }
}

export function validateState(definition, state){
  const json = assertJSON(state, definition.stateLimits);
  validateSchema(state, definition.stateSchema);
  const copy = JSON.parse(json);
  definition.validate?.(copy);
  // A validator may inspect but may not silently normalise, discard or replace input.
  if(JSON.stringify(copy) !== json) fail('The tool validator changed example state.');
  return copy;
}

export function statePath(state, path){
  if(!Array.isArray(path) || !path.length || path.length > 16) fail('A control needs a bounded state path.');
  let current = state;
  for(const key of path){
    if((typeof key !== 'string' && !Number.isSafeInteger(key)) || unsafeKeys.has(String(key)) ||
      current === null || typeof current !== 'object' || !Object.hasOwn(current, key)) fail('The control refers to missing state.');
    current = current[key];
  }
  return current;
}

export function applyControl(definition, state, id, input){
  const control = definition.controls[id];
  if(!control) fail('Unknown example control.');
  let next = validateState(definition, state);
  if(control.type === 'action'){
    if(typeof definition.actions?.[control.action] !== 'function') fail('Unknown example action.');
    next = definition.actions[control.action](next);
  }else{
    statePath(next, control.path);
    let value = input;
    if(control.type === 'number' || control.type === 'range'){
      if(!['string', 'number'].includes(typeof input) || (typeof input === 'string' && !input.trim())) fail('Enter a number.');
      value = Number(input);
      validateSchema(value, {type:'number', minimum:control.min, maximum:control.max, multipleOf:control.step}, control.label);
    }else if(control.type === 'checkbox'){
      if(typeof input !== 'boolean') fail('Choose an enabled or disabled value.');
    }else if(control.type === 'select'){
      if(!control.options.some(option => JSON.stringify(option.value) === JSON.stringify(input))) fail('Choose one of the available options.');
    }else{
      validateSchema(input, {type:'string', maxLength:control.maxLength}, control.label);
    }
    let parent = next;
    for(const key of control.path.slice(0, -1)) parent = parent[key];
    parent[control.path.at(-1)] = value;
  }
  return validateState(definition, next);
}
