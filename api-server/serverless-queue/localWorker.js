/**
 * Local Worker - Polls Firestore and processes jobs locally
 *
 * Features:
 * - Polls Firestore for queued jobs
 * - Executes Claude Code locally
 * - Updates job status in real-time
 * - Handles offline/online gracefully
 * - Processes backlog when coming online
 */

require('dotenv').config();
const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');
const mime = require('mime-types');
const FirestoreQueueManager = require('./firestoreQueueManager');
const Logger = require('./logger');
const { getTemplate, enhancePrompt, getAvailableTypes } = require('./blueprintTemplates');

class LocalWorker {
  constructor(config = {}) {
    this.config = {
      pollIntervalMs: config.pollIntervalMs || parseInt(process.env.POLL_INTERVAL_MS || '5000'),
      maxConcurrentJobs: config.maxConcurrentJobs || parseInt(process.env.MAX_CONCURRENT_JOBS || '3'),
      claudeCodePath: config.claudeCodePath || process.env.CLAUDE_CODE_PATH || 'claude',
      projectManagerPath: config.projectManagerPath || process.env.PROJECT_MANAGER_PATH || '../data',
      workerId: config.workerId || `worker-${os.hostname()}-${process.pid}`
    };

    // Initialize logger
    this.logger = new Logger({
      level: process.env.LOG_LEVEL || 'info',
      serviceName: 'local-worker',
      logToFile: true,
      logDir: './logs'
    });

    this.queueManager = new FirestoreQueueManager({
      projectId: process.env.FIRESTORE_PROJECT_ID,
      credentialsPath: process.env.FIRESTORE_CREDENTIALS_PATH
    });

    // Load ProjectManager if path provided
    this.projectManager = null;
    if (this.config.projectManagerPath) {
      try {
        const ProjectManager = require(path.resolve(this.config.projectManagerPath, 'projectManager'));
        // ProjectManager constructor expects the data directory, not source directory
        const dataDir = path.resolve(__dirname, '../data');
        this.projectManager = new ProjectManager(dataDir);
        this.logger.info('ProjectManager loaded', {
          source_path: this.config.projectManagerPath,
          data_dir: dataDir
        });
      } catch (err) {
        this.logger.warn('ProjectManager not available', {
          error: err.message,
          path: this.config.projectManagerPath
        });
      }
    }

    this.activeJobs = new Map(); // Track currently processing jobs
    this.isRunning = false;
    this.isOnline = true;
    this.consecutiveErrors = 0;
    this.maxConsecutiveErrors = 5;
  }

  /**
   * Start the worker
   */
  async start() {
    if (this.isRunning) {
      this.logger.warn('Worker already running');
      return;
    }

    this.isRunning = true;

    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║         Firestore Queue Local Worker              ║');
    console.log('╚════════════════════════════════════════════════════╝');
    console.log(`  Worker ID: ${this.config.workerId}`);
    console.log(`  Poll Interval: ${this.config.pollIntervalMs}ms`);
    console.log(`  Max Concurrent: ${this.config.maxConcurrentJobs}`);
    console.log(`  Claude Code: ${this.config.claudeCodePath}`);
    console.log('════════════════════════════════════════════════════\n');

    this.logger.workerStarted({
      worker_id: this.config.workerId,
      poll_interval_ms: this.config.pollIntervalMs,
      max_concurrent: this.config.maxConcurrentJobs,
      claude_code_path: this.config.claudeCodePath,
      project_manager_path: this.config.projectManagerPath
    });

    // Check initial queue status
    try {
      const stats = await this.queueManager.getStats();
      console.log('📊 Current Queue Status:');
      console.log(`   Queued: ${stats.queued}`);
      console.log(`   Processing: ${stats.processing}`);
      console.log(`   Failed: ${stats.failed}`);
      console.log(`   Completed: ${stats.completed}`);
      console.log(`   Total: ${stats.total}\n`);
    } catch (err) {
      console.log('⚠️  Could not fetch queue stats:', err.message, '\n');
    }

    // Start polling
    this.pollLoop();

    console.log('✓ Worker started. Polling for jobs...\n');
  }

