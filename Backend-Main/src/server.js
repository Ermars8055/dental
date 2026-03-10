import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pool from './config/db.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';
import { initializeScheduledJobs, closeQueues } from './jobs/queue.js';
import { generateCSRFToken, verifyCSRFToken } from './middleware/csrf.js';
import authRoutes from './routes/authRoutes.js';
import patientRoutes from './routes/patientRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import reportsRoutes from './routes/reportsRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import treatmentRoutes from './routes/treatmentRoutes.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================
// Auto-run SQL migrations on startup
// ============================================
const runMigrations = async () => {
  try {
    // Ensure migrations tracking table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    const migrationsDir = join(__dirname, '..', 'migrations');
    const files = (await readdir(migrationsDir))
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const { rows } = await pool.query('SELECT id FROM _migrations WHERE filename = $1', [file]);
      if (rows.length > 0) continue; // already applied

      const sql = await readFile(join(migrationsDir, file), 'utf8');
      await pool.query(sql);
      await pool.query('INSERT INTO _migrations (filename) VALUES ($1)', [file]);
      console.log(`[MIGRATIONS] ✓ Applied: ${file}`);
      logger.info(`Migration applied: ${file}`);
    }
  } catch (err) {
    console.error('[MIGRATIONS] Error running migrations:', err.message);
    logger.error('Migration error', { error: err.message });
    throw err;
  }
};

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ============================================
// Middleware Setup
// ============================================

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  exposedHeaders: ['X-CSRF-Token'],
};
app.use(cors(corsOptions));

// Request logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Compression
app.use(compression());

// CSRF Protection
app.use(generateCSRFToken); // Generate tokens for GET requests
app.use(verifyCSRFToken); // Verify tokens for state-changing requests

// ============================================
// Health Check & Status Endpoints
// ============================================

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
  });
});

app.get('/api/status', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is operational',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// ============================================
// Routes
// ============================================

// Authentication routes
app.use('/api/auth', authRoutes);

// Patient routes
app.use('/api/patients', patientRoutes);

// Appointment routes
app.use('/api/appointments', appointmentRoutes);

// Payment routes
app.use('/api/payments', paymentRoutes);

// Expense routes
app.use('/api/expenses', expenseRoutes);

// Inventory routes
app.use('/api/inventory', inventoryRoutes);

// Settings and breaks routes
app.use('/api/settings', settingsRoutes);

// Reports and analytics routes
app.use('/api/reports', reportsRoutes);

// Notifications and reminders routes
app.use('/api/notifications', notificationRoutes);

// Treatment catalogue routes
app.use('/api/treatments', treatmentRoutes);

// ============================================
// Error Handling
// ============================================

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ============================================
// Server Startup
// ============================================

const startServer = async () => {
  try {
    // Test PostgreSQL connection
    console.log('[SERVER] Starting server initialization...');
    logger.info('Testing PostgreSQL connection...');

    console.log('[SERVER] Testing PostgreSQL connection...');
    try {
      await pool.query('SELECT 1');
      console.log('[SERVER] PostgreSQL connection successful');
      logger.info('PostgreSQL connection successful');
    } catch (connectionError) {
      console.log('[SERVER] Connection error:', connectionError.message);
      if (NODE_ENV === 'development') {
        logger.warn('PostgreSQL connection test failed, continuing in development mode', {
          error: connectionError.message,
        });
      } else {
        throw connectionError;
      }
    }

    // Run database migrations automatically
    console.log('[SERVER] Running database migrations...');
    await runMigrations();
    console.log('[SERVER] Migrations complete');
    if (NODE_ENV === 'production' || NODE_ENV === 'development') {
      try {
        console.log('[SERVER] Initializing background jobs...');
        await initializeScheduledJobs();
        console.log('[SERVER] Background jobs initialized');
        logger.info('Background jobs initialized');
      } catch (jobError) {
        console.log('[SERVER] Background jobs error:', jobError.message);
        logger.error('Failed to initialize background jobs', {
          error: jobError.message,
        });
        // Continue server startup even if jobs fail
      }
    }

    // Start server
    console.log(`[SERVER] Starting HTTP server on port ${PORT}...`);
    const server = app.listen(PORT, () => {
      console.log(`[SERVER] ✓ Server running on http://localhost:${PORT}`);
      logger.info(`Server started successfully`, {
        port: PORT,
        environment: NODE_ENV,
        url: `http://localhost:${PORT}`,
      });
    });

    // Handle graceful shutdown
    const gracefulShutdown = async () => {
      logger.info('Shutting down gracefully...');
      try {
        await closeQueues();
        server.close(() => {
          logger.info('Server closed');
          process.exit(0);
        });
      } catch (shutdownError) {
        logger.error('Error during shutdown', { error: shutdownError.message });
        process.exit(1);
      }
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
  } catch (error) {
    logger.error('Failed to start server', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', { error: error.message, stack: error.stack });
  process.exit(1);
});

startServer();

export default app;
