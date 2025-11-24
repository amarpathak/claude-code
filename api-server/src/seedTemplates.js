/**
 * Seed Templates
 *
 * Create default templates for the system
 */

const fs = require('fs').promises;
const path = require('path');
const { TemplateBuilder } = require('./templateSchema');

const TEMPLATES_DIR = path.join(__dirname, '../data/templates');

/**
 * Seed default templates
 */
async function seedTemplates() {
  await fs.mkdir(TEMPLATES_DIR, { recursive: true });

  const templates = [
    createLoveTemplate(),
    createCareerTemplate(),
    createMoneyTemplate(),
    createHealthTemplate(),
    createSpiritualTemplate(),
    createGeneralTemplate()
  ];

  for (const template of templates) {
    const filename = `${template.slug}-${template.id}.json`;
    const filepath = path.join(TEMPLATES_DIR, filename);

    // Check if already exists
    try {
      await fs.access(filepath);
      console.log(`Template ${template.name} already exists, skipping...`);
      continue;
    } catch (error) {
      // Doesn't exist, create it
    }

    await fs.writeFile(filepath, JSON.stringify(template, null, 2), 'utf8');
    console.log(`Created template: ${template.name}`);
  }

  console.log('Template seeding complete!');
}

/**
 * Love & Relationships Template
 */
function createLoveTemplate() {
  return new TemplateBuilder()
    .setName('Love & Relationships Blueprint')
    .setType('love')
    .setDescription('Comprehensive analysis of romantic life, partnership potential, and relationship timing')
    .setWordCount(1500)
    .addSection({
      heading: 'Your Romantic Nature',
      purpose: 'Analyze the user\'s approach to love and relationships',
      word_count: 300,
      key_placements: ['Venus', '7th house', 'Moon', 'Mars'],
      points_to_cover: [
        'Natural romantic tendencies',
        'How you express love',
        'What you need in a partner'
      ],
      questions_to_answer: [
        'What is your approach to love?',
        'How do you express affection?'
      ]
    })
    .addSection({
      heading: 'Love Timeline & Opportunities',
      purpose: 'Provide timing for romantic opportunities',
      word_count: 350,
      key_placements: ['Current dasha', 'Venus transits', '7th house lord'],
      points_to_cover: [
        'Current relationship phase',
        'Upcoming romantic periods',
        'Best timing for commitment'
      ],
      questions_to_answer: [
        'When will love opportunities arise?',
        'What is the timing for marriage?'
      ]
    })
    .addSection({
      heading: 'Compatibility Insights',
      purpose: 'Explain what makes a good match',
      word_count: 300,
      key_placements: ['Moon nakshatra', 'Venus sign', '7th house'],
      points_to_cover: [
        'Compatible partner traits',
        'Potential challenges in relationships',
        'How to maintain harmony'
      ],
      questions_to_answer: [
        'What kind of partner suits you?',
        'What should you look for in a relationship?'
      ]
    })
    .addSection({
      heading: 'Relationship Advice',
      purpose: 'Practical guidance for love life',
      word_count: 300,
      key_placements: ['Venus', 'Mars', 'Moon'],
      points_to_cover: [
        'Steps to attract love',
        'How to improve current relationships',
        'Red flags to watch for'
      ],
      questions_to_answer: [
        'What can I do to improve my love life?',
        'How can I prepare for a relationship?'
      ]
    })
    .addFollowUpQuestion({
      question: 'What is your current relationship status?',
      type: 'single_choice',
      options: ['Single', 'Dating', 'Committed', 'Married', 'Complicated'],
      required: true,
      weight: 10,
      purpose: 'Tailor advice to current situation'
    })
    .addFollowUpQuestion({
      question: 'What matters most to you in a relationship?',
      type: 'single_choice',
      options: ['Emotional connection', 'Physical attraction', 'Shared values', 'Financial stability', 'Adventure & fun'],
      required: false,
      weight: 8,
      purpose: 'Understand relationship priorities'
    })
    .addFollowUpQuestion({
      question: 'Have you experienced heartbreak?',
      type: 'single_choice',
      options: ['Yes, recently', 'Yes, in the past', 'No', 'Prefer not to say'],
      required: false,
      weight: 7,
      purpose: 'Address healing if needed'
    })
    .setRequiredPlacements({
      planets: ['Venus', 'Mars', 'Moon'],
      houses: [5, 7],
      dashas: ['current'],
      yogas: []
    })
    .setUserPreferences({
      tone: 'compassionate',
      focus: 'practical',
      timeframe: 'both'
    })
    .addTag('love')
    .addTag('relationships')
    .addTag('romance')
    .addTag('astrology')
    .build();
}

/**
 * Career & Purpose Template
 */
