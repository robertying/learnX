#!/bin/bash

APK_DIR="android/app/build/outputs/apk/release"
cp $APK_DIR/app-x86_64-release.apk $APK_DIR/learnX-x86_64-$VERSION_TAG.apk
cp $APK_DIR/app-arm64-v8a-release.apk $APK_DIR/learnX-arm64-v8a-$VERSION_TAG.apk
cp $APK_DIR/app-armeabi-v7a-release.apk $APK_DIR/learnX-armeabi-v7a-$VERSION_TAG.apk
cp $APK_DIR/app-x86-release.apk $APK_DIR/learnX-x86-$VERSION_TAG.apk
cp $APK_DIR/app-universal-release.apk $APK_DIR/learnX-universal-$VERSION_TAG.apk
