const express = require('express');
const next = require('next');
const { createServer } = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const mongoSanitize = require('express-mongo-sanitize');
const passport = require('passport');
require('dotenv').config({ path: '.env.local' });

const { connectDB } = require('./src/lib/db');
const { redisClient } = require('./src/lib/redis');
const { initializeSocket } = require('./src/lib/socket');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT, 10) || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  const server = express();
  const httpServer = createServer(server);
  
  // Connect to MongoDB
  await connectDB();
  
  // Connect to Redis
  await redisClient.connect();
  console.log('✅ Redis connected');

  // Initialize Socket.IO
  const io = initializeSocket(httpServer);
  
  // Make io accessible to routes
  server.set('io', io);

  // Security middleware
  server.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));
  
  server.use(cors({
    origin: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
    credentials: true,
  }));

  // IMPORTANT: Don't parse body for Next.js API routes
  // Only parse for non-Next.js routes
  server.use((req, res, next) => {
    // Skip body parsing for Next.js API routes
    if (req.url.startsWith('/api/') || req.url.startsWith('/_next/')) {
      return next();
    }
    express.json()(req, res, next);
  });

  server.use((req, res, next) => {
    if (req.url.startsWith('/api/') || req.url.startsWith('/_next/')) {
      return next();
    }
    express.urlencoded({ extended: true })(req, res, next);
  });

  server.use(cookieParser());
  server.use(mongoSanitize());

  // Session configuration with Redis
  server.use(
    session({
      store: new RedisStore({ client: redisClient }),
      secret: process.env.SESSION_SECRET || 'your_session_secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      },
    })
  );

  // Passport initialization
  server.use(passport.initialize());
  server.use(passport.session());

  // Let Next.js handle all requests
  server.all('*', (req, res) => {
    return handle(req, res);
  });

  httpServer.listen(port, () => {
    console.log(`🚀 Server running on http://${hostname}:${port}`);
    console.log(`📡 Socket.IO server ready`);
  });
}).catch((err) => {
  console.error('Error starting server:', err);
  process.exit(1);
});