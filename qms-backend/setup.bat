@echo off
echo ===================================
echo  QMS Pro - Backend Setup (Windows)
echo ===================================

if not exist .env (
    copy .env.example .env
    echo Created .env from .env.example
    echo.
    echo IMPORTANT: Edit .env and set your DB_PASSWORD before continuing!
    echo Then re-run this script.
    pause
    exit
)

echo Installing dependencies...
call composer install --no-interaction

echo Generating app key...
call php artisan key:generate

echo Running migrations and seeding...
call php artisan migrate:fresh --seed

echo.
echo ✅ Setup complete! Starting server...
echo Server running at: http://localhost:8000
echo.
call php artisan serve
