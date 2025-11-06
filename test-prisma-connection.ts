import { PrismaClient } from '@prisma/client';

async function testDatabaseConnection() {
  console.log('Testing database connection...\n');
  
  // Test with current DATABASE_URL
  console.log('Current DATABASE_URL:', process.env.DATABASE_URL || 'Not set');
  
  const prisma = new PrismaClient({
    log: ['error', 'warn'],
  });

  try {
    // Try to connect and run a simple query
    await prisma.$connect();
    console.log('✅ Successfully connected to database!');
    
    // Check if we can access the database
    const result = await prisma.$queryRaw`SELECT version()`;
    console.log('✅ Database query successful!');
    console.log('PostgreSQL version:', result);
    
    // Try to list all tables
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    console.log('Tables in database:', tables);
    
  } catch (error) {
    console.log('❌ Database connection failed!');
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log('Error details:', errorMessage);
    
    if (errorMessage.includes('authentication failed')) {
      console.log('\n🔍 This looks like a credential issue. Let me suggest some solutions:');
      console.log('1. Check if the password "2450" is correct');
      console.log('2. Try connecting to the default "postgres" database first');
      console.log('3. Check if the user "postgres" exists and has the right permissions');
    }
    
    if (errorMessage.includes('database') && errorMessage.includes('does not exist')) {
      console.log('\n🔍 The database "secureexam" might not exist yet.');
      console.log('You may need to create it first.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Load environment variables
require('dotenv').config();

testDatabaseConnection().catch(console.error);