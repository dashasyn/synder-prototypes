#!/bin/bash
# Start the Synder UX Tools server + Cloudflare tunnel
DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="/tmp"

# Start Node server
echo "Starting Node server on :8080..."
cd "$DIR"
node server.js > "$LOG_DIR/ux-tools-server.log" 2>&1 &
NODE_PID=$!
echo "Node PID: $NODE_PID"

# Wait for server to be ready
for i in $(seq 1 10); do
  if curl -s http://127.0.0.1:8080/api/load/per-transaction-audit > /dev/null 2>&1; then
    echo "Node server is ready!"
    break
  fi
  sleep 1
done

# Start Cloudflare tunnel
echo "Starting Cloudflare tunnel..."
/tmp/cloudflared tunnel --url http://127.0.0.1:8080 > "$LOG_DIR/ux-tools-tunnel.log" 2>&1 &
TUNNEL_PID=$!
echo "Tunnel PID: $TUNNEL_PID"

# Wait for tunnel URL
for i in $(seq 1 15); do
  URL=$(grep -o 'https://[^ ]*trycloudflare.com' "$LOG_DIR/ux-tools-tunnel.log" 2>/dev/null | head -1)
  if [ -n "$URL" ]; then
    echo ""
    echo "========================================="
    echo "  Synder UX Tools is ready!"
    echo "  URL: $URL"
    echo "  Per-transaction audit: $URL/per-transaction-audit.html"
    echo "  Copy generator: $URL/copy-generator.html"
    echo "========================================="
    break
  fi
  sleep 1
done

# Save PIDs for cleanup
echo "$NODE_PID" > "$LOG_DIR/ux-tools-node.pid"
echo "$TUNNEL_PID" > "$LOG_DIR/ux-tools-tunnel.pid"

# Wait for either to exit
wait -n $NODE_PID $TUNNEL_PID
echo "A process exited, shutting down..."
kill $NODE_PID $TUNNEL_PID 2>/dev/null
