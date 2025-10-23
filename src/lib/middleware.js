const { verifyToken } = require('./auth');
const { redisClient, ensureRedisConnection } = require('./redis');

// Authentication middleware
async function authenticateToken(req) {
  // Try to get token from different sources
  let token = null;
  
  // 1. Try to get from cookies
  try {
    const cookies = require('next/headers').cookies;
    const cookieStore = cookies();
    token = cookieStore.get('token')?.value;
  } catch (e) {
    // If cookies() is not available, try req.cookies
    token = req.cookies?.token;
  }
  
  // 2. If not in cookies, try Authorization header
  if (!token) {
    const authHeader = req.headers.get?.('authorization') || req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  if (!token) {
    console.log('❌ No token found in request');
    return { authenticated: false, error: 'No token provided' };
  }

  const decoded = verifyToken(token);
  
  if (!decoded) {
    console.log('❌ Invalid token');
    return { authenticated: false, error: 'Invalid token' };
  }

  console.log('✅ Token validated for user:', decoded.userId, 'role:', decoded.role);

  return { 
    authenticated: true, 
    user: { 
      userId: decoded.userId, 
      role: decoded.role, 
      tenantId: decoded.tenantId 
    } 
  };
}

// Role-based authorization
function authorize(...roles) {
  return async (req) => {
    const auth = await authenticateToken(req);
    
    if (!auth.authenticated) {
      return { authorized: false, error: auth.error };
    }

    if (!roles.includes(auth.user.role)) {
      return { authorized: false, error: 'Insufficient permissions' };
    }

    return { authorized: true, user: auth.user };
  };
}

// Rate limiter using Redis
async function rateLimiter(identifier, maxRequests = 100, windowMs = 60000, tenantId = null) {
  try {
    // Ensure Redis connection
    await ensureRedisConnection();
    
    // If Redis is not connected, allow the request (fail open)
    if (!redisClient || !redisClient.isOpen) {
      console.warn('Redis not connected, rate limiting disabled');
      return { allowed: true, remaining: maxRequests, resetTime: 0 };
    }

    const key = tenantId 
      ? `ratelimit:tenant:${tenantId}:${identifier}` 
      : `ratelimit:${identifier}`;
    
    const current = await redisClient.get(key);
    
    if (current && parseInt(current) >= maxRequests) {
      return { 
        allowed: false, 
        remaining: 0, 
        resetTime: await redisClient.ttl(key) 
      };
    }

    const requests = current ? parseInt(current) + 1 : 1;
    
    if (!current) {
      await redisClient.set(key, requests, {
        PX: windowMs,
      });
    } else {
      await redisClient.incr(key);
    }

    return {
      allowed: true,
      remaining: maxRequests - requests,
      resetTime: await redisClient.ttl(key),
    };
  } catch (error) {
    console.error('Rate limiter error:', error);
    // Fail open - allow request if rate limiting fails
    return { allowed: true, remaining: maxRequests, resetTime: 0 };
  }
}

// Tenant isolation middleware
function ensureTenantScope(user, resourceTenantId) {
  if (user.role === 'customer') {
    return true; // Customers can access any restaurant
  }

  if (user.role === 'restaurant' && user.tenantId === resourceTenantId) {
    return true;
  }

  return false;
}

module.exports = {
  authenticateToken,
  authorize,
  rateLimiter,
  ensureTenantScope,
};