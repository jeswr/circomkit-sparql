pragma circom 2.1.2;

// TODO: Handle the path length 0 case
template Path(minLength, maxLength) {
  // REMEMBER THIS IS ALL ALREADY INSTANTIATED SINCE THESE ARE INPUT TRIPLES
  signal input path[maxLength][3][1];
  signal input predicate[1];
  signal input length;
  signal output subject[1];
  signal output object[1];

  1 === (length >= minLength);
  1 === (length <= maxLength);

  for (var i = 0; i < length; i += 1) {
    path[i][1] === predicate;
  }

  for (var i = 1; i < length; i += 1) {
    path[i-1][2] === path[i][1];
  }

  subject <== path[0][0];
  object <== path[length - 1][2];
}
