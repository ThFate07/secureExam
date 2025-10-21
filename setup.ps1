# Quick Setup Script for Proctoring System
# Run this script to set up the database and start the server

Write-Host "Setting up Proctoring System..." -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
Write-Host "Checking Node.js installation..." -ForegroundColor Yellow
$nodeVersion = node --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  Node.js version: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "  ERROR: Node.js is not installed. Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check if PostgreSQL is accessible
Write-Host "Checking PostgreSQL..." -ForegroundColor Yellow
$pgCheck = psql --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  PostgreSQL is installed: $pgCheck" -ForegroundColor Green
} else {
    Write-Host "  WARNING: PostgreSQL CLI not found. Make sure PostgreSQL is installed and running." -ForegroundColor Yellow
    Write-Host "  Download from: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Installing dependencies..." -ForegroundColor Cyan
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to install dependencies" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Setting up database..." -ForegroundColor Cyan

# Generate Prisma Client
Write-Host "  Generating Prisma Client..." -ForegroundColor Yellow
npx prisma generate

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to generate Prisma Client" -ForegroundColor Red
    exit 1
}

# Run migrations
Write-Host "  Running database migrations..." -ForegroundColor Yellow
npx prisma migrate dev --name init

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to run migrations. Make sure PostgreSQL is running and DATABASE_URL in .env is correct." -ForegroundColor Red
    Write-Host "  Current DATABASE_URL from .env:" -ForegroundColor Yellow
    $envContent = Get-Content .env | Where-Object { $_ -match "^DATABASE_URL=" }
    Write-Host "  $envContent" -ForegroundColor White
    Write-Host ""
    Write-Host "  To fix:" -ForegroundColor Yellow
    Write-Host "  1. Start PostgreSQL service" -ForegroundColor White
    Write-Host "  2. Create database: psql -U postgres -c 'CREATE DATABASE secureexam;'" -ForegroundColor White
    Write-Host "  3. Update .env with correct password if needed" -ForegroundColor White
    exit 1
}

# Seed database (optional)
Write-Host "  Seeding database with initial data..." -ForegroundColor Yellow
npx prisma db seed

if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: Database seeding failed or skipped" -ForegroundColor Yellow
} else {
    Write-Host "  SUCCESS: Database seeded successfully" -ForegroundColor Green
}

Write-Host ""
Write-Host "SUCCESS: Setup completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Initial Accounts:" -ForegroundColor Cyan
Write-Host "  Teacher:" -ForegroundColor Yellow
Write-Host "    Email: teacher@example.com" -ForegroundColor White
Write-Host "    Password: teacher123" -ForegroundColor White
Write-Host ""
Write-Host "  Students:" -ForegroundColor Yellow
Write-Host "    Email: student1@example.com" -ForegroundColor White
Write-Host "    Password: student123" -ForegroundColor White
Write-Host ""
Write-Host "Starting development server..." -ForegroundColor Cyan
Write-Host "  Access the app at: http://localhost:3000" -ForegroundColor White
Write-Host "  Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host ""

npm run dev
