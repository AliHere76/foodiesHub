require('dotenv').config({ path: '.env.local' });
const { Kafka } = require('kafkajs');

async function testKafka() {
  console.log('🔍 Testing Kafka Connection...\n');

  const kafka = new Kafka({
    clientId: 'test-client',
    brokers: ['localhost:9092'],
    retry: {
      initialRetryTime: 100,
      retries: 3,
    },
  });

  const admin = kafka.admin();

  try {
    console.log('Connecting to Kafka...');
    await admin.connect();
    console.log('✅ Connected to Kafka\n');

    // List topics
    const topics = await admin.listTopics();
    console.log('📋 Existing topics:', topics.length > 0 ? topics : 'No topics yet');

    // Create order_events topic if it doesn't exist
    if (!topics.includes('order_events')) {
      console.log('\nCreating "order_events" topic...');
      await admin.createTopics({
        topics: [{
          topic: 'order_events',
          numPartitions: 3,
          replicationFactor: 1,
        }],
      });
      console.log('✅ Topic "order_events" created');
    } else {
      console.log('\n✅ Topic "order_events" already exists');
    }

    // Get cluster info
    const cluster = await admin.describeCluster();
    console.log('\n📊 Kafka Cluster Info:');
    console.log('   Brokers:', cluster.brokers.length);
    console.log('   Controller:', cluster.controller);
    
    await admin.disconnect();
    console.log('\n✅ Kafka test completed successfully!');
  } catch (error) {
    console.error('❌ Kafka test failed:', error.message);
    process.exit(1);
  }
}

testKafka();
