/**
 * XML Schema Datatype Encoding Library for CIRCOM Circuits
 * 
 * This library implements encoding of XML Schema 1.1 datatypes as integer arrays
 * for use in CIRCOM zero-knowledge proof circuits.
 * 
 * Based on W3C XML Schema Definition Language (XSD) 1.1 Part 2: Datatypes
 * https://www.w3.org/TR/xmlschema11-2/
 */

import { stringToInts } from "./utils";

// Datatype IDs based on XML Schema hierarchy
export enum XSDDatatype {
  // Special datatypes
  ANY_SIMPLE_TYPE = 0,
  ANY_ATOMIC_TYPE = 1,
  
  // Primitive datatypes
  STRING = 10,
  BOOLEAN = 11,
  DECIMAL = 12,
  FLOAT = 13,
  DOUBLE = 14,
  DURATION = 15,
  DATE_TIME = 16,
  TIME = 17,
  DATE = 18,
  G_YEAR_MONTH = 19,
  G_YEAR = 20,
  G_MONTH_DAY = 21,
  G_DAY = 22,
  G_MONTH = 23,
  HEX_BINARY = 24,
  BASE64_BINARY = 25,
  ANY_URI = 26,
  QNAME = 27,
  NOTATION = 28,
  
  // Derived datatypes
  NORMALIZED_STRING = 30,
  TOKEN = 31,
  LANGUAGE = 32,
  NMTOKEN = 33,
  NMTOKENS = 34,
  NAME = 35,
  NCNAME = 36,
  ID = 37,
  IDREF = 38,
  IDREFS = 39,
  ENTITY = 40,
  ENTITIES = 41,
  INTEGER = 42,
  NON_POSITIVE_INTEGER = 43,
  NEGATIVE_INTEGER = 44,
  LONG = 45,
  INT = 46,
  SHORT = 47,
  BYTE = 48,
  NON_NEGATIVE_INTEGER = 49,
  UNSIGNED_LONG = 50,
  UNSIGNED_INT = 51,
  UNSIGNED_SHORT = 52,
  UNSIGNED_BYTE = 53,
  POSITIVE_INTEGER = 54,
  YEAR_MONTH_DURATION = 55,
  DAY_TIME_DURATION = 56,
  DATE_TIME_STAMP = 57
}

// XML Schema datatype namespace
export const XSD_NAMESPACE = "http://www.w3.org/2001/XMLSchema#";

