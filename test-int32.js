require('dotenv').config();

// Test specifically for the integer marshalling issue
const { Client } = require('cassandra-driver');

async function testInt32Issue() {
  console.log('🧪 Testing ScyllaDB Int32 Marshalling Issue');
  console.log('==========================================');
  
  const client = new Client({
    contactPoints: [process.env.SCYLLA_HOST || 'localhost:9043'],
    localDataCenter: process.env.SCYLLA_DATACENTER || 'datacenter1',
  });
  
  try {
    await client.connect();
    console.log('✅ Connected to ScyllaDB');
    
    await client.execute('USE crystal');
    console.log('✅ Using crystal keyspace');
    
    // Test inserting a channel with position 0
    const query = `
      INSERT INTO channels (server_id, id, name, type, profile_id, category_id, position, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const serverId = '123e4567-e89b-12d3-a456-426614174000';
    const channelId = '223e4567-e89b-12d3-a456-426614174000';
    const profileId = '323e4567-e89b-12d3-a456-426614174000';
    
    // Test with different approaches
    console.log('\n🔧 Test 1: Using regular number');
    try {
      const params1 = [
        serverId,
        channelId,
        'test-channel',
        'TEXT',
        profileId,
        null,
        0, // Regular number
        new Date(),
        new Date()
      ];
      await client.execute(query, params1);
      console.log('✅ Test 1 passed: Regular number works');
    } catch (error) {
      console.log('❌ Test 1 failed:', error.message);
    }
    
    console.log('\n🔧 Test 2: Using explicit int32 conversion');
    try {
      const channelId2 = '333e4567-e89b-12d3-a456-426614174000';
      const position = Math.floor(0); // Ensure it's an integer
      const params2 = [
        serverId,
        channelId2,
        'test-channel-2',
        'TEXT',
        profileId,
        null,
        position,
        new Date(),
        new Date()
      ];
      
      // Use hints to specify data types
      const options = {
        hints: [
          null, // server_id UUID
          null, // id UUID
          null, // name TEXT
          null, // type TEXT
          null, // profile_id UUID
          null, // category_id UUID
          'int', // position INT
          null, // created_at TIMESTAMP
          null  // updated_at TIMESTAMP
        ]
      };
      
      await client.execute(query, params2, options);
      console.log('✅ Test 2 passed: Hints approach works');
    } catch (error) {
      console.log('❌ Test 2 failed:', error.message);
    }
    
    console.log('\n🔧 Test 3: Using cassandra-driver Integer type');
    try {
      const { Integer } = require('cassandra-driver').types;
      const channelId3 = '433e4567-e89b-12d3-a456-426614174000';
      const position = Integer.fromNumber(0);
      const params3 = [
        serverId,
        channelId3,
        'test-channel-3',
        'TEXT',
        profileId,
        null,
        position,
        new Date(),
        new Date()
      ];
      
      await client.execute(query, params3);
      console.log('✅ Test 3 passed: Integer type works');
    } catch (error) {
      console.log('❌ Test 3 failed:', error.message);
    }
    
    // Check what was created
    const selectQuery = 'SELECT id, name, position FROM channels WHERE server_id = ?';
    const result = await client.execute(selectQuery, [serverId]);
    
    console.log('\n📋 Created channels:');
    result.rows.forEach(row => {
      console.log(`- ID: ${row.id}, Name: ${row.name}, Position: ${row.position}`);
    });
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  } finally {
    await client.shutdown();
    process.exit(0);
  }
}

testInt32Issue();
