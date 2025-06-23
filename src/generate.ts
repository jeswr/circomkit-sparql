import { translate, Algebra } from "sparqlalgebrajs";
import fs from "fs";
import { Variable, BaseQuad } from "@rdfjs/types";
import { Filter } from "sparqlalgebrajs/lib/algebra";

const TERM_ID_SETUP = false;

const query = fs.readFileSync("sparql.rq", "utf8");
const sparql = translate(query);

if (sparql.type !== "project") {
  throw new Error("Expected a SELECT query");
}

let varId = 0;

const variables = sparql.variables;
const variableMap = new Map<string, number>();
const outputVariables: number[] = [];
const imports = new Set<string>();
const patterns: BaseQuad[] = [];
const varOccurrences: Record<number, [number, 0 | 1 | 2][]> = {};
const reveals: [number, 0 | 1 | 2][] = [];
const filters: Map<string, Filter> = new Map();
// const varsRequiringPropertyProof = new Set<number>();
const varsRequiringPropertyProof: number[] = [];
const termTypeConstraints: string[] = [];
let numTriples = 1;

function getVariableId(variable: Variable): number {
  if (variable.termType !== "Variable") {
    throw new Error("Expected a variable");
  }
  if (variableMap.has(variable.value)) {
    return variableMap.get(variable.value)!;
  }
  const id = varId;
  variableMap.set(variable.value, varId);
  varId++;
  return id;
}

// Variables to output
for (const variable of variables) {
  outputVariables.push(getVariableId(variable));
}

let input = sparql.input;
let filter: Algebra.Expression | null = null;

if (input.type === Algebra.types.FILTER) {
  filter = input.expression;
  input = input.input;
}

if (input.type !== "bgp") {
  throw new Error("Expected a BGP");
}

patterns.push(...input.patterns);

numTriples = patterns.length;
const ord = ['subject', 'predicate', 'object'] as const;

for (let i = 0; i < patterns.length; i++) {
  const pattern = patterns[i];
  for (let j = 0; j < 3; j++) {
    const term = pattern[ord[j]];
    if (term.termType === "Variable") {
      (varOccurrences[getVariableId(term)] ??= []).push([i, j as 0 | 1 | 2]);
    } else if (term.termType === "BlankNode") {
      throw new Error("Unexpected blank node, should have been removed in preprocessing");
    } else {
      reveals.push([i, j as 0 | 1 | 2]);
    }
  }
  if (pattern.graph.termType !== "DefaultGraph") {
    throw new Error("Expected a default graph");
  }
}

const joins = Object.values(varOccurrences).filter(v => v.length > 1);

let outString = '';

for (const join of joins) {
  for (let i = 1; i < join.length; i++) {
    outString += `  triples[${join[0][0]}][${join[0][1]}] === triples[${join[i][0]}][${join[i][1]}];\n`;
  }
}

// TODO: Add "OR" support
function getExpressionString(expression: Algebra.Expression): string {
  if (expression.expressionType === Algebra.expressionTypes.TERM) {
    const term = expression.term;
    if (term.termType === "Variable") {
      // Confirm that the term is an integer
      // varsRequiringPropertyProof.add(getVariableId(term));
      if (!varsRequiringPropertyProof.includes(getVariableId(term))) {
        varsRequiringPropertyProof.push(getVariableId(term));
      }

      const ind = varsRequiringPropertyProof.indexOf(getVariableId(term));

      // Checks that the term is an integer
      const constraint = `  terms[${ind}][0] === 5;`;
      if (!termTypeConstraints.includes(constraint)) {
        termTypeConstraints.push(constraint);
      }
      return `terms[${ind}][1]`;
      // return `triples[${varOccurrences[getVariableId(term)][0][0]}][${varOccurrences[getVariableId(term)][0][1]}]`;
    }
    throw new Error("Only variable term expressions are currently supported in filters");
  }
  if (expression.expressionType === Algebra.expressionTypes.NAMED && expression.name.termType === "NamedNode" && expression.name.value === "http://www.w3.org/2001/XMLSchema#integer") {
    if (expression.args.length !== 1) {
      throw new Error("Only unary operator expressions are currently supported in filters");
    }
    const arg = expression.args[0];
    if (arg.expressionType === Algebra.expressionTypes.TERM) {
      const term = arg.term;
      if (term.termType !== "Literal") {
        throw new Error("Only literal expressions are currently supported in filters");
      }
      if (term.datatype.termType !== "NamedNode" || term.datatype.value !== "http://www.w3.org/2001/XMLSchema#integer") {
        throw new Error("Only integer literals are currently supported in filters");
      }
      return `${term.value}`;
    }
  }

  console.log(expression);
  throw new Error("Only term and some named expressions are currently supported in filters");
}

