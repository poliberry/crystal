const { Client } = require('cassandra-driver');
const { readFileSync } = require('fs');
const { join } = require('path');

// Load environment variables
require('dotenv').config();

// ScyllaDB connection configuration
const clientOptions = {
  contactPoints: [process.env.SCYLLA_HOST || 'localhost:9042'],
  localDataCenter: process.env.SCYLLA_DATACENTER || 'datacenter1',
  // Don't specify keyspace initially
  credentials: process.env.SCYLLA_USERNAME && process.env.SCYLLA_PASSWORD ? {
    username: process.env.SCYLLA_USERNAME,
    password: process.env.SCYLLA_PASSWORD
  } : undefined,
  pooling: {
    coreConnectionsPerHost: {
      [1]: 2,
      [2]: 1
    }
  },
  socketOptions: {
    connectTimeout: 30000,
    readTimeout: 30000
  }
};

async function initializeScyllaDB() {
  const client = new Client(clientOptions);
  const keyspace = process.env.SCYLLA_KEYSPACE || 'crystal';
  
  try {
    // Connect without keyspace first
    await client.connect();
    
    // Create keyspace if it doesn't exist
    await client.execute(`
      CREATE KEYSPACE IF NOT EXISTS ${keyspace}
      WITH replication = {
        'class': 'SimpleStrategy',
        'replication_factor': 1
      }
    `);

    // Switch to the keyspace
    await client.execute(`USE ${keyspace}`);

    console.log(`✅ ScyllaDB connected to keyspace: ${keyspace}`);
    return { client, success: true };
  } catch (error) {
    console.error('❌ ScyllaDB connection failed:', error);
    return { client, success: false };
  }
}

async function initializeSchema() {
  try {
    console.log('🚀 Starting ScyllaDB schema initialization...');
    
    // Check environment variables
    const requiredEnvVars = ['SCYLLA_HOST', 'SCYLLA_DATACENTER', 'SCYLLA_KEYSPACE'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.log('⚠️  Missing ScyllaDB environment variables:');
      console.log('Please add the following to your .env file:');
      console.log('');
      console.log('# ScyllaDB Configuration');
      console.log('SCYLLA_HOST=localhost:9042');
      console.log('SCYLLA_DATACENTER=datacenter1');
      console.log('SCYLLA_KEYSPACE=crystal');
      console.log('# Optional authentication (if enabled)');
      console.log('# SCYLLA_USERNAME=cassandra');
      console.log('# SCYLLA_PASSWORD=cassandra');
      console.log('');
      return false;
    }

    // Initialize connection and keyspace
    const { client, success } = await initializeScyllaDB();
    if (!success) {
      throw new Error('Failed to connect to ScyllaDB');
    }

    // Read and execute the schema file
    const schemaPath = join(__dirname, 'scylla-schema.cql');
    let schemaContent;
    
    try {
      schemaContent = readFileSync(schemaPath, 'utf-8');
      console.log(`📁 Schema file size: ${schemaContent.length} characters`);
      console.log(`📁 First 200 characters: ${schemaContent.substring(0, 200)}`);
    } catch (error) {
      console.error(`❌ Could not read schema file: ${schemaPath}`);
      console.error('Make sure the scylla-schema.cql file exists in the lib directory');
      return false;
    }
    
    // Split the schema into individual statements
    const rawStatements = schemaContent.split(';');
    console.log(`📝 Raw statements after split: ${rawStatements.length}`);
    
    // Debug: show first few raw statements
    console.log('\n🔍 First 5 raw statements:');
    rawStatements.slice(0, 5).forEach((stmt, i) => {
      console.log(`${i + 1}. [${stmt.length} chars] ${stmt.substring(0, 100).replace(/\n/g, ' ')}...`);
    });
    
    const statements = rawStatements
      .map(stmt => {
        // Clean up the statement by removing comments and extra whitespace
        return stmt.replace(/--[^\n]*/g, '').trim();
      })
      .filter(stmt => {
        // Keep only non-empty statements that start with CREATE
        return stmt.length > 0 && stmt.toUpperCase().startsWith('CREATE');
      });
      
    console.log(`📝 Filtered statements: ${statements.length}`);
    
    console.log(`🏗️  Executing ${statements.length} schema statements...`);
    
    // Debug: show first few statements
    console.log('\n🔍 First 3 statements:');
    statements.slice(0, 3).forEach((stmt, i) => {
      console.log(`${i + 1}. ${stmt.substring(0, 80)}...`);
    });
    
    // Execute each statement
    let successCount = 0;
    let failureCount = 0;
    
    for (const statement of statements) {
      try {
        await client.execute(statement);
        const shortStmt = statement.substring(0, 50).replace(/\s+/g, ' ');
        console.log(`✅ Executed: ${shortStmt}...`);
        successCount++;
      } catch (error) {
        const shortStmt = statement.substring(0, 50).replace(/\s+/g, ' ');
        console.error(`❌ Failed to execute statement: ${shortStmt}...`);
        console.error(`   Error: ${error.message}`);
        console.error(`   Full statement: ${statement}`);
        failureCount++;
        // Continue with other statements even if one fails
      }
    }
    
    console.log(`\n📊 Execution Summary:`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${failureCount}`);
    console.log(`   📋 Total: ${statements.length}`);
    
    await client.shutdown();
    console.log('🎉 Schema initialization completed!');
    return true;
  } catch (error) {
    console.error('❌ Schema initialization failed:', error);
    return false;
  }
}

// Run schema initialization
async function run() {
  console.log('🌟 Crystal Discord Clone - ScyllaDB Schema Initialization');
  console.log('========================================================');
  
  const success = await initializeSchema();
  
  if (success) {
    console.log('✅ Schema initialization completed successfully!');
    console.log('💡 You can now set USE_SCYLLA=true in your environment to use ScyllaDB');
    process.exit(0);
  } else {
    console.log('❌ Schema initialization failed!');
    console.log('Please check the error messages above and ensure ScyllaDB is running');
    process.exit(1);
  }
}

// Only run if this is the main module
if (require.main === module) {
  run();
}

module.exports = { initializeSchema, initializeScyllaDB };
