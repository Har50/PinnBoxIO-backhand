#!/bin/bash
set -e
cd "$(dirname "$0")"
eas build --platform ios --profile production --non-interactive
eas submit --platform ios --profile production --non-interactive --latest
