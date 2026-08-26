#!/usr/bin/env bash
# Galileo AI (LogRocket) query helper. ALWAYS saves the full response to /tmp/galileo-<chatID>.json
#   galileo.sh ask "<question>"        -> new query; prints chatID (server-generated; custom ones 500)
#   galileo.sh get <chatID> [prompt]   -> follow up in that chat to retrieve results
KEY="vn4kxj:synder_test:gy2Tjqcc5zYlbpCh88po"
URL="https://api.logrocket.com/v1/orgs/vn4kxj/apps/synder_test/ask-galileo/"
post() { curl -s -X POST "$URL" -H "Authorization: Token $KEY" -H "Content-Type: application/json" -d "$1"; }
case "$1" in
  ask) B=$(jq -cn --arg m "$2" '{message:$m}'); R=$(post "$B")
       C=$(printf '%s' "$R" | jq -r '.chatID // "ERR"')
       printf '%s' "$R" > "/tmp/galileo-$C.json"; echo "chatID=$C"; printf '%s' "$R" | jq -r '.status // .' | head -3 ;;
  get) P="${3:-Summarize your findings as plain text with concrete numbers. No charts, no visualizations, no follow-up questions.}"
       B=$(jq -cn --arg m "$P" --arg c "$2" '{message:$m,chatID:$c}'); R=$(post "$B")
       printf '%s' "$R" > "/tmp/galileo-$2-latest.json"
       printf '%s' "$R" | jq -r '.messages[] | select(.type=="assistant") | .messageContent' 2>/dev/null || printf '%s' "$R" ;;
esac
