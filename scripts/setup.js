#!/usr/bin/env node

/**
 * Quick Start Script for SecureExam Backend
 * 
 * This script helps set up the development environment quickly.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

function run(command, options = {}) {
  try {
    execSync(command, { stdio: 'inherit', ...options });
    return true;
  } catch (error) {
    console.error(`Error running command: ${command}`);
    return false;
  }
}

async function main() {
  console.log('🚀 SecureExam Backend Quick Start\n');
  console.log('This script will help you set up your development environment.\n');

  // Check if .env exists
  const envPath = path.join(__dirname, '.env');
  const envExamplePath = path.join(__dirname, '.env.example');

  if (!fs.existsSync(envPath)) {
    console.log('📝 Creating .env file...');
    
    if (fs.existsSync(envExamplePath)) {
      fs.copyFileSync(envExamplePath, envPath);
      console.log('✅ .env file created from .env.example\n');
      console.log('⚠️  Please update the DATABASE_URL and secrets in .env before continuing.\n');
      
      const continueSetup = await ask('Have you configured .env? (y/n): ');
      if (continueSetup.toLowerCase() !== 'y') {
        console.log('\nPlease configure .env and run this script again.');
        rl.close();
        return;
      }
    } else {
      console.error('❌ .env.example not found!');
      rl.close();
      return;
    }
  } else {
    console.log('✅ .env file already exists\n');
  }

  // Install dependencies
  console.log('📦 Installing dependencies...');
  if (!run('npm install')) {
    console.error('❌ Failed to install dependencies');
    rl.close();
    return;
  }
  console.log('✅ Dependencies installed\n');

  // Generate Prisma Client
  console.log('🔧 Generating Prisma Client...');
  if (!run('npx prisma generate')) {
    console.error('❌ Failed to generate Prisma Client');
    rl.close();
    return;
  }
  console.log('✅ Prisma Client generated\n');

  // Run migrations
  console.log('🗄️  Running database migrations...');
  const migrateResult = run('npx prisma migrate dev --name init');
  
  if (!migrateResult) {
    console.error('❌ Failed to run migrations');
    console.log('\nMake sure PostgreSQL is running and DATABASE_URL is correct in .env');
    rl.close();
    return;
  }
  console.log('✅ Migrations completed\n');

  // Seed database
  const seedDb = await ask('Would you like to seed the database with initial data? (y/n): ');
  
  if (seedDb.toLowerCase() === 'y') {
    console.log('🌱 Seeding database...');
    if (run('npx prisma db seed')) {
      console.log('✅ Database seeded\n');
      console.log('\n📋 Initial Accounts Created:');
      console.log('══════════════════════════════════════');
      console.log('Teacher:');
      console.log('  Email: teacher@example.com');
      console.log('  Password: teacher123\n');
      console.log('Students:');
      console.log('  Email: student1@example.com');
      console.log('  Password: student123\n');
      console.log('  Email: student2@example.com');
      console.log('  Password: student123');
      console.log('══════════════════════════════════════\n');
    } else {
      console.error('⚠️  Failed to seed database (non-critical)');
    }
  }

  // All done
  console.log('\n✨ Setup complete!\n');
  console.log('To start the development server, run:');
  console.log('  npm run dev\n');
  console.log('The app will be available at:');
  console.log('  http://localhost:3000\n');
  console.log('To view the database, run:');
  console.log('  npx prisma studio\n');

  rl.close();
}

main().catch((error) => {
  console.error('❌ An error occurred:', error);
  rl.close();
  process.exit(1);
});
