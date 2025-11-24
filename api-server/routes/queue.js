/**
 * Queue Routes - Job queue management API
 */

const express = require('express');
const router = express.Router();
const {
  createJobFromTemplate,
  validateTemplateJobData,
  getTemplateRequirements,
  incrementTemplateUsage
} = require('../src/templateJobIntegration');

let queueManager = null;

// Initialize route with queue manager
function initializeRoute(qm) {
  queueManager = qm;
}

/**
 * POST /api/queue/jobs
 * Add a new job to the queue
 */
router.post('/jobs', async (req, res) => {
  try {
    const {
      project_id,
      prompt,
      user_info,
      swiss_data,
      working_directory,
      timeout,
      priority,
      save_data
    } = req.body;

    if (!prompt) {
      return res.status(400).json({
        error: 'Prompt is required'
      });
    }

    const result = await queueManager.addJob({
      project_id,
      prompt,
      user_info,
      swiss_data,
      working_directory,
      timeout,
      priority,
      save_data
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * POST /api/queue/bulk
 * Add multiple jobs in bulk
 */
router.post('/bulk', async (req, res) => {
  try {
    const { jobs } = req.body;

    if (!jobs || !Array.isArray(jobs) || jobs.length === 0) {
      return res.status(400).json({
        error: 'jobs array is required'
      });
    }

    const result = await queueManager.addBulkJobs(jobs);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/queue/jobs/:jobId
 * Get job status
 */
router.get('/jobs/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const status = await queueManager.getJobStatus(jobId);

    res.json({
      success: true,
      job: status
    });
  } catch (error) {
    res.status(404).json({
      error: error.message
    });
  }
});

/**
 * GET /api/queue/jobs
 * List jobs with filtering
 */
router.get('/jobs', async (req, res) => {
  try {
    const {
      status = 'all',
      limit = 50,
      start = 0
    } = req.query;

    const jobs = await queueManager.getJobs({
      status,
      limit: parseInt(limit),
      start: parseInt(start)
    });

    res.json({
      success: true,
      count: jobs.length,
      jobs
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * POST /api/queue/jobs/:jobId/retry
 * Retry a failed job
 */
router.post('/jobs/:jobId/retry', async (req, res) => {
  try {
    const { jobId } = req.params;
    const result = await queueManager.retryJob(jobId);

    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * DELETE /api/queue/jobs/:jobId
 * Remove a job
 */
router.delete('/jobs/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const result = await queueManager.removeJob(jobId);

    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/queue/stats
 * Get queue statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await queueManager.getQueueStats();

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * POST /api/queue/pause
 * Pause the queue
 */
router.post('/pause', async (req, res) => {
  try {
    const result = await queueManager.pause();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * POST /api/queue/resume
 * Resume the queue
 */
router.post('/resume', async (req, res) => {
  try {
    const result = await queueManager.resume();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * POST /api/queue/clean
 * Clean old jobs
 */
router.post('/clean', async (req, res) => {
  try {
    const { grace, status, limit } = req.body;

    const result = await queueManager.cleanJobs({
      grace: grace || 86400000,  // 24 hours
      status: status || 'completed',
      limit: limit || 1000
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * POST /api/queue/jobs/from-template
 * Create a job from a template
 */
router.post('/jobs/from-template', async (req, res) => {
  try {
    const {
      template_id,
      user_data,
      options = {}
    } = req.body;

    if (!template_id) {
      return res.status(400).json({
        error: 'template_id is required'
      });
    }

    if (!user_data) {
      return res.status(400).json({
        error: 'user_data is required (must include swiss_data, project_id, etc.)'
      });
    }

    // Validate user data
    const validation = validateTemplateJobData(user_data);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Invalid user data',
        errors: validation.errors
      });
    }

    // Create job from template
    const jobData = await createJobFromTemplate(template_id, user_data, options);

    // Add job to queue
    const result = await queueManager.addJob(jobData);

    // Increment template usage
    await incrementTemplateUsage(template_id);

    res.json({
      success: true,
      job_id: result.job_id,
      template_id: template_id,
      message: 'Job created from template successfully'
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/queue/templates/:templateId/requirements
 * Get requirements for a template
 */
router.get('/templates/:templateId/requirements', async (req, res) => {
  try {
    const { templateId } = req.params;

    const requirements = await getTemplateRequirements(templateId);

    res.json({
      success: true,
      requirements
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * POST /api/queue/jobs/from-template/bulk
 * Create multiple jobs from templates in bulk
 */
router.post('/jobs/from-template/bulk', async (req, res) => {
  try {
    const { jobs } = req.body;

    if (!jobs || !Array.isArray(jobs) || jobs.length === 0) {
      return res.status(400).json({
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
        await incrementTemplateUsage(template_id);

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
      error: error.message
    });
  }
});

module.exports = { router, initializeRoute };
