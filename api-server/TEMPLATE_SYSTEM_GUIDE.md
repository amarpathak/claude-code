# Template Management System Guide

A comprehensive system for managing blueprint templates with rich metadata, follow-up questions, and context data.

## Overview

The template system provides:
- **Enhanced template schema** with metadata, follow-up questions, and context
- **Template dashboard** for visual management
- **API endpoints** for CRUD operations
- **Job integration** to create template-based jobs
- **Usage tracking** and statistics

## Features

### 1. Enhanced Template Schema

Templates now include:
- **Structure**: Sections, word counts, content organization
- **Follow-up questions**: Gather additional user context
- **Context data**: Astrological placements, user preferences, reading parameters
- **Metadata**: Tags, usage tracking, versioning
- **Validation**: Ensure data integrity

### 2. Template Dashboard

Access at: `http://localhost:8000/templates/dashboard`

Features:
- Visual template browsing
- Filter by type, category, status
- Create, edit, duplicate, delete templates
- View template details and statistics
- Track usage metrics

### 3. Template Types

Pre-configured templates:
- **Love & Relationships** - Romantic life analysis
- **Career & Purpose** - Professional path guidance
- **Money & Wealth** - Financial opportunities
- **Health & Wellness** - Physical and mental health
- **Spiritual Path** - Spiritual growth guidance
- **General** - Complete life blueprint

## API Endpoints

### Template Management

#### List Templates
```bash
GET /api/templates
```

Query parameters:
- `type`: Filter by type (love, career, money, health, spiritual, general)
- `category`: Filter by category (blueprint, report, analysis, guide)
- `tag`: Filter by tag
- `active_only`: Show only active templates (true/false)

Example:
```bash
curl -H "X-API-Key: your-key" \
  "http://localhost:8000/api/templates?type=love&active_only=true"
```

#### Get Template
```bash
GET /api/templates/:id
```

Get a specific template by ID or slug.

Example:
```bash
curl -H "X-API-Key: your-key" \
  "http://localhost:8000/api/templates/love-relationships-blueprint"
```

#### Create Template
```bash
POST /api/templates
```

Body:
```json
{
  "name": "My Custom Template",
  "type": "custom",
  "category": "blueprint",
  "description": "A custom template for...",
  "structure": {
    "word_count": 1500,
    "sections": [
      {
        "heading": "Introduction",
        "purpose": "Introduce the reading",
        "word_count": 300,
        "key_placements": ["Sun", "Moon"],
        "points_to_cover": ["Overview", "Key themes"],
        "questions_to_answer": ["What is the main question?"]
      }
    ]
  },
  "follow_up_questions": [
    {
      "question": "What matters most to you?",
      "type": "single_choice",
      "options": ["Option 1", "Option 2"],
      "required": true,
      "weight": 10,
      "purpose": "Understand priorities"
    }
  ],
  "metadata": {
    "tags": ["custom", "special"]
  }
}
```

#### Update Template
```bash
PUT /api/templates/:id
```

Same body structure as create.

#### Delete Template
```bash
DELETE /api/templates/:id
```

Query parameters:
- `permanent=true`: Permanently delete (default: soft delete)

#### Duplicate Template
```bash
POST /api/templates/:id/duplicate
```

Body:
```json
{
  "name": "New Template Name"
}
```

### Job Creation from Templates

#### Create Job from Template
```bash
POST /api/queue/jobs/from-template
```

Body:
```json
{
  "template_id": "love-relationships-blueprint",
  "user_data": {
    "project_id": "user-project-id",
    "user_question": "Should I have kids?",
    "user_info": {
      "name": "User",
      "birth_date": "1995-07-02",
      "birth_time": "06:50",
      "birth_place": "Gaya, Bihar, India"
    },
    "swiss_data": {
      "planets": {
        "sun": { "sign": "Cancer", "degree": 15.93, "house": 12 },
        "moon": { "sign": "Leo", "degree": 0.88, "house": 2 }
      },
      "houses": {
        "1": { "sign": "Leo", "degree": 0 }
      }
    },
    "follow_up_answers": {
      "question-id-1": "Single",
      "question-id-2": "Emotional connection"
    },
    "preferences": {
      "tone": "compassionate",
      "focus": "practical",
      "timeframe": "both"
    }
  },
  "options": {
    "priority": "high",
    "timeout": 300000
  }
}
```

