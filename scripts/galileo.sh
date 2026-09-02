#!/usr/bin/env bash
# Galileo AI (LogRocket) query helper. ALWAYS saves the full response to /tmp/galileo-<chatID>.json
#   galileo.sh ask "<question>"        -> new query; prints chatID (server-generated; custom ones 500)
#   galileo.sh get <chatID> [prompt]   -> follow up in that chat to retrieve results
KEY="vn4kxj:synder_test:gy2Tjqcc5zYlbpCh88po"
URL="https://api.logrocket.com/v1/orgs/vn4kxj/apps/synder_test/ask-galileo/"
post() { curl -s -X POST "$URL" -H "Authorization: Token $KEY" -H "Content-Type: application/json" -d "$1"; }

# Retry cap — PERMISSIONS.md 🟢 allows up to 3 attempts at a failing query, after which
# it becomes 🟡 (tell Ignat what was tried). That was prose in a document, which makes it
# a suggestion; enforced here, it is a limit. Counter is per distinct query text / chatID,
# stored in /tmp so it survives within a working session and resets on reboot.
# Override for a genuinely new question that happens to repeat wording: GALILEO_RESET=1.
RETRY_CAP=3
cap_check() {
  local id; id=$(printf '%s' "$1" | cksum | cut -d' ' -f1)
  local f="/tmp/galileo-attempts-$id"
  [ -n "${GALILEO_RESET:-}" ] && rm -f "$f"
  local n=$(( $(cat "$f" 2>/dev/null || echo 0) + 1 ))
  printf '%s' "$n" > "$f"
  if [ "$n" -gt "$RETRY_CAP" ]; then
    echo "REFUSED: attempt $n on this query — cap is $RETRY_CAP (PERMISSIONS.md)." >&2
    echo "This is now 🟡: stop retrying, report to Ignat what was tried and what failed." >&2
    echo "Counter: $f — GALILEO_RESET=1 to override for a genuinely different question." >&2
    exit 3
  fi
  [ "$n" -gt 1 ] && echo "note: attempt $n of $RETRY_CAP on this query." >&2
}
case "$1" in
  ask) cap_check "ask:$2"; B=$(jq -cn --arg m "$2" '{message:$m}'); R=$(post "$B")
       C=$(printf '%s' "$R" | jq -r '.chatID // "ERR"')
       printf '%s' "$R" > "/tmp/galileo-$C.json"; echo "chatID=$C"; printf '%s' "$R" | jq -r '.status // .' | head -3 ;;
  get) cap_check "get:$2"
       P="${3:-Summarize your findings as plain text with concrete numbers. No charts, no visualizations, no follow-up questions.}"
       B=$(jq -cn --arg m "$P" --arg c "$2" '{message:$m,chatID:$c}'); R=$(post "$B")
       printf '%s' "$R" > "/tmp/galileo-$2-latest.json"
       printf '%s' "$R" | jq -r '.messages[] | select(.type=="assistant") | .messageContent' 2>/dev/null || printf '%s' "$R" ;;
esac
