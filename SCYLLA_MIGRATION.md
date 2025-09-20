# ScyllaDB Migration Guide

This document outlines the steps to migrate from PostgreSQL/Prisma to ScyllaDB.

## Environment Setup

Add the following environment variables to your `.env` file:

```bash
# ScyllaDB Configuration
USE_SCYLLA=false  # Set to true to enable ScyllaDB
SCYLLA_HOST=localhost:9042
SCYLLA_DATACENTER=datacenter1
SCYLLA_KEYSPACE=crystal

# Optional authentication (if ScyllaDB auth is enabled)
# SCYLLA_USERNAME=cassandra
# SCYLLA_PASSWORD=cassandra
```

## Migration Process

### Phase 1: Setup ScyllaDB Infrastructure
1. Install ScyllaDB locally or use a cloud instance
2. Install the ScyllaDB driver: `yarn add cassandra-driver`
3. Set up environment variables
4. Initialize the schema: `node -r ts-node/register lib/scylla-init.ts`

### Phase 2: Test the Migration
1. Keep `USE_SCYLLA=false` initially
2. Start your application normally with PostgreSQL/Prisma
3. When ready to test ScyllaDB, set `USE_SCYLLA=true`
4. Restart the application

### Phase 3: Data Migration
1. Export data from PostgreSQL using Prisma
2. Transform and import into ScyllaDB
3. Verify data integrity

### Phase 4: Full Switch
1. Update all API routes to use the new database abstraction
2. Test all functionality with ScyllaDB
3. Remove Prisma dependencies (optional)

## Running ScyllaDB Locally

### Using Docker:
```bash
docker run --name scylla -p 9042:9042 -d scylladb/scylla:latest
```

### Using Docker Compose:
```yaml
version: '3'
services:
  scylla:
    image: scylladb/scylla:latest
    ports:
      - "9042:9042"
    environment:
      - SCYLLA_CLUSTER_NAME=crystal-cluster
    volumes:
      - scylla-data:/var/lib/scylla
volumes:
  scylla-data:
```

## Schema Initialization

Run the schema initialization script:

```bash
# Using Node.js directly
node -r ts-node/register lib/scylla-init.ts

# Or using yarn/npm script (add to package.json)
yarn scylla:init
```

## Testing the Migration

1. Start with PostgreSQL/Prisma (USE_SCYLLA=false)
2. Test all functionality
3. Switch to ScyllaDB (USE_SCYLLA=true)
4. Test the same functionality
5. Compare results

## Key Differences

### Data Modeling
- ScyllaDB uses partition keys and clustering columns instead of foreign keys
- Denormalization is often preferred for better performance
- No JOIN operations - data is pre-organized for query patterns

### Query Patterns
- Optimized for specific access patterns
- Time-series data benefits from clustering by timestamp
- Server-based partitioning for better distribution

### Performance Benefits
- Horizontal scaling across multiple nodes
- Better performance for high-volume writes
- Optimized for time-series data (messages, logs)
- Lower latency for read/write operations

## Troubleshooting

### Connection Issues
- Verify ScyllaDB is running: `docker ps`
- Check port accessibility: `telnet localhost 9042`
- Verify environment variables are set correctly

### Schema Issues
- Check if keyspace exists: `DESCRIBE KEYSPACE crystal;`
- Verify table creation: `DESCRIBE TABLES;`
- Check table structure: `DESCRIBE TABLE table_name;`

### Query Issues
- Enable query tracing in development
- Check ScyllaDB logs for errors
- Verify data types match between Prisma and ScyllaDB models

## Performance Monitoring

ScyllaDB provides built-in monitoring:
- Access metrics at: http://localhost:10000
- Monitor query performance and cluster health
- Use nodetool for cluster management

## Next Steps

1. Complete API route migration
2. Implement data migration scripts
3. Add comprehensive testing
4. Optimize queries for ScyllaDB patterns
5. Set up production cluster
