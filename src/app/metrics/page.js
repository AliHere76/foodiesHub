'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { io } from 'socket.io-client';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function MetricsDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const socketRef = useRef(null);
  const [user, setUser] = useState(null);
  const [metrics, setMetrics] = useState({
    ordersPerMinute: 0,
    ordersLast10Minutes: 0,
    totalOrders: 0,
    avgPrepTime: 0,
    timestamp: new Date().toISOString(),
  });
  const [ordersHistory, setOrdersHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    if (parsedUser.role !== 'restaurant') {
      router.push('/dashboard');
      return;
    }

    const tenantId = searchParams.get('tenantId') || parsedUser.tenantId;

    if (!tenantId) {
      alert('Tenant ID is required');
      return;
    }

    fetchMetrics(tenantId);
    initializeSocket(tenantId);

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [router, searchParams]);

  const fetchMetrics = async (tenantId) => {
    try {
      const response = await fetch(`/api/metrics?tenantId=${tenantId}`);
      const data = await response.json();

      if (data.success) {
        setMetrics(data.data);
        updateOrdersHistory(data.data);
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeSocket = (tenantId) => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000';
    const socket = io(socketUrl);

    socket.on('connect', () => {
      console.log('Socket connected');
      setConnected(true);
      socket.emit('join_tenant', tenantId);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnected(false);
    });

    socket.on('metrics_update', (newMetrics) => {
      console.log('Received metrics update:', newMetrics);
      setMetrics(newMetrics);
      updateOrdersHistory(newMetrics);
    });

    socket.on('order_update', (orderData) => {
      console.log('Received order update:', orderData);
      fetchMetrics(tenantId);
    });

    socketRef.current = socket;
  };

  const updateOrdersHistory = (newMetrics) => {
    setOrdersHistory((prev) => {
      const updated = [
        ...prev,
        {
          time: new Date(newMetrics.timestamp).toLocaleTimeString(),
          orders: newMetrics.ordersPerMinute,
        },
      ];
      return updated.slice(-20);
    });
  };

  const lineChartData = {
    labels: ordersHistory.map((d) => d.time),
    datasets: [
      {
        label: 'Orders Per Minute',
        data: ordersHistory.map((d) => d.orders),
        borderColor: 'rgb(249, 115, 22)',
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const barChartData = {
    labels: ['Last Minute', 'Last 10 Min', 'Total Orders'],
    datasets: [
      {
        label: 'Orders',
        data: [
          metrics.ordersPerMinute,
          metrics.ordersLast10Minutes,
          metrics.totalOrders,
        ],
        backgroundColor: [
          'rgba(249, 115, 22, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(34, 197, 94, 0.8)',
        ],
        borderRadius: 8,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
          color: '#9CA3AF',
        },
        grid: {
          color: '#374151',
        },
      },
      x: {
        ticks: {
          color: '#9CA3AF',
        },
        grid: {
          display: false,
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Header */}
      <div className="bg-gray-900/80 backdrop-blur-md border-b border-gray-800 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                Analytics Dashboard
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                Real-time performance metrics
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center border border-green-500/30">
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-white">WebSocket</p>
                <p className="text-sm text-gray-400">
                  {connected ? 'Connected' : 'Disconnected'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center border border-blue-500/30">
                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-white">Kafka Consumer</p>
                <p className="text-sm text-gray-400">Processing events</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center border border-orange-500/30">
                <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-white">Last Update</p>
                <p className="text-sm text-gray-400">
                  {new Date(metrics.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}