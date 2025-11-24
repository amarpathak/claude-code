# Birthstar Template System Integration Guide

**Version:** 1.0.0
**Last Updated:** November 25, 2024
**API Base URL (Production):** `https://api-server-2dlji6qpk-amarpathaks-projects.vercel.app`
**API Base URL (Local):** `http://localhost:8001`

---

## 🚀 What's New

The template system has been completely upgraded with:

✅ **Rich template schema** - Structured sections, word counts, metadata
✅ **Follow-up questions** - Gather user context for better personalization
✅ **Context-aware** - Templates specify required astrological placements
✅ **Usage tracking** - Analytics on template popularity
✅ **Visual dashboard** - Manage templates without code
✅ **Job integration** - Create jobs directly from templates

---

## 📋 Quick Comparison

### Old System (Before)
```javascript
// Manual prompt construction
const prompt = `Generate a birth chart blueprint...
USER QUESTION: ${userQuestion}
Birth data: ...
swiss-data.json...`;

await fetch('/api/queue/jobs', {
  method: 'POST',
  body: JSON.stringify({ prompt, project_id, swiss_data })
});
```

### New System (Now)
```javascript
// Template-based job creation
await fetch('/api/queue/jobs/from-template', {
  method: 'POST',
  body: JSON.stringify({
    template_id: 'love-relationships-blueprint',
    user_data: {
      project_id,
      user_question,
      swiss_data,
      follow_up_answers: { /* optional */ },
      preferences: { /* optional */ }
    }
  })
});
```

**Benefits:**
- ✅ Consistent prompts across all jobs
- ✅ Better personalization with follow-up questions
- ✅ Less code to maintain
- ✅ Easier A/B testing of prompt variations

---

## 🎯 Available Templates

| Template ID | Type | Use Case | Follow-up Questions |
|------------|------|----------|---------------------|
| `love-relationships-blueprint` | Love | Romantic life, relationships, marriage | 3 questions |
| `career-purpose-blueprint` | Career | Professional path, life purpose | 2 questions |
| `money-wealth-blueprint` | Money | Financial opportunities, wealth | 2 questions |
| `health-wellness-blueprint` | Health | Physical/mental health, vitality | 1 question |
| `spiritual-path-blueprint` | Spiritual | Spiritual growth, soul purpose | 1 question |
| `complete-life-blueprint` | General | Complete life analysis (all areas) | 2 questions |

---

## 🔧 Integration Steps

### Step 1: Get Template Requirements

Before creating a job, fetch what data the template needs:

```javascript
const API_KEY = process.env.API_KEY;
const API_BASE = 'https://api-server-2dlji6qpk-amarpathaks-projects.vercel.app';

async function getTemplateRequirements(templateId) {
  const response = await fetch(
    `${API_BASE}/api/queue/templates/${templateId}/requirements`,
    {
      headers: { 'X-API-Key': API_KEY }
    }
  );

  const { requirements } = await response.json();
  return requirements;
}

// Example usage
const req = await getTemplateRequirements('love-relationships-blueprint');

console.log('Template:', req.template_name);
console.log('Required data:', req.required_data);
console.log('Follow-up questions:', req.follow_up_questions);
```

**Response:**
```json
{
  "success": true,
  "requirements": {
    "template_id": "love-relationships-blueprint",
    "template_name": "Love & Relationships Blueprint",
    "required_data": {
      "swiss_data": true,
      "user_info": false,
      "project_id": true
    },
    "follow_up_questions": [
      {
        "id": "uuid-1",
        "question": "What is your current relationship status?",
        "type": "single_choice",
        "options": ["Single", "Dating", "Committed", "Married", "Complicated"],
        "required": true,
        "weight": 10,
        "purpose": "Tailor advice to current situation"
      },
      {
        "id": "uuid-2",
        "question": "What matters most to you in a relationship?",
        "type": "single_choice",
        "options": ["Emotional connection", "Physical attraction", "Shared values", "Financial stability", "Adventure & fun"],
        "required": false,
        "weight": 8,
        "purpose": "Understand relationship priorities"
      }
    ],
    "required_placements": {
      "planets": ["Venus", "Mars", "Moon"],
      "houses": [5, 7],
      "dashas": ["current"]
    }
  }
}
```

