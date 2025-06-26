#!/bin/bash

echo "🧪 Testing Chat API Response..."
echo ""

# Test 1: OEE Query
echo "📋 Test 1: OEE Query"
echo "===================="
curl -s -X POST http://localhost:3000/api/chat/conversational \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Show me OEE for all equipment today",
    "sessionId": "test-'$(date +%s)'",
    "userId": "test-user"
  }' | python -m json.tool

echo ""
echo ""

# Test 2: Downtime Query
echo "📋 Test 2: Downtime Query"
echo "======================="
curl -s -X POST http://localhost:3000/api/chat/conversational \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is my largest downtime cause?",
    "sessionId": "test-'$(date +%s)'",
    "userId": "test-user"
  }' | python -m json.tool