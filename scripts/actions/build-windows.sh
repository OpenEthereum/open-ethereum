#!/bin/bash
set -e # fail on any error
set -u # treat unset variables as error

echo "__________Show ENVIROMENT__________"
echo "CC:               " $CC
echo "CXX:              " $CXX
  # NOTE: Enables the aes-ni instructions for RustCrypto dependency.
  # If you change this please remember to also update .cargo/config
export RUSTFLAGS=" -Ctarget-feature=+aes,+sse2,+ssse3 -Ctarget-feature=+crt-static  -Clink-arg=-s"

echo "_____ Build OpenEthereum and tools _____"
time cargo build --verbose --release --features final
time cargo build --verbose --release -p evmbin
time cargo build --verbose --release -p ethstore-cli
time cargo build --verbose --release -p ethkey-cli

echo "_____ Post-processing binaries _____"
rm -rf artifacts
mkdir -p artifacts
cd artifacts

cp --verbose ../../target/release/parity.exe ./parity.exe
cp --verbose ../../target/release/parity-evm.exe ./parity-evm.exe
cp --verbose ../../target/release/ethstore.exe ./ethstore.exe
cp --verbose ../../target/release/ethkey.exe ./ethkey.exe

echo "_____ Calculating checksums _____"
for binary in $(ls)
do
  rhash --sha256 $binary -o $binary.sha256
  ./parity.exe tools hash $binary > $binary.sha3
done

echo "_____ Zip artifacts _____"
cd ..
zip -r artifacts.zip artifacts/
