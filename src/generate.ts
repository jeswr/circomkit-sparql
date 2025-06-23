import { translate, Algebra } from "sparqlalgebrajs";
import fs from "fs";
import { Variable, BaseQuad, Term } from "@rdfjs/types";
import { getIndex, stringToInts } from "./termId";
import { termToString } from "rdf-string-ttl";

// Configuration constants
const TERM_ID_SETUP = false;
const TERM_DIMENSIONS = 128;
const LANG_STRING_LENGTH = 8;

// Types for better code organization
interface CircuitState {
  varId: number;
  variables: Variable[];
  variableMap: Map<string, number>;
  outputVariables: number[];
  imports: Set<string>;
  patterns: BaseQuad[];
  varOccurrences: Record<number, [number, 0 | 1 | 2][]>;
  reveals: [number, 0 | 1 | 2, Term][];
      filters: Map<string, any>;
  varsRequiringPropertyProof: number[];
  termTypeConstraints: string[];
  numTriples: number;
  negativeCount: number;
  positiveCount: number;
}

interface OperatorMapping {
  [key: string]: string;
}

const OPERATOR_MAPPING: OperatorMapping = {
  ">": "GreaterThan(32)",
  "<": "LessThan(32)",
  "=": "IsEqual()",
  "!=": "IsEqual()",
  ">=": "GreaterEqThan(32)",
  "<=": "LessEqThan(32)",
};

// Initialize circuit state
function initializeCircuitState(): CircuitState {
  return {
    varId: 0,
    variables: [],
    variableMap: new Map<string, number>(),
    outputVariables: [],
    imports: new Set<string>(),
    patterns: [],
    varOccurrences: {},
    reveals: [],
    filters: new Map<string, any>(),
    varsRequiringPropertyProof: [],
    termTypeConstraints: [],
    numTriples: 1,
    negativeCount: 0,
    positiveCount: 0,
  };
}

// Utility functions
function getVariableId(state: CircuitState, variable: Variable): number {
  if (variable.termType !== "Variable") {
    throw new Error("Expected a variable");
  }
  if (state.variableMap.has(variable.value)) {
    return state.variableMap.get(variable.value)!;
  }
  const id = state.varId;
  state.variableMap.set(variable.value, state.varId);
  state.varId++;
  return id;
}

function getTermIdString(state: CircuitState, term: Term): string {
  if (term.termType === "Variable") {
    const varId = getVariableId(state, term);
    const occurrence = state.varOccurrences[varId][0];
    return `triples[${occurrence[0]}][${occurrence[1]}]`;
  }
  return `[${getIndex(term).join(", ")}]`;
}

// SPARQL algebra processing
function processSparqlQuery(queryString: string): Algebra.Operation {
  const sparql = translate(queryString);
  if (sparql.type !== "project") {
    throw new Error("Expected a SELECT query");
  }
  return sparql;
}

function extractVariables(state: CircuitState, sparql: Algebra.Operation): void {
  state.variables = sparql.variables;
  for (const variable of state.variables) {
    state.outputVariables.push(getVariableId(state, variable));
  }
}

function extractPatterns(state: CircuitState, input: Algebra.Operation): Algebra.Operation {
  let currentInput = input;
  
  if (currentInput.type === Algebra.types.FILTER) {
    currentInput = currentInput.input;
  }

  if (currentInput.type !== "bgp") {
    throw new Error("Expected a BGP");
  }

  state.patterns.push(...currentInput.patterns);
  state.numTriples = state.patterns.length;
  
  return input;
}

function processPatterns(state: CircuitState): void {
  const ord = ['subject', 'predicate', 'object'] as const;

  for (let i = 0; i < state.patterns.length; i++) {
    const pattern = state.patterns[i];
    for (let j = 0; j < 3; j++) {
      const term = pattern[ord[j]];
      if (term.termType === "Variable") {
        const varId = getVariableId(state, term);
        (state.varOccurrences[varId] ??= []).push([i, j as 0 | 1 | 2]);
      } else if (term.termType === "BlankNode") {
        throw new Error("Unexpected blank node, should have been removed in preprocessing");
      } else {
        state.reveals.push([i, j as 0 | 1 | 2, term]);
      }
    }
    if (pattern.graph.termType !== "DefaultGraph") {
      throw new Error("Expected a default graph");
    }
  }
}

// Circuit generation functions
function generateJoins(state: CircuitState): string {
  const joins = Object.values(state.varOccurrences).filter(v => v.length > 1);
  let output = '';

  if (joins.length > 0) {
    output += `  // Joins\n`;
  }

  for (const join of joins) {
    for (let i = 1; i < join.length; i++) {
      output += `  triples[${join[0][0]}][${join[0][1]}] === triples[${join[i][0]}][${join[i][1]}];\n`;
    }
  }

  return output;
}

