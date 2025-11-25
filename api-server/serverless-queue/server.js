/**
 * Firestore Queue API Server
 *
 * Provides REST API for adding jobs and checking status.
 * Also hosts documentation at /usage endpoint.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const FirestoreQueueManager = require('./firestoreQueueManager');
const LocalWorker = require('./localWorker');
const ProjectManager = require('./projectManager');
const { getAvailableTypes, getTemplate } = require('./blueprintTemplates');
const { generateClaudeMd, generatePersonalizedTemplate, generateBlueprintTypeTemplate } = require('./templateGenerator');
const { initializeFirebase } = require('./firebase-init');
const FirestoreTemplateManager = require('./firestoreTemplateManager');
const {
  createJobFromTemplate,
  validateTemplateJobData,
  getTemplateRequirements,
  incrementTemplateUsage,
  initializeTemplateJobIntegration
} = require('./templateJobIntegration-firestore');

const app = express();
const PORT = process.env.QUEUE_API_PORT || 8001;
const HOST = process.env.QUEUE_API_HOST || '0.0.0.0';

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin
const firebaseAdmin = initializeFirebase();
const firestoreDb = firebaseAdmin.firestore();

// Initialize queue manager (uses firebase-init.js for credentials)
const queueManager = new FirestoreQueueManager();

// Initialize Firestore template manager
const templateManager = new FirestoreTemplateManager(firestoreDb);
console.log('✓ Firestore Template system initialized');

// Initialize template job integration
initializeTemplateJobIntegration(templateManager);

// Initialize project manager for user registration
const projectManager = new ProjectManager(path.join(__dirname, '../data'));

// Initialize worker if enabled
let worker = null;
if (process.env.START_WORKER === 'true') {
  worker = new LocalWorker();
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET / - Root endpoint with API info
 */
app.get('/', (req, res) => {
  res.json({
    name: 'Firestore Queue API',
    version: '1.0.0',
    description: 'Serverless job queue with offline resilience',

    endpoints: {
      queue: {
        'POST /queue/jobs': 'Add a job to the queue',
        'POST /queue/bulk': 'Add multiple jobs',
        'GET /queue/jobs/:id': 'Get job status',
        'GET /queue/jobs': 'List jobs',
        'POST /queue/jobs/:id/retry': 'Retry a failed job',
        'DELETE /queue/jobs/:id': 'Delete a job',
        'GET /queue/stats': 'Get queue statistics',
        'POST /api/queue/jobs/from-template': 'Create job from Firestore template (NEW)',
        'POST /api/queue/jobs/from-template/bulk': 'Create multiple jobs from templates (NEW)',
        'GET /api/queue/templates/:id/requirements': 'Get template requirements (NEW)'
      },
      templates: {
        'GET /api/templates': 'List all global templates (marketplace)',
        'GET /api/templates/:id': 'Get specific template',
        'GET /api/templates/search/:term': 'Search templates',
        'GET /api/templates/stats/overview': 'Template statistics'
      },
      users: {
        'POST /users/:userId': 'Register/update user (auto-generates CLAUDE.md + blueprint template)',
        'GET /users/:userId': 'Get user information',
        'GET /users/:userId/templates': 'List user templates',
        'POST /users/:userId/templates/:name': 'Generate specific template on-demand (children, career, relationships, health, spiritual)'
      },
      blueprints: {
        'GET /blueprints/types': 'List available blueprint types (love, money, career, health, general)'
      },
      files: {
        'GET /files/:projectId/*': 'Serve generated files from project directories'
      },
      documentation: {
        'GET /usage': 'Interactive documentation',
        'GET /docs/:file': 'Documentation files'
      },
      health: {
        'GET /health': 'Health check',
        'GET /worker/status': 'Worker status (if running)'
      }
    },

    documentation_url: `http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/usage`,

    worker: {
      enabled: process.env.START_WORKER === 'true',
      status: worker ? worker.getStatus() : null
    }
  });
});

/**
 * POST /queue/jobs - Add a job
 */
