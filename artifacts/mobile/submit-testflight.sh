#!/bin/bash
cd "$(dirname "$0")"
npx eas-cli submit --platform ios --profile production --latest
