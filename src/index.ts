import { Circomkit } from "circomkit";
import fs from "fs";
import { fromIndex } from "./termId";
import { termToString } from "rdf-string-ttl";

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

  // const ptau = "11";
  // const ptau = "11";

  // if (ptau) {
  //   // check if ptau file exists
  //   if (!fs.existsSync(`./ptau/powersOfTau28_hez_final_${ptau}.ptau`)) {
  //     // download ptau file
  //     const response = await fetch(`https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_${ptau}.ptau`);
  //     const data = await response.arrayBuffer();
  //     fs.writeFileSync(`./ptau/powersOfTau28_hez_final_${ptau}.ptau`, Buffer.from(data));
  //   }

  //   // manually setup with correct ptau file
  //   await circomkit.setup("query_test", `./ptau/powersOfTau28_hez_final_${ptau}.ptau`);
  // }

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
    const metadata = JSON.parse(fs.readFileSync("circuits/artefacts/query.json", "utf8"));
    const publicSignals = JSON.parse(await fs.readFileSync("build/query_test/my_input/public.json", "utf8"));
    const variables = metadata.variables;
    const result = variables.map((variable: string, index: number) => {
      return {
        [variable]: termToString(fromIndex(publicSignals.slice(index * 128, (index + 1) * 128).map((x: string) => parseInt(x.toString())))),
      };
    });
    console.log(result);
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
