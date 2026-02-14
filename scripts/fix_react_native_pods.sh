#!/bin/bash

pushd ios/Pods/hermes-engine/destroot/Library/Frameworks/universal/hermesvm.xcframework/ios-arm64_x86_64-maccatalyst/hermesvm.framework
rm -r hermesvm Resources
ln -s Versions/Current/Resources Resources
ln -s Versions/Current/hermesvm hermesvm
pushd Versions && rm -r Current && ln -s 1 Current && popd
popd

pushd ios/Pods/React-Core-prebuilt/React.xcframework/ios-arm64_x86_64-maccatalyst/React.framework
rm -r React Resources
ln -s Versions/Current/Resources Resources
ln -s Versions/Current/React React
pushd Versions && rm -r Current && ln -s A Current && popd
popd

pushd ios/Pods/ReactNativeDependencies/framework/packages/react-native/ReactNativeDependencies.xcframework/ios-arm64_x86_64-maccatalyst/ReactNativeDependencies.framework
rm -r ReactNativeDependencies Resources
ln -s Versions/Current/Resources Resources
ln -s Versions/Current/ReactNativeDependencies ReactNativeDependencies
pushd Versions && rm -r Current && ln -s A Current && popd
mv ReactNativeDependencies_*.bundle Resources
popd
