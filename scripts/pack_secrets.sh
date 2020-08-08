#!/bin/bash

BASEDIR=$(dirname "$0")
cd $BASEDIR/../

tar cvf secrets.tar.gz android/keystores/release.keystore fastlane/key.json \
    ios/GoogleService-Info.plist \
    android/app/google-services.json \
    .env
travis encrypt-file --com secrets.tar.gz --add
