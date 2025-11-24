# ⚠️ URGENT: Fix for 404 Error

## 🔴 Problem

You're getting:
```
Cannot POST /api/queue/jobs/from-template
404 Not Found
```

## ✅ Solution

**The template routes haven't been deployed to your server yet.**

You need to **deploy the updated code** OR **restart your server**.

---

## 🚀 Quick Fix (Choose One)

### Option 1: For Local Development (30 seconds)

```bash
# Stop current server
pkill -f "node server.js"

# Pull latest code
cd /path/to/api-server
git pull origin main

# Install dependencies (if any new ones)
npm install

# Start server
PORT=8001 node server.js

# Test it works
curl -X POST http://localhost:8001/api/queue/jobs/from-template \
  -H "Content-Type: application/json" \
  -H "X-API-Key: admin" \
  -d '{"template_id":"test"}'

# Should return validation error (not 404):
# {"error":"user_data is required..."}
```

### Option 2: For Production/Vercel (2 minutes)

```bash
cd /path/to/api-server

# Deploy to Vercel
vercel --prod

# Wait for deployment...
# Copy the new URL

# Update your app to use new URL
# Update API_BASE in your code

# Test it works
curl -H "X-API-Key: your-key" \
  https://new-url.vercel.app/api/templates

# Should return 6 templates
```

---

## 🧪 Verify It's Fixed

```bash
# Test 1: List templates (should return 6)
curl -H "X-API-Key: your-key" \
  http://localhost:8001/api/templates

# Test 2: Get template requirements
curl -H "X-API-Key: your-key" \
  http://localhost:8001/api/queue/templates/love-relationships-blueprint/requirements

# Test 3: Create job (should return job_id)
curl -X POST http://localhost:8001/api/queue/jobs/from-template \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-key" \
  -d '{
    "template_id": "complete-life-blueprint",
    "user_data": {
      "project_id": "test",
      "swiss_data": {
        "planets": {"sun": {"sign": "Cancer", "degree": 15, "house": 12}},
        "houses": {"1": {"sign": "Leo", "degree": 0}}
      }
    }
  }'
```

All three should work without 404 errors.

---

## 📋 What Changed

The template system adds these new endpoints:

```
POST   /api/queue/jobs/from-template              ← You need this
GET    /api/queue/templates/:id/requirements      ← And this
GET    /api/templates                             ← List templates
GET    /templates/dashboard                       ← Dashboard UI
```

These routes are **only available after deploying/restarting** with the new code.

---

## ⚡ TL;DR

1. **Local dev:** Restart server with latest code
2. **Production:** Deploy to Vercel with `vercel --prod`
3. **Update** your API_BASE URL if deploying new version
4. **Test** with curl commands above
5. **If still broken:** See `TROUBLESHOOTING_404.md`

---

## 📞 Still Getting 404?

Check:
- [ ] Are you using the correct URL? (localhost:8001 or new Vercel URL)
- [ ] Did the server restart successfully?
- [ ] Do you have the latest code? (`git pull`)
- [ ] Is your API key correct?

See **TROUBLESHOOTING_404.md** for detailed debugging.

---

## 🎯 After It's Fixed

Once the 404 is resolved, use these docs:
1. **BIRTHSTAR_README.md** - Start here
2. **BIRTHSTAR_TEMPLATE_INTEGRATION.md** - Complete guide
3. **examples/birthstar-integration-example.js** - Working code

---

**Need immediate help?** Contact API team.

**Last Updated:** November 25, 2024