// Mapping from XML Schema IRI to datatype enum
export const XSD_IRI_TO_TYPE: Record<string, XSDDatatype> = {
  [`${XSD_NAMESPACE}anySimpleType`]: XSDDatatype.ANY_SIMPLE_TYPE,
  [`${XSD_NAMESPACE}anyAtomicType`]: XSDDatatype.ANY_ATOMIC_TYPE,
  [`${XSD_NAMESPACE}string`]: XSDDatatype.STRING,
  [`${XSD_NAMESPACE}boolean`]: XSDDatatype.BOOLEAN,
  [`${XSD_NAMESPACE}decimal`]: XSDDatatype.DECIMAL,
  [`${XSD_NAMESPACE}float`]: XSDDatatype.FLOAT,
  [`${XSD_NAMESPACE}double`]: XSDDatatype.DOUBLE,
  [`${XSD_NAMESPACE}duration`]: XSDDatatype.DURATION,
  [`${XSD_NAMESPACE}dateTime`]: XSDDatatype.DATE_TIME,
  [`${XSD_NAMESPACE}time`]: XSDDatatype.TIME,
  [`${XSD_NAMESPACE}date`]: XSDDatatype.DATE,
  [`${XSD_NAMESPACE}gYearMonth`]: XSDDatatype.G_YEAR_MONTH,
  [`${XSD_NAMESPACE}gYear`]: XSDDatatype.G_YEAR,
  [`${XSD_NAMESPACE}gMonthDay`]: XSDDatatype.G_MONTH_DAY,
  [`${XSD_NAMESPACE}gDay`]: XSDDatatype.G_DAY,
  [`${XSD_NAMESPACE}gMonth`]: XSDDatatype.G_MONTH,
  [`${XSD_NAMESPACE}hexBinary`]: XSDDatatype.HEX_BINARY,
  [`${XSD_NAMESPACE}base64Binary`]: XSDDatatype.BASE64_BINARY,
  [`${XSD_NAMESPACE}anyURI`]: XSDDatatype.ANY_URI,
  [`${XSD_NAMESPACE}QName`]: XSDDatatype.QNAME,
  [`${XSD_NAMESPACE}NOTATION`]: XSDDatatype.NOTATION,
  [`${XSD_NAMESPACE}normalizedString`]: XSDDatatype.NORMALIZED_STRING,
  [`${XSD_NAMESPACE}token`]: XSDDatatype.TOKEN,
  [`${XSD_NAMESPACE}language`]: XSDDatatype.LANGUAGE,
  [`${XSD_NAMESPACE}NMTOKEN`]: XSDDatatype.NMTOKEN,
  [`${XSD_NAMESPACE}NMTOKENS`]: XSDDatatype.NMTOKENS,
  [`${XSD_NAMESPACE}Name`]: XSDDatatype.NAME,
  [`${XSD_NAMESPACE}NCName`]: XSDDatatype.NCNAME,
  [`${XSD_NAMESPACE}ID`]: XSDDatatype.ID,
  [`${XSD_NAMESPACE}IDREF`]: XSDDatatype.IDREF,
  [`${XSD_NAMESPACE}IDREFS`]: XSDDatatype.IDREFS,
  [`${XSD_NAMESPACE}ENTITY`]: XSDDatatype.ENTITY,
  [`${XSD_NAMESPACE}ENTITIES`]: XSDDatatype.ENTITIES,
  [`${XSD_NAMESPACE}integer`]: XSDDatatype.INTEGER,
  [`${XSD_NAMESPACE}nonPositiveInteger`]: XSDDatatype.NON_POSITIVE_INTEGER,
  [`${XSD_NAMESPACE}negativeInteger`]: XSDDatatype.NEGATIVE_INTEGER,
  [`${XSD_NAMESPACE}long`]: XSDDatatype.LONG,
  [`${XSD_NAMESPACE}int`]: XSDDatatype.INT,
  [`${XSD_NAMESPACE}short`]: XSDDatatype.SHORT,
  [`${XSD_NAMESPACE}byte`]: XSDDatatype.BYTE,
  [`${XSD_NAMESPACE}nonNegativeInteger`]: XSDDatatype.NON_NEGATIVE_INTEGER,
  [`${XSD_NAMESPACE}unsignedLong`]: XSDDatatype.UNSIGNED_LONG,
  [`${XSD_NAMESPACE}unsignedInt`]: XSDDatatype.UNSIGNED_INT,
  [`${XSD_NAMESPACE}unsignedShort`]: XSDDatatype.UNSIGNED_SHORT,
  [`${XSD_NAMESPACE}unsignedByte`]: XSDDatatype.UNSIGNED_BYTE,
  [`${XSD_NAMESPACE}positiveInteger`]: XSDDatatype.POSITIVE_INTEGER,
  [`${XSD_NAMESPACE}yearMonthDuration`]: XSDDatatype.YEAR_MONTH_DURATION,
  [`${XSD_NAMESPACE}dayTimeDuration`]: XSDDatatype.DAY_TIME_DURATION,
  [`${XSD_NAMESPACE}dateTimeStamp`]: XSDDatatype.DATE_TIME_STAMP
};

/**
 * Encodes an XML Schema datatype value as an integer array for CIRCOM
 * @param value The lexical representation of the value
 * @param datatype The XML Schema datatype IRI
 * @param size The target array size (default: 128)
 * @returns Array of integers representing the encoded value
 */
