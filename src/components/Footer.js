'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function Footer() {
  const [email, setEmail] = useState('');

  const handleSubscribe = (e) => {
    e.preventDefault();
    alert('Thank you for subscribing!');
    setEmail('');
  };

  return (
    <footer className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-orange-500 rounded-full filter blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-red-500 rounded-full filter blur-3xl"></div>
      </div>

      <div className="container mx-auto px-6 py-12 relative z-10">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-2xl">🍔</span>
              </div>
              <div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                  FoodiesHub
                </h3>
                <p className="text-xs text-gray-400">Order. Eat. Enjoy.</p>
              </div>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Your favorite food delivered fast. Experience the best restaurants in your city with just a few clicks.
            </p>
            {/* Social Media */}
            <div className="flex space-x-3">
              {[
                { icon: '📘', name: 'Facebook', color: 'hover:bg-blue-600' },
                { icon: '🐦', name: 'Twitter', color: 'hover:bg-sky-500' },
                { icon: '📷', name: 'Instagram', color: 'hover:bg-pink-600' },
                { icon: '💼', name: 'LinkedIn', color: 'hover:bg-blue-700' },
              ].map((social) => (
                <button
                  key={social.name}
                  className={`w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center ${social.color} transition-all transform hover:scale-110 hover:shadow-lg`}
                  title={social.name}
                >
                  <span className="text-xl">{social.icon}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-bold mb-4 bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
              Quick Links
            </h4>
            <ul className="space-y-3">
              {[
                { href: '/restaurants', label: 'Browse Restaurants' },
                { href: '/orders', label: 'Track Orders' },
                { href: '/dashboard', label: 'Dashboard' },
                { href: '/register', label: 'Partner with Us' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-orange-400 transition-colors flex items-center space-x-2 group"
                  >
                    <span className="w-1.5 h-1.5 bg-orange-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    <span>{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-lg font-bold mb-4 bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
              Support
            </h4>
            <ul className="space-y-3">
              {[
                { label: 'Help Center', href: '#' },
                { label: 'FAQs', href: '#' },
                { label: 'Contact Us', href: '#' },
                { label: 'Privacy Policy', href: '#' },
                { label: 'Terms of Service', href: '#' },
              ].map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-gray-400 hover:text-orange-400 transition-colors flex items-center space-x-2 group"
                  >
                    <span className="w-1.5 h-1.5 bg-orange-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    <span>{link.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="text-lg font-bold mb-4 bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
              Stay Updated
            </h4>
            <p className="text-gray-400 text-sm mb-4">
              Subscribe to get special offers and updates!
            </p>
            <form onSubmit={handleSubscribe} className="space-y-3">
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-lg opacity-0 hover:opacity-100 transition-opacity pointer-events-none"></div>
              </div>
              <button
                type="submit"
                className="w-full px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg font-semibold shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 transition-all transform hover:scale-105"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 pt-8 mt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-gray-400 text-sm text-center md:text-left">
              <p>© 2025 FoodiesHub. All rights reserved.</p>
              <p className="text-xs mt-1">Built with ❤️ for food lovers everywhere</p>
            </div>

            {/* Payment Methods */}
            <div className="flex items-center space-x-3">
              <span className="text-gray-500 text-sm mr-2">We accept:</span>
              {['💳', '💰', '📱', '💵'].map((icon, idx) => (
                <div
                  key={idx}
                  className="w-12 h-8 bg-gray-800 rounded border border-gray-700 flex items-center justify-center hover:border-orange-500 transition-colors"
                >
                  <span className="text-lg">{icon}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* App Download Section */}
        <div className="mt-8 p-6 bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-2xl border border-orange-500/20">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            <div>
              <h4 className="text-xl font-bold mb-1">Get the FoodiesHub App</h4>
              <p className="text-gray-400 text-sm">Available on iOS and Android</p>
            </div>
            <div className="flex space-x-4">
              <button className="px-6 py-3 bg-black hover:bg-gray-900 rounded-lg font-semibold transition-all transform hover:scale-105 flex items-center space-x-2">
                <span className="text-2xl">🍎</span>
                <div className="text-left">
                  <p className="text-xs text-gray-400">Download on</p>
                  <p className="text-sm font-bold">App Store</p>
                </div>
              </button>
              <button className="px-6 py-3 bg-black hover:bg-gray-900 rounded-lg font-semibold transition-all transform hover:scale-105 flex items-center space-x-2">
                <span className="text-2xl">🤖</span>
                <div className="text-left">
                  <p className="text-xs text-gray-400">Get it on</p>
                  <p className="text-sm font-bold">Google Play</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
