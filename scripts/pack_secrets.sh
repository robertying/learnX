#!/bin/bash

BASEDIR=$(dirname "$0")
cd $BASEDIR/../

tar cvf secrets.tar.gz android/keystores/release.keystore fastlane/key.json \
    ios/GoogleService-Info.plist ios/CodePush.plist \
    android/app/google-services.json android/app/src/main/res/values/codepush.xml
travis encrypt-file secrets.tar.gz --add