let f = 0;

const OperatorMapping = {
  ">": "GreaterThan(32)",
  "<": "LessThan(32)",
  "=": "IsEqual()",
  "!=": "IsEqual()",
  ">=": "GreaterEqThan(32)",
  "<=": "LessEqThan(32)",
}

function handleFilterExpression(expression: Algebra.Expression): void {
  if (expression.expressionType === Algebra.expressionTypes.OPERATOR) {
    const operator = expression.operator;
    
    // Handle AND operations
    if (operator === "&&") {
      if (expression.args.length !== 2) {
        throw new Error("AND operator must have exactly 2 arguments");
      }
      
      // Recursively handle both sides of the AND
      handleFilterExpression(expression.args[0]);
      outString += `\n`;
      handleFilterExpression(expression.args[1]);
      return;
    }

    // Handle comparison operators
    if (operator === ">" || operator === "<" || operator === "=" || operator === "!=" || operator === ">=" || operator === "<=") {
      if (expression.args.length !== 2) {
        throw new Error("Only binary operator expressions are currently supported in filters");
      }

      // For now we skip any work relying on coercions 
      const left = expression.args[0];
      const right = expression.args[1];

      imports.add("circomlib/circuits/comparators.circom");

      outString += `  component f${f} = ${OperatorMapping[operator]};\n`;
      outString += `  f${f}.in[0] <== ${getExpressionString(left)};\n`;
      outString += `  f${f}.in[1] <== ${getExpressionString(right)};\n`;
      outString += `  f${f}.out === ${operator === "!=" ? 0 : 1};\n`;

      f++;
      return;
    } else if (operator === "isiri" || operator === "isliteral" || operator === "isblank") {
      if (expression.args.length !== 1) {
        throw new Error("isIRI operator must have exactly 1 argument");
      }
      const arg = expression.args[0];
      if (arg.expressionType !== Algebra.expressionTypes.TERM || arg.term.termType !== "Variable") {
        throw new Error("isIRI operator must have a variable argument");
      }
      if (!varsRequiringPropertyProof.includes(getVariableId(arg.term))) {
        varsRequiringPropertyProof.push(getVariableId(arg.term));
      }

      const ind = varsRequiringPropertyProof.indexOf(getVariableId(arg.term));

      // Checks that the term is an integer
      if (operator === "isiri") {
        outString += `  terms[${ind}][0] === 0;\n`;
      } else if (operator === "isblank") {
        outString += `  terms[${ind}][0] === 1;\n`;
      } else if (operator === "isliteral") {
        imports.add("circomlib/circuits/comparators.circom");
        outString += `  component notZero${ind} = IsEqual();\n`;
        outString += `  notZero${ind}.in[0] <== terms[${ind}][0];\n`;
        outString += `  notZero${ind}.in[1] <== 0;\n`;
        outString += `  notZero${ind}.out === 0;\n`;
        outString += `  component notOne${ind} = IsEqual();\n`;
        outString += `  notOne${ind}.in[0] <== terms[${ind}][0];\n`;
        outString += `  notOne${ind}.in[1] <== 1;\n`;
        outString += `  notOne${ind}.out === 0;\n`;
      }
      return;
    }
    
    throw new Error(`Unsupported operator: ${operator}. Only comparison operators (>, <, =, !=, >=, <=) and && are supported`);
  }
  
  throw new Error("Only operator expressions are currently supported in filters");
}

