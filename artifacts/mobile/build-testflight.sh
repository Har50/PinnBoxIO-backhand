#!/bin/bash
cd "$(dirname "$0")"
npx eas-cli build --platform ios --profile production --auto-submit
