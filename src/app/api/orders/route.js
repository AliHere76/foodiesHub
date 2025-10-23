import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Order from '@/models/Order';
import MenuItem from '@/models/MenuItem';
import Restaurant from '@/models/Restaurant';
import { authenticateToken, rateLimiter } from '@/lib/middleware';
import { kafkaProducer } from '@/lib/kafka';

export async function GET(request) {
  try {
    const auth = await authenticateToken(request);
    
    if (!auth.authenticated) {
      return NextResponse.json(
        { success: false, message: auth.error },
        { status: 401 }
      );
    }

    await connectDB();

    let query = {};
    
    if (auth.user.role === 'customer') {
      query.customerId = auth.user.userId;
    } else if (auth.user.role === 'restaurant') {
      query.tenantId = auth.user.tenantId;
    }

    const orders = await Order.find(query)
      .populate('restaurantId', 'name logo')
      .populate('customerId', 'name email phone')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      count: orders.length,
      orders: orders,
      data: orders,
    });
  } catch (error) {
    console.error('Get orders error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    console.log('📝 Attempting to create order...');
    const auth = await authenticateToken(request);
    
    console.log('🔐 Auth result:', auth);
    
    if (!auth.authenticated || auth.user.role !== 'customer') {
      console.log('❌ Unauthorized:', auth.error || 'Not a customer');
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('✅ User authenticated:', auth.user);

    // Rate limiting per user
    const rateLimit = await rateLimiter(
      auth.user.userId,
      10,
      60000,
      null
    );
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, message: 'Too many orders. Please try again later.' },
        { status: 429 }
      );
    }

    const orderData = await request.json();
    const { restaurantId, items, deliveryAddress, contactPhone, paymentMethod, specialInstructions } = orderData;

    // Validation
    if (!restaurantId || !items || items.length === 0 || !deliveryAddress) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    await connectDB();

    // Ensure Kafka producer is connected
    try {
      await kafkaProducer.connect();
    } catch (kafkaError) {
      console.log('Kafka producer already connected');
    }

    // Get restaurant
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return NextResponse.json(
        { success: false, message: 'Restaurant not found' },
        { status: 404 }
      );
    }

    // Validate and calculate prices
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const menuItem = await MenuItem.findOne({
        _id: item.menuItem,
        tenantId: restaurant.tenantId,
        isAvailable: true,
      });

      if (!menuItem) {
        return NextResponse.json(
          { success: false, message: `Menu item ${item.menuItem} not found or unavailable` },
          { status: 400 }
        );
      }

      const itemTotal = menuItem.price * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        menuItem: menuItem._id,
        name: menuItem.name,
        quantity: item.quantity,
        price: menuItem.price,
        specialInstructions: item.specialInstructions,
      });
    }

    // Calculate totals
    const deliveryFee = restaurant.deliveryFee || 0;
    const tax = subtotal * 0.1; // 10% tax
    const totalAmount = subtotal + deliveryFee + tax;

    // Check minimum order
    if (subtotal < restaurant.minimumOrder) {
      return NextResponse.json(
        { success: false, message: `Minimum order amount is $${restaurant.minimumOrder}` },
        { status: 400 }
      );
    }

    // Create order
    const order = await Order.create({
      tenantId: restaurant.tenantId,
      restaurantId: restaurant._id,
      customerId: auth.user.userId,
      items: orderItems,
      subtotal,
      deliveryFee,
      tax,
      totalAmount,
      deliveryAddress,
      contactPhone,
      paymentMethod: paymentMethod || 'online',
      paymentStatus: 'pending',
      specialInstructions,
      estimatedDeliveryTime: new Date(Date.now() + restaurant.estimatedDeliveryTime * 60000),
    });

    // Publish order event to Kafka
    try {
      await kafkaProducer.publishOrderEvent({
        _id: order._id,
        tenantId: order.tenantId,
        restaurantId: order.restaurantId,
        customerId: order.customerId,
        totalAmount: order.totalAmount,
        status: order.status,
      });
    } catch (kafkaError) {
      console.error('Failed to publish order event:', kafkaError);
      // Don't fail the order creation if Kafka fails
    }

    // Populate order details before returning
    const populatedOrder = await Order.findById(order._id)
      .populate('restaurantId', 'name logo')
      .populate('customerId', 'name email phone')
      .populate('items.menuItem', 'name description image')
      .lean();

    return NextResponse.json({
      success: true,
      message: 'Order created successfully',
      order: populatedOrder,
      data: populatedOrder,
    }, { status: 201 });
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}