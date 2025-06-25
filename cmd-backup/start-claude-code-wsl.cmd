@echo off
REM Launch script for Claude Code in WSL environment

echo Starting Claude Code in WSL environment...
echo.
echo This script helps overcome Playwright browser installation issues in WSL.
echo.

wsl -d Ubuntu-20.04 bash -c "cd $(wslpath '%~dp0') && ./start-claude.sh"