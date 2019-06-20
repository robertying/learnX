#!/bin/bash

cp -r patch/node_modules .

pushd node_modules/react-native-interactable
rm -rf \{ios\,android\} && rm -rf android && rm -rf ios
ln -s lib/android . && ln -s lib/ios .
popd
