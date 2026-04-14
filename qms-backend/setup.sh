#!/bin/bash
echo "==================================="
echo " QMS Pro - Backend Setup (Mac/Linux)"
echo "==================================="

if [ ! -f .env ]; then
    cp .env.example .env
    echo "Created .env — please set DB_PASSWORD in .env then re-run."
    exit 1
fi

composer install --no-interaction
php artisan key:generate
php artisan migrate:fresh --seed
echo ""
echo "✅ Setup complete! Starting server..."
php artisan serve
