const { Client } = require('pg');

// Test different common PostgreSQL credentials
const testConfigs = [
  {
    user: 'postgres',
    password: '2450',
    host: 'localhost',
    port: 5432,
    database: 'secureexam'
  },
  {
    user: 'postgres',
    password: '2450',
    host: 'localhost',
    port: 5432,
    database: 'postgres' // Try connecting to default database first
  },
  {
    user: 'postgres',
    password: 'postgres',
    host: 'localhost',
    port: 5432,
    database: 'postgres'
  },
  {
    user: 'postgres',
    password: '',
    host: 'localhost',
    port: 5432,
    database: 'postgres'
  }
];

async function testConnection(config) {
  const client = new Client(config);
  try {
    await client.connect();
    console.log(`✅ Successfully connected with user: ${config.user}, password: ${config.password || '(empty)'}, database: ${config.database}`);
    
    // Try to list databases
    const result = await client.query('SELECT datname FROM pg_database WHERE datistemplate = false;');
    console.log('Available databases:', result.rows.map(row => row.datname));
    
    await client.end();
    return true;
  } catch (error) {
    console.log(`❌ Failed to connect with user: ${config.user}, password: ${config.password || '(empty)'}, database: ${config.database}`);
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('Testing PostgreSQL connection with different configurations...\n');
  
  for (const config of testConfigs) {
    const success = await testConnection(config);
    if (success) {
      console.log('\n🎉 Found working configuration!');
      break;
    }
    console.log('');
  }
}

main().catch(console.error);