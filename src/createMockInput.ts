import { dereferenceToStore } from "rdf-dereference-store";
import mappings from "./mappings.json";
import { forEachTerms } from "rdf-terms";
import { Term, Quad } from "@rdfjs/types";
import { getIndex } from "./termId";
import { termToString } from "rdf-string-ttl";
import fs from "fs";

const idToPos = {
  0: 'subject',
  1: 'predicate',
  2: 'object',
} as const;

function createInput(params: {
  quads: Quad[],
  termInputs: [number, 0 | 1 | 2][]
}) {
  let i = 0;
  const map = new Map<string, number>();
  function getId(term: Term) {
    const key = termToString(term);
    if (!map.has(key)) {
      map.set(key, i++);
    }
    return map.get(key);
  }

  const terms = params
    .termInputs
    .map(([triple, pos]) => getIndex(params.quads[triple][idToPos[pos]]));

  return {
    triples: params.quads.map((quad) => [getId(quad.subject), getId(quad.predicate), getId(quad.object)]),
    terms,
  }

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

dereferenceToStore("data.ttl", { localFiles: true })
  .then(({ store }) => {
    const sampleInput = createInput({
      quads: [...store],
      termInputs: JSON.parse(fs.readFileSync("circuits/artefacts/query.json", "utf8")).termInputs,
    });
    fs.writeFileSync("circuits/artefacts/my_input.json", JSON.stringify(sampleInput, null, 2));
  });


  