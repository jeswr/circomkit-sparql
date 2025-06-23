pragma circom 2.0.0;

template Lang() {
  signal input in[128];
  signal input prefix[length];
  signal output out;

  out <== str[0] === prefix[0] && str[1] === prefix[1] && str[2] === prefix[2];
}
