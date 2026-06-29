import type { WalnutContext } from './walnut';

/** @walnut_method
 * name: Compare Values
 * description: Compare ${input1} ${operator} ${input2}
 * actionType: custom_compare_values
 * context: shared
 * needsLocator: false
 * category: Data Processing
 */
export async function compareValues(ctx: WalnutContext) {
  // --- Input Resolution ---
  // Walnut passes values into ctx.args[] depending on the placeholder syntax used in the description:
  //
  //   ${paramName}  → value already resolved from local test data   → args[N] = the actual value
  //   $[varName]    → runtime variable name                         → args[N] = "varName" (look up via ctx.getVariable)
  //   $(varName)    → global variable name                          → args[N] = "varName" (look up via ctx.variableContext)
  //
  // Resolution order for each arg:
  //   1. Runtime variable  — ctx.getVariable(arg)         ($[varName])
  //   2. Global variable   — ctx.variableContext[arg]     ($(varName))
  //   3. Local parameter   — the arg string itself        (${paramName})

  function resolveInput(arg: string): { resolved: any; source: string } {
    // 1. Runtime variable ($[varName])
    const fromRuntime = ctx.getVariable(arg);
    if (fromRuntime !== undefined && fromRuntime !== null) {
      return { resolved: fromRuntime, source: `runtime variable "$[${arg}]"` };
    }

    // 2. Global variable ($(varName))
    const fromGlobal = ctx.variableContext?.[arg];
    if (fromGlobal !== undefined && fromGlobal !== null) {
      return { resolved: fromGlobal, source: `global variable "$(${arg})"` };
    }

    // 3. Local test data parameter (${paramName}) — value is already the arg itself
    return { resolved: arg, source: `local parameter "\${${arg}}"` };
  }

  const { resolved: val1, source: src1 } = resolveInput(ctx.args[0]);
  const operator = (ctx.args[1] ?? '').trim();
  const { resolved: val2, source: src2 } = resolveInput(ctx.args[2]);

  // --- Validate operator ---
  const SUPPORTED_OPERATORS = [
    '=', '==', '!=', '<>', '<', '>', '<=', '>=',
    'contains', 'not contains', 'starts with', 'ends with',
  ];
  if (!SUPPORTED_OPERATORS.includes(operator.toLowerCase())) {
    throw new Error(
      `Unsupported operator: "${operator}". ` +
      `Supported operators: ${SUPPORTED_OPERATORS.map(o => `"${o}"`).join(', ')}.`
    );
  }

  ctx.log(`Input 1 resolved from ${src1} → ${JSON.stringify(val1)}`);
  ctx.log(`Operator: "${operator}"`);
  ctx.log(`Input 2 resolved from ${src2} → ${JSON.stringify(val2)}`);

  // --- Determine canonical datatype ---
  function getType(value: any): string {
    if (value === null || value === undefined) return 'null';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'string' && value.trim() !== '' && !isNaN(Number(value))) return 'number';
    return typeof value; // 'string' | 'number' | 'boolean' | 'object'
  }

  const type1 = getType(val1);
  const type2 = getType(val2);

  ctx.log(`Datatype of Input 1: ${type1}`);
  ctx.log(`Datatype of Input 2: ${type2}`);

  // --- Datatype mismatch → fail immediately ---
  if (type1 !== type2) {
    throw new Error(
      `Datatype mismatch: Input 1 (${src1}) is of type "${type1}", ` +
      `but Input 2 (${src2}) is of type "${type2}". ` +
      `Both values must be the same type to compare.`
    );
  }

  // --- Operator validity for the resolved type ---
  const ORDER_OPERATORS = ['<', '>', '<=', '>='];
  const STRING_ONLY_OPERATORS = ['contains', 'not contains', 'starts with', 'ends with'];

  if (ORDER_OPERATORS.includes(operator) && type1 !== 'number' && type1 !== 'string') {
    throw new Error(
      `Operator "${operator}" is not supported for type "${type1}". ` +
      `Ordering operators (${ORDER_OPERATORS.join(', ')}) can only be used with numbers or strings.`
    );
  }

  if (STRING_ONLY_OPERATORS.includes(operator.toLowerCase()) && type1 !== 'string') {
    throw new Error(
      `Operator "${operator}" is not supported for type "${type1}". ` +
      `"${operator}" can only be used with string values.`
    );
  }

  // --- Normalise then compare ---
  const normalise = (v: any, t: string) => (t === 'number' ? Number(v) : v);
  const norm1 = normalise(val1, type1);
  const norm2 = normalise(val2, type2);

  function evaluate(a: any, op: string, b: any): boolean {
    switch (op.toLowerCase()) {
      case '=':
      case '==':
        if (type1 === 'object' || type1 === 'array') return JSON.stringify(a) === JSON.stringify(b);
        return a === b;
      case '!=':
      case '<>':
        if (type1 === 'object' || type1 === 'array') return JSON.stringify(a) !== JSON.stringify(b);
        return a !== b;
      case '<':           return a < b;
      case '>':           return a > b;
      case '<=':          return a <= b;
      case '>=':          return a >= b;
      case 'contains':    return String(a).includes(String(b));
      case 'not contains': return !String(a).includes(String(b));
      case 'starts with': return String(a).startsWith(String(b));
      case 'ends with':   return String(a).endsWith(String(b));
      default:
        throw new Error(`Unhandled operator: "${op}"`);
    }
  }

  const passed = evaluate(norm1, operator, norm2);

  // --- Pass or fail the step ---
  if (passed) {
    ctx.log(
      `Comparison passed: "${norm1}" (${src1}) ${operator} "${norm2}" (${src2}) is TRUE (type: ${type1})`
    );
  } else {
    throw new Error(
      `Comparison failed: "${norm1}" (${src1}) ${operator} "${norm2}" (${src2}) is FALSE (type: ${type1}).`
    );
  }
}