function createCareerTemplate() {
  return new TemplateBuilder()
    .setName('Career & Purpose Blueprint')
    .setType('career')
    .setDescription('Professional path guidance, career timing, and life purpose discovery')
    .setWordCount(1500)
    .addSection({
      heading: 'Your Career Path',
      purpose: 'Identify natural career inclinations',
      word_count: 350,
      key_placements: ['10th house', 'Sun', 'Saturn', 'Midheaven'],
      points_to_cover: [
        'Natural career strengths',
        'Suitable professions',
        'Career trajectory'
      ],
      questions_to_answer: [
        'What career path suits me?',
        'What are my professional strengths?'
      ]
    })
    .addSection({
      heading: 'Professional Strengths & Skills',
      purpose: 'Highlight unique talents',
      word_count: 300,
      key_placements: ['Mercury', 'Jupiter', '3rd house', '6th house'],
      points_to_cover: [
        'Communication skills',
        'Leadership abilities',
        'Technical aptitudes'
      ],
      questions_to_answer: [
        'What are my unique talents?',
        'How can I leverage my skills?'
      ]
    })
    .addSection({
      heading: 'Career Timing & Opportunities',
      purpose: 'Provide timing for career moves',
      word_count: 350,
      key_placements: ['Current dasha', 'Saturn transits', '10th house lord'],
      points_to_cover: [
        'Best timing for career changes',
        'Promotion periods',
        'Business opportunities'
      ],
      questions_to_answer: [
        'When should I make a career move?',
        'When will success come?'
      ]
    })
    .addSection({
      heading: 'Life Purpose & Direction',
      purpose: 'Connect career to deeper purpose',
      word_count: 300,
      key_placements: ['Sun', 'North Node', '9th house'],
      points_to_cover: [
        'Soul mission',
        'How career serves purpose',
        'Fulfillment path'
      ],
      questions_to_answer: [
        'What is my life purpose?',
        'How does my career align with my purpose?'
      ]
    })
    .addFollowUpQuestion({
      question: 'What is your current career situation?',
      type: 'single_choice',
      options: ['Employed', 'Self-employed', 'Between jobs', 'Student', 'Career break'],
      required: true,
      weight: 10,
      purpose: 'Tailor career advice appropriately'
    })
    .addFollowUpQuestion({
      question: 'What aspect of your career needs attention?',
      type: 'single_choice',
      options: ['Finding direction', 'Changing careers', 'Advancing in current role', 'Work-life balance', 'Starting a business'],
      required: false,
      weight: 9,
      purpose: 'Focus on specific career challenge'
    })
    .setRequiredPlacements({
      planets: ['Sun', 'Saturn', 'Jupiter'],
      houses: [10, 6],
      dashas: ['current', 'upcoming']
    })
    .addTag('career')
    .addTag('purpose')
    .addTag('professional')
    .addTag('astrology')
    .build();
}

/**
 * Money & Wealth Template
 */
function createMoneyTemplate() {
  return new TemplateBuilder()
    .setName('Money & Wealth Blueprint')
    .setType('money')
    .setDescription('Financial opportunities, wealth timing, and prosperity guidance')
    .setWordCount(1500)
    .addSection({
      heading: 'Your Financial Nature',
      purpose: 'Understand money mindset and patterns',
      word_count: 300,
      key_placements: ['2nd house', '8th house', 'Jupiter', 'Saturn'],
      points_to_cover: [
        'Natural relationship with money',
        'Earning style',
        'Spending patterns'
      ],
      questions_to_answer: [
        'How do I relate to money?',
        'What are my financial strengths?'
      ]
    })
    .addSection({
      heading: 'Wealth Opportunities & Timing',
      purpose: 'Identify wealth windows',
      word_count: 400,
      key_placements: ['Jupiter transits', 'Current dasha', '11th house'],
      points_to_cover: [
        'Favorable financial periods',
        'Investment timing',
        'Business opportunities'
      ],
      questions_to_answer: [
        'When will wealth come?',
        'When should I invest or start a business?'
      ]
    })
    .addSection({
      heading: 'Income Streams & Assets',
      purpose: 'Explore wealth building strategies',
      word_count: 350,
      key_placements: ['2nd house', '11th house', 'Jupiter'],
      points_to_cover: [
        'Primary income sources',
        'Potential side income',
        'Asset accumulation'
      ],
      questions_to_answer: [
        'How can I increase my income?',
        'What investments suit me?'
      ]
    })
    .addSection({
      heading: 'Financial Advice',
      purpose: 'Practical money guidance',
      word_count: 250,
      key_placements: ['Saturn', '6th house', '8th house'],
      points_to_cover: [
        'Money management tips',
        'Debt handling',
        'Long-term wealth building'
      ],
      questions_to_answer: [
        'How can I manage money better?',
        'What financial pitfalls should I avoid?'
      ]
    })
    .addFollowUpQuestion({
      question: 'What is your primary financial goal?',
      type: 'single_choice',
      options: ['Increase income', 'Build savings', 'Invest wisely', 'Pay off debt', 'Financial freedom'],
      required: true,
      weight: 10,
      purpose: 'Focus on specific financial goal'
    })
    .addFollowUpQuestion({
      question: 'What is your current financial situation?',
      type: 'single_choice',
      options: ['Stable', 'Struggling', 'Growing', 'Uncertain', 'Prefer not to say'],
      required: false,
      weight: 8,
      purpose: 'Gauge urgency of financial guidance'
    })
    .setRequiredPlacements({
      planets: ['Jupiter', 'Saturn'],
      houses: [2, 8, 11],
      dashas: ['current']
    })
    .addTag('money')
    .addTag('wealth')
    .addTag('finance')
    .addTag('astrology')
    .build();
}

