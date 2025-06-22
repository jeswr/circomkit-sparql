import { Circomkit } from "circomkit";
import fs from "fs";

async function main() {
  // create circomkit
  const circomkit = new Circomkit({
    protocol: "plonk",
  });

  // artifacts output at `build/sparql_age_jesse` directory
  await circomkit.compile("query_test", {
    file: "query",
    template: "QueryVerifier",
    params: [],
  });

  // proof & public signals at `build/sparql_age_jesse/my_input` directory
  console.time("Proof generation");
  await circomkit.prove("query_test", "my_input", JSON.parse(fs.readFileSync("circuits/artefacts/my_input.json", "utf8")));
  console.timeEnd("Proof generation");

  // verify with proof & public signals at `build/sparql_age_jesse/my_input`
  console.time("Proof verification");
  const ok = await circomkit.verify("query_test", "my_input");
  console.timeEnd("Proof verification");
  
  if (ok) {
    circomkit.log.log("Proof verified!", "success");
  } else {
    circomkit.log.log("Verification failed.", "error");
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