export function encodeXSDValue(value: string, datatype: string, size: number = 128): number[] {
  const datatypeEnum = XSD_IRI_TO_TYPE[datatype];
  
  if (datatypeEnum === undefined) {
    throw new Error(`Unknown XML Schema datatype: ${datatype}`);
  }
  
  switch (datatypeEnum) {
    case XSDDatatype.BOOLEAN:
      return encodeBooleanValue(value, size);
    
    case XSDDatatype.INTEGER:
    case XSDDatatype.LONG:
    case XSDDatatype.INT:
    case XSDDatatype.SHORT:
    case XSDDatatype.BYTE:
    case XSDDatatype.NON_NEGATIVE_INTEGER:
    case XSDDatatype.NON_POSITIVE_INTEGER:
    case XSDDatatype.NEGATIVE_INTEGER:
    case XSDDatatype.POSITIVE_INTEGER:
    case XSDDatatype.UNSIGNED_LONG:
    case XSDDatatype.UNSIGNED_INT:
    case XSDDatatype.UNSIGNED_SHORT:
    case XSDDatatype.UNSIGNED_BYTE:
      return encodeIntegerValue(value, datatypeEnum, size);
    
    case XSDDatatype.DECIMAL:
      return encodeDecimalValue(value, size);
    
    case XSDDatatype.FLOAT:
      return encodeFloatValue(value, size);
    
    case XSDDatatype.DOUBLE:
      return encodeDoubleValue(value, size);
    
    case XSDDatatype.DATE_TIME:
    case XSDDatatype.DATE_TIME_STAMP:
      return encodeDateTimeValue(value, size);
    
    case XSDDatatype.DATE:
      return encodeDateValue(value, size);
    
    case XSDDatatype.TIME:
      return encodeTimeValue(value, size);
    
    case XSDDatatype.G_YEAR:
      return encodeGYearValue(value, size);
    
    case XSDDatatype.G_MONTH:
      return encodeGMonthValue(value, size);
    
    case XSDDatatype.G_DAY:
      return encodeGDayValue(value, size);
    
    case XSDDatatype.G_YEAR_MONTH:
      return encodeGYearMonthValue(value, size);
    
    case XSDDatatype.G_MONTH_DAY:
      return encodeGMonthDayValue(value, size);
    
    case XSDDatatype.DURATION:
    case XSDDatatype.YEAR_MONTH_DURATION:
    case XSDDatatype.DAY_TIME_DURATION:
      return encodeDurationValue(value, size);
    
    case XSDDatatype.HEX_BINARY:
      return encodeHexBinaryValue(value, size);
    
    case XSDDatatype.BASE64_BINARY:
      return encodeBase64BinaryValue(value, size);
    
    default:
      // For string-based types, use string encoding
      return encodeStringValue(value, size);
  }
}

/**
 * Encode boolean value
 * Format: [datatype_id, boolean_value, padding...]
 */
function encodeBooleanValue(value: string, size: number): number[] {
  const normalizedValue = value.trim().toLowerCase();
  let boolValue: number;
  
  if (normalizedValue === "true" || normalizedValue === "1") {
    boolValue = 1;
  } else if (normalizedValue === "false" || normalizedValue === "0") {
    boolValue = 0;
  } else {
    throw new Error(`Invalid boolean value: ${value}`);
  }
  
  const result = [XSDDatatype.BOOLEAN, boolValue];
  return result.concat(Array(size - result.length).fill(0));
}

/**
 * Encode integer values with range validation
 * Format: [datatype_id, sign_bit, magnitude_bytes...]
 */
