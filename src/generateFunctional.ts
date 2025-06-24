import { translate, Algebra } from "sparqlalgebrajs";
import fs from "fs";
import { Variable, BaseQuad, Term } from "@rdfjs/types";
import { getIndex, stringToInts } from "./termId";
import { termToString } from "rdf-string-ttl";
import {  } from 'rdf-namespaces';
import { xsd } from "./xsd";

interface Operation {
  patterns: Algebra.Pattern[];
  filters: Algebra.Filter[];
  imports: Set<string>;
}

function filter(op: Algebra.Filter): Operation {
  const { expression, input } = op;
  const { type } = expression;

  const res = operation(input);
}

function bgp(op: Algebra.Bgp): Operation {
  return {
    patterns: op.patterns,
    filters: [],
    imports: new Set(),
  }
}

function operation(op: Algebra.Operation) {
  switch (op.type) {
    case Algebra.types.FILTER:   return filter(op);
    case Algebra.types.BGP:      return bgp(op);
    default:
      throw new Error(`Unsupported operation: ${op.type}`);
  }
}

function expression(op: Algebra.Expression) {
  const { type, expressionType } = op;
  switch (expressionType) {
    default:
      throw new Error(`Unsupported expression: ${expressionType}`);
  }
}

function project(op: Algebra.Project) {
  const { variables, input } = op;

  return {
    variables: variables.map(v => v.value),
    ...operation(input),
  }
}
