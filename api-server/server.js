/**
 * Claude Code API Server
 *
 * Express server providing REST API access to Claude Code functionality
 *
 * Features:
 * - Standard execute mode (buffer-based, quick Q&A)
 * - Workspace mode (file-based, persistent storage, full tool access)
 * - API key management with admin dashboard
 * - Usage tracking and statistics
 * - Cloudflare tunnel support
 */

// Load environment variables FIRST
require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const cloudflared = require('cloudflared');
const WorkspaceManager = require('./workspace-manager');
const ProjectManager = require('./src/projectManager');
const FirestoreQueueManager = require('./serverless-queue/firestoreQueueManager');

// Import routes
const executeRoutes = require('./routes/execute');
const workspaceRoutes = require('./routes/workspace');
const adminRoutes = require('./routes/admin');
const usageRoutes = require('./routes/usage');
const dashboardRoutes = require('./routes/dashboard');
const projectRoutes = require('./routes/projects');
const batchRoutes = require('./routes/batch');
const queueRoutes = require('./routes/queue');
const fileRoutes = require('./routes/files');
const birthstarUsageRoutes = require('./routes/birthstar-usage');
const templateRoutes = require('./routes/templates');

// Import middleware
const authMiddleware = require('./middleware/auth');
const trackingMiddleware = require('./middleware/tracking');

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = {
  // Server API authentication
  SERVER_API_KEY: process.env.SERVER_API_KEY || '',
  ENABLE_AUTH: (process.env.ENABLE_AUTH || 'true').toLowerCase() === 'true',
  ADMIN_SECRET: process.env.ADMIN_SECRET || 'change-me-in-production',

  // Claude Code configuration
  CLAUDE_CODE_PATH: process.env.CLAUDE_CODE_PATH || 'claude',
  DEFAULT_WORKING_DIR: process.env.DEFAULT_WORKING_DIR || process.cwd(),
  ANTHROPIC_BASE_URL: process.env.ANTHROPIC_BASE_URL || '',

  // Workspace configuration
  WORKSPACE_BASE_DIR: process.env.WORKSPACE_BASE_DIR || './claude-data',

  // Cloudflare tunnel
  ENABLE_CLOUDFLARE: (process.env.ENABLE_CLOUDFLARE || 'false').toLowerCase() === 'true',
  CLOUDFLARE_TUNNEL_TOKEN: process.env.CLOUDFLARE_TUNNEL_TOKEN || '',

  // Queue system
  ENABLE_QUEUE: (process.env.ENABLE_QUEUE || 'false').toLowerCase() === 'true',
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: process.env.REDIS_PORT || 6379,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || '',

  // Server settings
  PORT: parseInt(process.env.PORT || '8000', 10),
  HOST: process.env.HOST || '0.0.0.0'
};

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

// Usage tracking
const usageStats = {
  startTime: new Date(),
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  totalExecutionTime: 0,
  requestsByEndpoint: {},
  recentRequests: [],
  executeInsights: []
};

// API Key Management
const apiKeys = new Map();

// Initialize with the main server key if provided
if (config.SERVER_API_KEY) {
  apiKeys.set(config.SERVER_API_KEY, {
    key: config.SERVER_API_KEY,
    name: 'Primary Server Key',
    createdAt: new Date().toISOString(),
    lastUsed: null,
    requestCount: 0,
    enabled: true
  });
}

// Initialize Workspace Manager
const workspaceManager = new WorkspaceManager(config.WORKSPACE_BASE_DIR);

// Initialize Project Manager
const projectManager = new ProjectManager('./data');

// Initialize Firestore Queue Manager (always enabled)
let queueManager = null;

queueManager = new FirestoreQueueManager({
  collectionName: 'jobs'
});

console.log('✓ Firestore Queue system initialized');

// ============================================================================
// EXPRESS APP SETUP
// ============================================================================

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize middleware
authMiddleware.initialize(config, apiKeys);
trackingMiddleware.initialize(usageStats);

// Apply tracking middleware to all routes
app.use(trackingMiddleware.trackRequest);

// ============================================================================
// INITIALIZE ROUTES
// ============================================================================

// Initialize all route modules with their dependencies
executeRoutes.initializeRoute(config, usageStats, projectManager);
workspaceRoutes.initializeRoute(config, workspaceManager);
adminRoutes.initializeRoute(config, apiKeys);
usageRoutes.initializeRoute(usageStats, apiKeys);
dashboardRoutes.initializeRoute(apiKeys);
projectRoutes.initializeRoute(config);
batchRoutes.initializeRoute(config, projectManager);

// Initialize Firestore queue routes (always enabled)
queueRoutes.initializeRoute(queueManager);

// Initialize file serving routes
fileRoutes.initializeRoute(projectManager, './src/projects');

// ============================================================================
// ROOT ENDPOINT
// ============================================================================

