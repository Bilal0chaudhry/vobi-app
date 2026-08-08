#!/bin/bash

echo "=========================================================="
echo "              Starting Vobi Voice Backend                 "
echo "=========================================================="

# 1. Generate a unique API key for this session
API_KEY=$(openssl rand -hex 32)

# 2. Inject the API key into the Python backend's environment
export VOBI_API_KEY="$API_KEY"

# 3. Start cloudflared in the background
echo "-> Starting Cloudflare Tunnel..."
rm -f cloudflared.log
./cloudflared tunnel --url http://localhost:8000 2>cloudflared.log &
TUNNEL_PID=$!

echo "-> Waiting for secure public URL..."
while true; do
  URL=$(grep -oE "https://[a-zA-Z0-9-]+\.trycloudflare\.com" cloudflared.log | head -1)
  if [ ! -z "$URL" ]; then
    break
  fi
  sleep 1
done

# 4. Inject the tunnel URL and API key into the frontend
echo "-> Updating frontend with new URL and API key..."
sed -i "s|const API_BASE = \".*\";|const API_BASE = \"${URL}\";|g" src/utils/api.js
sed -i "s|const API_KEY = \".*\";|const API_KEY = \"${API_KEY}\";|g" src/utils/api.js

# 5. Deploy to GitHub Pages
echo "-> Deploying updated website to GitHub Pages..."
npm run deploy

# 6. Wait for GitHub Pages cache to clear
echo "-> Waiting for GitHub Pages to update its global cache (this usually takes 1-3 minutes)..."
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
echo "=========================================================="
echo " 🎉 SUCCESS! Backend and Website are running! 🎉"
echo " The website cache is fully cleared. Anyone can visit:"
echo " https://bilal0chaudhry.github.io/vobi-app/"
echo " Waiting for incoming calls..."
echo "=========================================================="

trap "echo -e '\nShutting down...'; kill $TUNNEL_PID; exit" INT

# 7. Start python server in the foreground
cd pipeline
.venv/bin/python server.py
