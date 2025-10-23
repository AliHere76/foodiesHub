require('dotenv').config({ path: '.env.local' });
const { consumer } = require('./src/lib/kafka');
const { redisClient, ensureRedisConnection } = require('./src/lib/redis');
const io = require('socket.io-client');

// Socket.IO client to emit events to the main server
let socketClient = null;

async function connectSocketClient() {
  return new Promise((resolve, reject) => {
    socketClient = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000', {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    socketClient.on('connect', () => {
      console.log('✅ Kafka consumer connected to Socket.IO server');
      resolve();
    });

    socketClient.on('error', (error) => {
      console.error('❌ Socket.IO connection error:', error);
    });

    socketClient.on('disconnect', () => {
      console.log('⚠️  Kafka consumer disconnected from Socket.IO server');
    });

    setTimeout(() => {
      if (!socketClient.connected) {
        console.warn('⚠️  Socket.IO connection timeout, continuing without real-time events');
        resolve(); // Continue anyway
      }
    }, 5000);
  });
}

async function startConsumer() {
  try {
    console.log('🚀 Starting Kafka Consumer...');
    
    // Connect Redis with improved connection handling
    await ensureRedisConnection();
    if (redisClient && redisClient.isOpen) {
      console.log('✅ Redis connected for consumer');
    } else {
      console.error('❌ Failed to connect to Redis');
      process.exit(1);
    }

    // Connect to Socket.IO server
    console.log('🔌 Connecting to Socket.IO server...');
    await connectSocketClient();

    // Connect Kafka consumer
    console.log('📡 Connecting to Kafka...');
    await consumer.connect();
    console.log('✅ Kafka Consumer connected');

    console.log('📝 Subscribing to order_events topic...');
    await consumer.subscribe({ 
      topic: 'order_events', 
      fromBeginning: false 
    });
    console.log('✅ Subscribed to order_events topic');

    console.log('🎧 Starting message consumption...');
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const event = JSON.parse(message.value.toString());
          console.log(`📨 Received event: ${event.eventType} for tenant ${event.tenantId} | Order: ${event.orderId}`);

          await processOrderEvent(event);
        } catch (error) {
          console.error('❌ Error processing message:', error);
        }
      },
    });

    console.log('🎧 Kafka consumer is listening for order events...');
    console.log('✅ All systems ready! Waiting for events...');
  } catch (error) {
    console.error('❌ Error starting consumer:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

async function processOrderEvent(event) {
  const { eventType, tenantId, orderId, timestamp, customerId } = event;

  // Emit real-time Socket.IO events
  if (socketClient && socketClient.connected) {
    if (eventType === 'order_created') {
      console.log(`📡 Emitting new_order event for tenant ${tenantId}`);
      
      // Notify restaurant
      socketClient.emit('broadcast_to_tenant', {
        tenantId,
        event: 'new_order',
        data: { orderId, ...event }
      });
      
      // Notify customer
      if (customerId) {
        socketClient.emit('broadcast_to_customer', {
          customerId,
          event: 'order_update',
          data: { orderId, status: 'pending', ...event }
        });
      }
    } else if (eventType === 'order_updated') {
      console.log(`📡 Emitting order_status_change for order ${orderId}`);
      
      // Notify restaurant
      socketClient.emit('broadcast_to_tenant', {
        tenantId,
        event: 'order_status_change',
        data: { orderId, status: event.status, ...event }
      });
      
      // Notify customer
      if (customerId) {
        socketClient.emit('broadcast_to_customer', {
          customerId,
          event: 'order_status_change',
          data: { orderId, status: event.status, ...event }
        });
      }
    }
  }

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

  // Emit metrics update via Socket.IO
  if (socketClient && socketClient.connected) {
    socketClient.emit('broadcast_to_tenant', {
      tenantId,
      event: 'metrics_update',
      data: metrics
    });
  }

  console.log(`📈 Aggregated metrics for tenant ${tenantId}:`, metrics);
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  if (socketClient) socketClient.close();
  await consumer.disconnect();
  await redisClient.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  if (socketClient) socketClient.close();
  await consumer.disconnect();
  await redisClient.quit();
  process.exit(0);
});

startConsumer();