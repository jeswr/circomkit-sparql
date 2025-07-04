import { ManifestLoader, TestCaseQueryEvaluation } from 'rdf-test-suite';
import { translate } from 'sparqlalgebrajs';

const UNSUPPORTED_OPERATIONS = [
  'SUM',
  'COUNT',
  'AVG',
  'MIN',
  'MAX',
  'SAMPLE',
  'GROUP_CONCAT(',
  'MINUS',
  'NOT EXISTS',
  // Operations that we can support; because the verifier needs to just check outside of the circuit
  'ORDER BY',
  'LIMIT',
  'GROUP BY',
  // Operations we can support; because the verifier needs to just check outside of the circuit
  'UNION',
  // Operations that we could just ignore
  'OFFSET',
]

async function main() {
  const manifestLoader = new ManifestLoader();
  const manifest = await manifestLoader.from('http://w3c.github.io/rdf-tests/sparql/sparql11/manifest-all.ttl');
  
  
  console.log(manifest.specifications?.['http://www.w3.org/TR/sparql11-query/']
    ?.subManifests
    ?.flatMap((subManifest) => subManifest.testEntries)
    ?.filter((testEntry) => testEntry?.types.includes('http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#QueryEvaluationTest'))
    ?.map((testEntry) => (testEntry as TestCaseQueryEvaluation).queryString)
    ?.filter((query) => !UNSUPPORTED_OPERATIONS.some((operation) => query.includes(operation)))
    ?.filter((query) => translate(query, { baseIRI: 'http://example.org/' }).type === 'project')
  );
}

main();
