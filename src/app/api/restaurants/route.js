import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Restaurant from '@/models/Restaurant';
import { cacheHelper } from '@/lib/redis';
import { rateLimiter } from '@/lib/middleware';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const cuisine = searchParams.get('cuisine');
    const search = searchParams.get('search');
    
    // Rate limiting
    const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimit = await rateLimiter(clientIp, 100, 60000);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, message: 'Rate limit exceeded' },
        { status: 429, headers: { 'X-RateLimit-Remaining': rateLimit.remaining.toString() } }
      );
    }

    // Check cache
    const cacheKey = `restaurants:${cuisine || 'all'}:${search || ''}`;
    const cached = await cacheHelper.get(cacheKey);
    
    if (cached) {
      return NextResponse.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    await connectDB();

    // Build query
    let query = { isActive: true };
    
    if (cuisine) {
      query.cuisine = { $in: [cuisine] };
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const restaurants = await Restaurant.find(query)
      .select('-__v')
      .sort({ rating: -1, createdAt: -1 })
      .lean();

    // Cache results for 5 minutes
    await cacheHelper.set(cacheKey, restaurants, null, 300);

    return NextResponse.json({
      success: true,
      count: restaurants.length,
      data: restaurants,
    });
  } catch (error) {
    console.error('Get restaurants error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}