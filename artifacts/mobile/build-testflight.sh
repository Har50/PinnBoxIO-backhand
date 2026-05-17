#!/bin/bash
cd "$(dirname "$0")"

# Write ASC API key from secret
if [ -n "$ASC_API_KEY_CONTENT" ]; then
  echo "-----BEGIN PRIVATE KEY-----" > /tmp/AuthKey.p8
  echo "$ASC_API_KEY_CONTENT" | tr ' ' '\n' >> /tmp/AuthKey.p8
  echo "-----END PRIVATE KEY-----" >> /tmp/AuthKey.p8
  chmod 600 /tmp/AuthKey.p8
  echo "ASC API key written."
fi

export EXPO_ASC_API_KEY_PATH=/tmp/AuthKey.p8
export EXPO_ASC_KEY_ID=XT5F8TSLWA
export EXPO_ASC_ISSUER_ID=29ecf491-9bfc-4605-8fb9-24c5b58604e3
export EXPO_APPLE_TEAM_TYPE=INDIVIDUAL

npx eas-cli@latest build --platform ios --profile production --non-interactive --auto-submit
