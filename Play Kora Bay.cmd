@echo off
setlocal
if not exist "%~dp0dist\index.html" (
  echo Kora Bay could not find its game files.
  echo Extract the entire Kora-Bay-playable.zip first, then run this launcher.
  echo Keep the dist folder next to this file.
  pause
  exit /b 1
)
echo Opening Kora Bay in your default browser...
start "" "%~dp0dist\index.html"
if errorlevel 1 (
  echo The browser could not open automatically.
  echo Open the dist folder, then right-click index.html and choose Open with Chrome or Edge.
  pause
  exit /b 1
)