### Step 2: Present Follow-up Questions to User

Display the questions in your UI and collect answers:

```javascript
function renderFollowUpQuestions(questions) {
  // React example
  return questions.map(q => (
    <div key={q.id} className="question">
      <label>
        {q.question}
        {q.required && <span className="required">*</span>}
      </label>

      {q.type === 'single_choice' && (
        <select name={q.id} required={q.required}>
          <option value="">Select...</option>
          {q.options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      )}

      {q.type === 'text' && (
        <textarea name={q.id} required={q.required} />
      )}

      <small className="help-text">{q.purpose}</small>
    </div>
  ));
}
```

### Step 3: Create Job from Template

```javascript
async function createBlueprintJob(templateId, userData) {
  const response = await fetch(
    `${API_BASE}/api/queue/jobs/from-template`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify({
        template_id: templateId,
        user_data: userData,
        options: {
          priority: 'high',  // optional: 'low', 'normal', 'high'
          timeout: 300000    // optional: milliseconds
        }
      })
    }
  );

  const result = await response.json();
  return result.job_id;
}
```

### Step 4: Monitor Job Status

```javascript
async function getJobStatus(jobId) {
  const response = await fetch(
    `${API_BASE}/api/queue/jobs/${jobId}`,
    {
      headers: { 'X-API-Key': API_KEY }
    }
  );

  const { job } = await response.json();
  return job;
}

// Poll for completion
async function waitForJob(jobId, maxWaitMs = 300000) {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const job = await getJobStatus(jobId);

    if (job.status === 'completed') {
      return job.result;
    } else if (job.status === 'failed') {
      throw new Error(job.error || 'Job failed');
    }

    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s
  }

  throw new Error('Job timeout');
}
```

---

## 💡 Complete Example: Love Blueprint

Here's a complete flow from user input to blueprint generation:

```javascript
async function generateLoveBlueprint(user) {
  // 1. Get template requirements
  const requirements = await getTemplateRequirements('love-relationships-blueprint');

  // 2. Present questions to user (in your UI)
  const answers = await presentQuestionsToUser(requirements.follow_up_questions);
  // Example answers:
  // {
  //   "uuid-1": "Single",
  //   "uuid-2": "Emotional connection"
  // }

  // 3. Prepare user data
  const userData = {
    project_id: user.id,  // e.g., "user-7PZmV9Oa1cOBoQs6NeoTfYtcujz1"
    user_question: "Should I have children?",  // User's main question

    // User birth info (optional but recommended)
    user_info: {
      name: user.name,
      birth_date: user.birthDate,      // "1995-07-02"
      birth_time: user.birthTime,      // "06:50"
      birth_place: user.birthPlace     // "Gaya, Bihar, India"
    },

    // Astrological data (REQUIRED)
    swiss_data: {
      planets: {
        sun: { sign: 'Cancer', degree: 15.93, house: 12 },
        moon: { sign: 'Leo', degree: 0.88, house: 2, nakshatra: 'Magha' },
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

    // Follow-up answers (optional but improves quality)
    follow_up_answers: answers,

    // User preferences (optional)
    preferences: {
      tone: 'compassionate',        // 'direct', 'gentle', 'balanced', 'spiritual'
      focus: 'practical',           // 'practical', 'spiritual', 'balanced'
      timeframe: 'both',            // 'immediate', 'long-term', 'both'
      depth: 'comprehensive'        // 'quick', 'standard', 'comprehensive'
    }
  };

  // 4. Create job
  const jobId = await createBlueprintJob('love-relationships-blueprint', userData);
  console.log('Job created:', jobId);

  // 5. Wait for completion
  const result = await waitForJob(jobId);

  // 6. Parse result
  const blueprint = JSON.parse(result.output);
  // {
  //   title: "Your Love Journey: A Blueprint for...",
  //   summary: "Your chart reveals...",
  //   content: "## Your Romantic Nature\n\n..."
  // }

  return blueprint;
}
```

