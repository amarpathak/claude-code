# 🚀 Deploy Template System - Step by Step

## 🎯 What We're Deploying

New template management system with:
- 6 pre-built templates
- Template-based job creation endpoints
- Follow-up questions support
- Visual dashboard

---

## ⚡ Quick Deploy (2 Minutes)

### Step 1: Commit Changes

```bash
cd /Users/amarpathak/claude-code/api-server

# Add all new files
git add \
  src/templateSchema.js \
  src/templateJobIntegration.js \
  src/seedTemplates.js \
  routes/templates.js \
  templates/template-dashboard.html \
  data/templates/*.json \
  BIRTHSTAR*.md \
  TEMPLATE*.md \
  examples/birthstar-integration-example.js \
  TROUBLESHOOTING_404.md

# Commit
git commit -m "feat: add enhanced template management system

- Add template schema with rich metadata
- Add template-based job creation
- Add 6 pre-built templates (love, career, money, health, spiritual, general)
- Add follow-up questions support
- Add visual dashboard for template management
- Add integration docs for Birthstar team"
```

### Step 2: Deploy to Vercel

```bash
# Deploy to production
vercel --prod

# Wait for deployment (30-60 seconds)
# Copy the production URL when done
```

### Step 3: Seed Templates on Production

After deployment, seed the templates:

```bash
# Option A: Via curl (if you have a seed endpoint)
curl -X POST https://your-new-url.vercel.app/api/seed-templates \
  -H "X-API-Key: your-admin-key"

# Option B: Via Vercel CLI
vercel env add SEED_TEMPLATES
# Value: true

# Then redeploy
vercel --prod
```

### Step 4: Verify Deployment

```bash
# Test health check
curl https://your-new-url.vercel.app/health

# Test templates endpoint
curl -H "X-API-Key: your-key" \
  https://your-new-url.vercel.app/api/templates

# Should return 6 templates
```

---

## 📋 Detailed Deployment Steps

### Before Deployment

#### 1. Verify Files Locally

```bash
# Check all files exist
ls -la src/templateSchema.js
ls -la src/templateJobIntegration.js
ls -la routes/templates.js
ls -la data/templates/

# Run tests locally
node examples/birthstar-integration-example.js 1
```

#### 2. Check Server Configuration

Verify `server.js` has these routes registered:

```javascript
// Template routes (line ~364)
app.use('/api/templates', authMiddleware.verifyApiKey, templateRoutes);

// Queue routes (line ~392)
app.use('/api/queue', authMiddleware.verifyApiKey, queueRoutes.router);

// Dashboard route (line ~375)
app.get('/templates/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'templates', 'template-dashboard.html'));
});
```

#### 3. Test Locally First

```bash
# Start local server
PORT=8001 node server.js

# In another terminal, test endpoints
curl -H "X-API-Key: admin" http://localhost:8001/api/templates
curl -X POST http://localhost:8001/api/queue/jobs/from-template \
  -H "Content-Type: application/json" \
  -H "X-API-Key: admin" \
  -d '{"template_id":"love-relationships-blueprint","user_data":{"project_id":"test","swiss_data":{"planets":{"sun":{"sign":"Cancer","degree":15,"house":12}},"houses":{"1":{"sign":"Leo","degree":0}}}}}'

# Should return job_id, not 404
```

### Deployment

#### 1. Check Git Status

```bash
git status

# Should show new/modified files:
# - src/templateSchema.js
# - src/templateJobIntegration.js
# - src/seedTemplates.js
# - routes/templates.js
# - templates/template-dashboard.html
# - data/templates/*.json
# - Updated server.js
# - Updated routes/queue.js
# - Documentation files
```

#### 2. Commit Changes

```bash
# Stage all changes
git add -A

# Commit with descriptive message
git commit -m "feat: add template management system

Features:
- Enhanced template schema with metadata and follow-up questions
- Template-based job creation API
- 6 pre-built blueprint templates
- Visual dashboard for template management
- Integration documentation for Birthstar team
- Usage tracking and analytics

Endpoints:
- POST /api/queue/jobs/from-template
- GET /api/templates
- GET /templates/dashboard

Docs:
- BIRTHSTAR_TEMPLATE_INTEGRATION.md
- TEMPLATE_QUICK_REFERENCE.md
- TROUBLESHOOTING_404.md"
```

#### 3. Push to Repository

```bash
# Push to main branch
git push origin main

# Or push to your deployment branch
git push origin your-branch
```

#### 4. Deploy to Vercel

```bash
# Deploy to production
vercel --prod

# Vercel will show:
# ✓ Deployed to production URL
# Copy this URL for testing
```

#### 5. Check Deployment Status

```bash
# View deployment logs
vercel logs

# Or visit Vercel dashboard
# https://vercel.com/dashboard
```

### After Deployment

#### 1. Verify Deployment

```bash
export PROD_URL="https://your-new-deployment.vercel.app"
export API_KEY="your-production-api-key"

# Test health
curl $PROD_URL/health

# Test templates
curl -H "X-API-Key: $API_KEY" $PROD_URL/api/templates

# Test dashboard (in browser)
open $PROD_URL/templates/dashboard
```

#### 2. Seed Templates

