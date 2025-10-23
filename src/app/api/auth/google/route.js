import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { generateToken } from '@/lib/auth';

// This is a simplified Google OAuth implementation
// For production, use passport-google-oauth20 with proper OAuth flow

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      // Redirect to Google OAuth
      const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
        `redirect_uri=${process.env.GOOGLE_CALLBACK_URL}&` +
        `response_type=code&` +
        `scope=email profile`;
      
      return NextResponse.redirect(googleAuthUrl);
    }

    // Exchange code for tokens (simplified - implement full OAuth flow in production)
    await connectDB();

    // Mock user data - In production, fetch from Google API
    const googleUser = {
      id: 'google_' + Date.now(),
      email: 'user@example.com',
      name: 'Google User',
    };

    let user = await User.findOne({ googleId: googleUser.id });

    if (!user) {
      user = await User.create({
        googleId: googleUser.id,
        email: googleUser.email,
        name: googleUser.name,
        role: 'customer',
        provider: 'google',
      });
    }

    const token = generateToken(user._id, user.role, user.tenantId);

    const response = NextResponse.redirect(new URL('/dashboard', request.url));
    
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Google OAuth error:', error);
    return NextResponse.redirect(new URL('/login?error=oauth_failed', request.url));
  }
}