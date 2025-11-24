/**
 * Template System Usage Examples
 *
 * Demonstrates how to use the enhanced template management system
 * for creating personalized astrological blueprints.
 */

const API_BASE = 'http://localhost:8000';
const API_KEY = process.env.API_KEY || 'your-api-key-here';

/**
 * Helper function for API calls
 */
async function apiCall(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || response.statusText);
  }

  return response.json();
}

/**
 * Example 1: List all available templates
 */
async function example1_listTemplates() {
  console.log('\n=== Example 1: List All Templates ===\n');

  const result = await apiCall('/api/templates');

  console.log(`Found ${result.count} templates:\n`);
  result.templates.forEach(t => {
    console.log(`- ${t.name} (${t.type})`);
    console.log(`  Usage: ${t.usage_count} times`);
    console.log(`  Tags: ${t.tags.join(', ')}\n`);
  });
}

/**
 * Example 2: Get template requirements
 */
async function example2_getTemplateRequirements() {
  console.log('\n=== Example 2: Get Template Requirements ===\n');

  const result = await apiCall('/api/queue/templates/love-relationships-blueprint/requirements');
  const req = result.requirements;

  console.log(`Template: ${req.template_name}\n`);
  console.log('Required Data:');
  Object.entries(req.required_data).forEach(([key, required]) => {
    console.log(`  ${key}: ${required ? 'Required' : 'Optional'}`);
  });

  console.log('\nFollow-up Questions:');
  req.follow_up_questions.forEach((q, i) => {
    console.log(`  ${i + 1}. ${q.question}`);
    console.log(`     Type: ${q.type}, Required: ${q.required}`);
    if (q.options) console.log(`     Options: ${q.options.join(', ')}`);
  });

  console.log('\nRequired Placements:');
  console.log(`  Planets: ${req.required_placements.planets.join(', ')}`);
  console.log(`  Houses: ${req.required_placements.houses.join(', ')}`);
}

/**
 * Example 3: Create a job from template
 */
async function example3_createJobFromTemplate() {
  console.log('\n=== Example 3: Create Job from Template ===\n');

  const userData = {
    project_id: 'user-7PZmV9Oa1cOBoQs6NeoTfYtcujz1',
    user_question: 'Should I have children?',
    user_info: {
      name: 'User',
      birth_date: '1995-07-02',
      birth_time: '06:50',
      birth_place: 'Gaya, Bihar, India'
    },
    swiss_data: {
      planets: {
        sun: { sign: 'Cancer', degree: 15.93, house: 12 },
        moon: { sign: 'Leo', degree: 0.88, house: 2 },
        venus: { sign: 'Gemini', degree: 22.5, house: 11 },
        mars: { sign: 'Virgo', degree: 8.3, house: 2 },
        jupiter: { sign: 'Sagittarius', degree: 25.0, house: 5 }
      },
      houses: {
        1: { sign: 'Leo', degree: 0 },
        5: { sign: 'Sagittarius', degree: 15 },
        7: { sign: 'Aquarius', degree: 0 }
      },
      dashas: {
        current: {
          planet: 'Moon',
          start: '2020-01-15',
          end: '2030-01-15'
        }
      }
    },
    follow_up_answers: {
      'current-relationship-status': 'Single',
      'relationship-priority': 'Emotional connection',
      'heartbreak-experience': 'Yes, in the past'
    },
    preferences: {
      tone: 'compassionate',
      focus: 'practical',
      timeframe: 'both'
    }
  };

  const result = await apiCall('/api/queue/jobs/from-template', {
    method: 'POST',
    body: JSON.stringify({
      template_id: 'love-relationships-blueprint',
      user_data: userData,
      options: {
        priority: 'high',
        timeout: 300000
      }
    })
  });

  console.log('Job created successfully!');
  console.log(`Job ID: ${result.job_id}`);
  console.log(`Template: ${result.template_id}`);
  console.log('\nMonitor job status at:');
  console.log(`GET /api/queue/jobs/${result.job_id}`);
}

