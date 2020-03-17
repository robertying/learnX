#!/bin/bash

APK_DIR="android/app/build/outputs/bundle/release"

bundletool build-apks --bundle=$APK_DIR/app-release.aab --output=$APK_DIR/app-release.apks --overwrite
bundletool install-apks --apks=$APK_DIR/app-release.apks
