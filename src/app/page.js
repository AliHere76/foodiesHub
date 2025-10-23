'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='));
      
      if (token) {
        router.push('/dashboard');
      } else {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-amber-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-amber-50 text-gray-900">
      {/* Hero Section */}
      <div className="py-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h1 className="text-6xl md:text-7xl font-bold mb-6 leading-tight text-gray-900">
              Delicious Food
              <br />
              <span className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                Delivered Fast
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              Order from the best restaurants in your area. Real-time tracking, fast delivery, and amazing food at your doorstep.
            </p>
            <div className="flex justify-center gap-4">
              <Link
                href="/register"
                className="px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl text-lg font-semibold hover:shadow-2xl hover:shadow-orange-500/30 transition-all transform hover:scale-105"
              >
                Order Now
              </Link>
              <Link
                href="/restaurants"
                className="px-8 py-4 bg-white rounded-xl text-lg font-semibold hover:bg-gray-50 transition-all border-2 border-gray-200 text-gray-700 hover:border-orange-300"
              >
                Browse Restaurants
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="grid md:grid-cols-3 gap-8 mt-20">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-gray-200 hover:border-orange-300 hover:shadow-xl transition-all">
              <div className="text-4xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent mb-2">500+</div>
              <div className="text-gray-600 font-medium">Partner Restaurants</div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-gray-200 hover:border-orange-300 hover:shadow-xl transition-all">
              <div className="text-4xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent mb-2">50K+</div>
              <div className="text-gray-600 font-medium">Happy Customers</div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-gray-200 hover:border-orange-300 hover:shadow-xl transition-all">
              <div className="text-4xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent mb-2">30 Min</div>
              <div className="text-gray-600 font-medium">Average Delivery</div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 px-6 bg-white/50">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-4xl font-bold text-center mb-16 text-gray-900">Why Choose FoodiesHub</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 border border-gray-200 hover:border-orange-300 hover:shadow-2xl transition-all group">
              <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform text-white">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Lightning Fast</h3>
              <p className="text-gray-600 leading-relaxed">Average delivery time of 30 minutes. Track your order in real-time from kitchen to doorstep.</p>
            </div>

            <div className="bg-white rounded-2xl p-8 border border-gray-200 hover:border-orange-300 hover:shadow-2xl transition-all group">
              <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform text-white">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Quality Assured</h3>
              <p className="text-gray-600 leading-relaxed">Partnered with the best restaurants. Every meal is prepared fresh and delivered hot.</p>
            </div>

            <div className="bg-white rounded-2xl p-8 border border-gray-200 hover:border-orange-300 hover:shadow-2xl transition-all group">
              <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform text-white">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Best Prices</h3>
              <p className="text-gray-600 leading-relaxed">Competitive pricing with exclusive deals. Save more on every order with our rewards program.</p>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="py-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-4xl font-bold text-center mb-16 text-gray-900">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: '01', title: 'Choose Location', desc: 'Enter your delivery address' },
              { step: '02', title: 'Pick Restaurant', desc: 'Browse from 500+ options' },
              { step: '03', title: 'Place Order', desc: 'Select items and checkout' },
              { step: '04', title: 'Get Delivered', desc: 'Track and receive your food' }
            ].map((item, idx) => (
              <div key={idx} className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white shadow-lg">
                  {item.step}
                </div>
                <h4 className="text-xl font-bold mb-2 text-gray-900">{item.title}</h4>
                <p className="text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 px-6 bg-gradient-to-r from-orange-500 to-red-500">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-bold mb-6 text-white">Ready to Order?</h2>
          <p className="text-xl mb-8 text-white/95">Join thousands of satisfied customers enjoying delicious food daily</p>
          <Link
            href="/register"
            className="inline-block px-10 py-4 bg-white text-orange-600 rounded-xl text-lg font-bold hover:bg-gray-50 transition-all transform hover:scale-105 shadow-2xl"
          >
            Sign Up Now - It's Free
          </Link>
        </div>
      </div>
    </div>
  );
}