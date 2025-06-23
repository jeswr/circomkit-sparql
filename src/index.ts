import { Circomkit } from "circomkit";
import fs from "fs";

async function main() {
  // create circomkit
  const circomkit = new Circomkit({
    protocol: "plonk",
    optimization: 2,
  });

  // artifacts output at `build/sparql_age_jesse` directory
  await circomkit.compile("query_test", {
    file: "query",
    template: "QueryVerifier",
    params: [],
  });

  // check if ptau file exists
  if (!fs.existsSync("./ptau/powersOfTau28_hez_final_09.ptau")) {
    // download ptau file
    const response = await fetch("https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_09.ptau");
    const data = await response.arrayBuffer();
    fs.writeFileSync("./ptau/powersOfTau28_hez_final_09.ptau", Buffer.from(data));
  }

  // manually setup with correct ptau file
  await circomkit.setup("query_test", "./ptau/powersOfTau28_hez_final_09.ptau");

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