function encodeIntegerValue(value: string, datatype: XSDDatatype, size: number): number[] {
  const num = BigInt(value.trim());
  
  // Validate ranges based on datatype
  validateIntegerRange(num, datatype);
  
  // Convert to two's complement representation
  const isNegative = num < 0n;
  const magnitude = isNegative ? -num : num;
  
  // Convert to bytes (little-endian)
  const bytes: number[] = [];
  let temp = magnitude;
  while (temp > 0n || bytes.length === 0) {
    bytes.push(Number(temp & 0xFFn));
    temp = temp >> 8n;
  }
  
  const result = [datatype, isNegative ? 1 : 0, ...bytes];
  return result.concat(Array(size - result.length).fill(0));
}

/**
 * Validate integer ranges according to XML Schema specification
 */
function validateIntegerRange(value: bigint, datatype: XSDDatatype): void {
  switch (datatype) {
    case XSDDatatype.BYTE:
      if (value < -128n || value > 127n) throw new Error(`Value ${value} out of range for byte`);
      break;
    case XSDDatatype.SHORT:
      if (value < -32768n || value > 32767n) throw new Error(`Value ${value} out of range for short`);
      break;
    case XSDDatatype.INT:
      if (value < -2147483648n || value > 2147483647n) throw new Error(`Value ${value} out of range for int`);
      break;
    case XSDDatatype.LONG:
      if (value < -9223372036854775808n || value > 9223372036854775807n) throw new Error(`Value ${value} out of range for long`);
      break;
    case XSDDatatype.UNSIGNED_BYTE:
      if (value < 0n || value > 255n) throw new Error(`Value ${value} out of range for unsignedByte`);
      break;
    case XSDDatatype.UNSIGNED_SHORT:
      if (value < 0n || value > 65535n) throw new Error(`Value ${value} out of range for unsignedShort`);
      break;
    case XSDDatatype.UNSIGNED_INT:
      if (value < 0n || value > 4294967295n) throw new Error(`Value ${value} out of range for unsignedInt`);
      break;
    case XSDDatatype.UNSIGNED_LONG:
      if (value < 0n || value > 18446744073709551615n) throw new Error(`Value ${value} out of range for unsignedLong`);
      break;
    case XSDDatatype.NON_NEGATIVE_INTEGER:
      if (value < 0n) throw new Error(`Value ${value} must be non-negative`);
      break;
    case XSDDatatype.NON_POSITIVE_INTEGER:
      if (value > 0n) throw new Error(`Value ${value} must be non-positive`);
      break;
    case XSDDatatype.NEGATIVE_INTEGER:
      if (value >= 0n) throw new Error(`Value ${value} must be negative`);
      break;
    case XSDDatatype.POSITIVE_INTEGER:
      if (value <= 0n) throw new Error(`Value ${value} must be positive`);
      break;
  }
}

/**
 * Encode decimal value
 * Format: [datatype_id, sign_bit, integer_part_bytes..., decimal_places, fractional_part_bytes...]
 */
function encodeDecimalValue(value: string, size: number): number[] {
  const trimmed = value.trim();
  const match = trimmed.match(/^([+-]?)(\d+)(?:\.(\d+))?$/);
  
  if (!match) {
    throw new Error(`Invalid decimal format: ${value}`);
  }
  
  const [, sign, integerPart, fractionalPart = ""] = match;
  const isNegative = sign === "-";
  
  // Encode integer part
  const integerBytes = encodeDigitsToBytes(integerPart);
  
  // Encode fractional part
  const fractionalBytes = encodeDigitsToBytes(fractionalPart);
  
  const result = [
    XSDDatatype.DECIMAL,
    isNegative ? 1 : 0,
    integerBytes.length,
    ...integerBytes,
    fractionalBytes.length,
    ...fractionalBytes
  ];
  
  return result.concat(Array(size - result.length).fill(0));
}

/**
 * Encode float value (IEEE 754 single precision)
 * Format: [datatype_id, ieee754_bytes...]
 */
