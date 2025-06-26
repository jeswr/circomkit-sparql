# SPARQL-to-Circuit Compiler

This repository implements a **SPARQL-to-Circuit compiler** that generates zero-knowledge circuits from SPARQL queries using [Circomkit](https://github.com/erhant/circomkit). It allows you to prove knowledge of RDF data that satisfies a SPARQL query without revealing the actual data values.

## Current stage

We have a working SPARQL (susbet) -> CIRCOM compiler (see [src/generateFunctional.ts](./src/generateFunctional.ts)); and would now like to work out how to integrate the matrix lookup arguments.

For now lets talk in terms of the example:

* generate circuit [./circuits/query.circom](./circuits/query.circom) - generated from [./sparql.rq](./sparql.rq)
* input data [./circuits/artefacts/my_input.json](./circuits/artefacts/my_input.json) - generated from [./data.ttl](./data.ttl)

I would now like support to develop the matrix lookup for the input triples in the circuit.

Note that the current input triples look like `triple[3][3][128]` . This is a different representation to Christophs most recent paper (who would've had an input of `triple[3][5]` to represent [subject, predicate, object, object datatype, graph]) the differences are that:

* We do not currently describe the graph name (which was the 5th element)
* We use the first bit of the 128 bit term signal to represent the datatype for each term
* We use the remaining 127 bits to describe the string in the case of IRI (think URL) terms; or the datatype value of datatypes - e.g. the integer 2012 is represneted as `[3, 2012, 0, ..., 0]`, the boolean true is represneted as `[4, 1, 0, ..., 0]` and the IRI `http://example.org/jesse` is represented as `[ 104, 116, 116, 112,  58,  47, 47, 101, 120,  97, 109, 112, 108, 101,  46, 111, 114, 103, 47, 106, 101, 115, 115, 101, 0, ..., 0]`. This enabled me to prove properties on strings.

I am happy to change the input signal back to something like `triple[3][5]` - or `triple[3][3]`; it would be ideal if we could still prove properties of strings based on the field representaiton of an IRI. Is this possible? I seem to remember an indication that it was not in one of our calls.

## Key Files

* src/generateFunctional.ts - this is the code for converting SPARQL to circuits

## Design Choices

To reduce complexity of the circuits - we place the following restrictions on input datatypes:

* Datatypes must be well-formed - for instance "a"^^xsd:integer cannot be encoded or provided to the circuit
* Only one form of semantically equal literals are supported. E.g. "true"^^xsd:boolean is supported, "1"^^xsd:boolean is not. "1"^^xsd:integer is supported "01"^^xsd:integer is not.

## How It Works

The system translates SPARQL queries into Circom circuits that can verify:

- **RDF triple patterns** match your private data
- **FILTER constraints** are satisfied (age ranges, data types, language tags, etc.)
- **Variable bindings** are consistent across the query

## Example Query

The current SPARQL query (`sparql.rq`) demonstrates age-based filtering with type constraints:

```sparql
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX xs: <http://www.w3.org/2001/XMLSchema#>

SELECT ?person WHERE {
  ?person foaf:age ?age ;
          foaf:knows ?friend ;
          foaf:name ?name .

  FILTER (?age >= xs:integer(18))
  FILTER (?age < xs:integer(25))
  FILTER (?age != xs:integer(20))
  FILTER (isIRI(?friend))
  FILTER (isLITERAL(?name))
  FILTER (lang(?name) = "en")
}
```

This query finds people aged 18-24 (but not 20) who know someone and have an English name.

## Repository Structure

### Core Files

- **`sparql.rq`** - SPARQL query to be converted to a circuit
- **`data.ttl`** - RDF data in Turtle format (your private knowledge base)
- **`circuits/query.circom`** - Generated Circom circuit file
- **`circuits/artefacts/my_input.json`** - **🔑 Input file** (which is where we need to be putting the signed data)
- **`circuits/artefacts/query.json`** - **📋 Query specification** (defines required terms and reveals)
- **`circuits.json`** - Circuit configurations

### Source Code (`src/`)

- **`generate.ts`** - Main compiler (SPARQL → Circom)
- **`termId.ts`** - RDF term encoding scheme
- **`createMockInput.ts`** - Generates signed input from RDF data
- **`conversion.ts`** - String/integer utilities

## 🔑 Critical: `my_input.json` Format

**This is the signed input file that issuers must generate.** It contains the private witness data for your zero-knowledge proof.

### Structure Overview

```json
{
  "triples": [
    [0, 1, 2],    // subject_id, predicate_id, object_id
    [0, 3, 4],    // References to term vocabulary
    [0, 5, 6]
  ],
  "terms": [
    [5, 19, 0, 0, 0, ...],      // Integer: age value 19
    [0, 104, 116, 116, ...],    // Named Node: IRI 
    [2, 101, 110, 0, 0, ...]    // Language tag: "en"
  ]
}
```

### Field Explanations

#### `triples` Array

- Each `[subject_id, predicate_id, object_id]` represents one RDF triple
- IDs reference positions in your dataset's term vocabulary
- Example: `[0, 1, 2]` means "term_0 predicate_1 term_2"

#### `terms` Array

Each term is encoded as a **128-element integer array**:

**Position 0 (Term Type):**

- `0` = Named Node (IRI)
- `2` = Language-tagged literal
- `3` = String literal
- `4` = Boolean literal
- `5` = Integer literal ⭐ (used in age filtering)
- `6-19` = Other XSD datatypes
- `21` = Plain literal

**Positions 1-127 (Term Data):**

- **Integers** (type 5): `[5, actual_value, 0, 0, ...]`
- **Strings/IRIs**: UTF-8 encoded bytes, zero-padded to 127 elements
- **Language tags**: Language code bytes (e.g., "en" = `[101, 110, 0, ...]`)

### Example Encoding

From the sample data:

```json
[5, 19, 0, 0, ...]           // Integer literal: age 19
[0, 104, 116, 116, ...]      // Named node: "http://example.org/bob"
[2, 101, 110, 0, ...]        // Language tag: "en"
```

## 📋 Query Specification: `query.json`

The `query.json` file is automatically generated during circuit compilation and serves as the **interface specification** between the circuit and your input data. It defines exactly what terms must be included and what will be revealed.

### Structure

```json
{
  "termInputs": [
    [0, 2],    // Triple 0, position 2 (object) - the age value
    [1, 2],    // Triple 1, position 2 (object) - the friend IRI  
    [2, 2]     // Triple 2, position 2 (object) - the name literal
  ],
  "variables": [
    "person"   // Output variable names from SELECT clause
  ],
  "reveals": [
    [0, 1],    // Triple 0, position 1 (predicate) - foaf:age
    [1, 1],    // Triple 1, position 1 (predicate) - foaf:knows
    [2, 1]     // Triple 2, position 1 (predicate) - foaf:name
  ]
}
```

### Field Explanations

#### `termInputs` Array

- **Purpose**: Specifies which RDF terms need detailed encoding in `my_input.json`
- **Format**: `[triple_index, position]` where position is 0=subject, 1=predicate, 2=object
- **Why needed**: These terms are used in FILTER constraints (age comparisons, type checks, language matching)
- **Circuit usage**: Accessed as `terms[i]` arrays for property verification

#### `variables` Array

- **Purpose**: Maps circuit output variables to SPARQL SELECT variables
- **Format**: Array of variable names from your SPARQL query
- **Circuit usage**: Values returned as `variables[i]` outputs

#### `reveals` Array

- **Purpose**: Specifies which RDF terms will be publicly revealed in the proof - verifiers MUST check that the terms in the reveals array correspond to expected terms in patterns of the query.
- **Format**: `[triple_index, position]` coordinates in your triple pattern
- **Circuit usage**: Output as `reveals[i]` signals

### External Verification Requirements

**⚠️ Important**: The circuit only proves your data satisfies the FILTER constraints. **You must verify the revealed values externally** to complete the proof verification:

#### Revealed Predicates Check

From the example `reveals`:

```json
"reveals": [[0, 1], [1, 1], [2, 1]]
```

**External verification must confirm**:

- `reveals[0]` = `foaf:age` (correct predicate for age)
- `reveals[1]` = `foaf:knows` (correct predicate for friendship)
- `reveals[2]` = `foaf:name` (correct predicate for name)

#### Why External Checks Are Needed

The circuit proves:

- ✅ Age is between 18-24 (but not 20)
- ✅ Friend is an IRI
- ✅ Name is a literal with English language tag
- ❌ **Does NOT prove the predicates are correct**

Without external verification, someone could use:

- `foaf:height` instead of `foaf:age` (wrong property)
- `foaf:enemy` instead of `foaf:knows` (wrong relationship)

#### Verification Code Example

```typescript
// After proof verification, check revealed values
const revealedPredicates = proof.publicSignals.reveals;
const expectedPredicates = ['foaf:age', 'foaf:knows', 'foaf:name'];

for (let i = 0; i < expectedPredicates.length; i++) {
  if (revealedPredicates[i] !== expectedPredicates[i]) {
    throw new Error(`Wrong predicate at position ${i}`);
  }
}
```

## Workflow

### For Repository Owners

1. **Define Query**: Edit `sparql.rq` with your SPARQL query
2. **Generate Circuit**: `npm run generate` (creates `circuits/query.circom`)
3. **Setup Circuit**: `npx circomkit setup query`

### For Issuers (Data Providers)

1. **Prepare Data**: Create your private `data.ttl` file matching the query structure
2. **Generate Input**: `npm run input` (creates signed `circuits/artefacts/my_input.json`)
3. **Create Proof**: `npm run start` (generates zero-knowledge proof)
4. **Verify**: `npx circomkit verify query my_input`

### Complete Demo

```bash
# Clean build and run full pipeline
npm run demo
```

## Technical Details

### Term Encoding Scheme

The system uses a sophisticated encoding where RDF terms are converted to fixed-size integer arrays:

- **Type safety**: First element indicates the RDF term type
- **Data packing**: Remaining 127 elements contain UTF-8 encoded content
- **Zero-padding**: Shorter terms are padded with zeros
- **Maximum length**: 127 bytes per term (UTF-8 encoded)

### Circuit Generation

The SPARQL-to-Circom compiler:

- Translates BGP (Basic Graph Patterns) to triple constraints
- Converts FILTER expressions to arithmetic circuits
- Handles variable joins across triple patterns
- Supports comparison operators (`>`, `<`, `=`, `!=`, `>=`, `<=`)
- Implements type checking (IRI, literal, language tag validation)

### Supported SPARQL Features

- ✅ Basic Graph Patterns (BGP)
- ✅ FILTER expressions with comparisons
- ✅ Type checking (`isIRI`, `isLITERAL`)
- ✅ Language tag matching (`lang(?var) = "en"`)
- ✅ Integer arithmetic constraints
- ✅ Variable joins
- ❌ OPTIONAL patterns (not yet supported)
- ❌ UNION operations (not yet supported)

## Performance

Performance benchmarks for the example SPARQL query (age filtering with 3 triple patterns):

```
Setup: Circuit compilation and trusted setup
Proof generation: ~936ms 
Proof verification: ~121ms
Protocol: PLONK
```

**Notes:**

- Performance scales with query complexity (number of triple patterns and FILTER constraints)
- Initial setup includes circuit compilation and cryptographic parameter generation
- Proof generation time is dominated by constraint satisfaction
- Verification is fast and suitable for real-time applications
- PLONK protocol provides universal setup (no per-circuit trusted setup required)