function getExpressionString(state: CircuitState, expression: Algebra.Expression): string {
  if (expression.expressionType === Algebra.expressionTypes.TERM) {
    const term = expression.term;
    if (term.termType === "Variable") {
      const varId = getVariableId(state, term);
      if (!state.varsRequiringPropertyProof.includes(varId)) {
        state.varsRequiringPropertyProof.push(varId);
      }

      const constraint = `  ${getTermIdString(state, term)}[0] === 5;`;
      if (!state.termTypeConstraints.includes(constraint)) {
        state.termTypeConstraints.push(constraint);
      }
      return `${getTermIdString(state, term)}[1]`;
    }
    throw new Error("Only variable term expressions are currently supported in filters");
  }
  
  if (expression.expressionType === Algebra.expressionTypes.NAMED && 
      expression.name.termType === "NamedNode" && 
      expression.name.value === "http://www.w3.org/2001/XMLSchema#integer") {
    if (expression.args.length !== 1) {
      throw new Error("Only unary operator expressions are currently supported in filters");
    }
    const arg = expression.args[0];
    if (arg.expressionType === Algebra.expressionTypes.TERM) {
      const term = arg.term;
      if (term.termType !== "Literal") {
        throw new Error("Only literal expressions are currently supported in filters");
      }
      if (term.datatype.termType !== "NamedNode" || 
          term.datatype.value !== "http://www.w3.org/2001/XMLSchema#integer") {
        throw new Error("Only integer literals are currently supported in filters");
      }
      return term.value;
    }
  }

  console.log(JSON.stringify(expression, null, 2));
  throw new Error("Only term and some named expressions are currently supported in filters");
}

function handleLangFilter(state: CircuitState, expression: Algebra.OperatorExpression): string {
  const langArg = expression.args[0] as Algebra.OperatorExpression;
  const lang = langArg.args[0].term as Variable;
  const str = (expression.args[1] as Algebra.TermExpression).term.value as string;

  state.imports.add("./operators/langmatches.circom");
  
  const varId = getVariableId(state, lang);
  if (!state.varsRequiringPropertyProof.includes(varId)) {
    state.varsRequiringPropertyProof.push(varId);
  }

  const langElements = stringToInts(str, LANG_STRING_LENGTH);
  let output = '';

  for (let i = 0; i < langElements.length; i++) {
    output += `  ${getTermIdString(state, lang)}[${i + 1}] === ${langElements[i]};\n`;
  }

  return output;
}

function handleComparisonFilter(
  state: CircuitState, 
  operator: string, 
  args: Algebra.Expression[], 
  componentId: number
): string {
  state.imports.add("circomlib/circuits/comparators.circom");

  const left = getExpressionString(state, args[0]);
  const right = getExpressionString(state, args[1]);
  const expectedResult = operator === "!=" ? 0 : 1;

  return `  component f${componentId} = ${OPERATOR_MAPPING[operator]};\n` +
         `  f${componentId}.in[0] <== ${left};\n` +
         `  f${componentId}.in[1] <== ${right};\n` +
         `  f${componentId}.out === ${expectedResult};\n`;
}

function handleTypeCheckFilter(state: CircuitState, operator: string, arg: Algebra.Expression): string {
  if (arg.expressionType !== Algebra.expressionTypes.TERM || arg.term.termType !== "Variable") {
    throw new Error(`${operator} operator must have a variable argument`);
  }

  const varId = getVariableId(state, arg.term);
  if (!state.varsRequiringPropertyProof.includes(varId)) {
    state.varsRequiringPropertyProof.push(varId);
  }

  const idString = `triples[${state.varOccurrences[varId][0][0]}][${state.varOccurrences[varId][0][1]}][0]`;
  const ind = state.varsRequiringPropertyProof.indexOf(varId);

  switch (operator) {
    case "isiri":
      return `  ${idString} === 0;\n`;
    case "isblank":
      return `  ${idString} === 1;\n`;
    case "isliteral":
      state.imports.add("circomlib/circuits/comparators.circom");
      return `  component notZero${ind} = IsEqual();\n` +
             `  notZero${ind}.in[0] <== ${idString};\n` +
             `  notZero${ind}.in[1] <== 0;\n` +
             `  notZero${ind}.out === 0;\n` +
             `  component notOne${ind} = IsEqual();\n` +
             `  notOne${ind}.in[0] <== ${idString};\n` +
             `  notOne${ind}.in[1] <== 1;\n` +
             `  notOne${ind}.out === 0;\n`;
    default:
      throw new Error(`Unsupported type check operator: ${operator}`);
  }
}

