#!/bin/bash
# figma-fetch.sh — Cached Figma API wrapper
# Usage: figma-fetch.sh <endpoint> [cache_hours]
# Example: figma-fetch.sh "files/tSZzqtd28HCrnaY0Ku0Y6z/styles" 24
# Example: figma-fetch.sh "files/tSZzqtd28HCrnaY0Ku0Y6z/nodes?ids=102:182,102:326" 12
#
# - Caches responses in .figma-cache/
# - Default cache TTL: 24 hours
# - Skips API call if cache is fresh

WORKSPACE="/home/ubuntu/.openclaw/workspace"
CACHE_DIR="$WORKSPACE/.figma-cache"
TOKEN=$(cat "$WORKSPACE/.figma-token")
ENDPOINT="$1"
CACHE_HOURS="${2:-24}"

if [ -z "$ENDPOINT" ]; then
  echo "Usage: figma-fetch.sh <endpoint> [cache_hours]" >&2
  exit 1
fi

# Create cache key from endpoint (replace special chars)
CACHE_KEY=$(echo "$ENDPOINT" | sed 's/[^a-zA-Z0-9]/_/g')
CACHE_FILE="$CACHE_DIR/$CACHE_KEY.json"

# Check cache freshness
if [ -f "$CACHE_FILE" ]; then
  AGE_SECONDS=$(( $(date +%s) - $(stat -c %Y "$CACHE_FILE") ))
  MAX_SECONDS=$(( CACHE_HOURS * 3600 ))
  if [ "$AGE_SECONDS" -lt "$MAX_SECONDS" ]; then
    cat "$CACHE_FILE"
    exit 0
  fi
fi

# Fetch from API
RESPONSE=$(curl -s -H "X-Figma-Token: $TOKEN" "https://api.figma.com/v1/$ENDPOINT")

# Check for rate limit
if echo "$RESPONSE" | jq -e '.status == 429' > /dev/null 2>&1; then
  echo "RATE_LIMITED" >&2
  # Return stale cache if available
  if [ -f "$CACHE_FILE" ]; then
    echo "Using stale cache" >&2
    cat "$CACHE_FILE"
    exit 0
  fi
  echo "$RESPONSE"
  exit 1
fi

# Check for errors
if echo "$RESPONSE" | jq -e '.err' > /dev/null 2>&1; then
  echo "API error: $(echo "$RESPONSE" | jq -r '.err')" >&2
  echo "$RESPONSE"
  exit 1
fi

# Save to cache
echo "$RESPONSE" > "$CACHE_FILE"
cat "$CACHE_FILE"
