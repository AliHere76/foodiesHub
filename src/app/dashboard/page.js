'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    fetchDashboardData(parsedUser);
  }, [router]);

  const fetchDashboardData = async (userData) => {
    try {
      if (userData.role === 'customer') {
        const restResponse = await fetch('/api/restaurants');
        const restData = await restResponse.json();
        if (restData.success) {
          setRestaurants(restData.data);
        }
      }

      const ordersResponse = await fetch('/api/orders');
      const ordersData = await ordersResponse.json();
      if (ordersData.success) {
        setOrders(ordersData.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('user');
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-amber-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      confirmed: 'bg-blue-100 text-blue-700 border-blue-300',
      preparing: 'bg-purple-100 text-purple-700 border-purple-300',
      ready: 'bg-green-100 text-green-700 border-green-300',
      out_for_delivery: 'bg-orange-100 text-orange-700 border-orange-300',
      delivered: 'bg-green-100 text-green-700 border-green-300',
      cancelled: 'bg-red-100 text-red-700 border-red-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-300';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-amber-50">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
              FoodiesHub
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-gray-600">
                Welcome, <span className="text-gray-900 font-semibold">{user?.name}</span>
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-all border border-red-200 font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white/80 border-b border-gray-200">
        <div className="container mx-auto px-6">
          <nav className="flex gap-8">
            <Link
              href="/dashboard"
              className="py-4 border-b-2 border-orange-500 text-orange-600 font-semibold"
            >
              Dashboard
            </Link>
            {user?.role === 'customer' && (
              <Link
                href="/restaurants"
                className="py-4 border-b-2 border-transparent hover:border-gray-300 text-gray-600 hover:text-gray-900 transition-colors font-medium"
              >
                Restaurants
              </Link>
            )}
            <Link
              href="/orders"
              className="py-4 border-b-2 border-transparent hover:border-gray-300 text-gray-600 hover:text-gray-900 transition-colors font-medium"
            >
              Orders
            </Link>
            {user?.role === 'restaurant' && (
              <Link
                href={`/metrics?tenantId=${user.tenantId}`}
                className="py-4 border-b-2 border-transparent hover:border-gray-300 text-gray-600 hover:text-gray-900 transition-colors font-medium"
              >
                Analytics
              </Link>
            )}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 hover:border-orange-300 hover:shadow-xl transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1 font-medium">Total Orders</p>
                <p className="text-4xl font-bold text-gray-900">
                  {orders.length}
                </p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 hover:border-orange-300 hover:shadow-xl transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1 font-medium">Active Orders</p>
                <p className="text-4xl font-bold text-gray-900">
                  {orders.filter(o => ['pending', 'confirmed', 'preparing'].includes(o.status)).length}
                </p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 hover:border-orange-300 hover:shadow-xl transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1 font-medium">
                  {user?.role === 'customer' ? 'Restaurants' : 'Completed'}
                </p>
                <p className="text-4xl font-bold text-gray-900">
                  {user?.role === 'customer' 
                    ? restaurants.length 
                    : orders.filter(o => o.status === 'delivered').length
                  }
                </p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Orders</h2>
          {orders.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <p className="text-gray-600 text-lg mb-6">No orders yet</p>
              {user?.role === 'customer' && (
                <Link
                  href="/restaurants"
                  className="inline-block px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-orange-500/30 transition-all"
                >
                  Browse Restaurants
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {orders.slice(0, 5).map((order) => (
                <div
                  key={order._id}
                  className="bg-gray-50/50 border border-gray-200 rounded-xl p-6 hover:border-orange-300 hover:shadow-md transition-all"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-900 text-lg mb-1">
                        Order #{order.orderNumber}
                      </p>
                      <p className="text-gray-600 mb-2">
                        {order.restaurantId?.name || 'Restaurant'}
                      </p>
                      <p className="text-sm text-gray-500 font-medium">
                        {order.items.length} items • ${order.totalAmount.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-4 py-2 rounded-lg text-sm font-semibold border ${getStatusColor(order.status)}`}>
                        {order.status.replace('_', ' ').toUpperCase()}
                      </span>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}