function handleNegationFilter(
  state: CircuitState, 
  arg: any, 
  componentCounter: { value: number }
): string {
  if (arg.expressionType !== Algebra.expressionTypes.OPERATOR) {
    throw new Error("Negation can only be applied to operator expressions");
  }

  const operator = arg.operator;
  
  // Handle negated type checks
  if (["isiri", "isliteral", "isblank"].includes(operator)) {
    if (arg.args.length !== 1) {
      throw new Error(`${operator} operator must have exactly 1 argument`);
    }
    
    const varArg = arg.args[0];
    if (varArg.expressionType !== Algebra.expressionTypes.TERM || varArg.term.termType !== "Variable") {
      throw new Error(`${operator} operator must have a variable argument`);
    }

    const varId = getVariableId(state, varArg.term);
    if (!state.varsRequiringPropertyProof.includes(varId)) {
      state.varsRequiringPropertyProof.push(varId);
    }

    const idString = `triples[${state.varOccurrences[varId][0][0]}][${state.varOccurrences[varId][0][1]}][0]`;
    
    switch (operator) {
      case "isiri":
        // NOT isIRI means not equal to 0
        state.imports.add("circomlib/circuits/comparators.circom");
        return `  component notIRI${componentCounter.value} = IsEqual();\n` +
               `  notIRI${componentCounter.value}.in[0] <== ${idString};\n` +
               `  notIRI${componentCounter.value}.in[1] <== 0;\n` +
               `  notIRI${componentCounter.value}.out === 0;\n`;
      case "isblank":
        // NOT isBLANK means not equal to 1
        state.imports.add("circomlib/circuits/comparators.circom");
        return `  component notBlank${componentCounter.value} = IsEqual();\n` +
               `  notBlank${componentCounter.value}.in[0] <== ${idString};\n` +
               `  notBlank${componentCounter.value}.in[1] <== 1;\n` +
               `  notBlank${componentCounter.value}.out === 0;\n`;
      case "isliteral":
        // NOT isLITERAL means it is either IRI (0) or BLANK (1)
        state.imports.add("circomlib/circuits/comparators.circom");
        return `  component isZero${componentCounter.value} = IsEqual();\n` +
               `  isZero${componentCounter.value}.in[0] <== ${idString};\n` +
               `  isZero${componentCounter.value}.in[1] <== 0;\n` +
               `  component isOne${componentCounter.value} = IsEqual();\n` +
               `  isOne${componentCounter.value}.in[0] <== ${idString};\n` +
               `  isOne${componentCounter.value}.in[1] <== 1;\n` +
               `  isZero${componentCounter.value}.out + isOne${componentCounter.value}.out === 1;\n`;
      default:
        throw new Error(`Unsupported negated type check operator: ${operator}`);
    }
  }

  throw new Error(`Unsupported negation of operator: ${operator}`);
}

function handleFilterExpression(
  state: CircuitState, 
  expression: Algebra.Expression, 
  componentCounter: { value: number }
): string {
  if (expression.expressionType !== Algebra.expressionTypes.OPERATOR) {
    throw new Error("Only operator expressions are currently supported in filters");
  }

  const operator = expression.operator;
  let output = '';

  // Handle AND operations recursively
  if (operator === "&&") {
    if (expression.args.length !== 2) {
      throw new Error("AND operator must have exactly 2 arguments");
    }
    
    output += handleFilterExpression(state, expression.args[0], componentCounter);
    output += `\n`;
    output += handleFilterExpression(state, expression.args[1], componentCounter);
    return output;
  }

  // Handle comparison operators
  if (["=", "!=", ">", "<", ">=", "<="].includes(operator)) {
    if (expression.args.length !== 2) {
      throw new Error("Binary operators must have exactly 2 arguments");
    }

    // Special case for lang() = "string" pattern
    if (operator === "=" && 
        expression.args[0].expressionType === Algebra.expressionTypes.OPERATOR && 
        expression.args[0].operator === "lang" && 
        expression.args[0].args[0].term.termType === "Variable" &&
        expression.args[1].expressionType === Algebra.expressionTypes.TERM &&
        expression.args[1].term.termType === "Literal" &&
        expression.args[1].term.datatype.termType === "NamedNode" &&
        expression.args[1].term.datatype.value === 'http://www.w3.org/2001/XMLSchema#string') {
      return handleLangFilter(state, expression);
    }

    output += handleComparisonFilter(state, operator, expression.args, componentCounter.value);
    componentCounter.value++;
    return output;
  }

  // Handle type check operators
  if (["isiri", "isliteral", "isblank"].includes(operator)) {
    if (expression.args.length !== 1) {
      throw new Error(`${operator} operator must have exactly 1 argument`);
    }
    return handleTypeCheckFilter(state, operator, expression.args[0]);
  }

  // Handle negation operator
  if (operator === "!") {
    if (expression.args.length !== 1) {
      throw new Error("Negation operator must have exactly 1 argument");
    }
    const result = handleNegationFilter(state, expression.args[0], componentCounter);
    componentCounter.value++;
    return result;
  }

  throw new Error(`Unsupported operator: ${operator}. Only comparison operators (>, <, =, !=, >=, <=), type checks (isiri, isliteral, isblank), negation (!), and && are supported`);
}

