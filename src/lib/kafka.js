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
      await producer.send({
        topic: 'order_events',
        messages: [
          {
            key: order.tenantId,
            value: JSON.stringify({
              eventType: 'order_created',
              tenantId: order.tenantId,
              orderId: order._id,
              restaurantId: order.restaurantId,
              customerId: order.customerId,
              totalAmount: order.totalAmount,
              status: order.status,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      });
      console.log(`📤 Order event published for tenant ${order.tenantId}`);
    } catch (error) {
      console.error('Error publishing order event:', error);
      throw error;
    }
  },

  async publishOrderUpdate(order) {
    try {
      await producer.send({
        topic: 'order_events',
        messages: [
          {
            key: order.tenantId,
            value: JSON.stringify({
              eventType: 'order_updated',
              tenantId: order.tenantId,
              orderId: order._id,
              status: order.status,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      });
      console.log(`📤 Order update published for tenant ${order.tenantId}`);
    } catch (error) {
      console.error('Error publishing order update:', error);
    }
  },

  async disconnect() {
    await producer.disconnect();
  },
};

module.exports = { kafka, kafkaProducer, consumer };