import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import MenuItem from '@/models/MenuItem';
import Restaurant from '@/models/Restaurant';
import { cacheHelper } from '@/lib/redis';

export async function GET(request, { params }) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    await connectDB();

    // Get restaurant to verify it exists and get tenantId
    const restaurant = await Restaurant.findById(params.id);
    
    if (!restaurant) {
      return NextResponse.json(
        { success: false, message: 'Restaurant not found' },
        { status: 404 }
      );
    }

    // Check cache
    const cacheKey = `menu:${category || 'all'}`;
    const cached = await cacheHelper.get(cacheKey, restaurant.tenantId.toString());
    
    if (cached) {
      return NextResponse.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    // Build query
    let query = {
      tenantId: restaurant.tenantId,
      restaurantId: params.id,
      isAvailable: true,
    };

    if (category) {
      query.category = category;
    }

    const menuItems = await MenuItem.find(query)
      .select('-__v')
      .sort({ category: 1, name: 1 })
      .lean();

    // Cache for 10 minutes
    await cacheHelper.set(cacheKey, menuItems, restaurant.tenantId.toString(), 600);

    return NextResponse.json({
      success: true,
      count: menuItems.length,
      data: menuItems,
    });
  } catch (error) {
    console.error('Get menu error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}