/**
 * Health & Wellness Template
 */
function createHealthTemplate() {
  return new TemplateBuilder()
    .setName('Health & Wellness Blueprint')
    .setType('health')
    .setDescription('Physical vitality, mental wellness, and preventive health guidance')
    .setWordCount(1400)
    .addSection({
      heading: 'Your Health Constitution',
      purpose: 'Understand inherent health patterns',
      word_count: 350,
      key_placements: ['1st house', '6th house', 'Sun', 'Moon', 'Mars'],
      points_to_cover: [
        'Natural constitution',
        'Energy levels',
        'Health vulnerabilities'
      ],
      questions_to_answer: [
        'What is my natural health constitution?',
        'What areas need attention?'
      ]
    })
    .addSection({
      heading: 'Physical Vitality',
      purpose: 'Assess physical health and energy',
      word_count: 350,
      key_placements: ['Sun', 'Mars', '1st house'],
      points_to_cover: [
        'Physical strength',
        'Stamina and endurance',
        'Body systems to watch'
      ],
      questions_to_answer: [
        'How is my physical health?',
        'What can I do to improve vitality?'
      ]
    })
    .addSection({
      heading: 'Mental & Emotional Wellbeing',
      purpose: 'Address psychological health',
      word_count: 350,
      key_placements: ['Moon', 'Mercury', '4th house'],
      points_to_cover: [
        'Mental health patterns',
        'Emotional resilience',
        'Stress management'
      ],
      questions_to_answer: [
        'How is my mental health?',
        'How can I manage stress better?'
      ]
    })
    .addSection({
      heading: 'Wellness Recommendations',
      purpose: 'Practical health guidance',
      word_count: 250,
      key_placements: ['6th house', 'Mars', 'Saturn'],
      points_to_cover: [
        'Diet and nutrition',
        'Exercise recommendations',
        'Preventive measures'
      ],
      questions_to_answer: [
        'What lifestyle changes should I make?',
        'How can I prevent health issues?'
      ]
    })
    .addFollowUpQuestion({
      question: 'What aspect of health concerns you most?',
      type: 'single_choice',
      options: ['Physical health', 'Mental health', 'Energy levels', 'Chronic condition', 'Prevention'],
      required: true,
      weight: 10,
      purpose: 'Focus on primary health concern'
    })
    .setRequiredPlacements({
      planets: ['Sun', 'Moon', 'Mars'],
      houses: [1, 6],
      dashas: ['current']
    })
    .addTag('health')
    .addTag('wellness')
    .addTag('vitality')
    .addTag('astrology')
    .build();
}

/**
 * Spiritual Path Template
 */
