# SPARQL-to-Circuit Compiler

This repository implements a **SPARQL-to-Circuit compiler** that generates zero-knowledge circuits from SPARQL queries using [Circomkit](https://github.com/erhant/circomkit). It allows you to prove knowledge of RDF data that satisfies a SPARQL query without revealing the actual data values.

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

**This is the signed input file that collaborators must generate.** It contains the private witness data for your zero-knowledge proof.

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

### For Collaborators (Data Providers)

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
