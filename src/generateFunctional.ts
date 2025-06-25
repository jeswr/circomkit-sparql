import { translate, Algebra,  } from "sparqlalgebrajs";
import fs from "fs";
import { Variable, BaseQuad, Term } from "@rdfjs/types";
import { getIndex, stringToInts } from "./termId";
import { termToString } from "rdf-string-ttl";
import {  } from 'rdf-namespaces';
import { xsd } from "./xsd";

interface Var {
  type: "variable";
  value: string;
}

interface Input {
  type: "input";
  value: [number, number];
}

interface Static {
  type: "static";
  value: Term;
}

interface BindConstraint {
  type: "bind";
  left: Var;
  right: Var | Input;
}

interface EqConstraint {
  type: "=";
  left: Var | Static | Input;
  right: Var | Static | Input;
}

interface AllConstraint {
  type: "all";
  constraints: Constraint[];
}

interface SomeConstraint {
  type: "some";
  constraints: Constraint[];
}

interface NotConstraint {
  type: "not";
  constraint: Constraint;
}

type Constraint = EqConstraint | AllConstraint | SomeConstraint | NotConstraint;

function operator(op: Algebra.OperatorExpression): Constraint {
  switch (op.operator) {
    case "&&": return { type: "all", constraints: op.args.map(constraintExpression) };
    case "||": return { type: "some", constraints: op.args.map(constraintExpression) };
    case "=":  
      if (op.args.length !== 2) throw new Error("Expected two arguments for =");
      return { type: "=", left: valueExpression(op.args[0]), right: valueExpression(op.args[1]) };
    case "!=": return { type: "not", constraint: operator({ ...op, operator: "=" }) };
    default:
      throw new Error(`Unsupported operator: ${op.operator}`);
  }
}

function valueExpression(op: Algebra.Expression): Var | Static {
  switch (op.expressionType) {
    case Algebra.expressionTypes.TERM: return termExpression(op);
    default:
      throw new Error(`Unsupported expression: [${op.expressionType}]\n${JSON.stringify(op, null, 2)}`);
  }
}

function termExpression(op: Algebra.TermExpression): Var | Static {
  switch (op.term.termType) {
    case "Literal": return { type: "static", value: op.term };
    case "Variable": return { type: "variable", value: op.term.value };
    default:
      throw new Error(`Unsupported term type: ${op.term.termType}`);
  }
}

function constraintExpression(op: Algebra.Expression): Constraint {
  switch (op.expressionType) {
    case Algebra.expressionTypes.OPERATOR: return operator(op);
    default:
      throw new Error(`Unsupported expression: ${op.expressionType}`);
  }
}

function filter(op: Algebra.Filter): OutInfo {
  const { expression, input } = op;
  const res = operation(input);
  return {
    inputPatterns: res.inputPatterns,
    binds: res.binds,
    constraint: {
      type: "all",
      constraints: [
        res.constraint,
        constraintExpression(expression),
      ],
    },
  };
}

interface OutInfo {
  inputPatterns: Algebra.Pattern[];
  binds: BindConstraint[];
  constraint: Constraint;
}

function bgp(op: Algebra.Bgp): OutInfo {
  const { patterns } = op;
  const variables: Set<string> = new Set();
  const constraints: (Constraint | BindConstraint)[] = [];

  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i];
    if (pattern.graph.termType !== "DefaultGraph") {
      throw new Error("Expected a default graph");
    }

    for (let j = 0; j < 3; j++) {
      const term = pattern[(['subject', 'predicate', 'object'] as const)[j]];

      if (term.termType === "Variable") {
        constraints.push({
          type: variables.has(term.value) ? "=" : "bind",
          left: { type: "variable", value: term.value },
          right: { type: "input", value: [i, j] },
        });
        variables.add(term.value);
      } else if (term.termType === "NamedNode" || term.termType === "Literal") {
        constraints.push({
          type: "=",
          left: { type: "static", value: term },
          right: { type: "input", value: [i, j] },
        });
      } else {
        throw new Error("Unexpected term type: " + term.termType);
      }
    }
  }

  return {
    inputPatterns: patterns,
    binds: constraints.filter((c): c is BindConstraint => c.type === "bind"),
    constraint: {
      type: "all",
      constraints: constraints.filter((c): c is Constraint => c.type !== "bind"),
    },
  };
}

