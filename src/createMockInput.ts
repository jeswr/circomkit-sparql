import { termToString } from "rdf-string-ttl";
import fs from "fs";
import n3 from "n3";
import { getIndex } from "./termId";

const parser = new n3.Parser({ format: "text/turtle" });
const quads = parser.parse(fs.readFileSync("data.ttl", "utf8"));

fs.writeFileSync("circuits/artefacts/my_input.json", JSON.stringify({
  triples: quads.map(quad => [
    getIndex(quad.subject),
    getIndex(quad.predicate),
    getIndex(quad.object),
  ]) }, null, 2));