  /**
   * Stop the worker
   */
  async stop() {
    console.log('\n🛑 Stopping worker...');
    this.isRunning = false;

    this.logger.workerStopped({
      worker_id: this.config.workerId,
      active_jobs: this.activeJobs.size
    });

    // Wait for active jobs to complete
    if (this.activeJobs.size > 0) {
      console.log(`⏳ Waiting for ${this.activeJobs.size} active jobs to complete...`);
      this.logger.info('Waiting for active jobs to complete', {
        active_job_count: this.activeJobs.size,
        active_job_ids: Array.from(this.activeJobs.keys())
      });

      while (this.activeJobs.size > 0) {
        await this.sleep(1000);
      }
    }

    console.log('✓ Worker stopped gracefully');
    this.logger.info('Worker stopped gracefully');
  }

  /**
   * Main polling loop
   */
  async pollLoop() {
    while (this.isRunning) {
      try {
        await this.pollAndProcess();
        this.consecutiveErrors = 0;
        this.isOnline = true;
      } catch (error) {
        this.consecutiveErrors++;

        if (this.consecutiveErrors === 1) {
          console.error('❌ Error polling queue:', error.message);
        }

        if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
          if (this.isOnline) {
            console.log(`\n⚠️  System appears offline (${this.consecutiveErrors} errors)`);
            console.log('   Jobs will queue in Firestore until system is back online');
            console.log('   Retrying every 30 seconds (max 4 retries)...\n');
            this.isOnline = false;
          }

          // Stop after 4 offline retries
          const offlineRetries = this.consecutiveErrors - this.maxConsecutiveErrors + 1;
          if (offlineRetries >= 4) {
            console.error('\n❌ Max offline retries (4) reached. Worker shutting down.');
            console.error('   Please check Firestore connection and indexes.');
            console.error('   Restart worker when issues are resolved.\n');
            this.stop();
            break;
          }

          // Longer wait when offline
          await this.sleep(30000);
        } else {
          // Short wait on transient errors
          await this.sleep(5000);
        }

        continue;
      }

      // Wait before next poll
      await this.sleep(this.config.pollIntervalMs);
    }
  }

  /**
   * Poll queue and process available jobs
   */
  async pollAndProcess() {
    // Don't fetch more jobs if at capacity
    if (this.activeJobs.size >= this.config.maxConcurrentJobs) {
      return;
    }

    const availableSlots = this.config.maxConcurrentJobs - this.activeJobs.size;

    // Get queued jobs
    const jobs = await this.queueManager.getQueuedJobs(availableSlots);

    if (jobs.length === 0) {
      // Only log when coming back online
      if (!this.isOnline) {
        console.log('✓ Back online! No jobs in queue.');
        this.isOnline = true;
      }
      return;
    }

    // Log when coming back online with backlog
    if (!this.isOnline && jobs.length > 0) {
      console.log(`\n✓ Back online! Found ${jobs.length} queued jobs. Processing...`);
      this.isOnline = true;
    }

    // Process each job
    for (const job of jobs) {
      // Double-check capacity
      if (this.activeJobs.size >= this.config.maxConcurrentJobs) {
        break;
      }

      // Process job asynchronously
      this.processJobAsync(job);
    }
  }

  /**
   * Process job asynchronously (non-blocking)
   */
  async processJobAsync(job) {
    this.activeJobs.set(job.id, job);

    try {
      await this.processJob(job);
    } catch (error) {
      console.error(`Failed to process job ${job.id}:`, error.message);
    } finally {
      this.activeJobs.delete(job.id);
    }
  }

  /**
   * Process a single job
   */
  async processJob(job) {
    // Create job-specific logger with correlation ID
    const jobLogger = this.logger.child({
      job_id: job.id,
      project_id: job.project_id,
      worker_id: this.config.workerId,
      correlation_id: `${job.id}-${Date.now()}`
    });

    console.log(`\n📋 Processing job ${job.id}`);
    console.log(`   Project: ${job.project_id || 'none'}`);
    console.log(`   User ID: ${job.user_id || job.userId || '❌ NOT PROVIDED'}`);
    console.log(`   Prompt: ${job.prompt.substring(0, 80)}...`);

    jobLogger.jobStarted(job.id, {
      project_id: job.project_id,
      user_id: job.user_id || job.userId,
      prompt_length: job.prompt.length,
      has_user_info: !!job.user_info,
      has_swiss_data: !!job.swiss_data,
      priority: job.priority,
      timeout: job.timeout,
      attempts: job.attempts || 0
    });

    const startTime = Date.now();

    try {
      // Claim the job
      await this.queueManager.claimJob(job.id, this.config.workerId);

      // Handle user registration jobs specially
      if (job.type === 'user_registration') {
        console.log('   🆕 User registration job detected');
        await this.processUserRegistration(job, jobLogger);

        const executionTime = (Date.now() - startTime) / 1000;
        await this.queueManager.completeJob(job.id, {
          output: 'User registration completed successfully',
          exit_code: 0,
          execution_time: executionTime,
          worker_id: this.config.workerId
        });

        console.log(`   ✅ User registration completed in ${executionTime.toFixed(2)}s`);
        jobLogger.jobCompleted(job.id, executionTime, {
          exit_code: 0,
          type: 'user_registration'
        });
        return;
      }

      // Prepare working directory
      let workingDir = process.cwd();
      let finalPrompt = job.prompt;

      // If project_id, use project manager
      if (job.project_id && this.projectManager) {
        // Use userId as the folder name for consistency (reuse same folder for each user)
        const projectFolderId = job.user_id || job.userId || job.project_id;

        console.log(`   🔍 Debug: user_id=${job.user_id}, userId=${job.userId}, project_id=${job.project_id}`);
        console.log(`   🔍 Using folder ID: ${projectFolderId}`);

        let project = this.projectManager.getProject(projectFolderId);

        // Auto-create project if it doesn't exist
        if (!project) {
          console.log(`   📁 Project folder '${projectFolderId}' not found, creating...`);
          jobLogger.info('Auto-creating project', {
            project_id: projectFolderId,
            original_job_project_id: job.project_id,
            project_type: job.project_type || 'default',
            user_id: job.user_id || job.userId,
            debug_job_keys: Object.keys(job)
          });

          project = this.projectManager.createProject({
            id: projectFolderId,
            name: projectFolderId,
            type: job.project_type || 'default'
          });

          console.log(`   ✓ Project created at ${project.path}`);
          jobLogger.info('Project created', {
            project_id: projectFolderId,
            project_path: project.path
          });
        }

        workingDir = project.path;

        // Save data if provided
        if (job.save_data) {
          if (job.user_info) {
            this.projectManager.saveUserInfo(projectFolderId, job.user_info);
            console.log('   ✓ User info saved');
            jobLogger.debug('User info saved', {
              fields: Object.keys(job.user_info)
            });
          }
          if (job.swiss_data) {
            this.projectManager.saveSwissData(projectFolderId, job.swiss_data);
            console.log('   ✓ Swiss data saved');
            jobLogger.debug('Swiss data saved', {
              has_planets: !!job.swiss_data.planets,
              has_houses: !!job.swiss_data.houses,
              has_aspects: !!job.swiss_data.aspects
            });
          }
        }

        // Auto-create template based on blueprint_type if specified
        if (job.blueprint_type) {
          const blueprintTemplate = getTemplate(job.blueprint_type);
          if (blueprintTemplate) {
            const templateName = job.template_name || job.blueprint_type;

            // Create/update template in user's folder
            const saved = this.projectManager.saveTemplate(
              projectFolderId,
              templateName,
              JSON.stringify(blueprintTemplate.template, null, 2)
            );

            if (saved) {
              console.log(`   📋 Auto-created '${templateName}' template for blueprint_type: ${job.blueprint_type}`);
              jobLogger.info('Blueprint template auto-created', {
                blueprint_type: job.blueprint_type,
                template_name: templateName
              });
            }

            // Enhance prompt with blueprint-specific instructions
            finalPrompt = enhancePrompt(job.prompt, job.blueprint_type);
            console.log(`   ✨ Enhanced prompt for ${job.blueprint_type} blueprint`);
          }
        }

        // Load template if specified (or use the auto-created one)
        const templateName = job.template_name || job.blueprint_type;
        if (templateName) {
          const template = this.projectManager.getTemplate(projectFolderId, templateName);
          if (template) {
            console.log(`   📋 Template '${templateName}' loaded`);
            jobLogger.info('Template loaded', {
              template_name: templateName,
              template_length: template.length
            });

            // Prepend template with instructions to follow the structure
            finalPrompt = `IMPORTANT: Use the following template as a STRICT STRUCTURE REFERENCE. Your output MUST match this exact structure, including all fields, formatting, and data types.

TEMPLATE (${templateName}):
\`\`\`
${template}
\`\`\`

TASK:
${finalPrompt}

Remember: Your output must follow the template structure exactly. Do not omit fields or change the format.`;
          } else {
            console.log(`   ⚠️  Template '${templateName}' not found, using prompt as-is`);
            jobLogger.warn('Template not found', {
              template_name: templateName
            });
          }
        }

        // Load CLAUDE.md context
        const claudeMd = this.projectManager.readClaudeMd(projectFolderId);
        if (claudeMd) {
          finalPrompt = `${claudeMd}\n\n---\n\n${finalPrompt}`;
          console.log('   ✓ CLAUDE.md context loaded');
          jobLogger.debug('CLAUDE.md context loaded', {
            context_length: claudeMd.length
          });
        }
      }

      // Execute Claude Code
      console.log(`   ⚙️  Executing Claude Code...`);
      jobLogger.info('Executing Claude Code', {
        working_dir: workingDir,
        prompt_length: finalPrompt.length,
        timeout: job.timeout
      });
      const result = await this.executeClaudeCode(finalPrompt, workingDir, job.timeout);

      const executionTime = (Date.now() - startTime) / 1000;

      // Log execution to project if available
      if (job.project_id && this.projectManager) {
        const logProjectId = job.user_id || job.userId || job.project_id;
        this.projectManager.logExecution(logProjectId, {
          job_id: job.id,
          prompt: job.prompt,
          result: result
        });
      }

      // Scan for output files
      let files = [];
      if (job.project_id && this.projectManager) {
        const logProjectId = job.user_id || job.userId || job.project_id;
        const project = this.projectManager.getProject(logProjectId);
        if (project) {
          files = this.scanProjectFiles(project.path);

          if (files.length > 0) {
            console.log(`\n   📁 Generated ${files.length} file${files.length > 1 ? 's' : ''}:`);
            files.forEach((file, idx) => {
              const sizeMB = (file.size / 1024 / 1024).toFixed(2);
              const sizeKB = (file.size / 1024).toFixed(2);
              const sizeDisplay = file.size > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`;
              console.log(`      ${idx + 1}. ${file.name} (${sizeDisplay})`);
              console.log(`         Path: ${file.path}`);
              console.log(`         URL: ${file.url}`);
            });
            console.log('');
          } else {
            console.log(`   📁 No output files found`);
          }

          jobLogger.filesScanned(job.id, files.length, {
            files: files.map(f => ({
              name: f.name,
              size: f.size,
              type: f.type,
              path: f.path
            }))
          });
        }
      }

      // Complete the job
      const jobResult = {
        output: result.output,
        error: result.errorOutput || null,
        exit_code: result.exitCode,
        execution_time: executionTime,
        worker_id: this.config.workerId,
        files: files  // Include file URLs
      };

      await this.queueManager.completeJob(job.id, jobResult);

      console.log(`   ✅ Completed in ${executionTime.toFixed(2)}s`);

      jobLogger.jobCompleted(job.id, executionTime, {
        exit_code: result.exitCode,
        output_length: result.output?.length || 0,
        error_output_length: result.errorOutput?.length || 0,
        file_count: files.length,
        total_file_size: files.reduce((sum, f) => sum + f.size, 0),
        has_webhook: !!job.webhook_url
      });

      // Note: Webhook will be sent automatically by Firebase Cloud Function
      // when Firestore detects the status change to 'completed'
      if (job.webhook_url) {
        jobLogger.info('Webhook configured - will be sent by Cloud Function', {
          webhook_url: job.webhook_url
        });
      }

    } catch (error) {
      const executionTime = (Date.now() - startTime) / 1000;

      console.log(`   ❌ Failed: ${error.message}`);

      // Increment attempts
      const newAttempts = (job.attempts || 0) + 1;

      jobLogger.jobFailed(job.id, error, {
        attempts: newAttempts,
        max_attempts: 3,
        execution_time: executionTime,
        error_name: error.name,
        error_code: error.code,
        will_retry: newAttempts < 3
      });

      // Fail the job
      await this.queueManager.failJob(job.id, error.message, newAttempts);

      if (newAttempts < 3) {
        const retryDelay = Math.pow(2, newAttempts) * 2;
        console.log(`   🔄 Will retry in ${retryDelay}s (attempt ${newAttempts + 1}/3)`);
        jobLogger.info('Job scheduled for retry', {
          retry_delay_seconds: retryDelay,
          next_attempt: newAttempts + 1
        });
      } else {
        console.log(`   ⛔ Max retries reached. Job marked as failed.`);
        jobLogger.error('Job failed permanently - max retries reached', {
          total_attempts: newAttempts,
          final_error: error.message,
          has_webhook: !!job.webhook_url
        });

        // Note: Failure webhook will be sent automatically by Firebase Cloud Function
        // when Firestore detects the final failed status
        if (job.webhook_url) {
          jobLogger.info('Failure webhook will be sent by Cloud Function', {
            webhook_url: job.webhook_url
          });
        }
      }
    }
  }

  /**
   * Process user registration job
   */
  async processUserRegistration(job, jobLogger) {
    const { generateClaudeMd, generatePersonalizedTemplate } = require('./templateGenerator');

    const userId = job.user_id || job.userId;
    if (!userId) {
      throw new Error('user_id is required for user registration');
    }

    if (!this.projectManager) {
      throw new Error('ProjectManager not available');
    }

    console.log(`   👤 Setting up user: ${userId}`);

    // Create user project folder
    let project = this.projectManager.getProject(userId);
    if (!project) {
      project = this.projectManager.createProject({
        id: userId,
        name: job.user_info?.name || userId,
        type: 'user',
        tags: ['birthstar', 'user'],
        metadata: {
          registered_at: new Date().toISOString()
        }
      });
      console.log(`   ✓ Created project folder: ${project.path}`);
      jobLogger.info('Project folder created', {
        user_id: userId,
        project_path: project.path
      });
    } else {
      console.log(`   ✓ Using existing project folder: ${project.path}`);
    }

    // Save user info if provided
    if (job.user_info) {
      this.projectManager.saveUserInfo(userId, job.user_info);
      console.log('   ✓ User info saved');
      jobLogger.info('User info saved', {
        fields: Object.keys(job.user_info)
      });
    }

    // Save Swiss ephemeris data if provided
    if (job.swiss_data) {
      this.projectManager.saveSwissData(userId, job.swiss_data);
      console.log('   ✓ Swiss data saved');
      jobLogger.info('Swiss data saved', {
        has_planets: !!job.swiss_data.planets,
        has_houses: !!job.swiss_data.houses,
        has_aspects: !!job.swiss_data.aspects
      });
    }

    // Auto-generate CLAUDE.md with astrological guidelines
    const claudeMdContent = generateClaudeMd();
    const claudeMdPath = path.join(project.path, '.claude', 'CLAUDE.md');
    fs.mkdirSync(path.dirname(claudeMdPath), { recursive: true });
    fs.writeFileSync(claudeMdPath, claudeMdContent, 'utf8');
    console.log('   ✓ Generated CLAUDE.md');
    jobLogger.info('CLAUDE.md generated');

    // Auto-generate personalized blueprint template based on chart
    const personalizedTemplate = generatePersonalizedTemplate(
      userId,
      job.user_info?.name || userId,
      job.swiss_data,
      job.user_info
    );
    this.projectManager.saveTemplate(userId, 'blueprint', personalizedTemplate);
    console.log('   ✓ Generated personalized blueprint template');
    jobLogger.info('Blueprint template generated');

    // Save custom templates if provided
    const generatedTemplates = ['blueprint'];
    if (job.templates && typeof job.templates === 'object') {
      for (const [templateName, templateContent] of Object.entries(job.templates)) {
        const saved = this.projectManager.saveTemplate(
          userId,
          templateName,
          typeof templateContent === 'string'
            ? templateContent
            : JSON.stringify(templateContent, null, 2)
        );
        if (saved) {
          generatedTemplates.push(templateName);
          console.log(`   ✓ Saved custom template '${templateName}'`);
          jobLogger.info('Custom template saved', { template_name: templateName });
        }
      }
    }

    console.log(`   📋 Total templates created: ${generatedTemplates.join(', ')}`);

    // If campaign seed provided, generate initial content with Claude Code
    if (job.campaign_seed && job.campaign_seed.prompt) {
      console.log(`   🌱 Campaign seed detected: ${job.campaign_seed.campaign_name || 'default'}`);
      jobLogger.info('Generating campaign seed content', {
        campaign_name: job.campaign_seed.campaign_name,
        prompt_length: job.campaign_seed.prompt.length
      });

      try {
        // Run Claude Code with campaign seed prompt
        const seedResult = await this.executeClaudeCode(
          job.campaign_seed.prompt,
          project.path,
          job.timeout || 300
        );

        // Save output to REGISTRATION.md
        const registrationMdPath = path.join(project.path, 'REGISTRATION.md');
        fs.writeFileSync(registrationMdPath, seedResult.output, 'utf8');
        console.log(`   ✓ Campaign seed content generated → REGISTRATION.md`);
        jobLogger.info('Campaign seed content generated', {
          output_length: seedResult.output.length,
          file_path: registrationMdPath
        });

        // Also save metadata about the seed
        const seedMetaPath = path.join(project.path, '.claude', 'registration-meta.json');
        fs.writeFileSync(seedMetaPath, JSON.stringify({
          campaign_name: job.campaign_seed.campaign_name || 'default',
          generated_at: new Date().toISOString(),
          prompt: job.campaign_seed.prompt,
          output_length: seedResult.output.length
        }, null, 2));

      } catch (err) {
        console.log(`   ⚠️  Campaign seed generation failed: ${err.message}`);
        jobLogger.warn('Campaign seed generation failed', {
          error: err.message
        });
        // Don't fail the entire registration, just log the error
      }
    }
  }

  /**
   * Execute Claude Code process
   */
  async executeClaudeCode(prompt, workingDir, timeout) {
    const timeoutMs = (timeout || 300) * 1000;

    // Use --print for non-interactive mode and --dangerously-skip-permissions to auto-approve
    const claudeProcess = spawn(this.config.claudeCodePath, [
      '--print',
      '--dangerously-skip-permissions',
      prompt
    ], {
      cwd: workingDir,
      env: process.env,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let errorOutput = '';

    claudeProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    claudeProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    // No need to write to stdin when passing prompt as argument
    claudeProcess.stdin.end();

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        claudeProcess.kill();
        reject(new Error(`Execution timed out after ${timeout} seconds`));
      }, timeoutMs);

      claudeProcess.on('close', (code) => {
        clearTimeout(timer);

        if (code === 0 || output.length > 0) {
          resolve({ output, errorOutput, exitCode: code });
        } else {
          reject(new Error(errorOutput || 'Process failed with no output'));
        }
      });

      claudeProcess.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Scan project directory for output files (recursive)
   */
  scanProjectFiles(projectPath, baseUrl = process.env.BASE_URL || '') {
    const files = [];
    const allowedDirs = ['reports', 'outputs', 'workspace', 'apps/landing/generated', 'generated'];

    // Recursive scan function
    const scanDirectory = (dirPath, relativePath = '') => {
      try {
        if (!fs.existsSync(dirPath)) return;

        const items = fs.readdirSync(dirPath, { withFileTypes: true });

        items.forEach(item => {
          const itemPath = path.join(dirPath, item.name);
          const itemRelativePath = relativePath ? path.join(relativePath, item.name) : item.name;

          if (item.isFile()) {
            // Skip hidden files and lock files
            if (item.name.startsWith('.') || item.name.endsWith('.lock')) return;

            try {
              const stats = fs.statSync(itemPath);

              // Only include files modified in the last 5 minutes (likely just generated)
              const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
              if (stats.mtime.getTime() < fiveMinutesAgo) return;

              files.push({
                name: item.name,
                path: itemRelativePath,
                size: stats.size,
                type: mime.lookup(item.name) || 'application/octet-stream',
                url: `${baseUrl}/files/${path.basename(projectPath)}/${itemRelativePath}`,
                created_at: stats.birthtime.toISOString(),
                modified_at: stats.mtime.toISOString()
              });
            } catch (err) {
              // Skip files that can't be read
            }
          } else if (item.isDirectory() && !item.name.startsWith('.')) {
            // Recursively scan subdirectories
            scanDirectory(itemPath, itemRelativePath);
          }
        });
      } catch (err) {
        // Skip directories that can't be read
      }
    };

    // Scan allowed directories
    allowedDirs.forEach(dir => {
      const dirPath = path.join(projectPath, dir);
      scanDirectory(dirPath, dir);
    });

    // Sort files by modification time (newest first)
    files.sort((a, b) => new Date(b.modified_at) - new Date(a.modified_at));

    return files;
  }

  /**
   * Get worker status
   */
  getStatus() {
    return {
      worker_id: this.config.workerId,
      is_running: this.isRunning,
      is_online: this.isOnline,
      active_jobs: this.activeJobs.size,
      max_concurrent: this.config.maxConcurrentJobs,
      consecutive_errors: this.consecutiveErrors
    };
  }
}

// If run directly
if (require.main === module) {
  const worker = new LocalWorker();

  // Start worker
  worker.start().catch(error => {
    console.error('Failed to start worker:', error);
    process.exit(1);
  });

  // Graceful shutdown
  const shutdown = async (signal) => {
    console.log(`\nReceived ${signal}, shutting down gracefully...`);
    await worker.stop();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Error handling
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });
}

module.exports = LocalWorker;
