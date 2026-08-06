#!/bin/bash

echo "=========================================================="
echo "              Starting Vobi Voice Backend                 "
echo "=========================================================="

# 1. Start cloudflared in the background
echo "-> Starting Cloudflare Tunnel..."
rm -f cloudflared.log
./cloudflared tunnel --url http://localhost:8000 2> cloudflared.log &
TUNNEL_PID=$!

echo "-> Waiting for secure public URL..."
# Loop until the URL is found in the log
while true; do
  URL=$(grep -oE "https://[a-zA-Z0-9-]+\.trycloudflare\.com" cloudflared.log | head -1)
  if [ ! -z "$URL" ]; then
    break
  fi
  sleep 1
done

echo ""
echo "✅ Cloudflare Tunnel is live at: $URL"
echo ""

# 2. Update frontend configuration
echo "-> Updating frontend with new URL..."
sed -i "s|const API_BASE = '.*';|const API_BASE = '${URL}';|g" src/utils/api.js

# 3. Automatically deploy to GitHub Pages
echo "-> Deploying updated website to GitHub Pages..."
npm run deploy

echo ""
echo "=========================================================="
echo " 🎉 SUCCESS! Backend is ready and website is updated! 🎉"
echo " Anyone can now visit your GitHub Pages site to test it."
echo " Waiting for incoming calls..."
echo "=========================================================="

# Trap Ctrl+C to clean up background processes
trap "echo -e '\nShutting down...'; kill $TUNNEL_PID; exit" INT

# 4. Start python server in the foreground! (so we can type 'y'/'n')
cd pipeline
.venv/bin/python server.py
