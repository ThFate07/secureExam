# Alternative: SQLite setup for development
# This will switch your app to use SQLite instead of PostgreSQL

# Backup current .env
Write-Host "Creating backup of current .env..." -ForegroundColor Yellow
Copy-Item ".env" ".env.postgres.backup"

# Update .env to use SQLite
Write-Host "Updating .env to use SQLite..." -ForegroundColor Yellow
$envContent = Get-Content ".env"
$newEnvContent = $envContent -replace 'DATABASE_URL=postgresql.*', 'DATABASE_URL="file:./dev.db"'
$newEnvContent | Set-Content ".env"

Write-Host "Updated .env file to use SQLite" -ForegroundColor Green
Write-Host ""

# Update Prisma schema to use SQLite
Write-Host "Updating Prisma schema to use SQLite..." -ForegroundColor Yellow
$schemaPath = "prisma\schema.prisma"
if (Test-Path $schemaPath) {
    $schemaContent = Get-Content $schemaPath
    $newSchemaContent = $schemaContent -replace 'provider.*=.*"postgresql"', 'provider = "sqlite"'
    $newSchemaContent | Set-Content $schemaPath
    Write-Host "Updated Prisma schema" -ForegroundColor Green
} else {
    Write-Host "Prisma schema not found at $schemaPath" -ForegroundColor Red
}

Write-Host ""
Write-Host "Now run:" -ForegroundColor Cyan
Write-Host "  npx prisma migrate reset" -ForegroundColor White
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "To switch back to PostgreSQL later:" -ForegroundColor Yellow
Write-Host "  Copy .env.postgres.backup back to .env" -ForegroundColor White
Write-Host "  Update Prisma schema back to postgresql" -ForegroundColor White