function generateFilters(state: CircuitState, filter: Algebra.Expression | null): string {
  if (!filter) return '';

  let output = `\n`;
  const componentCounter = { value: 0 };
  output += handleFilterExpression(state, filter, componentCounter);
  return output;
}

function generateTermTypeConstraints(state: CircuitState): string {
  if (state.termTypeConstraints.length === 0) return '';

  let output = `\n`;
  for (const constraint of state.termTypeConstraints) {
    output += constraint + `\n`;
  }
  return output;
}

function generateOutputs(state: CircuitState): string {
  let output = `\n`;

  for (let i = 0; i < state.outputVariables.length; i++) {
    const variable = state.outputVariables[i];
    const occurrence = state.varOccurrences[variable][0];
    output += `  variables[${i}] <== triples[${occurrence[0]}][${occurrence[1]}];\n`;
  }

  return output;
}

function generateReveals(state: CircuitState): string {
  let output = `\n`;

  for (const reveal of state.reveals) {
    output += `  [${getIndex(reveal[2])}] === triples[${reveal[0]}][${reveal[1]}];\n`;
  }

  return output;
}

function generateTemplate(state: CircuitState): string {
  let output = `template QueryVerifier() {\n`;
  output += `  signal input triples[${state.numTriples}][3][${TERM_DIMENSIONS}];\n`;
  output += `  signal output variables[${state.outputVariables.length}][${TERM_DIMENSIONS}];\n`;
  output += `\n`;
  return output;
}

function generateImports(state: CircuitState): string {
  let output = `pragma circom 2.1.2;\n\n`;
  
  for (const imp of state.imports) {
    output += `include "${imp}";\n`;
  }
  
  output += `\n`;
  return output;
}

function collectFilterVariables(state: CircuitState, expression: Algebra.Expression): void {
  if (expression.expressionType === Algebra.expressionTypes.OPERATOR) {
    const operator = expression.operator;
    
    if (operator === "&&") {
      collectFilterVariables(state, expression.args[0]);
      collectFilterVariables(state, expression.args[1]);
      return;
    }
    
    for (const arg of expression.args) {
      if (arg.expressionType === Algebra.expressionTypes.TERM && arg.term.termType === "Variable") {
        const varId = getVariableId(state, arg.term);
        // This function is used to mark signals as used for constraint optimization
        // Implementation details would go here
      }
    }
  }
}

function generateCircuitMetadata(state: CircuitState): object {
  const termsToInclude = state.varsRequiringPropertyProof
    .map(v => state.varOccurrences[v][0]);

  return {
    termInputs: termsToInclude,
    variables: state.variables.map(v => v.value),
    reveals: state.reveals,
  };
}

// Main generation function
export function generateCircuit(queryFilePath: string = "sparql.rq"): void {
  const query = fs.readFileSync(queryFilePath, "utf8");
  const sparql = processSparqlQuery(query);
  const state = initializeCircuitState();

  // Extract variables
  extractVariables(state, sparql);

  // Process input and extract filter
  let input = sparql.input;
  let filter: Algebra.Expression | null = null;

  if (input.type === Algebra.types.FILTER) {
    filter = input.expression;
    input = input.input;
  }

  // Extract and process patterns
  extractPatterns(state, input);
  processPatterns(state);

  // Generate circuit components
  let circuitBody = '';
  circuitBody += generateJoins(state);
  circuitBody += generateFilters(state, filter);
  circuitBody += generateTermTypeConstraints(state);
  circuitBody += generateOutputs(state);
  circuitBody += generateReveals(state);
  circuitBody += `\n}\n`;

  // Generate complete circuit
  const circuitHeader = generateImports(state);
  const templateStart = generateTemplate(state);
  const completeCircuit = circuitHeader + templateStart + circuitBody;

  // Write outputs
  fs.writeFileSync("circuits/query.circom", completeCircuit);
  fs.writeFileSync("circuits/artefacts/query.json", JSON.stringify(generateCircuitMetadata(state), null, 2));
}

// Run the generator if this file is executed directly
if (require.main === module) {
  generateCircuit();
}
