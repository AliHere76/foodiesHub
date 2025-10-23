import { NextResponse } from 'next/server';
import { authenticateToken, ensureTenantScope } from '@/lib/middleware';
import { cacheHelper } from '@/lib/redis';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json(
        { success: false, message: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    const auth = await authenticateToken(request);
    
    if (!auth.authenticated) {
      return NextResponse.json(
        { success: false, message: auth.error },
        { status: 401 }
      );
    }

    // Check tenant scope for restaurant users
    if (auth.user.role === 'restaurant' && !ensureTenantScope(auth.user, tenantId)) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized access to tenant metrics' },
        { status: 403 }
      );
    }

    // Get current metrics from Redis
    // The Kafka consumer stores metrics with key: metrics:${tenantId}:current
    const { redisClient, ensureRedisConnection } = require('@/lib/redis');
    
    try {
      await ensureRedisConnection();
      
      if (!redisClient || !redisClient.isOpen) {
        console.warn('Redis not connected, returning default metrics');
        return NextResponse.json({
          success: true,
          data: {
            tenantId,
            ordersPerMinute: 0,
            ordersLast10Minutes: 0,
            totalOrders: 0,
            avgPrepTime: 0,
            timestamp: new Date().toISOString(),
          },
        });
      }

      // Get metrics directly from Redis
      const metricsKey = `metrics:${tenantId}:current`;
      const metricsData = await redisClient.get(metricsKey);
      
      console.log(`📊 Fetching metrics for tenant ${tenantId} from key: ${metricsKey}`);
      console.log(`📊 Metrics data:`, metricsData);

      if (!metricsData) {
        console.log(`📊 No metrics found, returning defaults`);
        return NextResponse.json({
          success: true,
          data: {
            tenantId,
            ordersPerMinute: 0,
            ordersLast10Minutes: 0,
            totalOrders: 0,
            avgPrepTime: 0,
            timestamp: new Date().toISOString(),
          },
        });
      }

      const metrics = JSON.parse(metricsData);
      console.log(`✅ Metrics found:`, metrics);
      
      return NextResponse.json({
        success: true,
        data: metrics,
      });
    } catch (redisError) {
      console.error('Redis error:', redisError);
      return NextResponse.json({
        success: true,
        data: {
          tenantId,
          ordersPerMinute: 0,
          ordersLast10Minutes: 0,
          totalOrders: 0,
          avgPrepTime: 0,
          timestamp: new Date().toISOString(),
        },
      });
    }
  } catch (error) {
    console.error('Get metrics error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}