/**
 * Example 4: Create a custom template
 */
async function example4_createCustomTemplate() {
  console.log('\n=== Example 4: Create Custom Template ===\n');

  const customTemplate = {
    name: 'Children & Family Blueprint',
    type: 'custom',
    category: 'blueprint',
    description: 'Detailed analysis of family life and children potential',
    structure: {
      word_count: 1500,
      sections: [
        {
          heading: 'Your Family Nature',
          purpose: 'Understand natural approach to family',
          word_count: 350,
          key_placements: ['Jupiter', '4th house', '5th house', 'Moon'],
          points_to_cover: [
            'Natural parenting style',
            'Family values',
            'Relationship with own parents'
          ],
          questions_to_answer: [
            'What kind of parent would you be?',
            'How do you relate to family?'
          ]
        },
        {
          heading: 'Children Potential & Timing',
          purpose: 'Analyze likelihood and timing of children',
          word_count: 400,
          key_placements: ['5th house', 'Jupiter', 'Moon', 'Venus'],
          points_to_cover: [
            'Number of children indicated',
            'Fertility factors',
            'Best timing for children'
          ],
          questions_to_answer: [
            'Will I have children?',
            'When is the best time?'
          ]
        },
        {
          heading: 'Parenting Strengths & Challenges',
          purpose: 'Identify parenting abilities and areas to work on',
          word_count: 350,
          key_placements: ['Moon', 'Saturn', 'Mars'],
          points_to_cover: [
            'Natural parenting strengths',
            'Potential challenges',
            'How to overcome difficulties'
          ],
          questions_to_answer: [
            'What will I be good at as a parent?',
            'What challenges might I face?'
          ]
        },
        {
          heading: 'Family Guidance',
          purpose: 'Practical advice for family planning',
          word_count: 300,
          key_placements: ['Jupiter', 'Saturn', 'Current dasha'],
          points_to_cover: [
            'Steps to prepare for parenthood',
            'Emotional readiness',
            'Practical considerations'
          ],
          questions_to_answer: [
            'How can I prepare?',
            'What should I consider?'
          ]
        }
      ]
    },
    follow_up_questions: [
      {
        question: 'Do you currently have children?',
        type: 'single_choice',
        options: ['Yes', 'No', 'Planning soon', 'Not sure yet'],
        required: true,
        weight: 10,
        purpose: 'Tailor advice to current family situation'
      },
      {
        question: 'What concerns you most about having children?',
        type: 'single_choice',
        options: [
          'Financial readiness',
          'Relationship stability',
          'Career impact',
          'Personal readiness',
          'Health concerns'
        ],
        required: false,
        weight: 8,
        purpose: 'Address specific concerns'
      },
      {
        question: 'What kind of family environment did you grow up in?',
        type: 'single_choice',
        options: [
          'Very supportive',
          'Somewhat supportive',
          'Neutral',
          'Challenging',
          'Prefer not to say'
        ],
        required: false,
        weight: 6,
        purpose: 'Understand family patterns'
      }
    ],
    context_data: {
      required_placements: {
        planets: ['Jupiter', 'Moon', 'Venus'],
        houses: [4, 5],
        dashas: ['current'],
        yogas: []
      },
      user_preferences: {
        tone: 'compassionate',
        focus: 'practical',
        timeframe: 'both',
        depth: 'comprehensive'
      },
      reading_params: {
        include_remedies: true,
        include_timing: true,
        include_examples: true,
        include_comparisons: false,
        include_warnings: true
      }
    },
    metadata: {
      tags: ['family', 'children', 'parenting', 'custom']
    }
  };

  const result = await apiCall('/api/templates', {
    method: 'POST',
    body: JSON.stringify(customTemplate)
  });

  console.log('Custom template created successfully!');
  console.log(`Template ID: ${result.template.id}`);
  console.log(`Template Slug: ${result.template.slug}`);
  console.log(`\nView at: ${API_BASE}/templates/dashboard`);
}

/**
 * Example 5: Bulk job creation from multiple templates
 */
