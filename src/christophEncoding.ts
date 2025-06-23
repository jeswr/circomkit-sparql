import { Quad } from "@rdfjs/types";
import { stringToInts } from "./utils";

function encode(terms: Quad[], size = 128) {
  return terms.map(term => [
    [0, ...stringToInts(term.value, size)],
    [1, ...stringToInts("", size)],
    [2, ...stringToInts(term.language, size)],
    [3, ...stringToInts(term.datatype.value, size)],
    [4, ...stringToInts(term.value, size)],
    [5, ...stringToInts(term.value, size)],
    [6, ...stringToInts(term.value, size)],
  ])
}
