import { readFileSync } from 'fs';
import { join } from 'path';
import { scylla, initializeScyllaDB } from './scylla';

export async function initializeSchema() {
  try {
    // First initialize the connection and keyspace
    const isConnected = await initializeScyllaDB();
    if (!isConnected) {
      throw new Error('Failed to connect to ScyllaDB');
    }

    // Read and execute the schema file
    const schemaPath = join(process.cwd(), 'lib', 'scylla-schema.cql');
    const schemaContent = readFileSync(schemaPath, 'utf-8');
    
    // Split the schema into individual statements
    const statements = schemaContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`🏗️  Executing ${statements.length} schema statements...`);
    
    // Execute each statement
    for (const statement of statements) {
      try {
        await scylla.execute(statement);
        console.log(`✅ Executed: ${statement.substring(0, 50)}...`);
      } catch (error) {
        console.error(`❌ Failed to execute statement: ${statement.substring(0, 50)}...`);
        console.error(error);
        // Continue with other statements even if one fails
      }
    }
    
    console.log('🎉 Schema initialization completed!');
    return true;
  } catch (error) {
    console.error('❌ Schema initialization failed:', error);
    return false;
  }
}

// Environment variables setup instructions
export function checkEnvironmentVariables() {
  const requiredEnvVars = [
    'SCYLLA_HOST',
    'SCYLLA_DATACENTER', 
    'SCYLLA_KEYSPACE'
  ];
  
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
  
  return true;
}

// Helper function to run schema initialization manually
export async function runSchemaInit() {
  console.log('🚀 Starting ScyllaDB schema initialization...');
  
  if (!checkEnvironmentVariables()) {
    process.exit(1);
  }
  
  const success = await initializeSchema();
  
  if (success) {
    console.log('✅ Schema initialization completed successfully!');
    process.exit(0);
  } else {
    console.log('❌ Schema initialization failed!');
    process.exit(1);
  }
}

// Run schema initialization if this file is executed directly
if (require.main === module) {
  runSchemaInit();
}
