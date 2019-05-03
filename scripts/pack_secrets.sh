#!/bin/bash

BASEDIR=$(dirname "$0")
cd $BASEDIR/../

tar cvf secrets.tar.gz android/keystores/release.keystore fastlane/key.json
travis encrypt-file secrets.tar.gz --add
