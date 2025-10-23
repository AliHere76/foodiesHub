import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Order from '@/models/Order';
import { authenticateToken, ensureTenantScope } from '@/lib/middleware';
import { kafkaProducer } from '@/lib/kafka';
import { emitOrderUpdate } from '@/lib/socket';

export async function GET(request, { params }) {
  try {
    const auth = await authenticateToken(request);
    
    if (!auth.authenticated) {
      return NextResponse.json(
        { success: false, message: auth.error },
        { status: 401 }
      );
    }

    await connectDB();

    const order = await Order.findById(params.id)
      .populate('restaurantId', 'name logo phone')
      .populate('customerId', 'name email phone')
      .populate('items.menuItem', 'name image')
      .lean();

    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      );
    }

    // Check authorization
    if (auth.user.role === 'customer' && order.customerId._id.toString() !== auth.user.userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      );
    }

    if (auth.user.role === 'restaurant' && !ensureTenantScope(auth.user, order.tenantId.toString())) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('Get order error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
  try {
    const auth = await authenticateToken(request);
    
    if (!auth.authenticated) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { status } = await request.json();

    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, message: 'Invalid status' },
        { status: 400 }
      );
    }

    await connectDB();

    const order = await Order.findById(params.id);

    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      );
    }

    // Authorization checks based on role
    if (auth.user.role === 'restaurant') {
      // Restaurant can update any order in their tenant
      if (!ensureTenantScope(auth.user, order.tenantId.toString())) {
        return NextResponse.json(
          { success: false, message: 'Unauthorized' },
          { status: 403 }
        );
      }
    } else if (auth.user.role === 'customer') {
      // Customer can only mark their own orders as 'delivered'
      if (order.customerId.toString() !== auth.user.userId) {
        return NextResponse.json(
          { success: false, message: 'Unauthorized' },
          { status: 403 }
        );
      }
      if (status !== 'delivered' || order.status !== 'out_for_delivery') {
        return NextResponse.json(
          { success: false, message: 'Customers can only confirm delivery of orders that are out for delivery' },
          { status: 403 }
        );
      }
    } else {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Update timestamps based on status
    if (status === 'preparing' && !order.preparationStartTime) {
      order.preparationStartTime = new Date();
    }

    if (status === 'ready' && !order.preparationEndTime) {
      order.preparationEndTime = new Date();
    }

    if (status === 'delivered' && !order.actualDeliveryTime) {
      order.actualDeliveryTime = new Date();
    }

    order.status = status;
    await order.save();

    // Populate order data for response
    const populatedOrder = await Order.findById(order._id)
      .populate('restaurantId', 'name logo phone')
      .populate('customerId', 'name email phone')
      .populate('items.menuItem', 'name image')
      .lean();

    // Publish update to Kafka
    try {
      await kafkaProducer.connect();
      await kafkaProducer.publishOrderUpdate({
        _id: String(order._id),
        tenantId: String(order.tenantId),
        status: order.status,
        customerId: String(order.customerId),
        restaurantId: String(order.restaurantId),
        totalAmount: Number(order.totalAmount),
      });
    } catch (kafkaError) {
      console.error('Failed to publish order update:', kafkaError);
    }

    // Emit real-time update via Socket.IO
    emitOrderUpdate(order.tenantId.toString(), order._id.toString(), {
      orderId: order._id.toString(),
      status: order.status,
      updatedAt: order.updatedAt,
      order: populatedOrder,
    });

    return NextResponse.json({
      success: true,
      message: 'Order status updated',
      order: populatedOrder,
    });
  } catch (error) {
    console.error('Update order error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}