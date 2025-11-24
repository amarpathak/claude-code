# 🔧 Troubleshooting: 404 Error on Template Endpoints

## ❌ Error You're Seeing

```
Cannot POST /api/queue/jobs/from-template
404 Not Found
```

---

## ✅ Quick Fix

The template routes need to be deployed/activated on your server. Follow these steps:

### Option 1: Restart Your Server (If Running Locally)

```bash
# Stop the current server
pkill -f "node server.js"

# Start it again
cd /path/to/api-server
PORT=8001 node server.js
```

### Option 2: Deploy to Production (If Using Vercel/Cloud)

The new template routes are **not deployed** to your production server yet.

```bash
cd /path/to/api-server

# Deploy to Vercel
vercel --prod

# Or commit and push (if using auto-deploy)
git add .
git commit -m "feat: add template management system"
git push origin main
```

### Option 3: Check Your API Base URL

Make sure you're pointing to the correct server:

```javascript
// ❌ Wrong - pointing to old server
const API_BASE = 'https://old-server.vercel.app';

// ✅ Correct - pointing to updated server
const API_BASE = 'http://localhost:8001';
// or for production after deployment:
const API_BASE = 'https://api-server-2dlji6qpk-amarpathaks-projects.vercel.app';
```

---

## 🔍 Detailed Diagnosis

### Step 1: Verify Local Server Has the Routes

```bash
# Test locally (should return validation error, not 404)
curl -X POST 'http://localhost:8001/api/queue/jobs/from-template' \
  -H 'Content-Type: application/json' \
  -H 'X-API-Key: admin' \
  -d '{"template_id":"test"}'

# ✅ Good response (routes exist):
# {"error":"user_data is required (must include swiss_data, project_id, etc.)"}

# ❌ Bad response (routes don't exist):
# Cannot POST /api/queue/jobs/from-template
```

### Step 2: Check Server Logs

Look for these lines when server starts:

```
✓ Firestore Queue system initialized
Starting Claude Code API Server on 0.0.0.0:8001
```

If you don't see queue initialization, check:

```javascript
// In server.js, should have:
const queueRoutes = require('./routes/queue');

// And should register routes:
app.use('/api/queue', authMiddleware.verifyApiKey, queueRoutes.router);
```

### Step 3: Verify Files Exist

```bash
# Check these files exist:
ls -la routes/queue.js                           # Queue routes
ls -la routes/templates.js                       # Template routes
ls -la src/templateJobIntegration.js             # Integration logic
ls -la src/templateSchema.js                     # Schema
ls -la data/templates/                           # Template storage

# All should exist. If missing, you need to pull latest code.
```

---

## 🚀 Complete Deployment Checklist

### For Local Development

- [ ] Pull latest code: `git pull origin main`
- [ ] Install dependencies: `npm install`
- [ ] Stop old server: `pkill -f "node server.js"`
- [ ] Start new server: `PORT=8001 node server.js`
- [ ] Verify routes work: Run test curl command above
- [ ] Test with example: `node examples/birthstar-integration-example.js 1`

### For Production Deployment

- [ ] Commit all changes
- [ ] Push to repository
- [ ] Deploy to Vercel: `vercel --prod`
- [ ] Wait for deployment to complete
- [ ] Get new deployment URL from Vercel
- [ ] Update `API_BASE` in your app to new URL
- [ ] Test with curl against production URL
- [ ] Verify dashboard works: `https://your-url.vercel.app/templates/dashboard`

---

## 🧪 Test the Deployment

### Test 1: Health Check

```bash
curl https://your-server.vercel.app/health
# Should return: {"status":"healthy"}
```

### Test 2: List Templates

```bash
curl -H "X-API-Key: your-key" \
  https://your-server.vercel.app/api/templates
# Should return: {"success":true,"count":6,"templates":[...]}
```

### Test 3: Template Requirements

