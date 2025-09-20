require('dotenv').config();

// Test the complete server creation flow
const { Client } = require('cassandra-driver');

async function testServerCreation() {
  console.log('🧪 Testing Complete Server Creation Flow');
  console.log('=======================================');
  
  const client = new Client({
    contactPoints: [process.env.SCYLLA_HOST || 'localhost:9043'],
    localDataCenter: process.env.SCYLLA_DATACENTER || 'datacenter1',
  });
  
  try {
    await client.connect();
    await client.execute('USE crystal');
    console.log('✅ Connected to ScyllaDB');
    
    // Step 1: Create a profile first
    const profileId = '123e4567-e89b-12d3-a456-426614174000';
    const profileQuery = `
      INSERT INTO profiles (id, user_id, name, email, image_url, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    await client.execute(profileQuery, [
      profileId,
      'test-user-123',
      'Test User',
      'test@example.com',
      'https://example.com/avatar.jpg',
      new Date(),
      new Date()
    ]);
    console.log('✅ Profile created');
    
    // Step 2: Create a server
    const serverId = '223e4567-e89b-12d3-a456-426614174000';
    const serverQuery = `
      INSERT INTO servers (id, name, image_url, invite_code, profile_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    await client.execute(serverQuery, [
      serverId,
      'Test Server',
      'https://example.com/server.jpg',
      'ABC12345', // 8-char alphanumeric invite code
      profileId,
      new Date(),
      new Date()
    ]);
    console.log('✅ Server created');
    
    // Step 3: Create a member
    const memberId = '323e4567-e89b-12d3-a456-426614174000';
    const memberQuery = `
      INSERT INTO members (server_id, id, profile_id, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    await client.execute(memberQuery, [
      serverId,
      memberId,
      profileId,
      'ADMIN',
      new Date(),
      new Date()
    ]);
    console.log('✅ Member created');
    
    // Step 4: Create channels with proper int32 hints
    const textChannelId = '423e4567-e89b-12d3-a456-426614174000';
    const voiceChannelId = '523e4567-e89b-12d3-a456-426614174000';
    
    const channelQuery = `
      INSERT INTO channels (server_id, id, name, type, profile_id, category_id, position, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    // Text channel
    const textChannelParams = [
      serverId,
      textChannelId,
      'general',
      'TEXT',
      profileId,
      null,
      0, // position
      new Date(),
      new Date()
    ];
    
    const channelHints = {
      hints: [null, null, null, null, null, null, 'int', null, null]
    };
    
    await client.execute(channelQuery, textChannelParams, channelHints);
    console.log('✅ Text channel created');
    
    // Voice channel
    const voiceChannelParams = [
      serverId,
      voiceChannelId,
      'general',
      'AUDIO',
      profileId,
      null,
      1, // position
      new Date(),
      new Date()
    ];
    
    await client.execute(channelQuery, voiceChannelParams, channelHints);
    console.log('✅ Voice channel created');
    
    // Verify everything was created
    console.log('\n📋 Verification:');
    
    const serverResult = await client.execute('SELECT * FROM servers WHERE id = ?', [serverId]);
    console.log(`Server: ${serverResult.rows[0].name} (${serverResult.rows[0].invite_code})`);
    
    const channelResult = await client.execute('SELECT * FROM channels WHERE server_id = ?', [serverId]);
    console.log(`Channels: ${channelResult.rows.length} created`);
    channelResult.rows.forEach(row => {
      console.log(`  - ${row.name} (${row.type}) at position ${row.position}`);
    });
    
    console.log('\n🎉 Complete server creation flow works!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await client.shutdown();
    process.exit(0);
  }
}

testServerCreation();
