import { dereferenceToStore } from "rdf-dereference-store";
import mappings from "./mappings.json";
import { forEachTerms } from "rdf-terms";
import { Term, Quad } from "@rdfjs/types";

function getIndex(term: Term) {
  switch (term.termType) {
    case "NamedNode":
      return 0;
    case "BlankNode":
      return 1;
    case "Literal":
      if (term.language) {
        return 2;
      }
      if (term.datatype && term.datatype.value === "http://www.w3.org/2001/XMLSchema#integer") {
        return 3;
      }
  }
}

const idToPos = {
  0: 'subject',
  1: 'predicate',
  2: 'object',
} as const;

function createInput(params: {
  quads: Quad[],
  reveal: [number, 0 | 1 | 2][]
}) {

  const terms = params
    .reveal
    .map(([triple, pos]) => params.quads[triple][idToPos[pos]]);

  console.log(terms);

  // const terms: string[] = [];
  // const bnodes: string[] = [];
  // // const datatypes:
  // const triples: [number, number, number][] = [];

  // function addTerm(term: Term) {
  //   if (term.termType === "NamedNode" && !mappings.includes(term.value) && !terms.includes(term.value)) {
  //     terms.push(term.value);
  //   }
  //   if (term.termType === "BlankNode" && !bnodes.includes(term.value)) {
  //     bnodes.push(term.value);
  //   }
  // }

  // for (const triple of params.quads) {
  //   forEachTerms(triple, (term) => {
  //     addTerm(term);
  //     if (term.termType === "Literal") {
  //       addTerm(term.datatype);
  //     }
  //   });
  // }

  // console.log(terms, bnodes);
}