Response:
```json
{
  "success": true,
  "job_id": "job-123",
  "template_id": "love-relationships-blueprint",
  "message": "Job created from template successfully"
}
```

#### Get Template Requirements
```bash
GET /api/queue/templates/:templateId/requirements
```

Returns what data is needed for the template:
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
    "follow_up_questions": [...],
    "required_placements": {
      "planets": ["Venus", "Mars", "Moon"],
      "houses": [5, 7],
      "dashas": ["current"]
    }
  }
}
```

#### Bulk Job Creation
```bash
POST /api/queue/jobs/from-template/bulk
```

Body:
```json
{
  "jobs": [
    {
      "template_id": "love-relationships-blueprint",
      "user_data": {...}
    },
    {
      "template_id": "career-purpose-blueprint",
      "user_data": {...}
    }
  ]
}
```

## Template Schema

### Structure

```javascript
{
  // Core identification
  id: String,
  name: String,
  slug: String,
  version: String,

  // Type and category
  type: String,  // love, money, career, health, spiritual, general
  category: String,  // blueprint, report, analysis, guide
  description: String,

  // Content structure
  structure: {
    title_pattern: String,
    word_count: Number,
    sections: [
      {
        heading: String,
        purpose: String,
        word_count: Number,
        key_placements: [String],
        points_to_cover: [String],
        questions_to_answer: [String]
      }
    ]
  },

  // Follow-up questions
  follow_up_questions: [
    {
      id: String,
      question: String,
      type: String,  // single_choice, multiple_choice, text, scale
      options: [String],
      required: Boolean,
      weight: Number,
      purpose: String
    }
  ],

  // Context data
  context_data: {
    required_placements: {
      planets: [String],
      houses: [Number],
      aspects: [String],
      dashas: [String]
    },
    user_preferences: {
      tone: String,  // direct, gentle, balanced, spiritual
      focus: String,  // practical, spiritual, balanced
      timeframe: String  // immediate, long-term, both
    },
    reading_params: {
      include_remedies: Boolean,
      include_timing: Boolean,
      include_examples: Boolean
    }
  },

  // Metadata
  metadata: {
    created_at: Date,
    updated_at: Date,
    tags: [String],
    usage_count: Number,
    is_active: Boolean
  }
}
```

## Usage Examples

### Example 1: Create Love Blueprint Job

```javascript
const response = await fetch('http://localhost:8000/api/queue/jobs/from-template', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-api-key'
  },
  body: JSON.stringify({
    template_id: 'love-relationships-blueprint',
    user_data: {
      project_id: 'user-7PZmV9Oa1cOBoQs6NeoTfYtcujz1',
      user_question: 'Should I have kids?',
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
          1: { sign: 'Leo', degree: 0 },
          5: { sign: 'Sagittarius', degree: 15 },
          7: { sign: 'Aquarius', degree: 0 }
        }
      },
      follow_up_answers: {
        'current-relationship-status': 'Single',
        'relationship-priority': 'Emotional connection'
      },
      preferences: {
        tone: 'compassionate',
        focus: 'practical'
      }
    }
  })
});

const result = await response.json();
console.log('Job created:', result.job_id);
```

### Example 2: Custom Template Builder

```javascript
const { TemplateBuilder } = require('./src/templateSchema');

const template = new TemplateBuilder()
  .setName('Children & Family Blueprint')
  .setType('custom')
  .setDescription('Analysis of family life and children')
  .setWordCount(1500)
  .addSection({
    heading: 'Family Overview',
    purpose: 'Understand family dynamics',
    word_count: 300,
    key_placements: ['Jupiter', '5th house', 'Moon'],
    points_to_cover: [
      'Family background',
      'Children potential',
      'Family relationships'
    ],
    questions_to_answer: [
      'What does your chart say about children?',
      'How is family life indicated?'
    ]
  })
  .addFollowUpQuestion({
    question: 'Do you have children?',
    type: 'single_choice',
    options: ['Yes', 'No', 'Planning'],
    required: true,
    weight: 10,
    purpose: 'Tailor family advice'
  })
  .setRequiredPlacements({
    planets: ['Jupiter', 'Moon'],
    houses: [4, 5]
  })
  .addTag('family')
  .addTag('children')
  .build();

