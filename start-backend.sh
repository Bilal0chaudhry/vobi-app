#!/bin/bash

echo ""
echo "  🚀 Starting Vobi..."
echo ""

API_KEY=$(openssl rand -hex 32)
export VOBI_API_KEY="$API_KEY"

echo "  🔑 API key generated"

rm -f cloudflared.log
./cloudflared tunnel --url http://localhost:8000 2>cloudflared.log &
TUNNEL_PID=$!

echo "  🌐 Starting tunnel..."
while true; do
  URL=$(grep -oE "https://[a-zA-Z0-9-]+\.trycloudflare\.com" cloudflared.log | grep -v "api.trycloudflare.com" | head -1)
  if [ ! -z "$URL" ]; then
    break
  fi
  
  if grep -q "failed to request quick Tunnel" cloudflared.log || ! kill -0 $TUNNEL_PID 2>/dev/null; then
    echo "  ⚠️ Cloudflare tunnel failed to start. Retrying..."
    kill $TUNNEL_PID 2>/dev/null
    rm -f cloudflared.log
    ./cloudflared tunnel --url http://localhost:8000 2>cloudflared.log &
    TUNNEL_PID=$!
  fi
  sleep 1
done
echo "  ✅ Tunnel ready: $URL"

echo "VITE_API_BASE=$URL" > .env.local

echo "  📦 Building & deploying..."
npm run deploy --silent 2>/dev/null

echo "  ⏳ Waiting for GitHub Pages cache..."
while true; do
  JS_PATH=$(curl -s https://bilal0chaudhry.github.io/vobi-app/ | grep -o 'assets/index-[a-zA-Z0-9_-]*\.js' | head -1)
  if [ ! -z "$JS_PATH" ]; then
    if curl -s "https://bilal0chaudhry.github.io/vobi-app/$JS_PATH" | grep -q "$URL"; then
      break
    fi
  fi
  sleep 5
done

echo ""
echo "  ════════════════════════════════════════════"
echo "  ✅ Vobi is live!"
echo "  🌐 https://bilal0chaudhry.github.io/vobi-app/"
echo "  📞 Waiting for calls..."
echo "  ════════════════════════════════════════════"
echo ""

trap "echo -e '\n  ✋ Shutting down...'; kill $TUNNEL_PID; exit" INT

cd pipeline
.venv/bin/python server.py
