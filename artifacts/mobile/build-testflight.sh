#!/bin/bash
cd "$(dirname "$0")"

# Write ASC API key from secret if available
if [ -n "$ASC_API_KEY_CONTENT" ]; then
  echo "$ASC_API_KEY_CONTENT" > /tmp/AuthKey.p8
  export EXPO_ASC_API_KEY_PATH=/tmp/AuthKey.p8
  echo "ASC API key written from secret."
fi

npx eas-cli build --platform ios --profile production --auto-submit
