#!/bin/bash

echo "::endgroup::" # ::group::Start Docker container

BUILD_USER="builder"

# Prepare environment
mkdir /build
chown "$BUILD_USER" /build
cd /build
sudo -EHu "$BUILD_USER" /build-scripts/build.sh
