@echo off
echo Connecting to PostgreSQL and setting new password...
echo.

"C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d postgres -h localhost -p 5432 -c "ALTER USER postgres PASSWORD 'admin123';"

if %ERRORLEVEL% EQU 0 (
    echo SUCCESS! Password changed to 'admin123'
    echo.
    echo Creating secureexam database if it doesn't exist...
    "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d postgres -h localhost -p 5432 -c "CREATE DATABASE secureexam;"
    echo.
    echo Now update your .env file with:
    echo DATABASE_URL=postgresql://postgres:admin123@localhost:5432/secureexam?schema=public
    echo.
    echo Don't forget to change pg_hba.conf back to 'md5' for security!
) else (
    echo FAILED: Could not connect. Make sure you've changed pg_hba.conf to 'trust'
)

pause