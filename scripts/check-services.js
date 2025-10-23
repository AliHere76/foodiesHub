require('dotenv').config({ path: '.env.local' });
const { createClient } = require('redis');
const mongoose = require('mongoose');

async function checkServices() {
  console.log('🔍 Checking Food Delivery App Services...\n');

  // Check MongoDB
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fooddelivery');
    console.log('✅ MongoDB: Connected');
    const userCount = await mongoose.connection.db.collection('users').countDocuments();
    console.log(`   └─ ${userCount} users found`);
    await mongoose.connection.close();
  } catch (error) {
    console.log('❌ MongoDB: Failed -', error.message);
  }

  // Check Redis
  try {
    const redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });
    await redisClient.connect();
    await redisClient.ping();
    console.log('✅ Redis: Connected');
    const info = await redisClient.info('server');
    const version = info.match(/redis_version:([^\r\n]+)/)?.[1];
    console.log(`   └─ Version: ${version}`);
    await redisClient.quit();
  } catch (error) {
    console.log('❌ Redis: Failed -', error.message);
  }

  // Check Environment Variables
  console.log('\n📋 Environment Variables:');
  console.log('   MONGODB_URI:', process.env.MONGODB_URI ? '✅ Set' : '❌ Missing');
  console.log('   REDIS_URL:', process.env.REDIS_URL ? '✅ Set' : '❌ Missing');
  console.log('   JWT_SECRET:', process.env.JWT_SECRET ? '✅ Set' : '❌ Missing');
  console.log('   SESSION_SECRET:', process.env.SESSION_SECRET ? '✅ Set' : '❌ Missing');

  console.log('\n✅ Service check complete!\n');
}

checkServices().catch(console.error);
