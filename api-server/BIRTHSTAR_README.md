# 🌟 Template System for Birthstar Team

Welcome! This guide will help you integrate the new template-based blueprint system into your application.

---

## 📚 What to Read

### 1. **START HERE** → `BIRTHSTAR_TEMPLATE_INTEGRATION.md`
**Complete integration guide with everything you need:**
- What's new and why it matters
- Step-by-step integration instructions
- Complete API reference
- Code examples for all use cases
- Customization options
- Error handling
- Best practices

**Time to read:** 15-20 minutes

---

### 2. **Quick Reference** → `TEMPLATE_QUICK_REFERENCE.md`
**Cheat sheet for daily use:**
- Quick start (30 seconds)
- All API endpoints
- Data structures
- Common patterns
- Error codes

**Time to read:** 5 minutes (keep this bookmarked!)

---

### 3. **Working Example** → `examples/birthstar-integration-example.js`
**Copy-paste and run immediately:**
```bash
cd examples
node birthstar-integration-example.js
```

6 complete examples:
1. Simple blueprint generation
2. With follow-up questions
3. With custom preferences
4. Multiple blueprints (bulk)
5. List available templates
6. Complete workflow simulation

**Time to run:** 2 minutes per example

---

## 🚀 Quick Start (5 Minutes)

### 1. Set Your API Key
```bash
export API_KEY="your-api-key"
export API_BASE="https://api-server-2dlji6qpk-amarpathaks-projects.vercel.app"
```

### 2. Run the Example
```bash
cd examples
node birthstar-integration-example.js 1
```

This will create a simple love blueprint and show you the result.

### 3. Try Other Examples
```bash
# With follow-up questions
node birthstar-integration-example.js 2

# Multiple blueprints at once
node birthstar-integration-example.js 4

# Complete workflow
node birthstar-integration-example.js 6
```

### 4. Integrate Into Your App
Copy the helper functions from `birthstar-integration-example.js` into your codebase:
```javascript
const {
  getTemplateRequirements,
  createJobFromTemplate,
  waitForJob
} = require('./birthstar-integration-example');
```

---

## 🎯 Available Templates

| Template | Best For | Follow-up Questions |
|----------|----------|---------------------|
| **Love & Relationships** | Romance, marriage, partnerships | 3 questions |
| **Career & Purpose** | Professional path, life mission | 2 questions |
| **Money & Wealth** | Financial opportunities, timing | 2 questions |
| **Health & Wellness** | Physical/mental health | 1 question |
| **Spiritual Path** | Soul purpose, spiritual growth | 1 question |
| **Complete Life** | All areas of life (comprehensive) | 2 questions |

---

## 💡 Key Benefits

### For Users
✅ More personalized blueprints (follow-up questions)
✅ Consistent quality across all readings
✅ Better timing predictions
✅ More detailed analysis

### For Your Team
✅ Less code to maintain
✅ Easier to A/B test prompts
✅ Better tracking and analytics
✅ Flexible customization
✅ Visual template management

---

## 🔑 API Endpoints You'll Use

### Primary Endpoint (80% of use cases)
```javascript
POST /api/queue/jobs/from-template

// Body
{
  template_id: 'love-relationships-blueprint',
  user_data: {
    project_id: 'user-id',
    user_question: 'Should I have kids?',
    swiss_data: { /* birth chart */ },
    follow_up_answers: { /* optional */ },
    preferences: { /* optional */ }
  }
}
```

### Supporting Endpoints
```javascript
// Get what data template needs
GET /api/queue/templates/:id/requirements

// Check job status
GET /api/queue/jobs/:jobId

// List all templates
GET /api/templates
```

---

## 📊 Data You Need

### Required
- `project_id` - User identifier
- `swiss_data` - Birth chart (planets, houses, dashas)

### Optional (but recommended)
- `user_question` - User's specific question
- `user_info` - Name, birth details
- `follow_up_answers` - Answers to template questions
- `preferences` - Tone, focus, timeframe

---

## 🎨 Customization

### Tone
- `compassionate` - Empathetic (best for sensitive topics)
- `direct` - Straightforward
- `balanced` - Mix of both
- `spiritual` - Mystical

### Focus
- `practical` - Actionable advice (recommended)
- `spiritual` - Soul-level insights
- `balanced` - Mix of both

### Timeframe
- `immediate` - Next 6 months
- `long-term` - 3-5 years
- `both` - Mix (recommended)

---

## 🧪 Testing

### Local Testing
```bash
# Start the server (if not running)
cd /Users/amarpathak/claude-code/api-server
npm start

# Run examples
cd examples
node birthstar-integration-example.js
```

### Production Testing
Update `API_BASE` to production URL and run the same examples.

---

## 🎯 Migration Path

### Phase 1: Learn (Week 1)
- [ ] Read `BIRTHSTAR_TEMPLATE_INTEGRATION.md`
- [ ] Run all examples
- [ ] Test with your actual data
- [ ] Understand follow-up questions

### Phase 2: Integrate (Week 2)
- [ ] Add follow-up question UI
- [ ] Replace old job creation with template-based
- [ ] Add error handling
- [ ] Test thoroughly

### Phase 3: Optimize (Week 3)
- [ ] Monitor template usage
- [ ] Collect user feedback
- [ ] Create custom templates if needed
- [ ] A/B test preferences

---

## 📱 Dashboard Access

**Visual template management:**
```
http://localhost:8001/templates/dashboard
```

Features:
- View all templates
- See usage statistics
- Create custom templates
- Edit existing templates
- Manage follow-up questions

---

## 🆘 Need Help?

### Documentation
1. **Complete Guide:** `BIRTHSTAR_TEMPLATE_INTEGRATION.md`
2. **Quick Reference:** `TEMPLATE_QUICK_REFERENCE.md`
3. **Technical Details:** `TEMPLATE_SYSTEM_GUIDE.md`

### Examples
- **Integration:** `examples/birthstar-integration-example.js`
- **General Usage:** `examples/template-usage-example.js`

### Support
- **API Team:** api@birthstar.com
- **Slack:** #api-support

---

## 🔍 Common Questions

### Q: Can I still use the old system?
**A:** Yes, but the new system is recommended for better results.

### Q: Do I need to answer all follow-up questions?
**A:** No, only required ones. But more answers = better personalization.

### Q: Can I create custom templates?
**A:** Yes! Use the dashboard or API. See `BIRTHSTAR_TEMPLATE_INTEGRATION.md` section "Advanced: Creating Custom Templates".

### Q: What if a template doesn't fit my use case?
**A:** You can:
1. Use the closest template and adjust preferences
2. Create a custom template
3. Request a new template from the API team

### Q: How long does job creation take?
**A:** Typically 30-60 seconds for a complete blueprint.

### Q: Can I create multiple blueprints at once?
**A:** Yes! Use the bulk endpoint. See example 4.

---

## ✅ Success Checklist

Before launching:
- [ ] Successfully created blueprint with example data
- [ ] Integrated follow-up questions into UI
- [ ] Tested all template types
- [ ] Added error handling
- [ ] Tested with real user data
- [ ] Set up monitoring/analytics
- [ ] Documented for your team

---

## 🎉 You're Ready!

Start with `BIRTHSTAR_TEMPLATE_INTEGRATION.md` and run the examples.

Questions? Contact the API team.

**Happy Integrating!** 🚀

---

**Last Updated:** November 25, 2024
**Version:** 1.0.0
