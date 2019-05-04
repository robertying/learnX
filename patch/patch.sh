#!/bin/bash

cp patch/redux-persist-expo-securestore.js node_modules/redux-persist-expo-securestore/src/index.js

pushd node_modules/react-native-interactable
rm -rf \{ios\,android\} && rm -rf android && rm -rf ios
ln -s lib/android . && ln -s lib/ios .
popd
