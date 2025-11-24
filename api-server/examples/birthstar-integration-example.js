/**
 * Birthstar Template Integration Example
 *
 * Copy this file and adapt it to your needs.
 * This demonstrates the complete flow of creating a blueprint using templates.
 *
 * Usage:
 *   node birthstar-integration-example.js
 */

// Configuration
const API_BASE = process.env.API_BASE || 'http://localhost:8001';
const API_KEY = process.env.API_KEY || 'admin';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Make API call
 */
async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get template requirements
 */
async function getTemplateRequirements(templateId) {
  const { requirements } = await apiCall(`/api/queue/templates/${templateId}/requirements`);
  return requirements;
}

/**
 * Create job from template
 */
async function createJobFromTemplate(templateId, userData, options = {}) {
  const result = await apiCall('/api/queue/jobs/from-template', {
    method: 'POST',
    body: JSON.stringify({
      template_id: templateId,
      user_data: userData,
      options
    })
  });

  return result.job_id;
}

/**
 * Get job status
 */
async function getJobStatus(jobId) {
  const { job } = await apiCall(`/api/queue/jobs/${jobId}`);
  return job;
}

/**
 * Wait for job to complete
 */
async function waitForJob(jobId, maxWaitMs = 300000) {
  const startTime = Date.now();
  const pollInterval = 2000; // 2 seconds

  console.log(`⏳ Waiting for job ${jobId}...`);

  while (Date.now() - startTime < maxWaitMs) {
    const job = await getJobStatus(jobId);

    if (job.status === 'completed') {
      console.log('✅ Job completed!');
      return JSON.parse(job.result.output);
    } else if (job.status === 'failed') {
      console.error('❌ Job failed:', job.error);
      throw new Error(job.error || 'Job failed');
    }

    // Show progress
    process.stdout.write('.');
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error('Job timeout');
}

/**
 * List all available templates
 */
async function listTemplates(filters = {}) {
  const params = new URLSearchParams();
  if (filters.type) params.append('type', filters.type);
  if (filters.activeOnly) params.append('active_only', 'true');

  const { templates } = await apiCall(`/api/templates?${params}`);
  return templates;
}

// ============================================================================
// SAMPLE DATA
// ============================================================================

/**
 * Sample user data for testing
 */
const SAMPLE_USER = {
  id: 'user-7PZmV9Oa1cOBoQs6NeoTfYtcujz1',
  name: 'Test User',
  birthDate: '1995-07-02',
  birthTime: '06:50',
  birthPlace: 'Gaya, Bihar, India',

  // Sample swiss ephemeris data
  swissData: {
    planets: {
      sun: { sign: 'Cancer', degree: 15.93, house: 12 },
      moon: { sign: 'Leo', degree: 0.88, house: 2, nakshatra: 'Magha' },
      venus: { sign: 'Gemini', degree: 22.5, house: 11 },
      mars: { sign: 'Virgo', degree: 8.3, house: 2 },
      jupiter: { sign: 'Sagittarius', degree: 25.0, house: 5 },
      saturn: { sign: 'Pisces', degree: 12.0, house: 8 },
      mercury: { sign: 'Cancer', degree: 20.0, house: 12 }
    },
    houses: {
      1: { sign: 'Leo', degree: 0 },
      2: { sign: 'Virgo', degree: 0 },
      3: { sign: 'Libra', degree: 0 },
      4: { sign: 'Scorpio', degree: 0 },
      5: { sign: 'Sagittarius', degree: 15 },
      6: { sign: 'Capricorn', degree: 0 },
      7: { sign: 'Aquarius', degree: 0 },
      8: { sign: 'Pisces', degree: 0 },
      9: { sign: 'Aries', degree: 0 },
      10: { sign: 'Taurus', degree: 0 },
      11: { sign: 'Gemini', degree: 0 },
      12: { sign: 'Cancer', degree: 0 }
    },
    dashas: {
      current: {
        planet: 'Moon',
        start: '2020-01-15',
        end: '2030-01-15'
      },
      upcoming: {
        planet: 'Mars',
        start: '2030-01-15',
        end: '2037-01-15'
      }
    }
  }
};

// ============================================================================
// EXAMPLES
// ============================================================================

/**
 * Example 1: Simple blueprint generation
 */
async function example1_simpleBlueprint() {
  console.log('\n=== Example 1: Simple Blueprint ===\n');

  const userData = {
    project_id: SAMPLE_USER.id,
    user_question: 'Should I have children?',
    swiss_data: SAMPLE_USER.swissData
  };

  const jobId = await createJobFromTemplate('love-relationships-blueprint', userData);
  console.log('Job created:', jobId);

  const blueprint = await waitForJob(jobId);
  console.log('\n📄 Blueprint Generated:');
  console.log('Title:', blueprint.title);
  console.log('Summary:', blueprint.summary);
  console.log('Content length:', blueprint.content.length, 'characters');
}

/**
 * Example 2: Blueprint with follow-up questions
 */
async function example2_withFollowUpQuestions() {
  console.log('\n=== Example 2: With Follow-up Questions ===\n');

  const templateId = 'love-relationships-blueprint';

  // 1. Get template requirements
  const requirements = await getTemplateRequirements(templateId);

  console.log('Template:', requirements.template_name);
  console.log('\nFollow-up questions:');
  requirements.follow_up_questions.forEach((q, i) => {
    console.log(`  ${i + 1}. ${q.question}`);
    console.log(`     Type: ${q.type}, Required: ${q.required}`);
    if (q.options) {
      console.log(`     Options: ${q.options.join(', ')}`);
    }
    console.log();
  });

  // 2. Simulate user answers
  const answers = {};
  requirements.follow_up_questions.forEach((q) => {
    if (q.type === 'single_choice') {
      // Pick first option for demo
      answers[q.id] = q.options[0];
    }
  });

  console.log('Simulated answers:', answers);

  // 3. Create job with answers
  const userData = {
    project_id: SAMPLE_USER.id,
    user_question: 'What does my chart say about love?',
    user_info: {
      name: SAMPLE_USER.name,
      birth_date: SAMPLE_USER.birthDate,
      birth_time: SAMPLE_USER.birthTime,
      birth_place: SAMPLE_USER.birthPlace
    },
    swiss_data: SAMPLE_USER.swissData,
    follow_up_answers: answers
  };

  const jobId = await createJobFromTemplate(templateId, userData);
  console.log('\nJob created:', jobId);

  const blueprint = await waitForJob(jobId);
  console.log('\n📄 Blueprint Generated:');
  console.log('Title:', blueprint.title);
}

/**
 * Example 3: Blueprint with custom preferences
 */
async function example3_withPreferences() {
  console.log('\n=== Example 3: With Custom Preferences ===\n');

  const userData = {
    project_id: SAMPLE_USER.id,
    user_question: 'When will I achieve financial success?',
    user_info: {
      name: SAMPLE_USER.name,
      birth_date: SAMPLE_USER.birthDate,
      birth_time: SAMPLE_USER.birthTime,
      birth_place: SAMPLE_USER.birthPlace
    },
    swiss_data: SAMPLE_USER.swissData,
    preferences: {
      tone: 'direct',           // More direct communication
      focus: 'practical',       // Practical advice
      timeframe: 'immediate',   // Focus on near-term
      depth: 'comprehensive'    // Detailed analysis
    }
  };

  const jobId = await createJobFromTemplate('money-wealth-blueprint', userData);
  console.log('Job created with custom preferences:', jobId);

  const blueprint = await waitForJob(jobId);
  console.log('\n📄 Blueprint Generated:');
  console.log('Title:', blueprint.title);
}

/**
 * Example 4: Multiple blueprints (bulk creation)
 */
async function example4_multipleBlueprints() {
  console.log('\n=== Example 4: Multiple Blueprints ===\n');

  const questions = [
    { template: 'love-relationships-blueprint', question: 'What does my chart say about love?' },
    { template: 'career-purpose-blueprint', question: 'What is my ideal career path?' },
    { template: 'money-wealth-blueprint', question: 'When will wealth come?' }
  ];

  const jobs = questions.map(q => ({
    template_id: q.template,
    user_data: {
      project_id: SAMPLE_USER.id,
      user_question: q.question,
      swiss_data: SAMPLE_USER.swissData
    }
  }));

  const result = await apiCall('/api/queue/jobs/from-template/bulk', {
    method: 'POST',
    body: JSON.stringify({ jobs })
  });

  console.log(`✅ Created ${result.created} jobs`);
  if (result.failed > 0) {
    console.log(`❌ Failed ${result.failed} jobs`);
  }

  console.log('\nJob IDs:');
  result.results.forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.template_id}: ${r.job_id}`);
  });

  // Wait for all jobs
  console.log('\nWaiting for all jobs to complete...');
  const blueprints = await Promise.all(
    result.results.map(r => waitForJob(r.job_id))
  );

  console.log('\n📄 All Blueprints Generated:');
  blueprints.forEach((bp, i) => {
    console.log(`${i + 1}. ${bp.title}`);
  });
}

/**
 * Example 5: List available templates
 */
async function example5_listTemplates() {
  console.log('\n=== Example 5: List Available Templates ===\n');

  const templates = await listTemplates({ activeOnly: true });

  console.log(`Found ${templates.length} active templates:\n`);

  templates.forEach((t, i) => {
    console.log(`${i + 1}. ${t.name}`);
    console.log(`   Type: ${t.type} | Category: ${t.category}`);
    console.log(`   Description: ${t.description}`);
    console.log(`   Usage: ${t.usage_count} times`);
    console.log(`   Tags: ${t.tags.join(', ')}`);
    console.log();
  });
}

/**
 * Example 6: Complete workflow simulation
 */
async function example6_completeWorkflow() {
  console.log('\n=== Example 6: Complete Workflow ===\n');

  // 1. User selects template
  console.log('Step 1: User selects template');
  const templates = await listTemplates({ type: 'love' });
  const selectedTemplate = templates[0];
  console.log(`Selected: ${selectedTemplate.name}\n`);

  // 2. Get requirements
  console.log('Step 2: Get template requirements');
  const requirements = await getTemplateRequirements(selectedTemplate.slug);
  console.log(`Required placements: ${requirements.required_placements.planets.join(', ')}\n`);

  // 3. Present follow-up questions (simulated)
  console.log('Step 3: Present follow-up questions to user');
  const answers = {};
  requirements.follow_up_questions.forEach((q, i) => {
    console.log(`Q${i + 1}: ${q.question}`);
    if (q.options) {
      const answer = q.options[0]; // Simulate user selecting first option
      answers[q.id] = answer;
      console.log(`A${i + 1}: ${answer}`);
    }
  });
  console.log();

  // 4. Create job
  console.log('Step 4: Create blueprint job');
  const userData = {
    project_id: SAMPLE_USER.id,
    user_question: 'What does my chart reveal about my romantic future?',
    user_info: {
      name: SAMPLE_USER.name,
      birth_date: SAMPLE_USER.birthDate,
      birth_time: SAMPLE_USER.birthTime,
      birth_place: SAMPLE_USER.birthPlace
    },
    swiss_data: SAMPLE_USER.swissData,
    follow_up_answers: answers,
    preferences: {
      tone: 'compassionate',
      focus: 'practical',
      timeframe: 'both'
    }
  };

  const jobId = await createJobFromTemplate(selectedTemplate.slug, userData);
  console.log(`Job created: ${jobId}\n`);

  // 5. Wait for completion
  console.log('Step 5: Wait for blueprint generation');
  const blueprint = await waitForJob(jobId);

  // 6. Display result
  console.log('\nStep 6: Display blueprint to user');
  console.log('━'.repeat(80));
  console.log(blueprint.title);
  console.log('━'.repeat(80));
  console.log('\nSummary:');
  console.log(blueprint.summary);
  console.log('\nContent preview:');
  console.log(blueprint.content.substring(0, 500) + '...');
  console.log('\n✅ Workflow complete!');
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('🌟 Birthstar Template Integration Examples\n');
  console.log('API Base:', API_BASE);
  console.log('API Key:', API_KEY.substring(0, 5) + '...\n');

  try {
    // Check if fetch is available
    if (typeof fetch === 'undefined') {
      console.error('❌ This script requires Node.js 18+ or install node-fetch');
      process.exit(1);
    }

    const args = process.argv.slice(2);
    const exampleNum = args[0];

    if (exampleNum) {
      // Run specific example
      const examples = {
        '1': example1_simpleBlueprint,
        '2': example2_withFollowUpQuestions,
        '3': example3_withPreferences,
        '4': example4_multipleBlueprints,
        '5': example5_listTemplates,
        '6': example6_completeWorkflow
      };

      const example = examples[exampleNum];
      if (example) {
        await example();
      } else {
        console.log('Usage: node birthstar-integration-example.js [1-6]');
        console.log('\nAvailable examples:');
        console.log('  1 - Simple blueprint generation');
        console.log('  2 - With follow-up questions');
        console.log('  3 - With custom preferences');
        console.log('  4 - Multiple blueprints (bulk)');
        console.log('  5 - List available templates');
        console.log('  6 - Complete workflow simulation');
        console.log('\n  (no argument) - Run all examples');
      }
    } else {
      // Run all examples
      await example5_listTemplates();
      await example1_simpleBlueprint();
      await example2_withFollowUpQuestions();
      await example3_withPreferences();
      await example4_multipleBlueprints();
      await example6_completeWorkflow();

      console.log('\n✅ All examples completed successfully!');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = {
  apiCall,
  getTemplateRequirements,
  createJobFromTemplate,
  getJobStatus,
  waitForJob,
  listTemplates
};
