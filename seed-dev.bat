@echo off
setlocal
title MatchaJob Platform - Seed Database
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\seed-data.ps1" %*
exit /b %ERRORLEVEL%
