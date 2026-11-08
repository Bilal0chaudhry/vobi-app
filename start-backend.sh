#!/bin/bash

echo ""
echo "  🚀 Starting Vobi..."
echo ""

# Clean up any zombie processes from previous interrupted runs and free port 8000
killall cloudflared 2>/dev/null
pkill -9 -f "[s]erver\.py" 2>/dev/null
fuser -k -9 8000/tcp >/dev/null 2>&1
sleep 0.5

# Fail fast if the Python environment is broken (e.g. after an OS/Python upgrade)
# instead of deploying a frontend that points at a backend that can't start.
echo "  🐍 Checking backend environment..."
if ! (cd pipeline && .venv/bin/python -c "import server" 2>/tmp/vobi_import_error.log); then
  echo "  ❌ Backend failed to import. Details:"
  tail -5 /tmp/vobi_import_error.log | sed 's/^/     /'
  echo "  💡 Rebuild it: cd pipeline && rm -rf .venv && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt"
  exit 1
fi
echo "  ✅ Backend environment OK"

rm -f cloudflared.log
./cloudflared tunnel --url http://localhost:8000 2>cloudflared.log &
TUNNEL_PID=$!

# Ensure tunnel is killed on Ctrl+C or any script exit
trap "echo -e '\n  ✋ Shutting down...'; kill $TUNNEL_PID 2>/dev/null" INT TERM EXIT

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

cd pipeline
.venv/bin/python server.py
