#!/bin/bash

echo "Testing Conversational Chat API..."

curl -X POST http://localhost:3000/api/chat/conversational-debug \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Compare performance between shifts",
    "sessionId": "test-session-123",
    "userId": "test-user"
  }' | jq .