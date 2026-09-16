@echo off
for /f "tokens=2 delims=: " %%a in ('ipconfig ^| find "IPv4"') do (
  if not "%%a"=="127.0.0.1" echo %%a
)