if (filter) {
  outString += `\n`;
  handleFilterExpression(filter);
  input = input.input;
}

// Add term type constraints
if (termTypeConstraints.length > 0) {
  outString += `\n`;
  for (const constraint of termTypeConstraints) {
    outString += constraint + `\n`;
  }
}

outString += `\n`;

for (let i = 0; i < outputVariables.length; i++) {
  const variable = outputVariables[i];
  outString += `  variables[${i}] <== triples[${varOccurrences[variable][0][0]}][${varOccurrences[variable][0][1]}];\n`;
}

outString += `\n`;

for (let i = 0; i < reveals.length; i++) {
  const reveal = reveals[i];
  outString += `  reveals[${i}] <== triples[${reveal[0]}][${reveal[1]}];\n`;
}

outString += `\n`;

// Add constraints for any unconstrained signals
const usedSignals = new Set<string>();
for (const join of joins) {
  for (const occurrence of join) {
    usedSignals.add(`${occurrence[0]}:${occurrence[1]}`);
  }
}

for (let i = 0; i < outputVariables.length; i++) {
  const variable = outputVariables[i];
  const occurrence = varOccurrences[variable][0];
  usedSignals.add(`${occurrence[0]}:${occurrence[1]}`);
}

for (const reveal of reveals) {
  usedSignals.add(`${reveal[0]}:${reveal[1]}`);
}

// Add signals used in filters to the used set
function collectFilterVariables(expression: Algebra.Expression): void {
  if (expression.expressionType === Algebra.expressionTypes.OPERATOR) {
    const operator = expression.operator;
    
    if (operator === "&&") {
      // Recursively collect variables from both sides of AND
      collectFilterVariables(expression.args[0]);
      collectFilterVariables(expression.args[1]);
      return;
    }
    
    // For comparison operators, collect variables from arguments
    for (const arg of expression.args) {
      if (arg.expressionType === Algebra.expressionTypes.TERM && arg.term.termType === "Variable") {
        const varId = getVariableId(arg.term);
        const occurrence = varOccurrences[varId][0];
        usedSignals.add(`${occurrence[0]}:${occurrence[1]}`);
      }
    }
  }
}

if (filter) {
  collectFilterVariables(filter);
}

// Constrain any unused signals to ensure they are valid
for (let i = 0; i < numTriples; i++) {
  for (let j = 0; j < 3; j++) {
    if (!usedSignals.has(`${i}:${j}`)) {
      outString += `  triples[${i}][${j}] * 0 === 0;\n`;
    }
  }
}

outString += `\n`;
outString += `}\n`;


let startString = `pragma circom 2.0.0;\n\n`;

// Add imports
for (const imp of imports) {
  startString += `include "${imp}";\n`;
}

const termsToInclude = varsRequiringPropertyProof
  .map(v => varOccurrences[v][0])
  // .sort((a, b) => (a[0] - b[0]) * patterns.length * 3 + (a[1] - b[1]));

// TODO: FUTURE NUMERIC SPECIFIC AFFORDANCES

startString += `\n`;

// Add template
startString += `template QueryVerifier() {\n`;
startString += `  signal input triples[${numTriples}][3];\n`;
startString += `  signal input terms[${termsToInclude.length}][128];\n`;
startString += `  signal output variables[${outputVariables.length}];\n`;
startString += `  signal output reveals[${reveals.length}];\n\n`;

startString += `\n`;

fs.writeFileSync("circuits/query.circom", startString + outString);
fs.writeFileSync("circuits/artefacts/query.json", JSON.stringify({
  // These are the terms that must be provided to the circuit as input
  // to check properties 
  "termInputs": termsToInclude,
  // These are the mapping to variable names in the output
  "variables": variables.map(v => v.value),
  // These are the terms that must be directly disclosed
  "reveals": reveals,
}, null, 2));

// Optimisation Notes:
// - We do NOT need to perform checks on disclosed values within the circuit:
// for instance; if age is revealed, we do not need to have proof that it is over
// 18 as part of the ZKP

// const expression = input.expression;

// expression.expressionType

// console.log(JSON.stringify(sparql, null, 2));