```bash
curl -H "X-API-Key: your-key" \
  https://your-server.vercel.app/api/queue/templates/love-relationships-blueprint/requirements
# Should return: {"success":true,"requirements":{...}}
```

### Test 4: Create Job (with valid data)

```bash
curl -X POST https://your-server.vercel.app/api/queue/jobs/from-template \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-key" \
  -d '{
    "template_id": "love-relationships-blueprint",
    "user_data": {
      "project_id": "test-user",
      "swiss_data": {
        "planets": {"sun": {"sign": "Cancer", "degree": 15, "house": 12}},
        "houses": {"1": {"sign": "Leo", "degree": 0}}
      }
    }
  }'
# Should return: {"success":true,"job_id":"..."}
```

---

## 📋 Common Issues

### Issue 1: "Cannot find module './routes/queue'"

**Fix:**
```bash
# You're missing the queue routes file
# Pull latest code
git pull origin main

# Or copy from another environment
```

### Issue 2: "queueManager is not initialized"

**Fix:**
The queue manager needs to be initialized. Check `server.js`:

```javascript
// Should have this section:
const queueManager = new FirestoreQueueManager();

// Initialize queue routes
queueRoutes.initializeRoute(queueManager);
```

### Issue 3: Routes work locally but not in production

**Fix:**
Production hasn't been deployed yet. Deploy now:

```bash
# Option A: Vercel CLI
vercel --prod

# Option B: Git push (if auto-deploy enabled)
git push origin main

# Wait 2-3 minutes for deployment
# Then test against new URL
```

### Issue 4: "Template not found" after deployment

**Fix:**
Template seed data not created. Run seed script:

```bash
# On your server
node src/seedTemplates.js

# Or via API
curl -X POST http://your-server/api/seed-templates \
  -H "X-API-Key: your-admin-key"
```

---

## 🔧 Manual Route Verification

If routes still don't work, manually verify registration in `server.js`:

```javascript
// Around line 35 - Import queue routes
const queueRoutes = require('./routes/queue');
const templateRoutes = require('./routes/templates');

// Around line 364 - Register template routes BEFORE projects
app.use('/api/templates', authMiddleware.verifyApiKey, templateRoutes);

// Around line 392 - Register queue routes
app.use('/api/queue', authMiddleware.verifyApiKey, queueRoutes.router);
```

If any of these lines are missing, add them and restart.

---

## 🆘 Still Not Working?

### Debug Mode

Start server with debug logging:

```bash
DEBUG=* node server.js
```

Look for:
- ✅ Route registration messages
- ✅ Queue manager initialization
- ❌ Any error messages about missing modules

### Check Server Logs

```bash
# If running in background
tail -f /tmp/api-server.log

# Or check deployment logs
vercel logs
```

### Contact Support

If still stuck, provide:
1. Server logs (startup messages)
2. curl command you're running
3. Full error response
4. API base URL you're using
5. Deployment platform (Vercel/Railway/etc)

---

## ✅ Success Indicators

You'll know it's working when:

✅ Curl to `/api/queue/jobs/from-template` returns validation error (not 404)
✅ `/api/templates` returns list of 6 templates
✅ Dashboard loads at `/templates/dashboard`
✅ Example script runs successfully
✅ Jobs are created and processed

---

## 📞 Quick Commands Reference

```bash
# Restart local server
pkill -f "node server.js" && PORT=8001 node server.js &

# Deploy to production
vercel --prod

# Test endpoint
curl -X POST http://localhost:8001/api/queue/jobs/from-template \
  -H "Content-Type: application/json" \
  -H "X-API-Key: admin" \
  -d '{"template_id":"test"}'

# Run example
node examples/birthstar-integration-example.js 1

# Check server is running
lsof -i :8001

# View logs
tail -f /tmp/api-server.log
```

---

**Need more help?** Contact the API team with your error details.

**Last Updated:** November 25, 2024