---

## 🎨 Customization Options

### User Preferences

Control the tone and style of generated blueprints:

```javascript
preferences: {
  // Tone: How direct or gentle the reading should be
  tone: 'compassionate',  // Options: 'direct', 'gentle', 'balanced', 'spiritual', 'professional'

  // Focus: What aspect to emphasize
  focus: 'practical',     // Options: 'practical', 'spiritual', 'psychological', 'balanced', 'technical'

  // Timeframe: Short-term vs long-term perspective
  timeframe: 'both',      // Options: 'immediate', 'short-term', 'long-term', 'both', 'life-span'

  // Depth: How detailed the reading should be
  depth: 'standard',      // Options: 'quick', 'standard', 'comprehensive'

  // Language style
  language_style: 'simple' // Options: 'simple', 'technical', 'poetic'
}
```

### Reading Parameters

Control what's included in the blueprint:

```javascript
// These are set in the template, but you can override them
// by creating a custom template variant

reading_params: {
  include_remedies: true,      // Include astrological remedies/solutions
  include_timing: true,        // Include timing predictions (dashas/transits)
  include_examples: false,     // Include example scenarios
  include_comparisons: false,  // Include compatibility comparisons
  include_warnings: true       // Include warnings about challenges
}
```

---

## 📊 Bulk Job Creation

Create multiple blueprints at once:

```javascript
async function createMultipleBlueprints(user) {
  const jobs = [
    {
      template_id: 'love-relationships-blueprint',
      user_data: {
        project_id: user.id,
        user_question: 'What does my chart say about love?',
        swiss_data: user.swissData,
        follow_up_answers: { /* ... */ }
      }
    },
    {
      template_id: 'career-purpose-blueprint',
      user_data: {
        project_id: user.id,
        user_question: 'What is my ideal career path?',
        swiss_data: user.swissData
      }
    },
    {
      template_id: 'money-wealth-blueprint',
      user_data: {
        project_id: user.id,
        user_question: 'When will wealth come?',
        swiss_data: user.swissData
      }
    }
  ];

  const response = await fetch(
    `${API_BASE}/api/queue/jobs/from-template/bulk`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify({ jobs })
    }
  );

  const result = await response.json();

  console.log(`Created ${result.created} jobs`);
  console.log(`Failed ${result.failed} jobs`);

  // Monitor all jobs
  const jobIds = result.results.map(r => r.job_id);
  const blueprints = await Promise.all(
    jobIds.map(id => waitForJob(id))
  );

  return blueprints;
}
```

---

## 🔍 Template Discovery

### List All Templates

```javascript
async function listTemplates(filters = {}) {
  const params = new URLSearchParams();

  if (filters.type) params.append('type', filters.type);           // love, career, money, etc.
  if (filters.category) params.append('category', filters.category); // blueprint, report, etc.
  if (filters.tag) params.append('tag', filters.tag);
  if (filters.activeOnly) params.append('active_only', 'true');

  const response = await fetch(
    `${API_BASE}/api/templates?${params}`,
    {
      headers: { 'X-API-Key': API_KEY }
    }
  );

  const { templates } = await response.json();
  return templates;
}

// Examples
const loveTemplates = await listTemplates({ type: 'love' });
const activeBlueprints = await listTemplates({ category: 'blueprint', activeOnly: true });
```

### Get Template Details

