require('dotenv').config();

// Import the TypeScript modules using require with proper paths
let ProfileAdapter;
try {
  // Try to import the compiled version or use ts-node
  ProfileAdapter = require('./lib/scylla-adapter.ts').ProfileAdapter;
} catch (error) {
  console.error('❌ Cannot load ScyllaDB adapter. Please ensure TypeScript compilation is set up.');
  console.error('You can run: npx ts-node test-scylla-ts.ts instead');
  process.exit(1);
}

async function testScyllaDBIntegration() {
  console.log('🧪 Testing ScyllaDB Integration');
  console.log('================================');
  
  const profileAdapter = new ProfileAdapter();
  
  try {
    // Test 1: Create a profile
    console.log('\n📝 Test 1: Creating a profile...');
    const testProfile = await profileAdapter.create({
      data: {
        userId: 'test-user-123',
        name: 'Test User',
        globalName: 'TestUser#1234',
        email: 'test@example.com',
        imageUrl: 'https://example.com/avatar.jpg'
      }
    });
    console.log('✅ Profile created:', {
      id: testProfile.id,
      name: testProfile.name,
      userId: testProfile.userId
    });
    
    // Test 2: Find the profile by ID
    console.log('\n🔍 Test 2: Finding profile by ID...');
    const foundProfile = await profileAdapter.findUnique({
      where: { id: testProfile.id }
    });
    console.log('✅ Profile found:', {
      id: foundProfile.id,
      name: foundProfile.name,
      userId: foundProfile.userId
    });
    
    // Test 3: Find profile by user ID
    console.log('\n🔍 Test 3: Finding profile by user ID...');
    const profileByUserId = await profileAdapter.findFirst({
      where: { userId: 'test-user-123' }
    });
    console.log('✅ Profile found by user ID:', {
      id: profileByUserId.id,
      name: profileByUserId.name,
      userId: profileByUserId.userId
    });
    
    // Test 4: Update the profile
    console.log('\n📝 Test 4: Updating profile...');
    const updatedProfile = await profileAdapter.update({
      where: { id: testProfile.id },
      data: { name: 'Updated Test User' }
    });
    console.log('✅ Profile updated:', {
      id: updatedProfile.id,
      name: updatedProfile.name,
      userId: updatedProfile.userId
    });
    
    console.log('\n🎉 All tests passed! ScyllaDB integration is working correctly.');
    console.log('✅ You can now use your Discord clone with ScyllaDB backend!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    // Clean up
    process.exit(0);
  }
}

testScyllaDBIntegration();
