import { termToString } from "rdf-string-ttl";
import { Term } from "@rdfjs/types";
import fs from "fs";
import n3 from "n3";

function stringToInts(str: string): number[] {
  let utf8Encode = new TextEncoder();
  // Pad this out to have a length of 128 and error if it's too long
  let ints = Array.from(utf8Encode.encode(str));
  if (ints.length > 128) {
    throw new Error("Term is too long");
  }
  return ints.concat(Array(128 - ints.length).fill(0));
}

export function convertObject(object: Term): [string, string] {
  if (object.termType === "Literal") {
    if (object.language) {
      return [termToString(n3.DataFactory.literal(object.value)), '"' + object.language + '"'];
    }
    if (object.datatype) {
      return [termToString(n3.DataFactory.literal(object.value)), termToString(object.datatype)];
    }
    return [termToString(object), ''];
  }
  return [termToString(object), ''];
}

const parser = new n3.Parser({ format: "text/turtle" });
const quads = parser.parse(fs.readFileSync("data.ttl", "utf8"));

fs.writeFileSync("circuits/artefacts/my_input.json", JSON.stringify({
  triples: quads.map(quad => [
    termToString(quad.subject),
    termToString(quad.predicate),
    ...convertObject(quad.object),
    termToString(quad.graph)
  ].map(stringToInts)) }, null, 2));
