@echo off
echo Starting Claude Code in Manufacturing Analytics Platform using WSL...

REM Convert Windows path to WSL path
set WINPATH=D:\Source\manufacturing-analytics-platform
set WSLPATH=/mnt/d/Source/manufacturing-analytics-platform

echo.
echo Make sure you have installed Claude Code in WSL with:
echo wsl bash -c "npm install -g @anthropic-ai/claude-code"
echo.

echo Starting Claude Code...
wsl bash -c "cd %WSLPATH% && claude-code"

echo.
echo If Claude Code didn't start, please check:
echo 1. You have WSL installed (Run: wsl --install)
echo 2. You have installed Claude Code in WSL