If templates aren't showing (count: 0), seed them:

**Option A: Run seed script on server**

If you have SSH/shell access:
```bash
# SSH to server
ssh your-server

# Run seed
cd /path/to/api-server
node src/seedTemplates.js
```

**Option B: Create seed endpoint** (if not exists)

Add to `server.js`:
```javascript
// Admin seed endpoint
app.post('/api/admin/seed-templates', async (req, res) => {
  const { secret } = req.body;

  if (secret !== config.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { seedTemplates } = require('./src/seedTemplates');
    await seedTemplates();
    res.json({ success: true, message: 'Templates seeded' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

Then call it:
```bash
curl -X POST $PROD_URL/api/admin/seed-templates \
  -H "Content-Type: application/json" \
  -d '{"secret":"your-admin-secret"}'
```

**Option C: Vercel file upload**

Templates are in `data/templates/`. Vercel should include them automatically if they're in the repo.

#### 3. Update API Base in Client Apps

Update Birthstar app to use new URL:

```javascript
// Before
const API_BASE = 'https://old-url.vercel.app';

// After
const API_BASE = 'https://your-new-url.vercel.app';
```

#### 4. Test Full Flow

```bash
# Test template requirements
curl -H "X-API-Key: $API_KEY" \
  $PROD_URL/api/queue/templates/love-relationships-blueprint/requirements

# Test job creation
curl -X POST $PROD_URL/api/queue/jobs/from-template \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "template_id": "love-relationships-blueprint",
    "user_data": {
      "project_id": "test-user-123",
      "swiss_data": {
        "planets": {
          "sun": {"sign": "Cancer", "degree": 15.93, "house": 12},
          "moon": {"sign": "Leo", "degree": 0.88, "house": 2}
        },
        "houses": {
          "1": {"sign": "Leo", "degree": 0}
        }
      }
    }
  }'

# Should return job_id
# {"success":true,"job_id":"..."}
```

---

## 🔍 Verification Checklist

After deployment, verify:

- [ ] Health endpoint returns 200: `/health`
- [ ] Templates endpoint returns 6 templates: `/api/templates`
- [ ] Template requirements endpoint works: `/api/queue/templates/:id/requirements`
- [ ] Job creation endpoint works: `/api/queue/jobs/from-template`
- [ ] Dashboard loads: `/templates/dashboard`
- [ ] Dashboard can list templates (enter API key)
- [ ] Can create job from dashboard
- [ ] Job processes successfully
- [ ] Logs show no errors

---

## 🐛 Troubleshooting Deployment

### Issue: Templates show count 0

**Solution:**
```bash
# Check if data/templates/ is in repo
git ls-files | grep data/templates

# If not, add it
git add data/templates/
git commit -m "feat: add template seed data"
git push
vercel --prod

# Or run seed script manually (see above)
```

### Issue: 404 on template routes

**Solution:**
```bash
# Check routes are registered in server.js
grep -n "app.use.*templates" server.js
grep -n "app.use.*queue" server.js

# Should see routes at lines ~364 and ~392
# If not, add them and redeploy
```

### Issue: Dashboard loads but can't fetch templates

**Solution:**
```bash
# Check CORS settings in server.js
# Should have:
app.use(cors());

# Check authentication
# Try with correct API key
```

### Issue: Vercel build fails

**Solution:**
```bash
# Check Vercel logs
vercel logs

# Common issues:
# - Missing dependencies in package.json
# - Syntax errors in new files
# - Missing environment variables

# Fix and redeploy
git commit --amend
git push --force
vercel --prod
```

---

## 📊 Post-Deployment Tasks

### 1. Update Documentation

Share with Birthstar team:
- New production URL
- Updated API key (if changed)
- Link to dashboard
- Link to documentation

### 2. Monitor Usage

```bash
# Check template usage
curl -H "X-API-Key: $API_KEY" \
  $PROD_URL/api/templates | jq '.templates[] | {name: .name, usage: .usage_count}'
```

### 3. Collect Feedback

- Ask Birthstar team to test with real data
- Monitor error rates
- Track which templates are most used
- Gather feedback on follow-up questions

### 4. Optimize

Based on usage:
- Add more templates for popular use cases
- Refine follow-up questions
- Adjust default preferences
- Create template variants

---

## 🚀 Quick Redeploy

If you need to make changes:

```bash
# Make changes
vim src/templateSchema.js

# Test locally
PORT=8001 node server.js
# Test in another terminal

# Commit and deploy
git add -A
git commit -m "fix: update template schema"
git push
vercel --prod

# Takes 30-60 seconds
```

---

## 📞 Support

**Deployment issues?** Contact:
- Vercel support: https://vercel.com/support
- Internal team: #deployments

**API issues?** Contact:
- API team: api@birthstar.com
- Slack: #api-support

---

## ✅ Success!

You'll know deployment succeeded when:

✅ Vercel shows "Deployment Complete"
✅ Production URL returns health check
✅ Templates endpoint returns 6 templates
✅ Dashboard loads and shows templates
✅ Job creation works end-to-end
✅ No errors in Vercel logs
✅ Birthstar team can access and test

---

**Last Updated:** November 25, 2024
