import { Circomkit } from "circomkit";
import fs from "fs";
import { fromIndex } from "./termId";
import { termToString } from "rdf-string-ttl";
import secp256k1 from "secp256k1";
import { randomBytes } from "crypto";

async function main() {
  // create circomkit
  const circomkit = new Circomkit({
    protocol: "plonk",
    optimization: 1,
  });

  // artifacts output at `build/sparql_age_jesse` directory
  await circomkit.compile("test_test", {
    file: "test",
    template: "Main",
    params: [],
  });

  const msg = randomBytes(1234)

  // generate privKey
  let privKey
  do {
    privKey = randomBytes(32)
  } while (!secp256k1.privateKeyVerify(privKey))

  // get the public key in a compressed format
  const pubKey = secp256k1.publicKeyCreate(privKey)

  // sign the message
  const sigObj = secp256k1.ecdsaSign(msg, privKey)

  // verify the signature
  console.log(secp256k1.ecdsaVerify(sigObj.signature, msg, pubKey))
  // => true

  // proof & public signals at `build/sparql_age_jesse/my_input` directory

  const input = {
    message: Array.from(msg),
    pubkey: Array.from(pubKey),
    sig: Array.from(sigObj.signature),
    message_bytes: msg.length,
  }

  const lengths = {
    message: msg.length,
    pubkey: pubKey.length,
    sig: sigObj.signature.length,
    message_bytes: msg.length,
  }

  console.log(lengths)

  process.exit(0)

  console.time("Proof generation");
  await circomkit.prove("test_test", "my_input", input);
  console.timeEnd("Proof generation");

  // verify with proof & public signals at `build/sparql_age_jesse/my_input`
  console.time("Proof verification");
  const ok = await circomkit.verify("test_test", "my_input");
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
