import { Term } from "@rdfjs/types";

function stringToInts(str: string, size = 127): number[] {
  let utf8Encode = new TextEncoder();
  // Pad this out to have a length of 128 and error if it's too long
  let ints = Array.from(utf8Encode.encode(str));
  if (ints.length > size) {
    throw new Error("Term is too long");
  }
  return ints.concat(Array(size - ints.length).fill(0));
}

function getIndex(term: Term): [number, ...number[]] {
  switch (term.termType) {
    case "NamedNode":
      return [0, ...stringToInts(term.value)];
    case "BlankNode":
      return [1, ...stringToInts(term.value)];
    case "Literal":
      // Language-tagged literal
      if (term.language) {
        return [2, ...stringToInts(term.language, 8), ...stringToInts(term.value, 119)];
      }
      
      // Typed literals - check datatype
      if (term.datatype) {
        const datatypeIRI = term.datatype.value;
        
        switch (datatypeIRI) {
          case "http://www.w3.org/2001/XMLSchema#string":
            return [3, ...stringToInts(term.value)];
          case "http://www.w3.org/2001/XMLSchema#boolean":
            // return [4, ...stringToInts(term.value)];
            return [4, (term.value.toLowerCase() === "true" || term.value.toLowerCase() === "1" ? 1 : 0), ...Array(126).fill(0)];
          case "http://www.w3.org/2001/XMLSchema#integer":
            // TODO: Properly handle ints etc.
            return [5, parseInt(term.value), ...Array(126).fill(0)];
          case "http://www.w3.org/2001/XMLSchema#decimal":
            return [6, ...stringToInts(term.value)];
          case "http://www.w3.org/2001/XMLSchema#float":
            return [7, ...stringToInts(term.value)];
          case "http://www.w3.org/2001/XMLSchema#double":
            return [8, ...stringToInts(term.value)];
          case "http://www.w3.org/2001/XMLSchema#dateTime":
            return [9, ...stringToInts(term.value)];
          case "http://www.w3.org/2001/XMLSchema#date":
            return [10, ...stringToInts(term.value)];
          case "http://www.w3.org/2001/XMLSchema#time":
            return [11, ...stringToInts(term.value)];
          case "http://www.w3.org/2001/XMLSchema#gYear":
            return [12, ...stringToInts(term.value)];
          case "http://www.w3.org/2001/XMLSchema#gMonth":
            return [13, ...stringToInts(term.value)];
          case "http://www.w3.org/2001/XMLSchema#gDay":
            return [14, ...stringToInts(term.value)];
          case "http://www.w3.org/2001/XMLSchema#gYearMonth":
            return [15, ...stringToInts(term.value)];
          case "http://www.w3.org/2001/XMLSchema#gMonthDay":
            return [16, ...stringToInts(term.value)];
          case "http://www.w3.org/2001/XMLSchema#duration":
            return [17, ...stringToInts(term.value)];
          case "http://www.w3.org/2001/XMLSchema#dayTimeDuration":
            return [18, ...stringToInts(term.value)];
          case "http://www.w3.org/2001/XMLSchema#yearMonthDuration":
            return [19, ...stringToInts(term.value)];
          default:
            return [20, ...stringToInts(term.datatype.value, 63), ...stringToInts(term.value,  64)];
        }
      }

      // Plain literal (no datatype, no language)
      return [21, ...stringToInts(term.value)];
    
    default:
      // Unknown term type
      return [22, ...stringToInts(term.value)];
  }
}

export { getIndex, stringToInts };
