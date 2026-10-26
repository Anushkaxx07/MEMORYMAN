@echo off
title SysScope - React Process Monitor
cd /d "%~dp0"

echo ========================================================
echo                 SysScope - Process Monitor
echo ========================================================
echo.

if not exist "sysscope.exe" (
    echo [1/3] Compiling sysscope.exe...
    g++ -std=c++14 -Wall -Wextra src\main.cpp -o sysscope.exe -lpsapi
    if errorlevel 1 (
        echo [ERROR] Failed to compile sysscope.exe. Please ensure g++ is installed.
        pause
        exit /b 1
    )
    echo [OK] sysscope.exe compiled successfully!
) else (
    echo [1/3] Found sysscope.exe.
)

cd ui
if not exist "node_modules" (
    echo [2/3] Installing UI dependencies...
    call npm install
)

echo [3/3] Starting SysScope React UI...
start http://localhost:5173
call npm run dev
pause
