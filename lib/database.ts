// Database abstraction layer that supports both Prisma and ScyllaDB
import { PrismaClient } from "@prisma/client";
import { scyllaDB, ScyllaDBAdapter } from "./scylla-adapter";
import { initializeSchema } from "./scylla-init";

declare global {
  var prisma: PrismaClient | undefined;
  var scyllaAdapter: ScyllaDBAdapter | undefined;
}

// Configuration to determine which database to use
const USE_SCYLLA = process.env.USE_SCYLLA === 'true';

// Initialize ScyllaDB if required
if (USE_SCYLLA && !globalThis.scyllaAdapter) {
  console.log('🔄 Initializing ScyllaDB...');
  initializeSchema().then((success) => {
    if (success) {
      console.log('✅ ScyllaDB initialization completed');
      globalThis.scyllaAdapter = scyllaDB;
    } else {
      console.error('❌ ScyllaDB initialization failed, falling back to Prisma');
      globalThis.prisma = globalThis.prisma || new PrismaClient();
    }
  }).catch((error) => {
    console.error('❌ ScyllaDB initialization error:', error);
    console.log('🔄 Falling back to Prisma...');
    globalThis.prisma = globalThis.prisma || new PrismaClient();
  });
}

// Prisma client (fallback or default)
const prismaClient = globalThis.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production" && !USE_SCYLLA) {
  globalThis.prisma = prismaClient;
}

// ScyllaDB client
const scyllaAdapter = globalThis.scyllaAdapter || scyllaDB;
if (process.env.NODE_ENV !== "production" && USE_SCYLLA) {
  globalThis.scyllaAdapter = scyllaAdapter;
}

// Export the appropriate database client based on configuration
export const db = USE_SCYLLA ? scyllaAdapter : prismaClient;

// Helper function to check which database is being used
export function isDatabaseScylla(): boolean {
  return USE_SCYLLA;
}

// Helper function to switch database mode (for testing/development)
export function getDatabaseInfo() {
  return {
    type: USE_SCYLLA ? 'ScyllaDB' : 'Prisma/PostgreSQL',
    useScylla: USE_SCYLLA,
    envVar: process.env.USE_SCYLLA,
  };
}

// Migration helper to gradually switch to ScyllaDB
export async function migrateToScyllaDB() {
  if (USE_SCYLLA) {
    console.log('⚠️ Already using ScyllaDB');
    return false;
  }
  
  console.log('🚀 Starting migration to ScyllaDB...');
  
  try {
    // Initialize ScyllaDB schema
    const schemaInitialized = await initializeSchema();
    if (!schemaInitialized) {
      throw new Error('Failed to initialize ScyllaDB schema');
    }
    
    // Here you would add data migration logic
    // For now, we'll just confirm the setup
    console.log('✅ ScyllaDB is ready for migration');
    console.log('💡 Set USE_SCYLLA=true in your environment to switch to ScyllaDB');
    
    return true;
  } catch (error) {
    console.error('❌ Migration to ScyllaDB failed:', error);
    return false;
  }
}

console.log(`📊 Database: ${getDatabaseInfo().type}`);