function operation(op: Algebra.Operation): OutInfo {
  switch (op.type) {
    case Algebra.types.FILTER:   return filter(op);
    case Algebra.types.BGP:      return bgp(op);
    default:
      throw new Error(`Unsupported operation: ${op.type}`);
  }
}

function topLevel(op: Algebra.Operation) {
  switch (op.type) {
    case Algebra.types.PROJECT: return project(op);
    default:
      throw new Error(`Unsupported top level operation: ${op.type}`);
  }
}

function expression(op: Algebra.Expression) {
  switch (op.expressionType) {
    default:
      throw new Error(`Unsupported expression: ${op.expressionType}`);
  }
}

function project(op: Algebra.Project) {
  return {
    variables: op.variables.map(v => v.value),
    ...operation(op.input),
  }
}

interface CircuitOptions {
  termSize: number;
  version: string;
}

// Main generation function
export function generateCircuit(queryFilePath: string = "sparql.rq", options: CircuitOptions = { termSize: 128, version: '2.1.2' }): string {
  const query = fs.readFileSync(queryFilePath, "utf8");
  const state = topLevel(translate(query));

  let id = 0;
  const anonymousVariables: Record<string, string> = {};
  const constraints: string[] = [];
  const imports: Set<string> = new Set();

  for (const bind of state.binds) {
    if (!state.variables.includes(bind.left.value) && !(bind.left.value in anonymousVariables))
      // Rather than creating extra hidden variables, we just use the existing variable where possible
      anonymousVariables[bind.left.value] = serializeTerm(bind.right);
    else
      constraints.push(`${serializeTerm(bind.left)} <== ${serializeTerm(bind.right)}`);
  }

  function serializeTerm(term: Var | Input): string {
    switch (term.type) {
      case "variable": 
        if (state.variables.includes(term.value))
          return `pub[${state.variables.indexOf(term.value)}]`;
        else
          return (anonymousVariables[term.value] ??= `hid[${id++}]`);
      case "input": return `triples[${term.value[0]}][${term.value[1]}]`;
    }
  }

  function termElem(term: Var | Static | Input): string[] {
    if (term.type === "static")
      return getIndex(term.value).map(term => term.toString());
    const serialized = serializeTerm(term);
    return Array(options.termSize).fill(0).map((_, i) => `${serialized}[${i}]`);
  }

  function eqTerms(left: Var | Static | Input, right: Var | Static | Input): string {
    const leftElems = termElem(left);
    const rightElems = termElem(right);
    if (leftElems.length !== rightElems.length)
      throw new Error("Term element lengths do not match");
    return leftElems.map((_, i) => `(${leftElems[i]} == ${rightElems[i]})`).join(" * ");
  }

  function handleConstraint(constraint: Constraint): string {
    switch (constraint.type) {
      case "all":
        if (constraint.constraints.length === 0) throw new Error("Expected at least one constraint");
        return constraint.constraints.map(c => handleConstraint(c)).join(" * ");
      case "some":
        imports.add("circomlib/circuits/gates.circom");
        if (constraint.constraints.length === 0) throw new Error("Expected at least one constraint");
        let res = handleConstraint(constraint.constraints[0]);
        for (let i = 1; i < constraint.constraints.length; i++)
          res = `OR()(${res}, ${handleConstraint(constraint.constraints[i])})`;
        return res;
      case "not":
        imports.add("circomlib/circuits/gates.circom");
        return `NOT()(${handleConstraint(constraint.constraint)})`;
      case "=":
        return eqTerms(constraint.left, constraint.right);
    }
  }

  constraints.push(`valid <== ${handleConstraint(state.constraint)}`);

  let output = `pragma circom ${options.version};\n\n`;
  for (const imp of imports)
    output += `include "${imp}";\n`;
  output += `\n`;
  output += `template QueryVerifier() {\n`;
  output += `  signal input triples[${state.inputPatterns.length}][3][${options.termSize}];\n`;
  if (state.variables.length > 0)
    output += `  signal output pub[${state.variables.length}][${options.termSize}];\n`;
  if (id > 0)
    output += `  signal hid[${id}][${options.termSize}];\n`;
  output += `  signal output valid;\n`;
  output += `\n`;
  output += `  ${constraints.join(";\n  ")};\n`;
  output += `}\n`;
  return output;
}

// Run the generator if this file is executed directly
if (require.main === module) {
  fs.writeFileSync("circuits/query.circom", generateCircuit());
}