app.get('/', (req, res) => {
  res.json({
    platform: 'Lemon AI Platform',
    name: 'Lemon API Server',
    version: '2.0.0',
    description: 'Scalable AI-powered development and automation platform built on Claude Code',

    capabilities: {
      project_management: {
        description: 'Manage unlimited projects with intelligent context',
        features: [
          'Auto-generated CLAUDE.md context files',
          'Template-based initialization',
          'Execution history tracking',
          'File-based storage (scales to 10,000+ projects)',
          'External project linking'
        ],
        endpoints: [
          'POST /api/projects',
          'GET /api/projects',
          'GET /api/projects/:id',
          'PUT /api/projects/:id',
          'DELETE /api/projects/:id',
          'GET /api/projects/:id/context',
          'PUT /api/projects/:id/context',
          'POST /api/projects/:id/context/regenerate',
          'GET /api/projects/:id/history',
          'GET /api/stats'
        ]
      },

      ai_execution: {
        description: 'AI-powered code operations with context',
        features: [
          'Standard mode (quick Q&A)',
          'Workspace mode (persistent sessions)',
          'Project mode (auto-loaded context)',
          'Streaming and non-streaming',
          'Custom working directories'
        ],
        endpoints: [
          'POST /api/execute',
          'POST /api/execute/stream',
          'POST /api/workspace/execute',
          'GET /api/workspace/sessions'
        ]
      },

      batch_operations: {
        description: 'Execute across hundreds of projects simultaneously',
        features: [
          'Parallel execution with concurrency control',
          'Filter-based project selection',
          'Job tracking and monitoring',
          'Error aggregation',
          'Progress reporting'
        ],
        endpoints: [
          'POST /api/batch/execute',
          'POST /api/batch/execute-by-filter',
          'GET /api/batch/jobs/:id',
          'GET /api/batch/jobs',
          'DELETE /api/batch/jobs'
        ]
      },

      templates: {
        description: 'Enhanced template management system with metadata, follow-up questions, and job integration',
        available: ['love', 'career', 'money', 'health', 'spiritual', 'general', 'custom'],
        features: [
          'Rich template schema with sections and context',
          'Follow-up questions for better personalization',
          'Template-based job creation',
          'Usage tracking and statistics',
          'Visual dashboard for management',
          'Template versioning and variants'
        ],
        endpoints: [
          'GET /api/templates - List all templates',
          'GET /api/templates/:id - Get specific template',
          'POST /api/templates - Create new template',
          'PUT /api/templates/:id - Update template',
          'DELETE /api/templates/:id - Delete template',
          'POST /api/templates/:id/duplicate - Duplicate template',
          'POST /api/queue/jobs/from-template - Create job from template',
          'GET /api/queue/templates/:id/requirements - Get template requirements',
          'GET /templates/dashboard - Template management UI'
        ]
      },

      api_management: {
        description: 'Secure multi-key authentication',
        features: [
          'Generate unlimited API keys',
          'Key-specific tracking',
          'Enable/disable keys',
          'Usage statistics per key',
          'Web admin dashboard'
        ],
        endpoints: [
          'GET /admin/keys',
          'POST /admin/keys',
          'DELETE /admin/keys/:keyPrefix',
          'PATCH /admin/keys/:keyPrefix/toggle'
        ]
      },

      analytics: {
        description: 'Comprehensive usage tracking',
        features: [
          'Request/response metrics',
          'Execution time tracking',
          'Project statistics',
          'Real-time dashboard',
          'Per-key usage tracking'
        ],
        endpoints: [
          'GET /usage',
          'GET /dashboard',
          'GET /admin/keys-dashboard'
        ]
      }
    },

    quick_start: {
      step_1: 'Create project: POST /api/projects with {"name": "My App", "type": "react"}',
      step_2: 'Execute: POST /api/execute with {"project_id": "...", "prompt": "add feature"}',
      step_3: 'Batch: POST /api/batch/execute across multiple projects',
      step_4: 'Monitor: GET /dashboard for analytics'
    },

    documentation: {
      platform_overview: 'LEMON_PLATFORM.md - Full platform capabilities',
      integration_guide: 'INTEGRATION_GUIDE_FOR_BIRTHSTAR.md - Integration guide for Birthstar',
      project_guide: 'PROJECT_MANAGEMENT_GUIDE.md - Project system guide',
      api_reference: 'API_REFERENCE.md - Complete API docs',
      quick_reference: 'QUICK_REFERENCE.md - Quick reference card',
      quick_start: 'QUICK_START.md - Getting started',
      usage_examples: 'USAGE_EXAMPLES.md - Code examples',
      setup_guide: 'SETUP_GUIDE.md - Installation & setup',
      interactive_docs: '/docs - Swagger UI (if available)',
      usage_dashboard: '/dashboard - Real-time analytics',
      admin_dashboard: '/admin/keys-dashboard - API key management'
    },

    authentication: config.ENABLE_AUTH ? 'enabled' : 'disabled',

    stats: {
      total_projects: projectManager.getStats().total,
      active_projects: projectManager.getStats().active,
      uptime: formatUptime((Date.now() - usageStats.startTime.getTime()) / 1000),
      total_requests: usageStats.totalRequests,
      success_rate: usageStats.totalRequests > 0
        ? ((usageStats.successfulRequests / usageStats.totalRequests) * 100).toFixed(1) + '%'
        : '0%'
    },

    support: {
      test_script: './test_projects.sh - Run comprehensive tests',
      health_check: 'GET /health',
      github: 'https://github.com/anthropics/claude-code'
    }
  });
});

