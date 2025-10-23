require('dotenv').config({ path: '.env.local' });
const { createClient } = require('redis');
const mongoose = require('mongoose');
const { Kafka } = require('kafkajs');

async function checkAllServices() {
  console.log('🔍 Checking All Food Delivery Services...\n');
  console.log('='.repeat(60));

  let allHealthy = true;

  // 1. Check MongoDB
  console.log('\n📦 MongoDB');
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fooddelivery');
    const dbName = mongoose.connection.db.databaseName;
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('   Status: ✅ Connected');
    console.log(`   Database: ${dbName}`);
    console.log(`   Collections: ${collections.length}`);
    await mongoose.connection.close();
  } catch (error) {
    console.log('   Status: ❌ Failed -', error.message);
    allHealthy = false;
  }

  // 2. Check Redis
  console.log('\n🔴 Redis');
  try {
    const redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });
    await redisClient.connect();
    await redisClient.ping();
    const info = await redisClient.info('server');
    const version = info.match(/redis_version:([^\r\n]+)/)?.[1];
    const memory = await redisClient.info('memory');
    const usedMemory = memory.match(/used_memory_human:([^\r\n]+)/)?.[1];
    console.log('   Status: ✅ Connected');
    console.log(`   Version: ${version}`);
    console.log(`   Memory: ${usedMemory}`);
    await redisClient.quit();
  } catch (error) {
    console.log('   Status: ❌ Failed -', error.message);
    allHealthy = false;
  }

  // 3. Check Kafka
  console.log('\n📨 Kafka');
  try {
    const kafka = new Kafka({
      clientId: 'health-check',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
      requestTimeout: 5000,
    });
    const admin = kafka.admin();
    await admin.connect();
    const topics = await admin.listTopics();
    const cluster = await admin.describeCluster();
    console.log('   Status: ✅ Connected');
    console.log(`   Brokers: ${cluster.brokers.length}`);
    console.log(`   Topics: ${topics.length}`);
    console.log(`   Order Events Topic: ${topics.includes('order_events') ? '✅' : '❌ Not created'}`);
    await admin.disconnect();
  } catch (error) {
    console.log('   Status: ❌ Failed -', error.message);
    allHealthy = false;
  }

  // 4. Check Zookeeper
  console.log('\n🐘 Zookeeper');
  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    const { stdout } = await execAsync('docker exec fooddelivery-zookeeper zkServer.sh status');
    if (stdout.includes('Mode: standalone') || stdout.includes('follower') || stdout.includes('leader')) {
      console.log('   Status: ✅ Running');
      console.log('   Mode: Standalone');
    } else {
      console.log('   Status: ⚠️  Unknown state');
    }
  } catch (error) {
    console.log('   Status: ❌ Not accessible');
    allHealthy = false;
  }

  // 5. Check Docker Containers
  console.log('\n🐳 Docker Containers');
  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    const { stdout } = await execAsync('docker ps --filter "name=fooddelivery" --format "{{.Names}}|{{.Status}}"');
    const containers = stdout.trim().split('\n').filter(line => line);
    
    containers.forEach(container => {
      const [name, status] = container.split('|');
      const isHealthy = status.includes('healthy') || status.includes('Up');
      const icon = isHealthy ? '✅' : '❌';
      console.log(`   ${icon} ${name.replace('fooddelivery-', '')}: ${status}`);
    });
  } catch (error) {
    console.log('   Status: ❌ Failed to check containers');
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  if (allHealthy) {
    console.log('✅ All core services are healthy!\n');
    console.log('You can now:');
    console.log('  • Run: npm run dev (Start Next.js app)');
    console.log('  • Run: node kafka-consumer.js (Start Kafka consumer)');
  } else {
    console.log('⚠️  Some services are not running properly.\n');
    console.log('Try:');
    console.log('  • docker-compose down');
    console.log('  • docker-compose up -d');
    console.log('  • node scripts/check-all.js');
  }
  console.log('='.repeat(60) + '\n');
}

checkAllServices().catch(console.error);
