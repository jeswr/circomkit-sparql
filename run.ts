import secp256k1 from "secp256k1";
import { randomBytes } from "crypto";

// function that takes a string input; creates a new public key and private key; signs the input with the private key; and returns the signature
// function sign(input) {
//   const pairs = ecdsaGenerateKeyPair();
//   const signature = ecdsaSign(input, pairs.privateKey);
//   return { signature, publicKey: pairs.publicKey };
// }

// console.log(sign("Hello, world!"));

const msg = randomBytes(32)

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


