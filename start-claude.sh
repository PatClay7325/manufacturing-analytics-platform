#!/bin/bash

# Start script for Claude Code in Linux environment

echo "Starting Claude Code..."
echo
echo "This script ensures that the correct dependencies are installed for testing."
echo

# Check if dependencies are installed
if ! dpkg -s libnss3 libnspr4 libasound2 > /dev/null 2>&1; then
  echo "Installing browser dependencies..."
  sudo apt-get update && sudo apt-get install -y libnss3 libnspr4 libasound2
fi

# Start Claude Code with your project
cd "$(dirname "$0")"
npx claude-code .