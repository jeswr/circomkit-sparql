/**
 * Examples of using the XML Schema Datatype Encoding Library
 * 
 * This file demonstrates how to encode various XML Schema datatypes
 * as integer arrays for use in CIRCOM circuits.
 */

import { 
  encodeXSDValue, 
  XSDDatatype, 
  XSD_NAMESPACE,
  getXSDDatatype,
  isXSDDatatype 
} from "../datatype";

// Example 1: Boolean values
console.log("=== Boolean Examples ===");
console.log("true:", encodeXSDValue("true", `${XSD_NAMESPACE}boolean`));
console.log("false:", encodeXSDValue("false", `${XSD_NAMESPACE}boolean`));
console.log("1:", encodeXSDValue("1", `${XSD_NAMESPACE}boolean`));
console.log("0:", encodeXSDValue("0", `${XSD_NAMESPACE}boolean`));

// Example 2: Integer values
console.log("\n=== Integer Examples ===");
console.log("42:", encodeXSDValue("42", `${XSD_NAMESPACE}integer`));
console.log("-123:", encodeXSDValue("-123", `${XSD_NAMESPACE}integer`));
console.log("Long 123456789:", encodeXSDValue("123456789", `${XSD_NAMESPACE}long`));
console.log("Byte 127:", encodeXSDValue("127", `${XSD_NAMESPACE}byte`));
console.log("UnsignedByte 255:", encodeXSDValue("255", `${XSD_NAMESPACE}unsignedByte`));

// Example 3: Decimal values
console.log("\n=== Decimal Examples ===");
console.log("123.456:", encodeXSDValue("123.456", `${XSD_NAMESPACE}decimal`));
console.log("-0.001:", encodeXSDValue("-0.001", `${XSD_NAMESPACE}decimal`));

// Example 4: Float and Double values
console.log("\n=== Float/Double Examples ===");
console.log("3.14159 (float):", encodeXSDValue("3.14159", `${XSD_NAMESPACE}float`));
console.log("2.71828 (double):", encodeXSDValue("2.71828", `${XSD_NAMESPACE}double`));
console.log("INF (float):", encodeXSDValue("INF", `${XSD_NAMESPACE}float`));
console.log("-INF (double):", encodeXSDValue("-INF", `${XSD_NAMESPACE}double`));
console.log("NaN (float):", encodeXSDValue("NaN", `${XSD_NAMESPACE}float`));

// Example 5: Date and Time values
console.log("\n=== Date/Time Examples ===");
console.log("Date 2023-12-25:", encodeXSDValue("2023-12-25", `${XSD_NAMESPACE}date`));
console.log("DateTime 2023-12-25T10:30:00:", encodeXSDValue("2023-12-25T10:30:00", `${XSD_NAMESPACE}dateTime`));
console.log("DateTime with timezone:", encodeXSDValue("2023-12-25T10:30:00+05:00", `${XSD_NAMESPACE}dateTime`));
console.log("Time 14:30:15:", encodeXSDValue("14:30:15", `${XSD_NAMESPACE}time`));
console.log("gYear 2023:", encodeXSDValue("2023", `${XSD_NAMESPACE}gYear`));
console.log("gMonth --12:", encodeXSDValue("--12", `${XSD_NAMESPACE}gMonth`));
console.log("gDay ---25:", encodeXSDValue("---25", `${XSD_NAMESPACE}gDay`));

// Example 6: Duration values
console.log("\n=== Duration Examples ===");
console.log("P1Y2M3DT4H5M6S:", encodeXSDValue("P1Y2M3DT4H5M6S", `${XSD_NAMESPACE}duration`));
console.log("PT2H30M:", encodeXSDValue("PT2H30M", `${XSD_NAMESPACE}duration`));
console.log("-P1D:", encodeXSDValue("-P1D", `${XSD_NAMESPACE}duration`));

// Example 7: Binary values
console.log("\n=== Binary Examples ===");
console.log("hexBinary 48656C6C6F:", encodeXSDValue("48656C6C6F", `${XSD_NAMESPACE}hexBinary`));
console.log("base64Binary SGVsbG8=:", encodeXSDValue("SGVsbG8=", `${XSD_NAMESPACE}base64Binary`));

// Example 8: String values (fallback)
console.log("\n=== String Examples ===");
console.log("String 'Hello World':", encodeXSDValue("Hello World", `${XSD_NAMESPACE}string`));
console.log("URI:", encodeXSDValue("https://example.org", `${XSD_NAMESPACE}anyURI`));

// Example 9: Utility functions
console.log("\n=== Utility Function Examples ===");
console.log("Is XSD datatype (integer):", isXSDDatatype(`${XSD_NAMESPACE}integer`));
console.log("Is XSD datatype (custom):", isXSDDatatype("https://example.org/myType"));
console.log("Get datatype enum:", getXSDDatatype(`${XSD_NAMESPACE}boolean`));

// Example 10: Error handling
console.log("\n=== Error Handling Examples ===");
try {
  encodeXSDValue("invalid", `${XSD_NAMESPACE}boolean`);
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.log("Boolean error:", errorMessage);
}

try {
  encodeXSDValue("999", `${XSD_NAMESPACE}byte`); // Out of range for byte
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.log("Byte range error:", errorMessage);
}

try {
  encodeXSDValue("invalid-date", `${XSD_NAMESPACE}date`);
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.log("Date format error:", errorMessage);
}

// Example 11: Custom array size
console.log("\n=== Custom Array Size Examples ===");
console.log("Boolean with size 64:", encodeXSDValue("true", `${XSD_NAMESPACE}boolean`, 64));
console.log("Integer with size 32:", encodeXSDValue("42", `${XSD_NAMESPACE}integer`, 32));

export {
  // Re-export for convenience
  encodeXSDValue,
  XSDDatatype,
  XSD_NAMESPACE,
  getXSDDatatype,
  isXSDDatatype
}; 