function encodeFloatValue(value: string, size: number): number[] {
  const num = parseFloat(value.trim());
  
  if (!isFinite(num) && !isNaN(num)) {
    // Handle special values
    return encodeSpecialFloatValue(value, XSDDatatype.FLOAT, size);
  }
  
  // Convert to IEEE 754 single precision
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setFloat32(0, num, true); // little-endian
  
  const bytes = Array.from(new Uint8Array(buffer));
  const result = [XSDDatatype.FLOAT, ...bytes];
  
  return result.concat(Array(size - result.length).fill(0));
}

/**
 * Encode double value (IEEE 754 double precision)
 * Format: [datatype_id, ieee754_bytes...]
 */
function encodeDoubleValue(value: string, size: number): number[] {
  const num = parseFloat(value.trim());
  
  if (!isFinite(num) && !isNaN(num)) {
    // Handle special values
    return encodeSpecialFloatValue(value, XSDDatatype.DOUBLE, size);
  }
  
  // Convert to IEEE 754 double precision
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setFloat64(0, num, true); // little-endian
  
  const bytes = Array.from(new Uint8Array(buffer));
  const result = [XSDDatatype.DOUBLE, ...bytes];
  
  return result.concat(Array(size - result.length).fill(0));
}

/**
 * Handle special float values (INF, -INF, NaN)
 */
function encodeSpecialFloatValue(value: string, datatype: XSDDatatype, size: number): number[] {
  const trimmed = value.trim().toUpperCase();
  let specialValue: number;
  
  if (trimmed === "INF" || trimmed === "+INF") {
    specialValue = 1; // Positive infinity
  } else if (trimmed === "-INF") {
    specialValue = 2; // Negative infinity
  } else if (trimmed === "NAN") {
    specialValue = 3; // NaN
  } else {
    throw new Error(`Invalid float value: ${value}`);
  }
  
  const result = [datatype, specialValue];
  return result.concat(Array(size - result.length).fill(0));
}

/**
 * Encode date-time value
 * Format: [datatype_id, year_bytes..., month, day, hour, minute, second, microsecond_bytes..., timezone_offset_bytes...]
 */
function encodeDateTimeValue(value: string, size: number): number[] {
  const match = value.trim().match(/^(-?\d{4,})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(?:Z|([+-])(\d{2}):(\d{2}))?$/);
  
  if (!match) {
    throw new Error(`Invalid dateTime format: ${value}`);
  }
  
  const [, year, month, day, hour, minute, second, fractionalSecond = "", tzSign, tzHour, tzMinute] = match;
  
  const yearNum = parseInt(year);
  const yearBytes = encodeSignedInteger(yearNum);
  
  // Encode fractional seconds as microseconds
  const microseconds = fractionalSecond ? parseInt(fractionalSecond.padEnd(6, '0').slice(0, 6)) : 0;
  const microsecondBytes = encodeUnsignedInteger(microseconds);
  
  // Encode timezone offset in minutes
  let timezoneOffset = 0;
  if (tzSign) {
    timezoneOffset = (parseInt(tzHour) * 60 + parseInt(tzMinute)) * (tzSign === '+' ? 1 : -1);
  }
  const timezoneBytes = encodeSignedInteger(timezoneOffset);
  
  const result = [
    XSDDatatype.DATE_TIME,
    yearBytes.length,
    ...yearBytes,
    parseInt(month),
    parseInt(day),
    parseInt(hour),
    parseInt(minute),
    parseInt(second),
    microsecondBytes.length,
    ...microsecondBytes,
    timezoneBytes.length,
    ...timezoneBytes
  ];
  
  return result.concat(Array(size - result.length).fill(0));
}

/**
 * Encode date value (similar to dateTime but without time components)
 */
