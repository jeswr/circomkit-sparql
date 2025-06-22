pragma circom 2.0.0;

template QueryVerifier() {
  signal input triples[2][3];
  signal output variables[1];
  signal output reveals[2];

  triples[0][0] === triples[1][0];

  variables[0] <== triples[0][0];

  reveals[0] <== triples[0][1];
  reveals[1] <== triples[1][1];

  triples[0][2] * 0 === 0;
  triples[1][2] * 0 === 0;

}