```javascript
async function getTemplate(idOrSlug) {
  const response = await fetch(
    `${API_BASE}/api/templates/${idOrSlug}`,
    {
      headers: { 'X-API-Key': API_KEY }
    }
  );

  const { template } = await response.json();
  return template;
}

// Can use ID or slug
const template1 = await getTemplate('love-relationships-blueprint');
const template2 = await getTemplate('2cbff088-60d1-4b13-992e-d9cb05917429');
```

---

## 🛠️ Advanced: Creating Custom Templates

If the default templates don't fit your needs, create custom ones:

```javascript
async function createCustomTemplate() {
  const template = {
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
          key_placements: ['5th house', 'Jupiter', 'Moon'],
          points_to_cover: [
            'Number of children indicated',
            'Fertility factors',
            'Best timing for children'
          ],
          questions_to_answer: [
            'Will I have children?',
            'When is the best time?'
          ]
        }
        // ... more sections
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
      }
    ],

    context_data: {
      required_placements: {
        planets: ['Jupiter', 'Moon', 'Venus'],
        houses: [4, 5],
        dashas: ['current']
      },
      user_preferences: {
        tone: 'compassionate',
        focus: 'practical',
        timeframe: 'both'
      },
      reading_params: {
        include_remedies: true,
        include_timing: true,
        include_warnings: true
      }
    },

    metadata: {
      tags: ['family', 'children', 'parenting', 'custom']
    }
  };

  const response = await fetch(
    `${API_BASE}/api/templates`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify(template)
    }
  );

  const { template: created } = await response.json();
  return created;
}
```

---

## 📈 Usage Analytics

Track which templates are most popular:

```javascript
async function getTemplateUsageStats() {
  const templates = await listTemplates({ activeOnly: true });

  // Sort by usage
  const sortedByUsage = templates.sort((a, b) =>
    b.usage_count - a.usage_count
  );

  console.log('Most popular templates:');
  sortedByUsage.slice(0, 5).forEach((t, i) => {
    console.log(`${i + 1}. ${t.name} - ${t.usage_count} uses`);
  });

  // Usage by type
  const usageByType = templates.reduce((acc, t) => {
    acc[t.type] = (acc[t.type] || 0) + t.usage_count;
    return acc;
  }, {});

  console.log('\nUsage by type:', usageByType);
}
```

---

## ⚠️ Error Handling

Handle common errors gracefully:

```javascript
async function safeCreateJob(templateId, userData) {
  try {
    // Validate user data first
    if (!userData.swiss_data) {
      throw new Error('swiss_data is required');
    }

    if (!userData.project_id) {
      throw new Error('project_id is required');
    }

    // Create job
    const response = await fetch(
      `${API_BASE}/api/queue/jobs/from-template`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify({
          template_id: templateId,
          user_data: userData
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();

      // Handle specific errors
      if (response.status === 400) {
        console.error('Invalid data:', error.errors);
        return { error: 'Please check your input data', details: error.errors };
      }

      if (response.status === 401) {
        console.error('Authentication failed');
        return { error: 'Invalid API key' };
      }

      if (response.status === 404) {
        console.error('Template not found');
        return { error: 'Template does not exist' };
      }

      throw new Error(error.error || 'Unknown error');
    }

    const result = await response.json();
    return { success: true, job_id: result.job_id };

  } catch (error) {
    console.error('Error creating job:', error);
    return { error: error.message };
  }
}
```

---

## 🧪 Testing

### Test with Sample Data

