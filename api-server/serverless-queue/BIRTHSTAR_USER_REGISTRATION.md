# Birthstar User Registration & Blueprint Generation

## Architecture Overview

The system consists of two components:

1. **Vercel API** (`https://serverless-queue.vercel.app`) - Job queue manager
2. **Local Worker** (Mac server) - Processes jobs and generates blueprints

**Data Flow:**
```
Client → Vercel API → Firestore Queue → Local Worker → Generate Files
```

All user folders and generated files are stored on the local worker machine, ensuring persistence across sessions.

---

## 1. User Registration

### Endpoint
```
POST https://serverless-queue.vercel.app/users/:userId
```

### Purpose
Register a new user once during onboarding. This queues a job that creates:
- User project folder
- `user-info.json` (birth details)
- `swiss-data.json` (planetary positions, houses, aspects)
- `CLAUDE.md` (astrological context for AI)
- Personalized blueprint templates

### Request Body
```json
{
  "user_info": {
    "name": "John Doe",
    "email": "john@example.com",
    "birth_date": "1990-01-15",
    "birth_time": "14:30",
    "birth_place": "New York, NY",
    "timezone": "America/New_York"
  },
  "swiss_data": {
    "planets": {
      "sun": { "sign": "Capricorn", "degree": 24.5, "house": 3 },
      "moon": { "sign": "Pisces", "degree": 12.3, "house": 5 },
      "mercury": { "sign": "Capricorn", "degree": 18.2, "house": 3 },
      "venus": { "sign": "Sagittarius", "degree": 5.8, "house": 2 },
      "mars": { "sign": "Aries", "degree": 22.1, "house": 6 }
    },
    "houses": {
      "1": { "sign": "Scorpio", "degree": 15.2 },
      "2": { "sign": "Sagittarius", "degree": 10.5 },
      "3": { "sign": "Capricorn", "degree": 8.3 }
    },
    "aspects": [
      { "planet1": "sun", "planet2": "moon", "type": "trine", "orb": 2.1 },
      { "planet1": "venus", "planet2": "mars", "type": "square", "orb": 1.5 }
    ]
  },
  "templates": {
    "custom-template": {
      "title": "Custom Blueprint",
      "sections": ["intro", "analysis", "guidance"]
    }
  },
  "campaign_seed": {
    "campaign_name": "career-transition-2025",
    "prompt": "Based on the user's birth chart, generate a comprehensive career transition roadmap. Include: 1) Current career energy analysis, 2) Optimal timing for career moves in next 6 months, 3) Industries aligned with their chart, 4) Action steps for the transition. Write in an inspiring, actionable tone."
  }
}
```

**Optional `campaign_seed` field:**
- Use this to pre-generate campaign-specific content during registration
- Claude Code runs with the seed prompt and saves output to `REGISTRATION.md`
- User sees this content immediately on dashboard
- Perfect for campaigns like "Career Transition", "Relationship Readiness", "2025 Planning", etc.

### Response
```json
{
  "success": true,
  "job_id": "job_1764068324954_j40eo0aiq",
  "user_id": "qohG4KR8mtTtxeJkE0BHxS2pygr1",
  "message": "User registration job queued. Worker will create folder and setup project.",
  "status_url": "/jobs/job_1764068324954_j40eo0aiq"
}
```

### Example (cURL)
```bash
curl -X POST https://serverless-queue.vercel.app/users/qohG4KR8mtTtxeJkE0BHxS2pygr1 \
  -H "Content-Type: application/json" \
  -d '{
    "user_info": {
      "name": "John Doe",
      "birth_date": "1990-01-15",
      "birth_time": "14:30",
      "birth_place": "New York, NY"
    },
    "swiss_data": {
      "planets": {
        "sun": { "sign": "Capricorn", "degree": 24.5, "house": 3 }
      }
    }
  }'
```

