@echo off
setlocal
title MatchaJob Platform - Docker Logs
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\logs-dev.ps1" %*
exit /b %ERRORLEVEL%