```javascript
// Sample test data for development/testing
const SAMPLE_USER_DATA = {
  project_id: 'test-user-123',
  user_question: 'Test question',
  user_info: {
    name: 'Test User',
    birth_date: '1990-01-01',
    birth_time: '12:00',
    birth_place: 'Mumbai, India'
  },
  swiss_data: {
    planets: {
      sun: { sign: 'Capricorn', degree: 10.5, house: 10 },
      moon: { sign: 'Cancer', degree: 15.2, house: 4 },
      venus: { sign: 'Sagittarius', degree: 20.0, house: 9 }
    },
    houses: {
      1: { sign: 'Aries', degree: 0 }
    },
    dashas: {
      current: { planet: 'Sun', start: '2020-01-01', end: '2026-01-01' }
    }
  }
};

// Run test
async function testTemplate(templateId) {
  console.log(`Testing template: ${templateId}`);

  const result = await safeCreateJob(templateId, SAMPLE_USER_DATA);

  if (result.error) {
    console.error('❌ Test failed:', result.error);
  } else {
    console.log('✅ Test passed. Job ID:', result.job_id);

    // Wait for result
    const job = await waitForJob(result.job_id);
    console.log('Job completed:', job.status);
  }
}
```

---

## 📝 Migration Checklist

For migrating from the old system:

- [ ] **Inventory current job creation code** - Find all places creating jobs
- [ ] **Map questions to templates** - Determine which template fits each use case
- [ ] **Identify follow-up questions** - What extra info would improve results?
- [ ] **Update job creation calls** - Replace old API calls with template-based ones
- [ ] **Add follow-up question UI** - Present questions to users
- [ ] **Test with real data** - Verify quality of generated blueprints
- [ ] **Monitor usage** - Track which templates are most popular
- [ ] **Create custom templates** - For use cases not covered by defaults
- [ ] **Update documentation** - Document template usage for your team

---

## 🎯 Best Practices

### 1. Always Provide Context

More context = better blueprints:

```javascript
// ❌ Minimal data
const userData = {
  project_id: user.id,
  swiss_data: { planets: {...} }
};

// ✅ Rich context
const userData = {
  project_id: user.id,
  user_question: "Should I start a business?",
  user_info: { name, birth_date, birth_time, birth_place },
  swiss_data: { planets, houses, dashas, yogas },
  follow_up_answers: { /* answered questions */ },
  preferences: { tone: 'direct', focus: 'practical' }
};
```

### 2. Use Follow-up Questions

They significantly improve personalization:

```javascript
// Always fetch and present follow-up questions
const requirements = await getTemplateRequirements(templateId);
const answers = await presentQuestionsToUser(requirements.follow_up_questions);
```

### 3. Handle Errors Gracefully

```javascript
// Show user-friendly errors
const result = await safeCreateJob(templateId, userData);

if (result.error) {
  showErrorToUser(result.error);
} else {
  showLoadingState();
  const blueprint = await waitForJob(result.job_id);
  showBlueprint(blueprint);
}
```

### 4. Cache Template Requirements

```javascript
// Cache requirements to avoid repeated API calls
const requirementsCache = new Map();

async function getCachedRequirements(templateId) {
  if (!requirementsCache.has(templateId)) {
    const req = await getTemplateRequirements(templateId);
    requirementsCache.set(templateId, req);
  }
  return requirementsCache.get(templateId);
}
```

### 5. Monitor Template Performance

```javascript
// Track which templates produce best results
function trackTemplateUsage(templateId, userSatisfaction) {
  analytics.track('blueprint_generated', {
    template_id: templateId,
    satisfaction_score: userSatisfaction,
    timestamp: new Date()
  });
}
```

---

## 🆘 Support & Contact

**Questions?** Contact the API team:
- **Slack:** #api-support
- **Email:** api@birthstar.com
- **Docs:** [Template System Guide](./TEMPLATE_SYSTEM_GUIDE.md)

**Dashboard Access:**
- **Production:** `https://your-vercel-url.vercel.app/templates/dashboard`
- **Local:** `http://localhost:8001/templates/dashboard`

---

## 📚 Additional Resources

- [Complete API Reference](./API_REFERENCE.md)
- [Template System Guide](./TEMPLATE_SYSTEM_GUIDE.md) - Technical details
- [Usage Examples](./examples/template-usage-example.js) - More code examples

---

**Happy Integrating! 🎉**

If you have questions or need custom templates, reach out to the API team.