function encodeDateValue(value: string, size: number): number[] {
  const match = value.trim().match(/^(-?\d{4,})-(\d{2})-(\d{2})(?:Z|([+-])(\d{2}):(\d{2}))?$/);
  
  if (!match) {
    throw new Error(`Invalid date format: ${value}`);
  }
  
  const [, year, month, day, tzSign, tzHour, tzMinute] = match;
  
  const yearNum = parseInt(year);
  const yearBytes = encodeSignedInteger(yearNum);
  
  // Encode timezone offset in minutes
  let timezoneOffset = 0;
  if (tzSign) {
    timezoneOffset = (parseInt(tzHour) * 60 + parseInt(tzMinute)) * (tzSign === '+' ? 1 : -1);
  }
  const timezoneBytes = encodeSignedInteger(timezoneOffset);
  
  const result = [
    XSDDatatype.DATE,
    yearBytes.length,
    ...yearBytes,
    parseInt(month),
    parseInt(day),
    timezoneBytes.length,
    ...timezoneBytes
  ];
  
  return result.concat(Array(size - result.length).fill(0));
}

/**
 * Encode time value
 */
function encodeTimeValue(value: string, size: number): number[] {
  const match = value.trim().match(/^(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(?:Z|([+-])(\d{2}):(\d{2}))?$/);
  
  if (!match) {
    throw new Error(`Invalid time format: ${value}`);
  }
  
  const [, hour, minute, second, fractionalSecond = "", tzSign, tzHour, tzMinute] = match;
  
  // Encode fractional seconds as microseconds
  const microseconds = fractionalSecond ? parseInt(fractionalSecond.padEnd(6, '0').slice(0, 6)) : 0;
  const microsecondBytes = encodeUnsignedInteger(microseconds);
  
  // Encode timezone offset in minutes
  let timezoneOffset = 0;
  if (tzSign) {
    timezoneOffset = (parseInt(tzHour) * 60 + parseInt(tzMinute)) * (tzSign === '+' ? 1 : -1);
  }
  const timezoneBytes = encodeSignedInteger(timezoneOffset);
  
  const result = [
    XSDDatatype.TIME,
    parseInt(hour),
    parseInt(minute),
    parseInt(second),
    microsecondBytes.length,
    ...microsecondBytes,
    timezoneBytes.length,
    ...timezoneBytes
  ];
  
  return result.concat(Array(size - result.length).fill(0));
}

/**
 * Encode gYear value
 */
function encodeGYearValue(value: string, size: number): number[] {
  const match = value.trim().match(/^(-?\d{4,})(?:Z|([+-])(\d{2}):(\d{2}))?$/);
  
  if (!match) {
    throw new Error(`Invalid gYear format: ${value}`);
  }
  
  const [, year, tzSign, tzHour, tzMinute] = match;
  
  const yearNum = parseInt(year);
  const yearBytes = encodeSignedInteger(yearNum);
  
  // Encode timezone offset in minutes
  let timezoneOffset = 0;
  if (tzSign) {
    timezoneOffset = (parseInt(tzHour) * 60 + parseInt(tzMinute)) * (tzSign === '+' ? 1 : -1);
  }
  const timezoneBytes = encodeSignedInteger(timezoneOffset);
  
  const result = [
    XSDDatatype.G_YEAR,
    yearBytes.length,
    ...yearBytes,
    timezoneBytes.length,
    ...timezoneBytes
  ];
  
  return result.concat(Array(size - result.length).fill(0));
}

/**
 * Encode gMonth value
 */
function encodeGMonthValue(value: string, size: number): number[] {
  const match = value.trim().match(/^--(\d{2})(?:Z|([+-])(\d{2}):(\d{2}))?$/);
  
  if (!match) {
    throw new Error(`Invalid gMonth format: ${value}`);
  }
  
  const [, month, tzSign, tzHour, tzMinute] = match;
  
  // Encode timezone offset in minutes
  let timezoneOffset = 0;
  if (tzSign) {
    timezoneOffset = (parseInt(tzHour) * 60 + parseInt(tzMinute)) * (tzSign === '+' ? 1 : -1);
  }
  const timezoneBytes = encodeSignedInteger(timezoneOffset);
  
  const result = [
    XSDDatatype.G_MONTH,
    parseInt(month),
    timezoneBytes.length,
    ...timezoneBytes
  ];
  
  return result.concat(Array(size - result.length).fill(0));
}

/**
 * Encode gDay value
 */
function encodeGDayValue(value: string, size: number): number[] {
  const match = value.trim().match(/^---(\d{2})(?:Z|([+-])(\d{2}):(\d{2}))?$/);
  
  if (!match) {
    throw new Error(`Invalid gDay format: ${value}`);
  }
  
  const [, day, tzSign, tzHour, tzMinute] = match;
  
  // Encode timezone offset in minutes
  let timezoneOffset = 0;
  if (tzSign) {
    timezoneOffset = (parseInt(tzHour) * 60 + parseInt(tzMinute)) * (tzSign === '+' ? 1 : -1);
  }
  const timezoneBytes = encodeSignedInteger(timezoneOffset);
  
  const result = [
    XSDDatatype.G_DAY,
    parseInt(day),
    timezoneBytes.length,
    ...timezoneBytes
  ];
  
  return result.concat(Array(size - result.length).fill(0));
}

/**
 * Encode gYearMonth value
 */
function encodeGYearMonthValue(value: string, size: number): number[] {
  const match = value.trim().match(/^(-?\d{4,})-(\d{2})(?:Z|([+-])(\d{2}):(\d{2}))?$/);
  
  if (!match) {
    throw new Error(`Invalid gYearMonth format: ${value}`);
  }
  
  const [, year, month, tzSign, tzHour, tzMinute] = match;
  
  const yearNum = parseInt(year);
  const yearBytes = encodeSignedInteger(yearNum);
  
  // Encode timezone offset in minutes
  let timezoneOffset = 0;
  if (tzSign) {
    timezoneOffset = (parseInt(tzHour) * 60 + parseInt(tzMinute)) * (tzSign === '+' ? 1 : -1);
  }
  const timezoneBytes = encodeSignedInteger(timezoneOffset);
  
  const result = [
    XSDDatatype.G_YEAR_MONTH,
    yearBytes.length,
    ...yearBytes,
    parseInt(month),
    timezoneBytes.length,
    ...timezoneBytes
  ];
  
  return result.concat(Array(size - result.length).fill(0));
}

/**
 * Encode gMonthDay value
 */
function encodeGMonthDayValue(value: string, size: number): number[] {
  const match = value.trim().match(/^--(\d{2})-(\d{2})(?:Z|([+-])(\d{2}):(\d{2}))?$/);
  
  if (!match) {
    throw new Error(`Invalid gMonthDay format: ${value}`);
  }
  
  const [, month, day, tzSign, tzHour, tzMinute] = match;
  
  // Encode timezone offset in minutes
  let timezoneOffset = 0;
  if (tzSign) {
    timezoneOffset = (parseInt(tzHour) * 60 + parseInt(tzMinute)) * (tzSign === '+' ? 1 : -1);
  }
  const timezoneBytes = encodeSignedInteger(timezoneOffset);
  
  const result = [
    XSDDatatype.G_MONTH_DAY,
    parseInt(month),
    parseInt(day),
    timezoneBytes.length,
    ...timezoneBytes
  ];
  
  return result.concat(Array(size - result.length).fill(0));
}

/**
 * Encode duration value
 * Format: [datatype_id, sign_bit, years, months, days, hours, minutes, seconds, microseconds...]
 */
function encodeDurationValue(value: string, size: number): number[] {
  const match = value.trim().match(/^(-?)P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/);
  
  if (!match) {
    throw new Error(`Invalid duration format: ${value}`);
  }
  
  const [, sign, years = "0", months = "0", days = "0", hours = "0", minutes = "0", seconds = "0"] = match;
  
  const isNegative = sign === "-";
  
  // Parse seconds with fractional part
  const secondsFloat = parseFloat(seconds);
  const wholeSeconds = Math.floor(secondsFloat);
  const microseconds = Math.round((secondsFloat - wholeSeconds) * 1000000);
  
  const microsecondBytes = encodeUnsignedInteger(microseconds);
  
  const result = [
    XSDDatatype.DURATION,
    isNegative ? 1 : 0,
    parseInt(years),
    parseInt(months),
    parseInt(days),
    parseInt(hours),
    parseInt(minutes),
    wholeSeconds,
    microsecondBytes.length,
    ...microsecondBytes
  ];
  
  return result.concat(Array(size - result.length).fill(0));
}

/**
 * Encode hexBinary value
 */
function encodeHexBinaryValue(value: string, size: number): number[] {
  const trimmed = value.trim().replace(/\s/g, '');
  
  if (!/^[0-9A-Fa-f]*$/.test(trimmed)) {
    throw new Error(`Invalid hexBinary format: ${value}`);
  }
  
  const bytes: number[] = [];
  for (let i = 0; i < trimmed.length; i += 2) {
    const hexByte = trimmed.slice(i, i + 2);
    bytes.push(parseInt(hexByte, 16));
  }
  
  const result = [XSDDatatype.HEX_BINARY, bytes.length, ...bytes];
  return result.concat(Array(size - result.length).fill(0));
}

/**
 * Encode base64Binary value
 */
function encodeBase64BinaryValue(value: string, size: number): number[] {
  const trimmed = value.trim().replace(/\s/g, '');
  
  try {
    // Decode base64 to get the original bytes
    const decoded = atob(trimmed);
    const bytes = Array.from(decoded, char => char.charCodeAt(0));
    
    const result = [XSDDatatype.BASE64_BINARY, bytes.length, ...bytes];
    return result.concat(Array(size - result.length).fill(0));
  } catch (error) {
    throw new Error(`Invalid base64Binary format: ${value}`);
  }
}

/**
 * Encode string value (fallback for string-based types)
 */
function encodeStringValue(value: string, size: number): number[] {
  const result = [XSDDatatype.STRING, ...stringToInts(value, size - 1)];
  return result.slice(0, size); // Ensure we don't exceed size
}

/**
 * Helper function to encode digits as bytes
 */
function encodeDigitsToBytes(digits: string): number[] {
  return digits.split('').map(d => parseInt(d));
}

/**
 * Helper function to encode signed integer as variable-length bytes
 */
function encodeSignedInteger(value: number): number[] {
  const isNegative = value < 0;
  const magnitude = Math.abs(value);
  
  const bytes: number[] = [];
  let temp = magnitude;
  do {
    bytes.push(temp & 0xFF);
    temp = temp >> 8;
  } while (temp > 0);
  
  return [isNegative ? 1 : 0, ...bytes];
}

/**
 * Helper function to encode unsigned integer as variable-length bytes
 */
function encodeUnsignedInteger(value: number): number[] {
  if (value < 0) {
    throw new Error("Cannot encode negative value as unsigned integer");
  }
  
  const bytes: number[] = [];
  let temp = value;
  do {
    bytes.push(temp & 0xFF);
    temp = temp >> 8;
  } while (temp > 0);
  
  return bytes;
}

/**
 * Get the XML Schema datatype for a given IRI
 */
export function getXSDDatatype(iri: string): XSDDatatype | undefined {
  return XSD_IRI_TO_TYPE[iri];
}

/**
 * Check if an IRI represents an XML Schema datatype
 */
export function isXSDDatatype(iri: string): boolean {
  return iri in XSD_IRI_TO_TYPE;
}

/**
 * Get the IRI for an XML Schema datatype
 */
export function getXSDIRI(datatype: XSDDatatype): string {
  for (const [iri, type] of Object.entries(XSD_IRI_TO_TYPE)) {
    if (type === datatype) {
      return iri;
    }
  }
  throw new Error(`Unknown datatype: ${datatype}`);
}