// Helper function for uptime formatting
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: '2.0.0',
    claude_code_available: true,
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// MOUNT ROUTES
// ============================================================================

// Standard execute endpoints (with auth)
app.use('/api', authMiddleware.verifyApiKey, executeRoutes.router);

// Workspace endpoints (with auth)
app.use('/api/workspace', authMiddleware.verifyApiKey, workspaceRoutes.router);

// IMPORTANT: Register specific routes BEFORE general routes to avoid conflicts

// Blueprint template management endpoints (with auth) - MUST be before /api/projects
app.use('/api/templates', authMiddleware.verifyApiKey, templateRoutes);

// Project endpoints (with auth) - includes OLD template engine at /api/templates/:category/:name
app.use('/api', authMiddleware.verifyApiKey, projectRoutes.router);

// Batch endpoints (with auth)
app.use('/api/batch', authMiddleware.verifyApiKey, batchRoutes.router);

// File serving endpoints (with auth)
app.use('/files', authMiddleware.verifyApiKey, fileRoutes.router);

// Template dashboard (no auth - lightweight view)
app.get('/templates/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'templates', 'template-dashboard.html'));
});

// Admin endpoints (no standard auth, uses admin secret)
app.use('/admin', adminRoutes.router);

// Birthstar usage documentation (no auth for documentation) - MUST be before '/' route
app.use('/usage', birthstarUsageRoutes);

// Usage & dashboard endpoints (no auth for read-only views)
app.use('/', usageRoutes.router);
app.use('/admin', dashboardRoutes.router);

// Firestore Queue endpoints (with auth if enabled)
if (config.ENABLE_AUTH) {
  app.use('/api/queue', authMiddleware.verifyApiKey, queueRoutes.router);
} else {
  app.use('/api/queue', queueRoutes.router);
}

// ============================================================================
// SERVER STARTUP
// ============================================================================

async function startServer() {
  console.log('Starting Claude Code API Server on ' + config.HOST + ':' + config.PORT);
  console.log('Authentication: ' + (config.ENABLE_AUTH ? 'enabled' : 'disabled'));
  console.log('Claude Code path: ' + config.CLAUDE_CODE_PATH);
  console.log('Default working directory: ' + config.DEFAULT_WORKING_DIR);
  console.log('Workspace base directory: ' + config.WORKSPACE_BASE_DIR);
  console.log('Queue system: ' + (config.ENABLE_QUEUE ? 'enabled (Redis: ' + config.REDIS_HOST + ':' + config.REDIS_PORT + ')' : 'disabled'));
  console.log('Cloudflare Tunnel: ' + (config.ENABLE_CLOUDFLARE ? 'enabled' : 'disabled'));
  console.log('');

  const server = app.listen(config.PORT, config.HOST, () => {
    console.log(`\nAPI Documentation: http://${config.HOST}:${config.PORT}/`);
    console.log(`Health Check: http://${config.HOST}:${config.PORT}/health`);
    console.log(`Usage Dashboard: http://${config.HOST}:${config.PORT}/dashboard`);
    console.log(`Admin Dashboard: http://${config.HOST}:${config.PORT}/admin/keys-dashboard`);
    if (config.ENABLE_QUEUE) {
      console.log(`Queue Dashboard: http://${config.HOST}:${config.PORT}/admin/queue-dashboard`);
    }
  });

  // Setup Cloudflare tunnel if enabled
  if (config.ENABLE_CLOUDFLARE) {
    try {
      console.log('\nStarting Cloudflare tunnel...');

      // If tunnel token is provided, use authenticated tunnel (persistent URL)
      // Otherwise use free tunnel (random URL)
      const tunnelOptions = config.CLOUDFLARE_TUNNEL_TOKEN
        ? { '--token': config.CLOUDFLARE_TUNNEL_TOKEN }
        : { '--url': `http://localhost:${config.PORT}` };

      const tunnel = cloudflared.tunnel(tunnelOptions);

      // Wait for URL to resolve (it's a Promise)
      const tunnelUrl = await tunnel.url;

      console.log(`\n✓ Cloudflare tunnel established!`);
      console.log(`Tunnel Type: ${config.CLOUDFLARE_TUNNEL_TOKEN ? 'Authenticated (Persistent URL)' : 'Free (Random URL)'}`);
      console.log(`Public URL: ${tunnelUrl}`);
      if (tunnel.connections && tunnel.connections.length > 0) {
        console.log(`Connection ID: ${tunnel.connections[0].id}`);
      }

      // Handle tunnel shutdown
      process.on('SIGINT', () => {
        console.log('\nShutting down tunnel...');
        tunnel.stop();
        server.close();
        process.exit(0);
      });
    } catch (error) {
      console.error('Failed to start Cloudflare tunnel:', error.message);
      console.log('Server will continue without tunnel support');
    }
  }

  return server;
}

// Start the server
if (require.main === module) {
  startServer().catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

module.exports = { app, startServer, config, usageStats, apiKeys, workspaceManager, projectManager, queueManager };