app.post('/queue/jobs', async (req, res) => {
  try {
    const {
      userId,
      user_question,
      context,
      template_name,
      user_info,
      swiss_data,
      prompt // Allow manual prompt override
    } = req.body;

    // Auto-create user project folder if userId is provided
    if (userId) {
      let project = projectManager.getProject(userId);

      if (!project) {
        // Create new user project automatically
        project = projectManager.createProject({
          id: userId,
          name: user_info?.name || userId,
          type: 'user',
          tags: ['birthstar', 'user', 'auto-created'],
          metadata: {
            auto_created_at: new Date().toISOString(),
            registered_at: new Date().toISOString()
          }
        });
        console.log(`✓ Auto-created user project: ${userId}`);

        // Save user info and swiss data if provided
        if (user_info) {
          projectManager.saveUserInfo(userId, user_info);
          console.log(`✓ Saved user info for ${userId}`);
        }
        if (swiss_data) {
          projectManager.saveSwissData(userId, swiss_data);
          console.log(`✓ Saved Swiss data for ${userId}`);
        }

        // Auto-generate CLAUDE.md and template for new users
        const claudeMdContent = generateClaudeMd();
        const claudeMdPath = path.join(project.path, '.claude', 'CLAUDE.md');
        fs.mkdirSync(path.dirname(claudeMdPath), { recursive: true });
        fs.writeFileSync(claudeMdPath, claudeMdContent, 'utf8');

        const personalizedTemplate = generatePersonalizedTemplate(
          userId,
          user_info?.name || userId,
          swiss_data,
          user_info
        );
        projectManager.saveTemplate(userId, 'blueprint', personalizedTemplate);
        console.log(`✓ Generated CLAUDE.md and blueprint template for ${userId}`);
      }
    }

    // Auto-generate prompt if user_question is provided
    let finalPrompt = prompt;
    if (!finalPrompt && user_question) {
      const templateRef = template_name || 'blueprint';
      const focusArea = context?.focus_area || 'General life guidance';
      const lifePhase = context?.life_phase || 'Current phase';

      finalPrompt = `Answer the user's question using their birth chart and the template in profile/templates/${templateRef}.template

USER QUESTION: "${user_question}"

CONTEXT:
- Focus Area: ${focusArea}
- Life Phase: ${lifePhase}

INSTRUCTIONS:
1. Read profile/swiss-data.json for complete chart data
2. Read profile/templates/${templateRef}.template for structure
3. Follow guidelines in .claude/CLAUDE.md
4. Generate 1200-1500 words
5. Answer their question directly and specifically
6. Reference exact degrees and placements
7. Save output as JSON: { "title": "...", "summary": "...", "content": "..." }

Use the template as a guide but write naturally. Make it personal and specific to their chart.`;
    }

    if (!finalPrompt) {
      return res.status(400).json({
        success: false,
        error: 'Either "prompt" or "user_question" is required'
      });
    }

    // Prepare job data
    const jobData = {
      ...req.body,
      prompt: finalPrompt,
      user_question,
      context,
      template_name: template_name || 'blueprint'
    };

    const result = await queueManager.addJob(jobData);
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /queue/bulk - Add multiple jobs
 */
app.post('/queue/bulk', async (req, res) => {
  try {
    const { jobs } = req.body;

    if (!jobs || !Array.isArray(jobs) || jobs.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'jobs array is required'
      });
    }

    // Auto-create user project folders for any userId in jobs
    const uniqueUserIds = [...new Set(jobs.map(j => j.userId).filter(Boolean))];
    for (const userId of uniqueUserIds) {
      let project = projectManager.getProject(userId);

      if (!project) {
        // Find the first job with this userId to get user_info and swiss_data
        const jobWithUserData = jobs.find(j => j.userId === userId);

        // Create new user project automatically
        project = projectManager.createProject({
          id: userId,
          name: jobWithUserData?.user_info?.name || userId,
          type: 'user',
          tags: ['birthstar', 'user', 'auto-created'],
          metadata: {
            auto_created_at: new Date().toISOString(),
            registered_at: new Date().toISOString()
          }
        });
        console.log(`✓ Auto-created user project: ${userId}`);

        // Save user info and swiss data if provided
        if (jobWithUserData?.user_info) {
          projectManager.saveUserInfo(userId, jobWithUserData.user_info);
          console.log(`✓ Saved user info for ${userId}`);
        }
        if (jobWithUserData?.swiss_data) {
          projectManager.saveSwissData(userId, jobWithUserData.swiss_data);
          console.log(`✓ Saved Swiss data for ${userId}`);
        }
      }
    }

    const result = await queueManager.addBulkJobs(jobs);
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /queue/jobs/:id - Get job status
 */
app.get('/queue/jobs/:id', async (req, res) => {
  try {
    const job = await queueManager.getJob(req.params.id);
    res.json({
      success: true,
      job
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /queue/jobs - List jobs
 */
app.get('/queue/jobs', async (req, res) => {
  try {
    const {
      status,
      project_id,
      limit = 50,
      offset = 0
    } = req.query;

    const jobs = await queueManager.getJobs({
      status,
      project_id,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      count: jobs.length,
      jobs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /queue/jobs/:id/retry - Retry a failed job
 */
app.post('/queue/jobs/:id/retry', async (req, res) => {
  try {
    await queueManager.retryJob(req.params.id);
    res.json({
      success: true,
      message: 'Job queued for retry'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /queue/jobs/:id - Delete a job
 */
app.delete('/queue/jobs/:id', async (req, res) => {
  try {
    await queueManager.deleteJob(req.params.id);
    res.json({
      success: true,
      message: 'Job deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /queue/stats - Get queue statistics
 */
app.get('/queue/stats', async (req, res) => {
  try {
    const stats = await queueManager.getStats();
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// TEMPLATE-BASED JOB CREATION
// ============================================================================

/**
 * POST /api/queue/jobs/from-template - Create job from Firestore template
 */
app.post('/api/queue/jobs/from-template', async (req, res) => {
  try {
    const {
      template_id,
      user_data,
      options = {}
    } = req.body;

    if (!template_id) {
      return res.status(400).json({
        success: false,
        error: 'template_id is required'
      });
    }

    if (!user_data) {
      return res.status(400).json({
        success: false,
        error: 'user_data is required (must include swiss_data, project_id, etc.)'
      });
    }

    // Validate user data
    const validation = validateTemplateJobData(user_data);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user data',
        errors: validation.errors
      });
    }

    // Create job from template
    const jobData = await createJobFromTemplate(template_id, user_data, options);

    // Add job to queue
    const result = await queueManager.addJob(jobData);

    // Increment template usage
    await incrementTemplateUsage(template_id, user_data.user_id);

    res.json({
      success: true,
      job_id: result.job_id,
      template_id: template_id,
      message: 'Job created from template successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/queue/templates/:templateId/requirements - Get template requirements
 */
app.get('/api/queue/templates/:templateId/requirements', async (req, res) => {
  try {
    const { templateId } = req.params;
    const { user_id } = req.query;

    const requirements = await getTemplateRequirements(templateId, user_id);

    res.json({
      success: true,
      requirements
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/queue/jobs/from-template/bulk - Create multiple jobs from templates
 */
app.post('/api/queue/jobs/from-template/bulk', async (req, res) => {
  try {
    const { jobs } = req.body;

    if (!jobs || !Array.isArray(jobs) || jobs.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'jobs array is required'
      });
    }

    const results = [];
    const errors = [];

    for (const jobConfig of jobs) {
      try {
        const { template_id, user_data, options = {} } = jobConfig;

        if (!template_id || !user_data) {
          errors.push({
            error: 'Missing template_id or user_data',
            config: jobConfig
          });
          continue;
        }

        // Validate
        const validation = validateTemplateJobData(user_data);
        if (!validation.valid) {
          errors.push({
            error: 'Invalid user data',
            errors: validation.errors,
            config: jobConfig
          });
          continue;
        }

        // Create job
        const jobData = await createJobFromTemplate(template_id, user_data, options);
        const result = await queueManager.addJob(jobData);

        // Increment usage
        await incrementTemplateUsage(template_id, user_data.user_id);

        results.push({
          success: true,
          job_id: result.job_id,
          template_id: template_id
        });
      } catch (error) {
        errors.push({
          error: error.message,
          config: jobConfig
        });
      }
    }

    res.json({
      success: errors.length === 0,
      created: results.length,
      failed: errors.length,
      results,
      errors
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// TEMPLATE MANAGEMENT
// ============================================================================

/**
 * GET /api/templates - List all global templates
 */
app.get('/api/templates', async (req, res) => {
  try {
    const { type, category, tag, active_only, limit, user_id } = req.query;

    const filters = {};
    if (type) filters.type = type;
    if (category) filters.category = category;
    if (active_only === 'true') filters.is_active = true;
    if (limit) filters.limit = parseInt(limit);

    let templates;
    if (user_id) {
      templates = await templateManager.listUserTemplates(user_id, filters);
    } else {
      templates = await templateManager.listGlobalTemplates(filters);
    }

    // Filter by tag if specified
    if (tag && templates) {
      templates = templates.filter(t =>
        t.metadata?.tags?.includes(tag)
      );
    }

    res.json({
      success: true,
      count: templates.length,
      templates: templates.map(t => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        type: t.type,
        category: t.category,
        description: t.description,
        version: t.version,
        usage_count: t.metadata?.usage_count || 0,
        is_active: t.metadata?.is_active ?? true,
        is_public: t.metadata?.is_public ?? false,
        created_at: t.metadata?.created_at,
        updated_at: t.metadata?.updated_at,
        tags: t.metadata?.tags || []
      }))
    });
  } catch (error) {
    console.error('Error listing templates:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/templates/:id - Get specific template
 */
app.get('/api/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.query;

    const template = await templateManager.getTemplate(id, user_id);

    res.json({
      success: true,
      template
    });
  } catch (error) {
    console.error('Error getting template:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/templates/search/:term - Search templates
 */
app.get('/api/templates/search/:term', async (req, res) => {
  try {
    const { term } = req.params;
    const { type, category, limit } = req.query;

    const filters = {};
    if (type) filters.type = type;
    if (category) filters.category = category;
    if (limit) filters.limit = parseInt(limit);

    const templates = await templateManager.searchTemplates(term, filters);

    res.json({
      success: true,
      count: templates.length,
      templates
    });
  } catch (error) {
    console.error('Error searching templates:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/templates/stats/overview - Get template statistics
 */
app.get('/api/templates/stats/overview', async (req, res) => {
  try {
    const stats = await templateManager.getTemplateStats();

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error getting template stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// USER MANAGEMENT
// ============================================================================

/**
 * POST /users/:userId - Register/update user
 * Called once per user to set up their project folder with swiss_data
 */
app.post('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { user_info, swiss_data, templates, campaign_seed } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    // Queue a user registration job for the worker to process
    const jobData = {
      type: 'user_registration',
      user_id: userId,
      project_id: userId, // Use userId as project_id for folder creation
      user_info: user_info || null,
      swiss_data: swiss_data || null,
      templates: templates || null,
      campaign_seed: campaign_seed || null, // Optional campaign-specific seed generation
      prompt: campaign_seed?.prompt || `Set up user project for ${user_info?.name || userId}`,
      priority: 10, // High priority for registration
      save_data: true
    };

    const job = await queueManager.addJob(jobData);
    console.log(`✓ Queued user registration job ${job.job_id} for ${userId}`);

    res.json({
      success: true,
      job_id: job.job_id,
      status: job.status,
      user_id: userId,
      message: 'User registration job queued. Worker will create folder and setup project.',
      has_campaign_seed: !!campaign_seed,
      created_at: job.created_at,
      status_url: `/jobs/${job.job_id}`
    });

  } catch (error) {
    console.error('User registration error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /users/:userId - Get user information
 */
app.get('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const project = projectManager.getProject(userId);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const userInfo = projectManager.getUserInfo(userId);
    const swissData = projectManager.getSwissData(userId);
    const templates = projectManager.listTemplates(userId);

    res.json({
      success: true,
      user_id: userId,
      project: {
        id: project.id,
        name: project.name,
        path: project.path,
        created: project.created,
        updated: project.updated
      },
      user_info: userInfo,
      has_swiss_data: !!swissData,
      templates: templates,
      swiss_data_saved_at: swissData?.saved_at
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /users/:userId/templates - List user templates
 */
app.get('/users/:userId/templates', async (req, res) => {
  try {
    const { userId } = req.params;

    const project = projectManager.getProject(userId);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const templates = projectManager.listTemplates(userId);

    res.json({
      success: true,
      user_id: userId,
      templates: templates,
      count: templates.length
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /users/:userId/templates/:templateName - Generate template on-demand
 */
app.post('/users/:userId/templates/:templateName', async (req, res) => {
  try {
    const { userId, templateName } = req.params;

    const project = projectManager.getProject(userId);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get user's swiss data and info
    const swissData = projectManager.getSwissData(userId);
    const userInfo = projectManager.getUserInfo(userId);

    // Generate template based on type
    let templateContent;
    const validTypes = ['children', 'career', 'relationships', 'health', 'spiritual', 'blueprint'];

    if (validTypes.includes(templateName)) {
      if (templateName === 'blueprint') {
        templateContent = generatePersonalizedTemplate(
          userId,
          userInfo?.name || userId,
          swissData,
          userInfo
        );
      } else {
        templateContent = generateBlueprintTypeTemplate(
          templateName,
          swissData,
          userInfo?.name || userId
        );
      }
    } else {
      return res.status(400).json({
        success: false,
        error: `Invalid template type. Valid types: ${validTypes.join(', ')}`
      });
    }

    // Save the template
    const saved = projectManager.saveTemplate(userId, templateName, templateContent);

    if (saved) {
      res.json({
        success: true,
        user_id: userId,
        template_name: templateName,
        message: `Template '${templateName}' generated successfully`
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to save template'
      });
    }

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// BLUEPRINT TYPES
// ============================================================================

/**
 * GET /blueprints/types - List available blueprint types
 */
app.get('/blueprints/types', (req, res) => {
  try {
    const types = getAvailableTypes();
    const typesWithDetails = types.map(type => {
      const template = getTemplate(type);
      return {
        type,
        sections: template.template.sections.map(s => s.heading),
        focus_area: template.template.metadata.focus_area,
        tags: template.template.tags
      };
    });

    res.json({
      success: true,
      types: typesWithDetails,
      count: types.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /health - Health check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    worker: worker ? worker.getStatus() : { enabled: false }
  });
});

/**
 * GET /worker/status - Worker status
 */
app.get('/worker/status', (req, res) => {
  if (!worker) {
    return res.json({
      enabled: false,
      message: 'Worker not running. Set START_WORKER=true to enable.'
    });
  }

  res.json({
    enabled: true,
    status: worker.getStatus()
  });
});

// ============================================================================
// FILE SERVING
// ============================================================================

/**
 * GET /files/:projectId/* - Serve generated files from project directories
 */
app.get('/files/:projectId/*', (req, res) => {
  try {
    const { projectId } = req.params;
    const filePath = req.params[0]; // Everything after /files/:projectId/

    const project = projectManager.getProject(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    const fullPath = path.join(project.path, filePath);

    // Security check: ensure file is within project directory
    const normalizedProjectPath = path.resolve(project.path);
    const normalizedFullPath = path.resolve(fullPath);

    if (!normalizedFullPath.startsWith(normalizedProjectPath)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    // Send file
    res.sendFile(fullPath);

  } catch (error) {
    console.error('File serving error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// DOCUMENTATION
// ============================================================================

/**
 * Serve documentation files
 */
app.use('/usage', express.static(path.join(__dirname, 'docs')));
app.use('/docs', express.static(path.join(__dirname, 'docs')));

// ============================================================================
// START SERVER
// ============================================================================

async function startServer() {
  // Start Express server
  const server = app.listen(PORT, HOST, () => {
    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║       Firestore Queue API Server                  ║');
    console.log('╚════════════════════════════════════════════════════╝');
    console.log(`  API:      http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
    console.log(`  Docs:     http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/usage`);
    console.log(`  Health:   http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/health`);
    console.log('════════════════════════════════════════════════════\n');
  });

  // Start worker if enabled
  if (worker) {
    console.log('Starting integrated worker...\n');
    await worker.start();
  }

  return server;
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\nReceived SIGTERM, shutting down gracefully...');
  if (worker) {
    await worker.stop();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\nReceived SIGINT, shutting down gracefully...');
  if (worker) {
    await worker.stop();
  }
  process.exit(0);
});

// Start if run directly
if (require.main === module) {
  startServer().catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

// Export app as default for Vercel
module.exports = app;
module.exports.default = app;
