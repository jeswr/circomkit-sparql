if [ ! -d "./venv" ]; then
  python3 -m venv ./venv
fi

source ./venv/bin/activate
python3 -m pip install python_jwt
python3 -m pip install cbor2


git submodule update --init --recursive

cd ./circuits/crescent-credentials/

git submodule update --init --recursive

# Generate the pem keys and certs
cd ../../

# Use the scripts in crescent-credentials to generate the pem keys and certs
cd ./circuits/crescent-credentials/circuit_setup/scripts/
bash run_setup.sh mdl1
cd ../../../../
mkdir -p ./inputs/mdl1/
cp -r ./circuits/crescent-credentials/circuit_setup/inputs/mdl1/ ./inputs/mdl1/

cd ./setup/
bash run.sh
