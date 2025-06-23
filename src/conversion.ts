// Convert a string to an array of 512 ints
function stringToInts(str: string): number[] {
  return str.split("").map((char) => char.charCodeAt(0));
}

// Convert an array of ints to a string
function intsToString(ints: number[]): string {
  return ints.map((int) => String.fromCharCode(int)).join("");
}

// Convert a string to an array of ints