async function example5_bulkJobCreation() {
  console.log('\n=== Example 5: Bulk Job Creation ===\n');

  const baseUserData = {
    project_id: 'user-7PZmV9Oa1cOBoQs6NeoTfYtcujz1',
    user_info: {
      name: 'User',
      birth_date: '1995-07-02',
      birth_time: '06:50',
      birth_place: 'Gaya, Bihar, India'
    },
    swiss_data: {
      planets: {
        sun: { sign: 'Cancer', degree: 15.93, house: 12 },
        moon: { sign: 'Leo', degree: 0.88, house: 2 },
        jupiter: { sign: 'Sagittarius', degree: 25.0, house: 5 }
      },
      houses: {
        1: { sign: 'Leo', degree: 0 }
      }
    }
  };

  const jobs = [
    {
      template_id: 'love-relationships-blueprint',
      user_data: {
        ...baseUserData,
        user_question: 'What does my chart say about love?'
      }
    },
    {
      template_id: 'career-purpose-blueprint',
      user_data: {
        ...baseUserData,
        user_question: 'What is my ideal career path?'
      }
    },
    {
      template_id: 'money-wealth-blueprint',
      user_data: {
        ...baseUserData,
        user_question: 'When will wealth come?'
      }
    }
  ];

  const result = await apiCall('/api/queue/jobs/from-template/bulk', {
    method: 'POST',
    body: JSON.stringify({ jobs })
  });

  console.log(`Created ${result.created} jobs successfully`);
  if (result.failed > 0) {
    console.log(`Failed: ${result.failed}`);
    console.log('Errors:', result.errors);
  }

  console.log('\nJob IDs:');
  result.results.forEach(r => {
    console.log(`  ${r.template_id}: ${r.job_id}`);
  });
}

/**
 * Example 6: Filter and search templates
 */
async function example6_filterTemplates() {
  console.log('\n=== Example 6: Filter Templates ===\n');

  // Get all love templates
  const loveTemplates = await apiCall('/api/templates?type=love');
  console.log(`Love templates: ${loveTemplates.count}`);

  // Get active blueprints only
  const activeBlueprints = await apiCall('/api/templates?category=blueprint&active_only=true');
  console.log(`Active blueprints: ${activeBlueprints.count}`);

  // Get templates with specific tag
  const familyTemplates = await apiCall('/api/templates?tag=family');
  console.log(`Family-related templates: ${familyTemplates.count}`);
}

/**
 * Run all examples
 */
async function runAllExamples() {
  try {
    await example1_listTemplates();
    await example2_getTemplateRequirements();
    await example3_createJobFromTemplate();
    await example4_createCustomTemplate();
    await example5_bulkJobCreation();
    await example6_filterTemplates();

    console.log('\n✅ All examples completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  }
}

// Run if executed directly
if (require.main === module) {
  // Check if fetch is available (Node 18+)
  if (typeof fetch === 'undefined') {
    console.error('This example requires Node.js 18+ or install node-fetch');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const exampleNum = args[0];

  if (exampleNum) {
    const examples = {
      '1': example1_listTemplates,
      '2': example2_getTemplateRequirements,
      '3': example3_createJobFromTemplate,
      '4': example4_createCustomTemplate,
      '5': example5_bulkJobCreation,
      '6': example6_filterTemplates
    };

    const example = examples[exampleNum];
    if (example) {
      example().catch(console.error);
    } else {
      console.log('Usage: node template-usage-example.js [1-6]');
      console.log('  1 - List all templates');
      console.log('  2 - Get template requirements');
      console.log('  3 - Create job from template');
      console.log('  4 - Create custom template');
      console.log('  5 - Bulk job creation');
      console.log('  6 - Filter templates');
      console.log('  (no argument) - Run all examples');
    }
  } else {
    runAllExamples().catch(console.error);
  }
}

module.exports = {
  example1_listTemplates,
  example2_getTemplateRequirements,
  example3_createJobFromTemplate,
  example4_createCustomTemplate,
  example5_bulkJobCreation,
  example6_filterTemplates
};
