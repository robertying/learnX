#!/bin/bash

BASEDIR=$(dirname "$0")
cd $BASEDIR/../

tar cvf secrets.tar.gz android/keystores/release.keystore .env.default
travis encrypt-file secrets.tar.gz --add
