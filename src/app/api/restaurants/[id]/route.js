import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Restaurant from '@/models/Restaurant';
import { cacheHelper } from '@/lib/redis';

export async function GET(request, { params }) {
  try {
    await connectDB();

    // Check cache
    const cacheKey = `restaurant:${params.id}`;
    const cached = await cacheHelper.get(cacheKey);
    
    if (cached) {
      return NextResponse.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    const restaurant = await Restaurant.findById(params.id)
      .select('-__v')
      .lean();

    if (!restaurant) {
      return NextResponse.json(
        { success: false, message: 'Restaurant not found' },
        { status: 404 }
      );
    }

    // Cache for 10 minutes
    await cacheHelper.set(cacheKey, restaurant, null, 600);

    return NextResponse.json({
      success: true,
      data: restaurant,
    });
  } catch (error) {
    console.error('Get restaurant error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const body = await request.json();
    const { 
      name, 
      description, 
      phone, 
      email, 
      cuisine, 
      estimatedDeliveryTime, 
      deliveryFee,
      minimumOrder,
      logo,
      coverImage,
      address,
      isActive 
    } = body;

    await connectDB();

    const restaurant = await Restaurant.findById(params.id);

    if (!restaurant) {
      return NextResponse.json(
        { success: false, message: 'Restaurant not found' },
        { status: 404 }
      );
    }

    // Update fields
    if (name) restaurant.name = name;
    if (description !== undefined) restaurant.description = description;
    if (phone) restaurant.phone = phone;
    if (email) restaurant.email = email;
    if (cuisine) restaurant.cuisine = cuisine;
    if (estimatedDeliveryTime) restaurant.estimatedDeliveryTime = estimatedDeliveryTime;
    if (deliveryFee !== undefined) restaurant.deliveryFee = deliveryFee;
    if (minimumOrder !== undefined) restaurant.minimumOrder = minimumOrder;
    if (logo !== undefined) restaurant.logo = logo;
    if (coverImage !== undefined) restaurant.coverImage = coverImage;
    if (address) restaurant.address = address;
    if (isActive !== undefined) restaurant.isActive = isActive;

    await restaurant.save();

    // Invalidate cache
    await cacheHelper.delete(`restaurant:${params.id}`);
    await cacheHelper.delete('restaurants:all:');

    return NextResponse.json({
      success: true,
      data: restaurant,
      message: 'Restaurant updated successfully',
    });
  } catch (error) {
    console.error('Update restaurant error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    await connectDB();

    const restaurant = await Restaurant.findByIdAndDelete(params.id);

    if (!restaurant) {
      return NextResponse.json(
        { success: false, message: 'Restaurant not found' },
        { status: 404 }
      );
    }

    // Invalidate cache
    await cacheHelper.delete(`restaurant:${params.id}`);
    await cacheHelper.delete('restaurants:all:');

    return NextResponse.json({
      success: true,
      message: 'Restaurant deleted successfully',
    });
  } catch (error) {
    console.error('Delete restaurant error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
