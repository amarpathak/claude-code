/**
 * Firestore Queue Manager
 *
 * Manages job queue using Firestore as the backend.
 * Handles job creation, status updates, and queries.
 */

const { initializeFirebase } = require('./firebase-init');

class FirestoreQueueManager {
  constructor(config = {}) {
    this.config = {
      collectionName: config.collectionName || 'jobs'
    };

    // Initialize Firebase (supports both Vercel and local)
    this.admin = initializeFirebase();

    this.db = this.admin.firestore();
    this.jobsCollection = this.db.collection(this.config.collectionName);
  }

  /**
   * Generate unique job ID
   */
  generateJobId() {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Add a new job to the queue
   */
  async addJob(jobData) {
    const {
      type,
      project_id,
      user_id,
      userId,
      prompt,
      user_info,
      swiss_data,
      campaign_seed,
      priority = 5,
      timeout = 300,
      save_data = true,
      webhook_url = null,
      project_type = 'default',
      template_name = null,
      blueprint_type = null
    } = jobData;

    if (!prompt) {
      throw new Error('Prompt is required');
    }

    const jobId = this.generateJobId();
    const now = this.admin.firestore.Timestamp.now();

    const job = {
      id: jobId,
      type: type || null,
      status: 'queued',
      priority: priority,

      // Input data
      project_id: project_id || null,
      user_id: user_id || userId || null,
      userId: userId || user_id || null,  // Keep both for backwards compatibility
      project_type: project_type,
      prompt: prompt,
      user_info: user_info || null,
      swiss_data: swiss_data || null,
      campaign_seed: campaign_seed || null,
      timeout: timeout,
      save_data: save_data,
      webhook_url: webhook_url,
      template_name: template_name || null,
      blueprint_type: blueprint_type || null,

      // Execution tracking
      attempts: 0,
      max_attempts: 3,
      picked_at: null,
      started_at: null,
      completed_at: null,
      worker_id: null,

      // Results
      result: null,

      // Error handling
      error: null,
      last_error_at: null,
      retry_after: now,  // Set to now so getQueuedJobs() query can match it

      // Timestamps
      created_at: now,
      updated_at: now
    };

    await this.jobsCollection.doc(jobId).set(job);

    return {
      job_id: jobId,
      status: 'queued',
      created_at: now.toDate().toISOString()
    };
  }

  /**
   * Add multiple jobs in bulk
   */
  async addBulkJobs(jobs) {
    const batch = this.db.batch();
    const createdJobs = [];

    for (const jobData of jobs) {
      const jobId = this.generateJobId();
      const now = this.admin.firestore.Timestamp.now();

      const job = {
        id: jobId,
        status: 'queued',
        priority: jobData.priority || 5,
        project_id: jobData.project_id || null,
        userId: jobData.userId || null,
        project_type: jobData.project_type || 'default',
        prompt: jobData.prompt,
        user_info: jobData.user_info || null,
        swiss_data: jobData.swiss_data || null,
        timeout: jobData.timeout || 300,
        save_data: jobData.save_data !== false,
        webhook_url: jobData.webhook_url || null,
        template_name: jobData.template_name || null,
        attempts: 0,
        max_attempts: 3,
        picked_at: null,
        started_at: null,
        completed_at: null,
        worker_id: null,
        result: null,
        error: null,
        last_error_at: null,
        retry_after: now,  // Set to now so getQueuedJobs() query can match it
        created_at: now,
        updated_at: now
      };

      const docRef = this.jobsCollection.doc(jobId);
      batch.set(docRef, job);

      createdJobs.push({
        job_id: jobId,
        status: 'queued'
      });
    }

    await batch.commit();

    return {
      count: createdJobs.length,
      jobs: createdJobs
    };
  }

  /**
   * Get jobs with specific status (for worker to pick up)
   */
  async getQueuedJobs(limit = 10) {
    const now = this.admin.firestore.Timestamp.now();

    const snapshot = await this.jobsCollection
      .where('status', 'in', ['queued', 'failed'])
      .where('retry_after', '<=', now)
      .orderBy('retry_after')
      .orderBy('priority', 'desc')
      .orderBy('created_at', 'asc')
      .limit(limit)
      .get();

    if (snapshot.empty) {
      return [];
    }

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  /**
   * Get job by ID
   */
  async getJob(jobId) {
    const doc = await this.jobsCollection.doc(jobId).get();

    if (!doc.exists) {
      throw new Error(`Job ${jobId} not found`);
    }

    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      created_at: data.created_at?.toDate().toISOString(),
      updated_at: data.updated_at?.toDate().toISOString(),
      picked_at: data.picked_at?.toDate().toISOString() || null,
      started_at: data.started_at?.toDate().toISOString() || null,
      completed_at: data.completed_at?.toDate().toISOString() || null,
      last_error_at: data.last_error_at?.toDate().toISOString() || null,
      retry_after: data.retry_after?.toDate().toISOString() || null
    };
  }

  /**
   * Update job status
   */
  async updateJobStatus(jobId, status, updates = {}) {
    const now = this.admin.firestore.Timestamp.now();

    const updateData = {
      status: status,
      updated_at: now,
      ...updates
    };

    // Set timestamps based on status
    if (status === 'processing' && !updates.started_at) {
      updateData.started_at = now;
    } else if (status === 'completed' && !updates.completed_at) {
      updateData.completed_at = now;
    } else if (status === 'failed') {
      updateData.last_error_at = now;

      // Calculate retry timestamp (exponential backoff)
      const attempts = updates.attempts || 0;
      if (attempts < 3) {
        const retryDelay = Math.pow(2, attempts) * 2000; // 2s, 4s, 8s
        updateData.retry_after = this.admin.firestore.Timestamp.fromMillis(
          Date.now() + retryDelay
        );
      } else {
        // Max attempts reached, don't retry
        updateData.retry_after = this.admin.firestore.Timestamp.fromDate(
          new Date('2099-12-31')
        ); // Far future
      }
    }

    await this.jobsCollection.doc(jobId).update(updateData);

    return { success: true };
  }

  /**
   * Claim a job (mark as processing)
   */
  async claimJob(jobId, workerId) {
    const now = this.admin.firestore.Timestamp.now();

    await this.jobsCollection.doc(jobId).update({
      status: 'processing',
      picked_at: now,
      started_at: now,
      worker_id: workerId,
      updated_at: now
    });

    return { success: true };
  }

  /**
   * Complete a job
   */
  async completeJob(jobId, result) {
    const now = this.admin.firestore.Timestamp.now();

    await this.jobsCollection.doc(jobId).update({
      status: 'completed',
      completed_at: now,
      updated_at: now,
      result: result
    });

    return { success: true };
  }

  /**
   * Fail a job
   */
  async failJob(jobId, error, attempts) {
    const now = this.admin.firestore.Timestamp.now();

    // Calculate retry timestamp
    let retryAfter;
    if (attempts < 3) {
      const retryDelay = Math.pow(2, attempts) * 2000; // 2s, 4s, 8s
      retryAfter = this.admin.firestore.Timestamp.fromMillis(Date.now() + retryDelay);
    } else {
      // Max attempts reached
      retryAfter = this.admin.firestore.Timestamp.fromDate(new Date('2099-12-31'));
    }

    await this.jobsCollection.doc(jobId).update({
      status: 'failed',
      error: error,
      attempts: attempts,
      last_error_at: now,
      retry_after: retryAfter,
      updated_at: now
    });

    return { success: true };
  }

  /**
   * Get all jobs with filtering
   */
  async getJobs(filter = {}) {
    const {
      status = null,
      project_id = null,
      limit = 50,
      offset = 0
    } = filter;

    let query = this.jobsCollection;

    if (status) {
      query = query.where('status', '==', status);
    }

    if (project_id) {
      query = query.where('project_id', '==', project_id);
    }

    query = query
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    const snapshot = await query.get();

    if (snapshot.empty) {
      return [];
    }

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        created_at: data.created_at?.toDate().toISOString(),
        updated_at: data.updated_at?.toDate().toISOString(),
        completed_at: data.completed_at?.toDate().toISOString() || null
      };
    });
  }

  /**
   * Get queue statistics
   */
  async getStats() {
    const [queued, processing, completed, failed] = await Promise.all([
      this.jobsCollection.where('status', '==', 'queued').count().get(),
      this.jobsCollection.where('status', '==', 'processing').count().get(),
      this.jobsCollection.where('status', '==', 'completed').count().get(),
      this.jobsCollection.where('status', '==', 'failed').count().get()
    ]);

    return {
      queued: queued.data().count,
      processing: processing.data().count,
      completed: completed.data().count,
      failed: failed.data().count,
      total: queued.data().count + processing.data().count +
             completed.data().count + failed.data().count
    };
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId) {
    const now = this.admin.firestore.Timestamp.now();

    await this.jobsCollection.doc(jobId).update({
      status: 'queued',
      error: null,
      retry_after: now,
      updated_at: now
    });

    return { success: true };
  }

  /**
   * Delete a job
   */
  async deleteJob(jobId) {
    await this.jobsCollection.doc(jobId).delete();
    return { success: true };
  }

  /**
   * Clean old jobs
   */
  async cleanOldJobs(daysOld = 7, status = 'completed') {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    const cutoffTimestamp = this.admin.firestore.Timestamp.fromDate(cutoffDate);

    const snapshot = await this.jobsCollection
      .where('status', '==', status)
      .where('completed_at', '<', cutoffTimestamp)
      .limit(500)
      .get();

    if (snapshot.empty) {
      return { deleted: 0 };
    }

    const batch = this.db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    return { deleted: snapshot.size };
  }
}

module.exports = FirestoreQueueManager;
