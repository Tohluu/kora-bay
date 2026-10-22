@echo off
setlocal
cd /d "%~dp0"
if not exist "%~dp0server.cjs" goto missingfiles
if not exist "%~dp0dist\index.html" goto missingfiles
set "KORA_NODE_BIN="
if exist "%ProgramFiles%\nodejs\node.exe" set "KORA_NODE_BIN=%ProgramFiles%\nodejs\node.exe"
if defined KORA_NODE_BIN goto startgame
where node >nul 2>nul
if not errorlevel 1 set "KORA_NODE_BIN=node"
if defined KORA_NODE_BIN goto startgame
echo Node.js was not found. Install Node.js 20 or newer, then open this launcher again.
echo You can still play without online phone features using Play Kora Bay.cmd.
pause
exit /b 1

:startgame
echo Starting Kora Bay. Keep this window open while you play.
echo If the browser does not open, copy this address into Chrome or Edge:
echo http://localhost:4173/
"%KORA_NODE_BIN%" server.cjs --open
if errorlevel 1 echo Kora Bay could not start. The error message is above.
pause
exit /b

:missingfiles
echo Kora Bay could not find its game files.
echo Extract the entire Kora-Bay-playable.zip first, then run this launcher.
echo Keep server.cjs and the dist folder next to this file.
pause
exit /b 1