// Save via API
await fetch('http://localhost:8000/api/templates', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-api-key'
  },
  body: JSON.stringify(template)
});
```

### Example 3: List and Filter Templates

```javascript
// Get all love templates
const loveTemplates = await fetch(
  'http://localhost:8000/api/templates?type=love',
  {
    headers: { 'X-API-Key': 'your-api-key' }
  }
).then(r => r.json());

console.log(`Found ${loveTemplates.count} love templates`);

// Get most used templates
const sortedTemplates = loveTemplates.templates
  .sort((a, b) => b.usage_count - a.usage_count);

console.log('Most used:', sortedTemplates[0].name);
```

## Best Practices

### 1. Template Design

- **Clear sections**: Each section should have a specific purpose
- **Appropriate word counts**: Balance detail with brevity
- **Key placements**: Specify exactly which astrological factors to reference
- **Follow-up questions**: Ask questions that genuinely improve the reading

### 2. Follow-up Questions

- Keep questions focused and relevant
- Use appropriate question types (single_choice, multiple_choice, text)
- Set realistic weights (1-10) based on importance
- Include purpose to explain why you're asking

### 3. Context Data

- Specify required placements clearly
- Set user preferences that match the template type
- Enable/disable reading parameters appropriately

### 4. Job Creation

- Always validate user data before submission
- Include comprehensive swiss_data
- Provide follow-up answers when available
- Set appropriate priorities and timeouts

## Integration with Birthstar

For Birthstar integration:

```javascript
// 1. Get template requirements
const requirements = await fetch(
  `http://localhost:8000/api/queue/templates/love-relationships-blueprint/requirements`,
  { headers: { 'X-API-Key': api_key } }
).then(r => r.json());

// 2. Present follow-up questions to user
const answers = await presentQuestionsToUser(requirements.follow_up_questions);

// 3. Create job with template
const job = await fetch(
  'http://localhost:8000/api/queue/jobs/from-template',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': api_key
    },
    body: JSON.stringify({
      template_id: 'love-relationships-blueprint',
      user_data: {
        project_id: userId,
        user_question: userQuestion,
        user_info: userBirthData,
        swiss_data: swissEphemerisData,
        follow_up_answers: answers
      }
    })
  }
).then(r => r.json());

// 4. Monitor job status
const status = await fetch(
  `http://localhost:8000/api/queue/jobs/${job.job_id}`,
  { headers: { 'X-API-Key': api_key } }
).then(r => r.json());
```

## Troubleshooting

### Template not found
- Check template ID or slug is correct
- Ensure template is active (`is_active: true`)
- Verify template file exists in `data/templates/`

### Validation errors
- Ensure all required fields are present
- Check data types match schema
- Validate swiss_data structure

### Job creation fails
- Verify API key is valid
- Check project_id exists
- Ensure swiss_data includes required placements
- Review queue manager logs

## Migration from Old System

To migrate from the old blueprint system:

1. **Export existing templates** to the new schema
2. **Add follow-up questions** based on common user needs
3. **Define context data** for each template type
4. **Update job creation** to use new endpoints
5. **Test thoroughly** with sample data

## Files Reference

- **Schema**: `src/templateSchema.js`
- **API Routes**: `routes/templates.js`
- **Dashboard**: `templates/template-dashboard.html`
- **Job Integration**: `src/templateJobIntegration.js`
- **Queue Routes**: `routes/queue.js` (template endpoints added)
- **Seed Data**: `src/seedTemplates.js`

## Support

For issues or questions:
- Check logs in `api-server/logs/`
- Review error messages carefully
- Test with curl/Postman first
- Verify data structure matches schema

---

**Version**: 1.0.0
**Last Updated**: 2024
**Maintained by**: API Server Team
