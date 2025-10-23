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
    
    if (!auth.authenticated || auth.user.role !== 'restaurant') {
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

    // Check tenant scope
    if (!ensureTenantScope(auth.user, order.tenantId.toString())) {
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

    // Publish update to Kafka
    try {
      await kafkaProducer.connect();
      await kafkaProducer.publishOrderUpdate({
        _id: order._id,
        tenantId: order.tenantId,
        status: order.status,
      });
    } catch (kafkaError) {
      console.error('Failed to publish order update:', kafkaError);
    }

    // Emit real-time update via Socket.IO
    emitOrderUpdate(order.tenantId.toString(), order._id.toString(), {
      orderId: order._id,
      status: order.status,
      updatedAt: order.updatedAt,
    });

    return NextResponse.json({
      success: true,
      message: 'Order status updated',
      data: order,
    });
  } catch (error) {
    console.error('Update order error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}