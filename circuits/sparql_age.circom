pragma circom 2.0.0;

include "circomlib/circuits/comparators.circom";

// Simple age verification circuit
template AgeVerifier() {
    signal input triples[1][3];
    // signal output valid;
    signal output v1;
    signal output predicate;

    // Check if age is greater than 18
    // Using a simple comparison: if age > 18, then valid = 1, else valid = 0
    component isPositive = LessThan(32);
    isPositive.in[0] <== 18;
    isPositive.in[1] <== triples[0][2];
    
    // isPositive.out ==> valid;
    isPositive.out === 1;
    name <== triples[0][0];
    predicate <== triples[0][1];
}
