@echo off
echo ===================================
echo  QMS Pro - Frontend (Windows)
echo ===================================
echo Installing dependencies...
call npm install
echo.
echo Starting dev server with API proxy...
echo Frontend: http://localhost:4200
echo.
call npx ng serve --proxy-config proxy.conf.json --open
