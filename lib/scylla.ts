import { Client } from 'cassandra-driver';

declare global {
  var scyllaClient: Client | undefined;
}

// ScyllaDB connection configuration
const clientOptions = {
  contactPoints: [process.env.SCYLLA_HOST || 'localhost:9042'],
  localDataCenter: process.env.SCYLLA_DATACENTER || 'datacenter1',
  keyspace: process.env.SCYLLA_KEYSPACE || 'crystal',
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

export const scylla = globalThis.scyllaClient || new Client(clientOptions);

if (process.env.NODE_ENV !== "production") globalThis.scyllaClient = scylla;

// Initialize keyspace and tables on startup
export async function initializeScyllaDB() {
  try {
    // Create keyspace if it doesn't exist
    await scylla.execute(`
      CREATE KEYSPACE IF NOT EXISTS ${clientOptions.keyspace}
      WITH replication = {
        'class': 'SimpleStrategy',
        'replication_factor': 1
      }
    `);

    // Switch to the keyspace
    await scylla.execute(`USE ${clientOptions.keyspace}`);

    console.log(`✅ ScyllaDB connected to keyspace: ${clientOptions.keyspace}`);
    return true;
  } catch (error) {
    console.error('❌ ScyllaDB connection failed:', error);
    return false;
  }
}

// Gracefully shutdown ScyllaDB connection
export async function shutdownScyllaDB() {
  try {
    await scylla.shutdown();
    console.log('✅ ScyllaDB connection closed');
  } catch (error) {
    console.error('❌ Error closing ScyllaDB connection:', error);
  }
}

// Helper function to execute prepared statements
export async function executeQuery(query: string, params?: any[], options?: any) {
  try {
    // For INSERT statements with UUIDs, don't use prepared statements
    const isInsert = query.trim().toUpperCase().startsWith('INSERT');
    const executeOptions = {
      prepare: !isInsert, // Don't prepare INSERT statements
      ...options
    };
    
    console.log('executeQuery - query:', query);
    console.log('executeQuery - params:', params);
    console.log('executeQuery - prepare:', executeOptions.prepare);
    
    const result = await scylla.execute(query, params, executeOptions);
    return result;
  } catch (error) {
    console.error('ScyllaDB Query Error:', error);
    throw error;
  }
}

// Helper function for batch operations
export async function executeBatch(queries: { query: string, params?: any[] }[]) {
  try {
    const batch = queries.map(({ query, params }) => ({ query, params }));
    const result = await scylla.batch(batch);
    return result;
  } catch (error) {
    console.error('ScyllaDB Batch Error:', error);
    throw error;
  }
}
