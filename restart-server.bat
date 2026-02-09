@echo off
echo Stopping all Node.js processes...
taskkill /F /IM node.exe >nul 2>&1

echo Waiting for processes to stop...
timeout /t 2 >nul

echo Starting backend server...
cd server
start cmd /k "npm start"

echo.
echo ✓ Server restart initiated!
echo Watch the new terminal window for server logs.
echo You should see:
echo   [Init] Server timeout set to 1 hour for long audio operations
echo   [Init] Keep-alive timeout: 61 minutes
echo   [Init] Headers timeout: 62 minutes
echo.
pause
