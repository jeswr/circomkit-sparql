import { translate } from "sparqlalgebrajs";
import fs from "fs";
import { Variable, BaseQuad } from "@rdfjs/types";

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
const varOccurrences: Record<string, [number, number][]> = {};
const reveals: [number, number][] = [];
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

const input = sparql.input;

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
      (varOccurrences[getVariableId(term)] ??= []).push([i, j]);
    } else if (term.termType === "BlankNode") {
      throw new Error("Unexpected blank node, should have been removed in preprocessing");
    } else {
      reveals.push([i, j]);
    }
  }
  if (pattern.graph.termType !== "DefaultGraph") {
    throw new Error("Expected a default graph");
  }
}

const joins = Object.values(varOccurrences).filter(v => v.length > 1);


let outString = `pragma circom 2.0.0;\n\n`;

// Add imports
for (const imp of imports) {
  outString += `include "${imp}";\n`;
}

// Add template
outString += `template QueryVerifier() {\n`;
outString += `  signal input triples[${numTriples}][3];\n`;
outString += `  signal output variables[${outputVariables.length}];\n`;
outString += `  signal output reveals[${reveals.length}];\n\n`;

for (const join of joins) {
  for (let i = 1; i < join.length; i++) {
    outString += `  triples[${join[0][0]}][${join[0][1]}] === triples[${join[i][0]}][${join[i][1]}];\n`;
  }
}

for (const variable of outputVariables) {
  outString += `  variables[${variable}] <== triples[${varOccurrences[variable][0][0]}][${varOccurrences[variable][0][1]}];\n`;
}

for (const reveal of reveals) {
  outString += `  reveals[${reveal[0]}] <== triples[${reveal[0]}][${reveal[1]}];\n`;
}

outString += `\n`;
outString += `}\n`;

fs.writeFileSync("circuits/query.circom", outString);

// Optimisation Notes:
// - We do NOT need to perform checks on disclosed values within the circuit:
// for instance; if age is revealed, we do not need to have proof that it is over
// 18 as part of the ZKP

// const expression = input.expression;

// expression.expressionType

// console.log(JSON.stringify(sparql, null, 2));
