@echo off
title Kafka Consumer - Food Delivery
color 0A
echo.
echo ========================================
echo   Starting Kafka Consumer
echo ========================================
echo.

REM Check if Node.js is available
where node >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if kafka-consumer.js exists
if not exist "kafka-consumer.js" (
    echo ERROR: kafka-consumer.js not found!
    echo Please run this script from the project root directory.
    pause
    exit /b 1
)

echo Starting Kafka Consumer...
echo.
echo Expected output:
echo   ✅ Redis connected for consumer
echo   ✅ Kafka consumer connected to Socket.IO server
echo   ✅ Kafka Consumer connected
echo   🎧 Kafka consumer is listening for order events...
echo.
echo If you don't see these messages, check:
echo   1. Docker is running (docker ps)
echo   2. Kafka container is healthy
echo   3. Redis container is healthy
echo.
echo ========================================
echo.

REM Run the Kafka consumer with auto-restart on crash
:start
node kafka-consumer.js
if errorlevel 1 (
    echo.
    echo ========================================
    echo   Kafka Consumer crashed!
    echo ========================================
    echo.
    echo Restarting in 5 seconds...
    echo Press Ctrl+C to stop
    timeout /t 5 /nobreak
    goto start
)

pause
