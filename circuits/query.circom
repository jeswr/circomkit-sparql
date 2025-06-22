pragma circom 2.0.0;

include "circomlib/circuits/comparators.circom";

template QueryVerifier() {
  signal input triples[2][3];
  signal output variables[1];
  signal output reveals[2];

  triples[0][0] === triples[1][0];

  component f0 = GreaterEqThan(32);
  f0.in[0] <== triples[0][2];
  f0.in[1] <== 18;
  f0.out === 1;

  variables[0] <== triples[0][0];

  reveals[0] <== triples[0][1];
  reveals[1] <== triples[1][1];

  triples[1][2] * 0 === 0;

}
