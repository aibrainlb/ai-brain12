// Add this at the very beginning for SSL issues
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

// Database
const connectDB = require('./config/database');

// Routes
const apiRoutes = require('./routes/api');

// Initialize app
const app = express();
const PORT = process.env.PORT || 3000;

// Connect to database
connectDB.connect().then(() => {
  console.log('✅ Database connection initialized');
}).catch((err) => {
  console.error('⚠️  Database connection failed:', err.message);
  console.log('ℹ️  Continuing without database...');
});

/**
 * Security Middleware
 */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:", "http:", "blob:"],
      connectSrc: ["'self'", "http://localhost:3000", "ws://localhost:3000"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      workerSrc: ["'self'", "blob:"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

/**
 * CORS Configuration
 */
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173'
    ];

console.log('\n🌐 CORS Configuration:');
console.log('   Environment:', process.env.NODE_ENV || 'development');
console.log('   Allowed Origins:', allowedOrigins);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman)
    if (!origin) {
      return callback(null, true);
    }
    
    // Allow localhost and development origins
    const isDevelopment = 
      !process.env.NODE_ENV || 
      process.env.NODE_ENV === 'development' ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1');
    
    if (isDevelopment) {
      return callback(null, true);
    }
    
    // Check allowed origins in production
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error(`🚫 CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Allow-Headers'
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

/**
 * Rate Limiting
 */
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  keyGenerator: (req) => req.ip
});

const contactLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_CONTACT_WINDOW) || 60 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_CONTACT_MAX) || 5,
  message: {
    success: false,
    message: 'Too many contact form submissions. Please try again later.'
  },
  skipFailedRequests: true
});

app.use('/api/', apiLimiter);
app.post('/api/contact', contactLimiter);

/**
 * Logging Middleware
 */
const logFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(logFormat, {
  stream: {
    write: (message) => {
      console.log(message.trim());
    }
  }
}));

/**
 * Body Parsing Middleware
 */
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb'
}));

/**
 * Static Files
 */
// Serve from public directory (for production)
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

/**
 * API Routes
 */
app.use('/api', apiRoutes);

/**
 * Database Health Check Endpoint
 */
app.get('/api/db/health', async (req, res) => {
  try {
    const health = await connectDB.healthCheck();
    res.json({
      success: true,
      database: health.status,
      timestamp: health.timestamp,
      ...health
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Database connection failed',
      error: error.message
    });
  }
});

/**
 * SPA Fallback
 */
app.get('*', (req, res, next) => {
  // Skip API routes
  if (req.path.startsWith('/api')) {
    return next();
  }
  
  // Skip files with extensions
  if (req.path.match(/\.\w+$/)) {
    return next();
  }
  
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/**
 * 404 Handler
 */
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Resource not found',
    path: req.path,
    method: req.method
  });
});

/**
 * Global Error Handler
 */
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.message);
  console.error('Stack:', err.stack);
  
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation',
      allowedOrigins: allowedOrigins,
      yourOrigin: req.headers.origin
    });
  }
  
  if (err.status === 429) {
    return res.status(429).json({
      success: false,
      message: 'Too many requests',
      retryAfter: err.retryAfter
    });
  }
  
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Something went wrong!' 
    : err.message;
  
  res.status(statusCode).json({
    success: false,
    message: message,
    error: process.env.NODE_ENV === 'development' ? {
      name: err.name,
      message: err.message,
      stack: err.stack
    } : undefined
  });
});

/**
 * Start Server (Local Development Only)
 */
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log('\n' + '='.repeat(70));
    console.log('🚀 AI BRAIN PORTFOLIO SERVER');
    console.log('='.repeat(70));
    console.log(`📍 Port: ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Local: http://localhost:${PORT}`);
    console.log(`📁 Public: ${path.join(__dirname, 'public')}`);
    console.log('='.repeat(70));
    console.log('\n📋 Available Endpoints:');
    console.log('   GET  /api/health          - Health check');
    console.log('   GET  /api/config          - Configuration');
    console.log('   GET  /api/stats           - Statistics');
    console.log('   POST /api/contact         - Contact form');
    console.log('   GET  /api/projects        - Portfolio projects');
    console.log('   GET  /api/db/health       - Database health');
    console.log('='.repeat(70) + '\n');
  });

  /**
   * Graceful Shutdown
   */
  const gracefulShutdown = async (signal) => {
    console.log(`\n🔄 Received ${signal}. Starting graceful shutdown...`);
    
    try {
      server.close(() => {
        console.log('✅ HTTP server closed');
      });
      
      await connectDB.disconnect();
      
      console.log('👋 Graceful shutdown completed');
      process.exit(0);
      
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    process.exit(1);
  });
  process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  });
}

/**
 * Export for Vercel Serverless Functions
 */
module.exports = app;