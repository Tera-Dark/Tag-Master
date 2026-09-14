@echo off
setlocal
cd /d "%~dp0"
title Tag Master - Local Development
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 22 LTS first: https://nodejs.org/
  pause
  exit /b 1
)
node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 22 ? 0 : 1)"
if errorlevel 1 (
  echo Node.js 22 or newer is required. Please upgrade Node.js.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Installing locked dependencies...
  call npm ci
  if errorlevel 1 (
    echo Dependency installation failed. Check your network and try again.
    pause
    exit /b 1
  )
)
echo Starting Tag Master. Close this window or press Ctrl+C to stop.
call npm run dev -- --open
if errorlevel 1 pause
