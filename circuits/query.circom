pragma circom 2.1.2;

include "circomlib/circuits/comparators.circom";
include "./operators/langmatches.circom";

template QueryVerifier() {
  signal input triples[3][3];
  signal input terms[3][128];
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

  terms[1][0] === 0;

  component notZero2 = IsEqual();
  notZero2.in[0] <== terms[2][0];
  notZero2.in[1] <== 0;
  notZero2.out === 0;
  component notOne2 = IsEqual();
  notOne2.in[0] <== terms[2][0];
  notOne2.in[1] <== 1;
  notOne2.out === 0;

  component fl3 = Lang();
  component fle3 = StringEquals();
  fl3.in <== terms[2];
  fle3.in[0] <== fl3.out;
  fle3.in[1] <== [101, 110, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

  terms[0][0] === 5;

  variables[0] <== triples[0][0];

  reveals[0] <== triples[0][1];
  reveals[1] <== triples[1][1];
  reveals[2] <== triples[2][1];


}
