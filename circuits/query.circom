pragma circom 2.0.0;

include "circomlib/circuits/comparators.circom";

template QueryVerifier() {
  signal input triples[3][3];
  signal input terms[1][128];
  signal output variables[1];
  signal output reveals[3];


  triples[0][0] === triples[1][0];
  triples[0][0] === triples[2][0];

  component f0 = GreaterEqThan(32);
  f0.in[0] <== terms[0][1];
  f0.in[1] <== 18;
  f0.out === 1;

  component f1 = LessThan(32);
  f1.in[0] <== terms[0][1];
  f1.in[1] <== 25;
  f1.out === 1;

  component f2 = IsEqual();
  f2.in[0] <== terms[0][1];
  f2.in[1] <== 20;
  f2.out === 0;

  terms[0][0] === 5;

  variables[0] <== triples[0][0];

  reveals[0] <== triples[0][1];
  reveals[1] <== triples[1][1];
  reveals[2] <== triples[2][1];

  triples[1][2] * 0 === 0;
  triples[2][2] * 0 === 0;

}
