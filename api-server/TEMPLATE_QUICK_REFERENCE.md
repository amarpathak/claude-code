# Template System Quick Reference

## 🚀 Quick Start (30 seconds)

```javascript
// 1. Create job from template
const response = await fetch('${API_BASE}/api/queue/jobs/from-template', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': YOUR_API_KEY
  },
  body: JSON.stringify({
    template_id: 'love-relationships-blueprint',
    user_data: {
      project_id: 'user-123',
      user_question: 'Should I have kids?',
      swiss_data: { /* birth chart data */ }
    }
  })
});

const { job_id } = await response.json();

// 2. Get result
const job = await fetch(`${API_BASE}/api/queue/jobs/${job_id}`, {
  headers: { 'X-API-Key': YOUR_API_KEY }
}).then(r => r.json());
```

---

## 📋 Available Templates

| ID | Type | Description |
|----|------|-------------|
| `love-relationships-blueprint` | Love | Romance, partnerships, marriage timing |
| `career-purpose-blueprint` | Career | Professional path, life purpose |
| `money-wealth-blueprint` | Money | Financial opportunities, wealth timing |
| `health-wellness-blueprint` | Health | Physical/mental health, vitality |
| `spiritual-path-blueprint` | Spiritual | Soul purpose, spiritual growth |
| `complete-life-blueprint` | General | All areas of life |

---

## 🔑 API Endpoints

### Jobs
```bash
# Create job from template
POST /api/queue/jobs/from-template

# Bulk create
POST /api/queue/jobs/from-template/bulk

# Get job status
GET /api/queue/jobs/:jobId

# Get template requirements
GET /api/queue/templates/:templateId/requirements
```

### Templates
```bash
# List templates
GET /api/templates?type=love&active_only=true

# Get template
GET /api/templates/:id

# Create/update/delete template
POST /api/templates
PUT /api/templates/:id
DELETE /api/templates/:id
```

---

## 💾 Required Data Structure

```javascript
{
  template_id: 'love-relationships-blueprint',
  user_data: {
    // REQUIRED
    project_id: 'user-id',
    swiss_data: {
      planets: { sun: {...}, moon: {...}, venus: {...} },
      houses: { 1: {...}, 5: {...}, 7: {...} },
      dashas: { current: {...} }
    },

    // OPTIONAL (but recommended)
    user_question: 'Should I have children?',
    user_info: {
      name: 'Name',
      birth_date: '1995-07-02',
      birth_time: '06:50',
      birth_place: 'Gaya, Bihar, India'
    },
    follow_up_answers: {
      'question-id-1': 'Answer 1',
      'question-id-2': 'Answer 2'
    },
    preferences: {
      tone: 'compassionate',      // direct, gentle, balanced, spiritual
      focus: 'practical',         // practical, spiritual, balanced
      timeframe: 'both'           // immediate, long-term, both
    }
  },
  options: {
    priority: 'high',    // low, normal, high
    timeout: 300000      // milliseconds
  }
}
```

---

## 🎨 Customization Options

### Tone
- `direct` - Straightforward, no sugar-coating
- `gentle` - Soft, nurturing approach
- `balanced` - Mix of direct and gentle
- `compassionate` - Empathetic and understanding
- `spiritual` - Mystical, soul-focused

### Focus
- `practical` - Actionable steps, real-world advice
- `spiritual` - Higher purpose, soul lessons
- `psychological` - Inner patterns, emotional growth
- `balanced` - Mix of practical and spiritual
- `technical` - Detailed astrological analysis

### Timeframe
- `immediate` - Current situation, next 6 months
- `short-term` - Next 1-2 years
- `long-term` - 3-5 years ahead
- `both` - Mix of short and long-term
- `life-span` - Entire life trajectory

---

## 📊 Response Format

### Job Creation Response
```json
{
  "success": true,
  "job_id": "job-uuid-123",
  "template_id": "love-relationships-blueprint",
  "message": "Job created from template successfully"
}
```

### Job Status Response
```json
{
  "success": true,
  "job": {
    "id": "job-uuid-123",
    "status": "completed",     // pending, processing, completed, failed
    "result": {
      "output": "{\"title\":\"...\", \"summary\":\"...\", \"content\":\"...\"}",
      "execution_time": 45000
    },
    "metadata": {
      "template_id": "love-relationships-blueprint",
      "template_name": "Love & Relationships Blueprint"
    }
  }
}
```

