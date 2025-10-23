require('dotenv').config({ path: '.env.local' });
const { consumer } = require('./src/lib/kafka');
const { redisClient } = require('./src/lib/redis');

async function startConsumer() {
  try {
    // Connect Redis
    await redisClient.connect();
    console.log('✅ Redis connected for consumer');

    // Connect Kafka consumer
    await consumer.connect();
    console.log('✅ Kafka Consumer connected');

    await consumer.subscribe({ topic: 'order_events', fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const event = JSON.parse(message.value.toString());
        console.log(`📨 Received event: ${event.eventType} for tenant ${event.tenantId}`);

        try {
          await processOrderEvent(event);
        } catch (error) {
          console.error('Error processing message:', error);
        }
      },
    });

    console.log('🎧 Kafka consumer is listening for order events...');
  } catch (error) {
    console.error('Error starting consumer:', error);
    process.exit(1);
  }
}

async function processOrderEvent(event) {
  const { eventType, tenantId, orderId, timestamp } = event;

  // Get current minute window
  const minuteKey = `metrics:${tenantId}:${getMinuteWindow(timestamp)}`;
  
  if (eventType === 'order_created') {
    // Increment orders per minute
    await redisClient.incr(`${minuteKey}:orders`);
    await redisClient.expire(`${minuteKey}:orders`, 3600); // 1 hour TTL

    // Store order timing for average calculation
    await redisClient.rPush(`${minuteKey}:order_ids`, orderId);
    await redisClient.expire(`${minuteKey}:order_ids`, 3600);

    // Update total orders count
    await redisClient.incr(`metrics:${tenantId}:total_orders`);

    // Store order creation time
    await redisClient.set(`order:${orderId}:created`, timestamp, { EX: 86400 });

    console.log(`📊 Metrics updated for tenant ${tenantId}`);
  }

  if (eventType === 'order_updated' && event.status === 'ready') {
    // Calculate preparation time
    const createdTime = await redisClient.get(`order:${orderId}:created`);
    if (createdTime) {
      const prepTime = new Date(timestamp) - new Date(createdTime);
      const prepTimeMinutes = Math.round(prepTime / 60000);

      // Store prep time in a sorted set for percentile calculations
      await redisClient.zAdd(`metrics:${tenantId}:prep_times`, {
        score: prepTimeMinutes,
        value: `${orderId}:${timestamp}`,
      });

      // Keep only last 1000 prep times
      await redisClient.zRemRangeByRank(`metrics:${tenantId}:prep_times`, 0, -1001);

      // Update average prep time (rolling average)
      const allPrepTimes = await redisClient.zRange(`metrics:${tenantId}:prep_times`, 0, -1);
      if (allPrepTimes.length > 0) {
        const scores = await Promise.all(
          allPrepTimes.map(member => redisClient.zScore(`metrics:${tenantId}:prep_times`, member))
        );
        const avgPrepTime = scores.reduce((a, b) => a + b, 0) / scores.length;
        await redisClient.set(`metrics:${tenantId}:avg_prep_time`, avgPrepTime.toFixed(2));
      }

      console.log(`⏱️ Prep time recorded: ${prepTimeMinutes} minutes for order ${orderId}`);
    }
  }

  // Aggregate real-time metrics
  await aggregateMetrics(tenantId);
}

function getMinuteWindow(timestamp) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}`;
}

async function aggregateMetrics(tenantId) {
  const now = new Date();
  const currentMinute = getMinuteWindow(now.toISOString());
  
  // Get orders in current minute
  const ordersThisMinute = await redisClient.get(`metrics:${tenantId}:${currentMinute}:orders`) || 0;
  
  // Get total orders
  const totalOrders = await redisClient.get(`metrics:${tenantId}:total_orders`) || 0;
  
  // Get average prep time
  const avgPrepTime = await redisClient.get(`metrics:${tenantId}:avg_prep_time`) || 0;

  // Calculate orders per minute (last 10 minutes)
  let ordersLast10Min = 0;
  for (let i = 0; i < 10; i++) {
    const pastMinute = new Date(now - i * 60000);
    const minuteKey = `metrics:${tenantId}:${getMinuteWindow(pastMinute.toISOString())}:orders`;
    const count = await redisClient.get(minuteKey) || 0;
    ordersLast10Min += parseInt(count);
  }

  const metrics = {
    tenantId,
    ordersPerMinute: ordersThisMinute,
    ordersLast10Minutes: ordersLast10Min,
    totalOrders: parseInt(totalOrders),
    avgPrepTime: parseFloat(avgPrepTime),
    timestamp: now.toISOString(),
  };

  // Store aggregated metrics
  await redisClient.set(
    `metrics:${tenantId}:current`,
    JSON.stringify(metrics),
    { EX: 300 } // 5 minutes TTL
  );

  console.log(`📈 Aggregated metrics for tenant ${tenantId}:`, metrics);
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await consumer.disconnect();
  await redisClient.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await consumer.disconnect();
  await redisClient.quit();
  process.exit(0);
});

startConsumer();