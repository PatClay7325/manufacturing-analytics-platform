@echo off
echo Adding data-testid attributes to components for Playwright tests...

echo.
echo === Components that need data-testid attributes ===
echo 1. Chat container in manufacturing-chat/[id]/page.tsx
echo 2. Dashboard sections (production trends, equipment status, alerts)
echo 3. Alert list items
echo 4. Equipment/WorkUnit cards
echo 5. Chat messages
echo 6. Sample questions/prompts

echo.
echo Please manually add these data-testid attributes to fix the tests:
echo.
echo In src/app/manufacturing-chat/[id]/page.tsx:
echo - Add data-testid="chat-container" to the main chat div
echo - Add data-testid="loading-indicator" to loading spinner
echo.
echo In src/app/dashboard/page.tsx:
echo - Add data-testid="production-trends-chart" to chart container
echo - Add data-testid="alert-item" to alert list items
echo - Update "Equipment Status" heading to "Work Units" (per Prisma schema)
echo - Add data-testid="workunit-card" to work unit cards
echo.
echo In src/components/chat/ChatMessage.tsx:
echo - Add data-testid="chat-message" with data-sender attribute
echo - Add data-testid="chat-message-user" for user messages
echo - Add data-testid="chat-message-assistant" for AI messages
echo.
echo In src/app/manufacturing-chat/page.tsx:
echo - Add data-testid="suggested-prompts" container
echo - Add data-testid="suggested-prompt" to each prompt button
echo.
echo === Manual fixes required ===