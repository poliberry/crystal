const { ScyllaDBAdapter } = require('./lib/scylla-adapter.ts');

console.log('Testing ScyllaDBAdapter...');

try {
  const db = new ScyllaDBAdapter();
  console.log('ScyllaDBAdapter created successfully');
  console.log('db.profile:', typeof db.profile);
  console.log('db.server:', typeof db.server);
  console.log('db.member:', typeof db.member);
  console.log('db.channel:', typeof db.channel);
  console.log('db.message:', typeof db.message);
  
  if (db.member) {
    console.log('db.member.findMany:', typeof db.member.findMany);
  }
  
  if (db.server) {
    console.log('db.server.findFirst:', typeof db.server.findFirst);
  }
} catch (error) {
  console.error('Error creating ScyllaDBAdapter:', error);
}
