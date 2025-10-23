'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import io from 'socket.io-client';

export default function OrdersPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [socket, setSocket] = useState(null);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
  }, [router]);

  // Define fetchOrders with useCallback to prevent recreating on each render
  const fetchOrders = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      console.log('📡 Fetching orders...');
      const response = await fetch('/api/orders', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const data = await response.json();
      console.log('✅ Orders fetched:', data.orders?.length || 0);
      setOrders(data.orders || []);
      setError(null);
    } catch (err) {
      console.error('❌ Error fetching orders:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch orders on mount and when user changes
  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user, fetchOrders]);

  // Initialize Socket.IO with improved connection handling
  useEffect(() => {
    if (!user) return;

    console.log('🔌 Initializing Socket.IO connection...');
    
    const newSocket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000', {
      auth: {
        token: localStorage.getItem('token')
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket connected:', newSocket.id);
      setConnected(true);
      
      // Log user data for debugging
      console.log('👤 User data:', user);
      
      // Restaurant owners join tenant room to see all orders
      if (user.role === 'restaurant') {
        newSocket.emit('join_tenant', user.tenantId);
        console.log('🏢 Joined tenant room:', user.tenantId);
      }
      
      // Customers join customer-specific room to see their orders
      if (user.role === 'customer') {
        // Try different possible user ID properties
        const customerId = user.userId || user._id || user.id;
        console.log('👤 Customer ID:', customerId);
        
        if (customerId) {
          newSocket.emit('join_customer', customerId);
          console.log('👤 Joined customer room:', customerId);
        } else {
          console.error('❌ Customer ID not found in user object:', user);
        }
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('⚠️ Socket disconnected:', reason);
      setConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
      setConnected(false);
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
      setConnected(true);
      
      // Rejoin rooms after reconnection
      if (user.role === 'restaurant') {
        newSocket.emit('join_tenant', user.tenantId);
        console.log('🏢 Rejoined tenant room:', user.tenantId);
      } else if (user.role === 'customer') {
        const customerId = user.userId || user._id || user.id;
        if (customerId) {
          newSocket.emit('join_customer', customerId);
          console.log('👤 Rejoined customer room:', customerId);
        }
      }
      
      // Refetch orders after reconnection
      fetchOrders();
    });

    newSocket.on('order_update', (data) => {
      console.log('📨 Received order_update:', data);
      // Refetch all orders to get latest data
      fetchOrders();
    });

    newSocket.on('order_status_change', (data) => {
      console.log('📨 Received order_status_change:', data);
      
      // Update the specific order in state
      if (data.order) {
        // Full order data received
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order._id === data.order._id 
              ? data.order
              : order
          )
        );
      } else if (data.orderId && data.status) {
        // Partial update received
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order._id === data.orderId 
              ? { ...order, status: data.status, updatedAt: data.updatedAt || new Date().toISOString() }
              : order
          )
        );
      }
    });

    // Listen for new orders (for restaurant owners)
    newSocket.on('new_order', (data) => {
      console.log('📨 Received new_order:', data);
      // Refetch orders to include the new one
      fetchOrders();
    });

    setSocket(newSocket);

    // Cleanup function - only disconnect when component actually unmounts
    return () => {
      console.log('🔌 Cleaning up Socket.IO connection');
      if (newSocket) {
        newSocket.off('connect');
        newSocket.off('disconnect');
        newSocket.off('connect_error');
        newSocket.off('reconnect');
        newSocket.off('order_update');
        newSocket.off('order_status_change');
        newSocket.off('new_order');
        newSocket.close();
      }
    };
  }, [user, fetchOrders]);

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      
      console.log(`🔄 Updating order ${orderId} to status: ${newStatus}`);
      
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update order status');
      }

      const data = await response.json();
      console.log('✅ Order status updated:', data);
      
      // Update local state immediately for better UX
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order._id === orderId ? { ...order, ...data.order } : order
        )
      );

      // Show success message
      alert(`Order status updated to ${newStatus.replace(/_/g, ' ')}`);
    } catch (err) {
      console.error('❌ Error updating order status:', err);
      alert(`Failed to update order status: ${err.message}`);
    }
  };

  const getNextStatuses = (currentStatus) => {
    const statusFlow = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['preparing', 'cancelled'],
      preparing: ['ready', 'cancelled'],
      ready: ['out_for_delivery'],
      out_for_delivery: ['delivered'],
      delivered: [],
      cancelled: []
    };
    return statusFlow[currentStatus] || [];
  };

  const getStatusButtonLabel = (status) => {
    const labels = {
      confirmed: '✓ Confirm Order',
      preparing: '👨‍🍳 Start Cooking',
      ready: '✅ Mark as Ready',
      out_for_delivery: '🚚 Send for Delivery',
      delivered: '📦 Mark as Delivered',
      cancelled: '❌ Cancel Order'
    };
    return labels[status] || status;
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: '⏳',
      confirmed: '✅',
      preparing: '👨‍🍳',
      ready: '🍽️',
      out_for_delivery: '🚚',
      delivered: '📦',
      cancelled: '❌'
    };
    return icons[status] || '📋';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatCurrency = (amount) => {
    return `$${amount.toFixed(2)}`;
  };

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    return order.status === filter;
  });

  const toggleOrderDetails = (orderId) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  const fetchDashboardData = async (userData) => {
    // Not needed anymore - replaced by fetchOrders
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
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 border-b border-orange-200">
        <div className="container mx-auto px-6 py-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
                  {user?.role === 'restaurant' ? 'Manage Orders' : 'My Orders'}
                </h1>
                <p className="text-orange-100 text-lg flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'} animate-pulse`}></span>
                  {connected ? 'Live updates enabled' : 'Connecting...'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="group bg-white rounded-2xl p-6 border border-gray-200 hover:border-orange-300 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm mb-2 font-medium uppercase tracking-wide">Total Orders</p>
                <p className="text-5xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  {orders.length}
                </p>
                <p className="text-sm text-gray-600 mt-2">All time orders</p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="group bg-white rounded-2xl p-6 border border-gray-200 hover:border-green-300 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm mb-2 font-medium uppercase tracking-wide">Active Orders</p>
                <p className="text-5xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  {orders.filter(o => ['pending', 'confirmed', 'preparing'].includes(o.status)).length}
                </p>
                <p className="text-sm text-gray-600 mt-2">In progress</p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="group bg-white rounded-2xl p-6 border border-gray-200 hover:border-blue-300 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm mb-2 font-medium uppercase tracking-wide">
                  {user?.role === 'customer' ? 'From Restaurants' : 'Completed'}
                </p>
                <p className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  {user?.role === 'customer' 
                    ? restaurants.length 
                    : orders.filter(o => o.status === 'delivered').length
                  }
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  {user?.role === 'customer' ? 'Available' : 'Delivered'}
                </p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Orders Section */}
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-200 shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">All Orders</h2>
              <p className="text-gray-500 mt-1">Filter and manage your orders</p>
            </div>
          </div>
            
          {/* Filter Tabs */}
          <div className="flex gap-2 flex-wrap mb-6 pb-6 border-b border-gray-200">
            {['all', 'pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'].map(status => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-md ${
                  filter === status
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-orange-500/30'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? 'All' : status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                  filter === status ? 'bg-white/20' : 'bg-gray-200'
                }`}>
                  {status === 'all' ? orders.length : orders.filter(o => o.status === status).length}
                </span>
              </button>
            ))}
          </div>

          {filteredOrders.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-32 h-32 bg-gradient-to-br from-orange-100 to-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-16 h-16 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {filter === 'all' ? 'No Orders Yet' : `No ${filter.replace('_', ' ')} Orders`}
              </h3>
              <p className="text-gray-600 mb-8 text-lg">
                {filter === 'all' ? 'Start ordering delicious food!' : 'Try selecting a different filter'}
              </p>
              {user?.role === 'customer' && (
                <Link
                  href="/restaurants"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-semibold hover:shadow-2xl hover:shadow-orange-500/40 transition-all transform hover:scale-105"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Browse Restaurants
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {filteredOrders.map((order) => (
                <div
                  key={order._id}
                  className="group bg-gradient-to-br from-white to-orange-50/20 border-2 border-gray-200 rounded-2xl overflow-hidden hover:border-orange-300 hover:shadow-2xl transition-all duration-300"
                >
                  {/* Order Header */}
                  <div className="p-6 md:p-8">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center text-white shadow-lg text-2xl">
                            {getStatusIcon(order.status)}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-2xl">
                              Order #{order.orderNumber}
                            </p>
                            <p className="text-sm text-gray-500 font-medium">
                              {formatDate(order.createdAt)}
                            </p>
                          </div>
                        </div>
                        
                        {/* Order Info Based on Role */}
                        <div className="mt-4 space-y-2 bg-white/60 rounded-xl p-4 border border-gray-200">
                          {user?.role === 'restaurant' ? (
                            <>
                              <div className="flex items-center gap-2 text-gray-700">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <span className="font-semibold">Customer:</span> {order.customerId?.name || 'N/A'}
                              </div>
                              <div className="flex items-center gap-2 text-gray-700">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <span className="font-semibold">Contact:</span> {order.customerId?.email || 'N/A'}
                              </div>
                              <div className="flex items-center gap-2 text-gray-700">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                <span className="font-semibold">Phone:</span> {order.contactPhone || order.customerId?.phone || 'N/A'}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center gap-2 text-gray-700">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                </svg>
                                <span className="font-semibold">Restaurant:</span> {order.restaurantId?.name || 'N/A'}
                              </div>
                              <div className="flex items-center gap-2 text-gray-700">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span className="font-semibold">Delivery:</span> {typeof order.deliveryAddress === 'object' ? `${order.deliveryAddress.street}, ${order.deliveryAddress.city}` : order.deliveryAddress || 'N/A'}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex md:flex-col items-center md:items-end gap-4">
                        <span className={`px-5 py-3 rounded-xl text-sm font-bold border-2 shadow-lg whitespace-nowrap ${getStatusColor(order.status)}`}>
                          {order.status.replace(/_/g, ' ').toUpperCase()}
                        </span>
                        <div className="text-right bg-gradient-to-br from-orange-50 to-red-50 px-6 py-4 rounded-xl border-2 border-orange-200">
                          <p className="text-sm text-gray-600 font-medium mb-1">Total Amount</p>
                          <p className="text-3xl font-bold text-orange-600">
                            ${order.totalAmount.toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {order.items.length} items
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Status Update Buttons for Restaurant */}
                    {user?.role === 'restaurant' && getNextStatuses(order.status).length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-sm font-semibold text-gray-700 mb-3">Update Order Status:</p>
                        <div className="flex flex-wrap gap-2">
                          {getNextStatuses(order.status).map(nextStatus => (
                            <button
                              key={nextStatus}
                              onClick={() => handleStatusUpdate(order._id, nextStatus)}
                              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all transform hover:scale-105 ${
                                nextStatus === 'cancelled' 
                                  ? 'bg-red-500 hover:bg-red-600 text-white shadow-md hover:shadow-lg'
                                  : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-md hover:shadow-lg'
                              }`}
                            >
                              {getStatusButtonLabel(nextStatus)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Delivery Confirmation Button for Customer */}
                    {user?.role === 'customer' && order.status === 'out_for_delivery' && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <button
                          onClick={() => handleStatusUpdate(order._id, 'delivered')}
                          className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg font-semibold shadow-md hover:shadow-lg transition-all transform hover:scale-[1.02]"
                        >
                          ✓ Confirm Order Received
                        </button>
                      </div>
                    )}

                    {/* Toggle Details Button */}
                    <button
                      onClick={() => toggleOrderDetails(order._id)}
                      className="mt-4 w-full py-2 text-sm text-orange-600 hover:text-orange-700 font-semibold flex items-center justify-center gap-2 hover:bg-orange-50 rounded-lg transition-all"
                    >
                      <span>{expandedOrder === order._id ? 'Hide' : 'Show'} Order Details</span>
                      <svg
                        className={`w-4 h-4 transition-transform ${expandedOrder === order._id ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>

                  {/* Expanded Order Details */}
                  {expandedOrder === order._id && (
                    <div className="px-6 pb-6 bg-gray-50 border-t border-gray-200">
                      <h4 className="font-bold text-gray-900 mt-4 mb-3">Order Items:</h4>
                      <div className="space-y-3">
                        {order.items?.map((item, index) => (
                          <div key={index} className="flex justify-between items-center py-3 px-4 bg-white rounded-lg border border-gray-200">
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900">{item.name || item.menuItem?.name || 'Unknown Item'}</p>
                              <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                              {item.specialInstructions && (
                                <p className="text-sm text-orange-600 mt-1">
                                  Note: {item.specialInstructions}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-gray-900">${item.price.toFixed(2)}</p>
                              <p className="text-xs text-gray-500">each</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Order Summary */}
                      <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Subtotal:</span>
                          <span className="font-semibold">${order.subtotal?.toFixed(2) || '0.00'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Delivery Fee:</span>
                          <span className="font-semibold">${order.deliveryFee?.toFixed(2) || '0.00'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Tax:</span>
                          <span className="font-semibold">${order.tax?.toFixed(2) || '0.00'}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold border-t pt-2">
                          <span>Total:</span>
                          <span className="text-orange-600">${order.totalAmount.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Order Timeline */}
                      {(order.preparationStartTime || order.preparationEndTime || order.actualDeliveryTime) && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h4 className="font-bold text-gray-900 mb-3">Order Timeline:</h4>
                          <div className="space-y-2">
                            <div className="flex items-center gap-3 text-sm">
                              <span className="text-xl">📝</span>
                              <div>
                                <p className="font-semibold text-gray-900">Order Placed</p>
                                <p className="text-gray-600">{formatDate(order.createdAt)}</p>
                              </div>
                            </div>
                            {order.preparationStartTime && (
                              <div className="flex items-center gap-3 text-sm">
                                <span className="text-xl">👨‍🍳</span>
                                <div>
                                  <p className="font-semibold text-gray-900">Started Preparing</p>
                                  <p className="text-gray-600">{formatDate(order.preparationStartTime)}</p>
                                </div>
                              </div>
                            )}
                            {order.preparationEndTime && (
                              <div className="flex items-center gap-3 text-sm">
                                <span className="text-xl">✅</span>
                                <div>
                                  <p className="font-semibold text-gray-900">Ready for Delivery</p>
                                  <p className="text-gray-600">{formatDate(order.preparationEndTime)}</p>
                                </div>
                              </div>
                            )}
                            {order.actualDeliveryTime && (
                              <div className="flex items-center gap-3 text-sm">
                                <span className="text-xl">🎉</span>
                                <div>
                                  <p className="font-semibold text-gray-900">Delivered</p>
                                  <p className="text-gray-600">{formatDate(order.actualDeliveryTime)}</p>
                                </div>
                              </div>
                            )}
                            {order.estimatedDeliveryTime && !order.actualDeliveryTime && (
                              <div className="flex items-center gap-3 text-sm">
                                <span className="text-xl">⏱️</span>
                                <div>
                                  <p className="font-semibold text-gray-900">Estimated Delivery</p>
                                  <p className="text-gray-600">{formatDate(order.estimatedDeliveryTime)}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}