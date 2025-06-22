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

  component f1 = LessThan(32);
  f1.in[0] <== triples[0][2];
  f1.in[1] <== 25;
  f1.out === 1;

  component f2 = GreaterEqThan(32);
  f2.in[0] <== triples[0][2];
  f2.in[1] <== 65;
  f2.out === 1;

  component f3 = LessThan(32);
  f3.in[0] <== triples[0][2];
  f3.in[1] <== 80;
  f3.out === 1;

  signal or_result_4;
  signal or_product_4;
  or_product_4 <== fnull.out * fnull.out;
  or_result_4 <== fnull.out + fnull.out - or_product_4;
  or_result_4 === 1;

  variables[0] <== triples[0][0];

  reveals[0] <== triples[0][1];
  reveals[1] <== triples[1][1];

  triples[1][2] * 0 === 0;

}
