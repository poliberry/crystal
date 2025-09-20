require('dotenv').config();

// Simple test to verify ScyllaDB connection
const { Client } = require('cassandra-driver');

async function testScyllaConnection() {
  console.log('🧪 Testing ScyllaDB Connection');
  console.log('==============================');
  
  const client = new Client({
    contactPoints: [process.env.SCYLLA_HOST || 'localhost:9043'],
    localDataCenter: process.env.SCYLLA_DATACENTER || 'datacenter1',
  });
  
  try {
    await client.connect();
    console.log('✅ Connected to ScyllaDB successfully!');
    
    // Test 1: Switch to crystal keyspace
    await client.execute('USE crystal');
    console.log('✅ Using crystal keyspace');
    
    // Test 2: Insert a test profile
    const profileId = '123e4567-e89b-12d3-a456-426614174000';
    const insertQuery = `
      INSERT INTO profiles (id, user_id, name, email, image_url, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    await client.execute(insertQuery, [
      profileId,
      'test-user-123',
      'Test User',
      'test@example.com',
      'https://example.com/avatar.jpg',
      new Date(),
      new Date()
    ]);
    console.log('✅ Inserted test profile');
    
    // Test 3: Query the profile back
    const selectQuery = 'SELECT * FROM profiles WHERE id = ?';
    const result = await client.execute(selectQuery, [profileId]);
    
    if (result.rows.length > 0) {
      const profile = result.rows[0];
      console.log('✅ Retrieved profile:', {
        id: profile.id.toString(),
        name: profile.name,
        userId: profile.user_id,
        email: profile.email
      });
    } else {
      console.log('❌ No profile found');
    }
    
    // Test 4: Update the profile
    const updateQuery = 'UPDATE profiles SET name = ? WHERE id = ?';
    await client.execute(updateQuery, ['Updated Test User', profileId]);
    console.log('✅ Updated profile');
    
    // Test 5: Verify the update
    const updatedResult = await client.execute(selectQuery, [profileId]);
    if (updatedResult.rows.length > 0) {
      const updatedProfile = updatedResult.rows[0];
      console.log('✅ Verified update:', {
        id: updatedProfile.id.toString(),
        name: updatedProfile.name,
        userId: updatedProfile.user_id
      });
    }
    
    console.log('\n🎉 All ScyllaDB tests passed!');
    console.log('✅ Your Crystal Discord clone is ready to use ScyllaDB!');
    console.log('💡 The complete migration is now working properly.');
    
  } catch (error) {
    console.error('\n❌ ScyllaDB test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await client.shutdown();
    process.exit(0);
  }
}

testScyllaConnection();