### Template Requirements Response
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
        "id": "uuid",
        "question": "What is your current relationship status?",
        "type": "single_choice",
        "options": ["Single", "Dating", "Committed"],
        "required": true
      }
    ],
    "required_placements": {
      "planets": ["Venus", "Mars", "Moon"],
      "houses": [5, 7]
    }
  }
}
```

---

## ⚡ Common Patterns

### Pattern 1: Simple Job
```javascript
const { job_id } = await fetch('/api/queue/jobs/from-template', {
  method: 'POST',
  headers: { 'X-API-Key': API_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    template_id: 'love-relationships-blueprint',
    user_data: { project_id, swiss_data }
  })
}).then(r => r.json());
```

### Pattern 2: With Follow-up Questions
```javascript
// 1. Get requirements
const { requirements } = await fetch(
  `/api/queue/templates/${templateId}/requirements`,
  { headers: { 'X-API-Key': API_KEY } }
).then(r => r.json());

// 2. Present questions to user
const answers = await showQuestionsInUI(requirements.follow_up_questions);

// 3. Create job with answers
const { job_id } = await fetch('/api/queue/jobs/from-template', {
  method: 'POST',
  headers: { 'X-API-Key': API_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    template_id: templateId,
    user_data: { project_id, swiss_data, follow_up_answers: answers }
  })
}).then(r => r.json());
```

### Pattern 3: Bulk Creation
```javascript
const jobs = templates.map(t => ({
  template_id: t.id,
  user_data: { project_id, swiss_data, user_question: t.question }
}));

const result = await fetch('/api/queue/jobs/from-template/bulk', {
  method: 'POST',
  headers: { 'X-API-Key': API_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({ jobs })
}).then(r => r.json());

console.log(`Created ${result.created}, Failed ${result.failed}`);
```

### Pattern 4: Wait for Completion
```javascript
async function waitForJob(jobId) {
  while (true) {
    const { job } = await fetch(`/api/queue/jobs/${jobId}`, {
      headers: { 'X-API-Key': API_KEY }
    }).then(r => r.json());

    if (job.status === 'completed') return JSON.parse(job.result.output);
    if (job.status === 'failed') throw new Error(job.error);

    await new Promise(r => setTimeout(r, 2000)); // Wait 2s
  }
}
```

---

## 🔧 Environment Variables

```bash
# API Configuration
API_BASE=https://api-server-2dlji6qpk-amarpathaks-projects.vercel.app
API_KEY=your-api-key-here

# Or local development
API_BASE=http://localhost:8001
API_KEY=admin
```

---

## ❌ Error Codes

| Status | Meaning | Solution |
|--------|---------|----------|
| 400 | Invalid data | Check required fields (swiss_data, project_id) |
| 401 | Unauthorized | Verify API key is correct |
| 404 | Template not found | Check template ID spelling |
| 500 | Server error | Contact API team |

---

## 📱 Dashboard Access

**URL:** `http://localhost:8001/templates/dashboard`

Features:
- View all templates
- Create/edit/duplicate templates
- See usage statistics
- Filter by type/category
- Manage follow-up questions

---

## 🎯 Best Practices

✅ **DO:**
- Always provide complete swiss_data
- Include follow-up answers when available
- Use appropriate preferences (tone, focus)
- Handle errors gracefully
- Monitor job status properly

❌ **DON'T:**
- Skip follow-up questions
- Use incomplete birth data
- Ignore error responses
- Hardcode template IDs (fetch from API)
- Create jobs without validation

---

## 🆘 Quick Help

**Template not working?**
```bash
# Check template exists
curl -H "X-API-Key: YOUR_KEY" \
  "${API_BASE}/api/templates/love-relationships-blueprint"

# Check requirements
curl -H "X-API-Key: YOUR_KEY" \
  "${API_BASE}/api/queue/templates/love-relationships-blueprint/requirements"
```

**Job stuck?**
```bash
# Check job status
curl -H "X-API-Key: YOUR_KEY" \
  "${API_BASE}/api/queue/jobs/JOB_ID"
```

**Need custom template?**
- Visit dashboard: `/templates/dashboard`
- Or use API: `POST /api/templates`

---

## 📞 Contact

- **Docs:** `BIRTHSTAR_TEMPLATE_INTEGRATION.md` (full guide)
- **Examples:** `examples/template-usage-example.js`
- **Support:** api@birthstar.com

---

Last updated: November 25, 2024
