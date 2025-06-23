export function stringToInts(str: string, size = 127): number[] {
  let utf8Encode = new TextEncoder();
  // Pad this out to have a length of 128 and error if it's too long
  let ints = Array.from(utf8Encode.encode(str));
  if (ints.length > size) {
    throw new Error("Term is too long");
  }
  return ints.concat(Array(size - ints.length).fill(0));
}
