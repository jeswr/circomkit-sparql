cargo run --bin mdl-gen -- -c ../inputs/mdl1/claims.json -d ../inputs/mdl1/device.prv \
  -k ../inputs/mdl1/issuer.prv -x ../inputs/mdl1/issuer_certs.pem \
  -o ../generated_files/mdl1/mdl.cbor

cargo run --bin prepare-prover-input -- --config ../inputs/mdl1/config.json \
 --mdl ../inputs/mdl1/mdl.cbor \
 --prover_inputs ../generated_files/mdl1/prover_inputs.json \
 --prover_aux ../generated_files/mdl1/prover_aux.json
