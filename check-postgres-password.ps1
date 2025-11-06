Write-Host "=== PostgreSQL Password Reset Helper ===" -ForegroundColor Cyan
Write-Host ""

# Common passwords to try
$passwords = @("admin", "root", "password", "123456", "postgres", "1234", "qwerty", "admin123", "root123", "password123")

$psqlPath = "C:\Program Files\PostgreSQL\18\bin\psql.exe"

Write-Host "Trying common passwords for PostgreSQL user 'postgres'..." -ForegroundColor Yellow
Write-Host ""

foreach ($password in $passwords) {
    Write-Host "Trying password: $password" -ForegroundColor Gray
    
    # Set PGPASSWORD environment variable
    $env:PGPASSWORD = $password
    
    # Try to connect
    $result = & $psqlPath -U postgres -d postgres -h localhost -p 5432 -c "SELECT version();" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "SUCCESS! Password is: $password" -ForegroundColor Green
        Write-Host ""
        Write-Host "Update your .env file with:" -ForegroundColor Cyan
        Write-Host "DATABASE_URL=postgresql://postgres:$password@localhost:5432/secureexam?schema=public" -ForegroundColor White
        Write-Host ""
        
        # Check if secureexam database exists
        Write-Host "Checking if 'secureexam' database exists..." -ForegroundColor Yellow
        $dbCheck = & $psqlPath -U postgres -d postgres -h localhost -p 5432 -c "SELECT 1 FROM pg_database WHERE datname = 'secureexam';" -t 2>&1
        
        if ($dbCheck -match "1") {
            Write-Host "Database 'secureexam' already exists!" -ForegroundColor Green
        } else {
            Write-Host "Creating 'secureexam' database..." -ForegroundColor Yellow
            $createDb = & $psqlPath -U postgres -d postgres -h localhost -p 5432 -c "CREATE DATABASE secureexam;" 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Database 'secureexam' created successfully!" -ForegroundColor Green
            } else {
                Write-Host "Failed to create database: $createDb" -ForegroundColor Red
            }
        }
        
        exit 0
    }
    
    # Clear the password variable
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "None of the common passwords worked." -ForegroundColor Red
Write-Host "You'll need to reset the PostgreSQL password manually." -ForegroundColor Yellow
Write-Host ""
Write-Host "To reset PostgreSQL password:" -ForegroundColor Cyan
Write-Host "1. Open Services (services.msc)" -ForegroundColor White
Write-Host "2. Stop 'postgresql-x64-18' service" -ForegroundColor White
Write-Host "3. Edit C:\Program Files\PostgreSQL\18\data\pg_hba.conf" -ForegroundColor White
Write-Host "4. Change 'md5' to 'trust' for local connections" -ForegroundColor White
Write-Host "5. Start the service and connect without password" -ForegroundColor White
Write-Host "6. Run: ALTER USER postgres PASSWORD 'newpassword';" -ForegroundColor White
Write-Host "7. Change pg_hba.conf back to 'md5'" -ForegroundColor White
Write-Host "8. Restart the service" -ForegroundColor White