function createSpiritualTemplate() {
  return new TemplateBuilder()
    .setName('Spiritual Path Blueprint')
    .setType('spiritual')
    .setDescription('Spiritual growth, soul purpose, and consciousness expansion')
    .setWordCount(1500)
    .addSection({
      heading: 'Your Spiritual Nature',
      purpose: 'Identify spiritual inclinations',
      word_count: 350,
      key_placements: ['12th house', '9th house', 'Jupiter', 'Ketu', 'Neptune'],
      points_to_cover: [
        'Natural spiritual tendencies',
        'Connection to higher consciousness',
        'Spiritual gifts'
      ],
      questions_to_answer: [
        'What is my spiritual nature?',
        'What spiritual gifts do I have?'
      ]
    })
    .addSection({
      heading: 'Soul Purpose & Mission',
      purpose: 'Reveal deeper life purpose',
      word_count: 400,
      key_placements: ['North Node', 'Sun', '9th house'],
      points_to_cover: [
        'Karmic mission',
        'Soul lessons',
        'Evolutionary path'
      ],
      questions_to_answer: [
        'What is my soul purpose?',
        'Why am I here?'
      ]
    })
    .addSection({
      heading: 'Spiritual Practices',
      purpose: 'Recommend spiritual practices',
      word_count: 350,
      key_placements: ['Jupiter', 'Moon', '12th house'],
      points_to_cover: [
        'Suitable meditation styles',
        'Spiritual disciplines',
        'Connection methods'
      ],
      questions_to_answer: [
        'What practices suit me?',
        'How can I deepen my spiritual connection?'
      ]
    })
    .addSection({
      heading: 'Spiritual Timing',
      purpose: 'Timing for spiritual growth',
      word_count: 250,
      key_placements: ['Current dasha', 'Jupiter transits'],
      points_to_cover: [
        'Awakening periods',
        'Best times for retreat',
        'Growth windows'
      ],
      questions_to_answer: [
        'When will spiritual growth occur?',
        'When should I focus on spiritual practice?'
      ]
    })
    .addFollowUpQuestion({
      question: 'What is your current spiritual practice?',
      type: 'single_choice',
      options: ['Regular practice', 'Occasional', 'Just starting', 'Exploring', 'None currently'],
      required: false,
      weight: 8,
      purpose: 'Gauge spiritual experience level'
    })
    .setRequiredPlacements({
      planets: ['Jupiter', 'Ketu'],
      houses: [9, 12],
      dashas: ['current']
    })
    .addTag('spiritual')
    .addTag('purpose')
    .addTag('consciousness')
    .addTag('astrology')
    .build();
}

/**
 * General Life Blueprint
 */
function createGeneralTemplate() {
  return new TemplateBuilder()
    .setName('Complete Life Blueprint')
    .setType('general')
    .setDescription('Comprehensive analysis covering all major life areas')
    .setWordCount(2000)
    .addSection({
      heading: 'Life Overview',
      purpose: 'Big picture life analysis',
      word_count: 400,
      key_placements: ['Sun', 'Moon', 'Ascendant', 'Current dasha'],
      points_to_cover: [
        'Current life phase',
        'Overall trajectory',
        'Key themes'
      ],
      questions_to_answer: [
        'What is the current state of my life?',
        'What themes define my life journey?'
      ]
    })
    .addSection({
      heading: 'Love & Relationships',
      purpose: 'Romantic life summary',
      word_count: 350,
      key_placements: ['Venus', '7th house', 'Moon'],
      points_to_cover: [
        'Relationship status and potential',
        'Romantic opportunities',
        'Partnership advice'
      ],
      questions_to_answer: [
        'How is my love life?',
        'What can I expect in relationships?'
      ]
    })
    .addSection({
      heading: 'Career & Purpose',
      purpose: 'Professional life summary',
      word_count: 350,
      key_placements: ['Sun', '10th house', 'Saturn'],
      points_to_cover: [
        'Career direction',
        'Professional opportunities',
        'Life purpose'
      ],
      questions_to_answer: [
        'How is my career?',
        'What is my purpose?'
      ]
    })
    .addSection({
      heading: 'Money & Wealth',
      purpose: 'Financial life summary',
      word_count: 300,
      key_placements: ['2nd house', 'Jupiter', '11th house'],
      points_to_cover: [
        'Financial status',
        'Wealth opportunities',
        'Money advice'
      ],
      questions_to_answer: [
        'How is my financial situation?',
        'When will wealth come?'
      ]
    })
    .addSection({
      heading: 'Personal Growth',
      purpose: 'Development and evolution',
      word_count: 300,
      key_placements: ['Jupiter', 'Saturn', 'North Node'],
      points_to_cover: [
        'Growth areas',
        'Challenges to overcome',
        'Next steps'
      ],
      questions_to_answer: [
        'How can I grow?',
        'What should I focus on?'
      ]
    })
    .addFollowUpQuestion({
      question: 'What area of your life needs the most attention?',
      type: 'single_choice',
      options: ['Love & relationships', 'Career & purpose', 'Money & wealth', 'Health & wellness', 'Personal growth'],
      required: true,
      weight: 10,
      purpose: 'Prioritize focus area'
    })
    .addFollowUpQuestion({
      question: 'How would you describe your current life phase?',
      type: 'single_choice',
      options: ['Starting fresh', 'Building & growing', 'Peak performance', 'Transition', 'Reflection & reset'],
      required: false,
      weight: 8,
      purpose: 'Understand life phase context'
    })
    .setRequiredPlacements({
      planets: ['Sun', 'Moon', 'Venus', 'Jupiter', 'Saturn'],
      houses: [1, 2, 7, 10],
      dashas: ['current', 'upcoming']
    })
    .addTag('general')
    .addTag('complete')
    .addTag('life-analysis')
    .addTag('astrology')
    .build();
}

// Run seeding if executed directly
if (require.main === module) {
  seedTemplates().catch(console.error);
}

module.exports = { seedTemplates };
