#!/bin/bash

APK_DIR="android/app/build/outputs/bundle/release"
KS_DIR="android/app/release.keystore"

bundletool build-apks --bundle=$APK_DIR/app-release.aab --output=$APK_DIR/app-release.apks --ks=$KS_DIR --ks-key-alias=io.robertying.learnx.key --overwrite
bundletool install-apks --apks=$APK_DIR/app-release.apks
