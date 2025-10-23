import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Restaurant from '@/models/Restaurant';
import { generateToken } from '@/lib/auth';

export async function POST(request) {
  let body;
  
  try {
    // Parse JSON body
    body = await request.json();
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Invalid JSON in request body' },
      { status: 400 }
    );
  }

  try {
    const { name, email, password, role, restaurantData } = body;

    // Validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, message: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'User already exists with this email' },
        { status: 400 }
      );
    }

    let tenantId = null;
    let restaurant = null;

    // If registering as restaurant, create restaurant
    if (role === 'restaurant' && restaurantData) {
      // Create user first
      const user = await User.create({
        name,
        email,
        password,
        role: 'restaurant',
      });

      // Create restaurant with user as owner
      restaurant = await Restaurant.create({
        ...restaurantData,
        ownerId: user._id,
        tenantId: null, // Will be set to restaurant _id
      });

      // Update restaurant's tenantId to its own _id
      restaurant.tenantId = restaurant._id;
      await restaurant.save();

      // Update user with tenantId
      user.tenantId = restaurant._id;
      await user.save();

      tenantId = restaurant._id;

      const token = generateToken(user._id, user.role, tenantId);

      const response = NextResponse.json({
        success: true,
        message: 'Restaurant registered successfully',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
        },
        restaurant: {
          id: restaurant._id,
          name: restaurant.name,
          tenantId: restaurant.tenantId,
        },
        token,
      }, { status: 201 });

      response.cookies.set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      });

      return response;
    }

    // Create customer user
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'customer',
    });

    const token = generateToken(user._id, user.role, null);

    const response = NextResponse.json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    }, { status: 201 });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}