### Example (JavaScript/Fetch)
```javascript
async function registerUser(userId, userInfo, swissData) {
  const response = await fetch(`https://serverless-queue.vercel.app/users/${userId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_info: userInfo,
      swiss_data: swissData
    })
  });

  const result = await response.json();
  console.log('Registration job queued:', result.job_id);
  return result;
}
```

---

## 2. Generate Blueprint

### Endpoint
```
POST https://serverless-queue.vercel.app/jobs
```

### Purpose
Generate a personalized astrological blueprint (e.g., "About You", "Career Path", "Relationships").

### Request Body
```json
{
  "user_id": "qohG4KR8mtTtxeJkE0BHxS2pygr1",
  "project_id": "qohG4KR8mtTtxeJkE0BHxS2pygr1",
  "prompt": "Generate personalized 'About You' insights for user based on their birth chart.",
  "blueprint_type": "about-you",
  "priority": 8,
  "timeout": 300,
  "save_data": false
}
```

### Blueprint Types Available
- `about-you` - Core personality insights
- `career` - Career guidance
- `relationships` - Relationship patterns
- `life-path` - Life purpose & direction
- `strengths` - Natural talents & strengths
- `challenges` - Growth opportunities

### Response
```json
{
  "success": true,
  "job": {
    "id": "job_1764068324954_xyz",
    "status": "queued",
    "user_id": "qohG4KR8mtTtxeJkE0BHxS2pygr1",
    "created_at": "2025-11-25T10:58:44.954Z"
  }
}
```

### Example (JavaScript)
```javascript
async function generateBlueprint(userId, blueprintType, customPrompt) {
  const response = await fetch('https://serverless-queue.vercel.app/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      project_id: userId,
      prompt: customPrompt || `Generate ${blueprintType} blueprint for user.`,
      blueprint_type: blueprintType,
      priority: 8,
      timeout: 300
    })
  });

  const result = await response.json();
  return result.job.id;
}
```

---

## 3. Campaign Seeds (Pre-Generated Content)

### Overview
Campaign seeds allow you to pre-generate personalized content during user registration. When a user signs up through a specific campaign (e.g., "Career Transition 2025"), they immediately see relevant content on their dashboard instead of an empty profile.

### How It Works
1. Pass `campaign_seed` in registration request
2. Worker creates folder structure + runs Claude Code with seed prompt
3. Output saved to `REGISTRATION.md` in user's folder
4. User lands on dashboard → sees pre-generated content immediately
5. Can still generate additional blueprints later

### Campaign Seed Examples

**Career Transition Campaign:**
```json
{
  "campaign_seed": {
    "campaign_name": "career-transition-2025",
    "prompt": "Based on the user's birth chart, generate a comprehensive career transition roadmap. Include: 1) Current career energy analysis, 2) Optimal timing for career moves in next 6 months, 3) Industries aligned with their chart, 4) Action steps for the transition. Write in an inspiring, actionable tone."
  }
}
```

**Relationship Readiness Campaign:**
```json
{
  "campaign_seed": {
    "campaign_name": "relationship-readiness",
    "prompt": "Analyze the user's birth chart for relationship readiness. Include: 1) Current relationship energy and patterns, 2) Venus and 7th house analysis, 3) Best timing for dating/partnerships in next 3 months, 4) Green flags to look for in partners, 5) Personal growth areas. Make it warm and encouraging."
  }
}
```

**2025 Year Ahead Campaign:**
```json
{
  "campaign_seed": {
    "campaign_name": "2025-year-ahead",
    "prompt": "Generate a personalized 2025 year-ahead forecast based on the birth chart. Include: 1) Overall themes for 2025, 2) Month-by-month highlights, 3) Key opportunities and challenges, 4) Best months for career, relationships, and personal growth, 5) Actionable advice. Write in an optimistic, empowering tone."
  }
}
```

**New Business Launch Campaign:**
```json
{
  "campaign_seed": {
    "campaign_name": "launch-your-business",
    "prompt": "Create a business launch blueprint based on the birth chart. Include: 1) Natural business strengths from chart, 2) Optimal business types/industries, 3) Best launch timing in next 90 days, 4) Partnership vs solo analysis, 5) Marketing style aligned with chart. Be practical and motivating."
  }
}
```

### Registration with Campaign Seed (Full Example)
```javascript
const response = await fetch('https://serverless-queue.vercel.app/users/user123', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_info: {
      name: 'Sarah Chen',
      birth_date: '1992-06-15',
      birth_time: '09:30',
      birth_place: 'San Francisco, CA'
    },
    swiss_data: {
      planets: { /* ... */ },
      houses: { /* ... */ },
      aspects: [ /* ... */ ]
    },
    campaign_seed: {
      campaign_name: 'career-transition-2025',
      prompt: 'Generate comprehensive career transition roadmap...'
    }
  })
});

const { job_id } = await response.json();

// Poll for completion
let job;
do {
  await sleep(3000);
  const statusRes = await fetch(`https://serverless-queue.vercel.app/jobs/${job_id}`);
  job = (await statusRes.json()).job;
} while (job.status !== 'completed' && job.status !== 'failed');

