#!/bin/bash

echo "=========================================================="
echo "              Starting Vobi Voice Backend                 "
echo "=========================================================="

# 1. Start python server in the background
echo "-> Starting Python backend..."
cd pipeline
../.venv/bin/python server.py &
SERVER_PID=$!
cd ..

# 2. Start cloudflared in the background
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

# 3. Update frontend configuration
echo "-> Updating frontend with new URL..."
sed -i "s|const API_BASE = '.*';|const API_BASE = '${URL}';|g" src/utils/api.js

# 4. Automatically deploy to GitHub Pages
echo "-> Deploying updated website to GitHub Pages..."
npm run deploy

echo ""
echo "=========================================================="
echo " 🎉 SUCCESS! Backend is running and website is updated! 🎉"
echo " Anyone can now visit your GitHub Pages site to test it."
echo ""
echo " (Your laptop's microphone and speakers are active for calls)"
echo " Press Ctrl+C to shut everything down."
echo "=========================================================="

# Wait for user to press Ctrl+C, then kill processes
trap "echo -e '\nShutting down...'; kill $SERVER_PID $TUNNEL_PID; exit" INT
wait
