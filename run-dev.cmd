@echo off
setlocal
set PATH=C:\Program Files\nodejs;%PATH%
cd /d "%~dp0"
call "C:\Program Files\nodejs\npm.cmd" run dev -- --hostname 127.0.0.1 --port 3000
