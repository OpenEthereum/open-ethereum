#!/bin/bash

set -e # fail on any error
set -u # treat unset variables as error

case ${CI_COMMIT_REF_NAME} in
  nightly|*v2.1*) export CHANNEL="edge";;
  beta|*v2.0*) export CHANNEL="beta";;
  stable|*v1.11*) export CHANNEL="stable";;
  *) echo "No release" exit 0;;
esac
echo "Release channel :" $CHANNEL " Branch/tag: " $CI_COMMIT_REF_NAME

echo $SNAPCRAFT_LOGIN_PARITY_BASE64 | base64 --decode > snapcraft.login
snapcraft login --with snapcraft.login

# snapcraft push fails if the same version is already there
if snapcraft status --arch $BUILD_ARCH parity | grep -qE "${CHANNEL} +${VERSION} "
then
  echo "> version ${VERSION} already present in channel ${CHANNEL}:"
  snapcraft status --arch $BUILD_ARCH parity
else
  snapcraft push --release $CHANNEL "artifacts/parity_"$VERSION"_"$BUILD_ARCH".snap"
  snapcraft status parity
fi
snapcraft logout
