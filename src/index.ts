import { Circomkit } from "circomkit";

async function main() {
  // create circomkit
  const circomkit = new Circomkit({
    protocol: "groth16",
  });

  // artifacts output at `build/sparql_age_jesse` directory
  await circomkit.compile("sparql_age_jesse", {
    file: "sparql_age",
    template: "AgeVerifier",
    params: [],
  });

  // proof & public signals at `build/sparql_age_jesse/my_input` directory
  await circomkit.prove("sparql_age_jesse", "my_input", { 
    "triples": [[0, 1, 19]]
   });

  // verify with proof & public signals at `build/sparql_age_jesse/my_input`
  const ok = await circomkit.verify("sparql_age_jesse", "my_input");
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
