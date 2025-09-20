// Client-safe database proxy - only for server-side API routes
declare global {
  var scyllaDb: any | undefined;
}

let db: any;

if (typeof window === 'undefined') {
  // Server-side: Import the actual database adapter
  try {
    console.log('Attempting to import ScyllaDBAdapter...');
    const { ScyllaDBAdapter } = require('./scylla-adapter');
    console.log('ScyllaDBAdapter imported successfully');
    
    if (!globalThis.scyllaDb) {
      console.log('Creating new ScyllaDBAdapter instance...');
      globalThis.scyllaDb = new ScyllaDBAdapter();
      console.log('ScyllaDBAdapter instance created');
    }
    
    db = globalThis.scyllaDb;
    console.log('DB instance assigned:', typeof db, !!db.category);
    
  } catch (error) {
    console.error('Failed to initialize ScyllaDB adapter:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    if (errorStack) {
      console.error('Error stack:', errorStack);
    }
    // Don't set to null - throw the error so we can see what's wrong
    throw new Error(`Database initialization failed: ${errorMessage}`);
  }
} else {
  // Client-side: This should never be used - components should use API routes
  db = new Proxy({}, {
    get(target, prop) {
      throw new Error(`Database operation "${String(prop)}" cannot be called on the client side. Use API routes instead.`);
    }
  });
}

export { db };