// Registration complete - user folder now contains REGISTRATION.md
console.log('User registered with campaign seed');
console.log('REGISTRATION.md created with personalized content');
```

### Accessing Campaign Seed Content

After registration completes, the seed content is available in:
- **File:** `data/projects/:userId/REGISTRATION.md`
- **Metadata:** `data/projects/:userId/.claude/registration-meta.json`

You can fetch this via your file serving endpoint:
```javascript
const registrationContent = await fetch(
  `https://api.example.com/files/:userId/REGISTRATION.md`
);
```

### Campaign Seed vs Regular Blueprints

| Feature | Campaign Seed | Regular Blueprint |
|---------|---------------|-------------------|
| When generated | During registration | On-demand after registration |
| Saved to | `REGISTRATION.md` | `reports/blueprint-name-{timestamp}.md` |
| Purpose | Initial dashboard content | Additional detailed reports |
| Customization | Per campaign | Per blueprint type |
| User sees | Immediately on first login | After requesting specific blueprint |

---

## 4. Check Job Status

### Endpoint
```
GET https://serverless-queue.vercel.app/jobs/:jobId
```

### Response (Queued)
```json
{
  "success": true,
  "job": {
    "id": "job_1764068324954_xyz",
    "status": "queued",
    "user_id": "qohG4KR8mtTtxeJkE0BHxS2pygr1",
    "created_at": "2025-11-25T10:58:44.954Z"
  }
}
```

### Response (Completed)
```json
{
  "success": true,
  "job": {
    "id": "job_1764068324954_xyz",
    "status": "completed",
    "user_id": "qohG4KR8mtTtxeJkE0BHxS2pygr1",
    "output": "# About You\n\nYour birth chart reveals...",
    "files": [
      {
        "name": "about-you-report.md",
        "path": "reports/about-you-report.md",
        "size": 15234,
        "url": "https://api.example.com/files/qohG4KR8mtTtxeJkE0BHxS2pygr1/reports/about-you-report.md"
      }
    ],
    "completed_at": "2025-11-25T10:59:31.622Z",
    "execution_time": 39.327
  }
}
```

### Polling Example
```javascript
async function waitForJobCompletion(jobId, maxWaitSeconds = 120) {
  const startTime = Date.now();

  while ((Date.now() - startTime) < maxWaitSeconds * 1000) {
    const response = await fetch(`https://serverless-queue.vercel.app/jobs/${jobId}`);
    const result = await response.json();

    if (result.job.status === 'completed') {
      return result.job;
    }

    if (result.job.status === 'failed') {
      throw new Error(`Job failed: ${result.job.error}`);
    }

    // Wait 2 seconds before next check
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  throw new Error('Job timeout');
}
```

---

## 4. Webhook Support (Optional)

Instead of polling, you can provide a webhook URL that will be called when the job completes.

### Request with Webhook
```json
{
  "user_id": "qohG4KR8mtTtxeJkE0BHxS2pygr1",
  "project_id": "qohG4KR8mtTtxeJkE0BHxS2pygr1",
  "prompt": "Generate about-you blueprint",
  "blueprint_type": "about-you",
  "webhook_url": "https://birthstar.app/api/job-completed"
}
```

### Webhook Payload (POST to your URL)
```json
{
  "job_id": "job_1764068324954_xyz",
  "status": "completed",
  "user_id": "qohG4KR8mtTtxeJkE0BHxS2pygr1",
  "output": "# About You\n\n...",
  "files": [...],
  "execution_time": 39.327,
  "completed_at": "2025-11-25T10:59:31.622Z"
}
```

---

## 5. User Folder Structure

When a user is registered, the worker creates this structure:

```
data/projects/qohG4KR8mtTtxeJkE0BHxS2pygr1/
├── REGISTRATION.md              # Campaign seed content (if provided)
├── .claude/
│   ├── config.json              # Project metadata
│   ├── history.jsonl            # Job execution history
│   ├── CLAUDE.md                # Astrological context for AI
│   ├── registration-meta.json   # Campaign seed metadata
│   ├── profile-data/
│   │   ├── user-info.json       # Birth details
│   │   └── swiss-data.json      # Planetary positions
│   └── templates/
│       └── blueprint.template   # Personalized template
├── profile/
│   ├── user-info.json           # Copy for Claude access
│   └── swiss-data.json          # Copy for Claude access
└── reports/
    └── about-you-1732547931.md  # Generated blueprints
```

**Key Files:**
- `REGISTRATION.md` - Pre-generated campaign seed content (only if campaign_seed was provided during registration)
- `.claude/registration-meta.json` - Metadata about the campaign (name, timestamp, prompt used)
- `reports/` - On-demand generated blueprints

---

## 6. Complete Integration Example

```javascript
class BirthstarQueueClient {
  constructor(apiUrl = 'https://serverless-queue.vercel.app') {
    this.apiUrl = apiUrl;
  }

  // Step 1: Register user (call once during onboarding)
  async registerUser(userId, userInfo, swissData, campaignSeed = null) {
    const response = await fetch(`${this.apiUrl}/users/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_info: userInfo,
        swiss_data: swissData,
        campaign_seed: campaignSeed
      })
    });
    return await response.json();
  }

  // Step 2: Generate blueprint
  async generateBlueprint(userId, blueprintType, customPrompt) {
    const response = await fetch(`${this.apiUrl}/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        project_id: userId,
        prompt: customPrompt || `Generate ${blueprintType} blueprint`,
        blueprint_type: blueprintType,
        priority: 8
      })
    });
    const result = await response.json();
    return result.job.id;
  }

  // Step 3: Wait for completion
  async waitForJob(jobId, maxWaitSeconds = 120) {
    const startTime = Date.now();

    while ((Date.now() - startTime) < maxWaitSeconds * 1000) {
      const response = await fetch(`${this.apiUrl}/jobs/${jobId}`);
      const result = await response.json();

      if (result.job.status === 'completed') {
        return result.job;
      }

      if (result.job.status === 'failed') {
        throw new Error(result.job.error || 'Job failed');
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error('Job timeout');
  }

  // All-in-one: Register and generate first blueprint
  async registerAndGenerateBlueprint(userId, userInfo, swissData, blueprintType) {
    // Register user
    console.log('Registering user...');
    const regResult = await this.registerUser(userId, userInfo, swissData);
    console.log('Registration job:', regResult.job_id);

    // Wait for registration to complete
    await this.waitForJob(regResult.job_id);
    console.log('User registered successfully');

    // Generate blueprint
    console.log('Generating blueprint...');
    const jobId = await this.generateBlueprint(userId, blueprintType);
    const job = await this.waitForJob(jobId);

    console.log('Blueprint generated:', job.output);
    return job;
  }
}

// Usage Example 1: Standard Registration (no campaign)
const client = new BirthstarQueueClient();

await client.registerUser('user123', {
  name: 'John Doe',
  birth_date: '1990-01-15',
  birth_time: '14:30',
  birth_place: 'New York, NY'
}, swissDataFromCalculation);

// Generate blueprints on-demand
const aboutYouJobId = await client.generateBlueprint('user123', 'about-you');
const aboutYouJob = await client.waitForJob(aboutYouJobId);
console.log('About You report:', aboutYouJob.output);

// Usage Example 2: Campaign Registration with Pre-Generated Content
const campaignSeed = {
  campaign_name: 'career-transition-2025',
  prompt: 'Based on the user\'s birth chart, generate a comprehensive career transition roadmap. Include: 1) Current career energy analysis, 2) Optimal timing for career moves in next 6 months, 3) Industries aligned with their chart, 4) Action steps for the transition. Write in an inspiring, actionable tone.'
};

const regResult = await client.registerUser('user456', {
  name: 'Sarah Chen',
  birth_date: '1992-06-15',
  birth_time: '09:30',
  birth_place: 'San Francisco, CA'
}, swissDataFromCalculation, campaignSeed);

// Wait for registration (includes seed generation)
const regJob = await client.waitForJob(regResult.job_id);
console.log('Registration complete - REGISTRATION.md created');

// User now has pre-generated content immediately available
// Can still generate additional blueprints later:
const relationshipsJobId = await client.generateBlueprint('user456', 'relationships');
```

---

## 7. Important Notes

### Authentication
Currently, the API uses an API key set via environment variable. Add this header to all requests:
```javascript
headers: {
  'Authorization': `Bearer ${SERVER_API_KEY}`
}
```

### Rate Limits
- Worker processes max 3 concurrent jobs
- Jobs are queued if worker is busy
- Average blueprint generation: 30-45 seconds

### Data Persistence
- ✅ User folders persist on worker machine
- ✅ Swiss data saved once, reused for all blueprints
- ✅ Templates are reusable
- ❌ Firestore only stores job queue (temporary)

### Best Practices
1. **Register users once** - Call `/users/:userId` only during onboarding
2. **Reuse user_id** - Use same Firebase Auth UID for all blueprint jobs
3. **Poll job status** - Check every 2-5 seconds, don't overwhelm the API
4. **Use webhooks** - Better than polling for production
5. **Campaign seeds** - Use for marketing campaigns to give users immediate value
   - Registration with campaign seed takes ~40-60 seconds (includes content generation)
   - Registration without campaign seed takes ~2-5 seconds (just folder setup)
   - `REGISTRATION.md` is perfect for dashboard hero content

---

## 8. Environment Variables

If running your own worker, set these:

```bash
# Firestore credentials
FIRESTORE_PROJECT_ID=birthstar-xyz
FIRESTORE_CREDENTIALS="{...json...}"

# Worker settings
POLL_INTERVAL_MS=5000
MAX_CONCURRENT_JOBS=3
CLAUDE_CODE_PATH=claude
PROJECT_MANAGER_PATH=../src

# API settings
SERVER_API_KEY=birthstar_97f303e8e6e6fd78ab675d107b67538c260e3dd8719409143e2f4422311eed2e
```

---

## Support

For issues or questions, contact the API team or check logs at:
- Worker logs: `/serverless-queue/logs/`
- Firestore jobs: `https://console.firebase.google.com`
