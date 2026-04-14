#!/bin/bash
echo "=================================="
echo " QMS Pro - Frontend (Mac/Linux)"
echo "=================================="
npm install
echo ""
echo "Starting dev server with API proxy..."
echo "Frontend: http://localhost:4200"
npx ng serve --proxy-config proxy.conf.json --open
