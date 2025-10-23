const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || 'food-delivery-app',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  retry: {
    initialRetryTime: 100,
    retries: 8,
  },
});

const producer = kafka.producer();
const consumer = kafka.consumer({ 
  groupId: process.env.KAFKA_GROUP_ID || 'food-delivery-consumer' 
});

const kafkaProducer = {
  async connect() {
    await producer.connect();
    console.log('✅ Kafka Producer connected');
  },

  async publishOrderEvent(order) {
    try {
      // Ensure all values are properly converted to strings or primitives
      const eventData = {
        eventType: 'order_created',
        tenantId: String(order.tenantId),
        orderId: String(order._id),
        restaurantId: String(order.restaurantId),
        customerId: String(order.customerId),
        totalAmount: Number(order.totalAmount),
        status: String(order.status),
        timestamp: new Date().toISOString(),
      };

      await producer.send({
        topic: 'order_events',
        messages: [
          {
            key: String(order.tenantId),
            value: JSON.stringify(eventData),
          },
        ],
      });
      console.log(`📤 Order event published for tenant ${order.tenantId}`);
    } catch (error) {
      console.error('Error publishing order event:', error);
      // Don't throw - let order creation succeed even if Kafka fails
    }
  },

  async publishOrderUpdate(order) {
    try {
      // Ensure all values are properly converted to strings or primitives
      const eventData = {
        eventType: 'order_updated',
        tenantId: String(order.tenantId),
        orderId: String(order._id),
        customerId: String(order.customerId),  // ✅ Include customerId
        restaurantId: String(order.restaurantId),  // ✅ Include restaurantId
        status: String(order.status),
        timestamp: new Date().toISOString(),
      };

      await producer.send({
        topic: 'order_events',
        messages: [
          {
            key: String(order.tenantId),
            value: JSON.stringify(eventData),
          },
        ],
      });
      console.log(`📤 Order update published for tenant ${order.tenantId}`);
    } catch (error) {
      console.error('Error publishing order update:', error);
      // Don't throw - let order update succeed even if Kafka fails
    }
  },

  async disconnect() {
    await producer.disconnect();
  },
};

module.exports = { kafka, kafkaProducer, consumer };