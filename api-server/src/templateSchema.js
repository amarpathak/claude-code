/**
 * Enhanced Template Schema
 *
 * Comprehensive template structure with metadata, follow-up data,
 * and extensible context for blueprint generation.
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Template Schema Definition
 */
const TemplateSchema = {
  // Core identification
  id: String,                    // Unique template ID
  name: String,                  // Display name
  slug: String,                  // URL-friendly identifier
  version: String,               // Version number (e.g., "1.0.0")

  // Template content
  type: String,                  // love, money, career, health, general, custom
  category: String,              // blueprint, report, analysis, guide
  description: String,           // What this template does

  // Structure definition
  structure: {
    title_pattern: String,       // Template for title generation
    word_count: Number,          // Target word count (e.g., 1500)
    sections: [
      {
        heading: String,         // Section title
        purpose: String,         // What this section accomplishes
        word_count: Number,      // Target words for this section
        key_placements: [String], // Astrological placements to reference
        points_to_cover: [String], // Specific points to address
        questions_to_answer: [String], // Questions this section answers
        subsections: [Object]    // Optional nested sections
      }
    ]
  },

  // Follow-up questions to gather more context
  follow_up_questions: [
    {
      id: String,
      question: String,          // The question text
      type: String,              // single_choice, multiple_choice, text, scale
      options: [String],         // For choice-based questions
      required: Boolean,         // Is this required?
      condition: Object,         // Show if condition met (e.g., {if_type: "love"})
      weight: Number,            // Importance (1-10)
      purpose: String            // Why we're asking this
    }
  ],

  // Extra context data to supply with template
  context_data: {
    // Astrological context
    required_placements: {
      planets: [String],         // e.g., ["Jupiter", "Venus"]
      houses: [Number],          // e.g., [5, 7, 10]
      aspects: [String],         // e.g., ["Jupiter trine Venus"]
      dashas: [String],          // e.g., ["current", "upcoming"]
      yogas: [String],           // e.g., ["Gaja Kesari", "Raj Yoga"]
      nakshatras: [String]       // e.g., ["Moon", "Ascendant"]
    },

    // User context preferences
    user_preferences: {
      tone: String,              // direct, gentle, balanced, spiritual
      focus: String,             // practical, spiritual, psychological, balanced
      timeframe: String,         // immediate, long-term, both
      depth: String,             // quick, standard, comprehensive
      language_style: String     // simple, technical, poetic
    },

    // Reading parameters
    reading_params: {
      include_remedies: Boolean,
      include_timing: Boolean,
      include_examples: Boolean,
      include_comparisons: Boolean,
      include_warnings: Boolean
    }
  },

  // Prompt engineering
  prompts: {
    template_generation: String,  // Prompt to generate template outline
    expansion: String,            // Prompt to expand template into full content
    system_context: String,       // Additional system context
    examples: [String]            // Example outputs for few-shot learning
  },

  // Quality & validation
  quality_criteria: {
    min_word_count: Number,
    max_word_count: Number,
    required_keywords: [String],
    required_placements: [String],
    tone_requirements: [String],
    structure_requirements: [String]
  },

  // Metadata
  metadata: {
    created_at: Date,
    updated_at: Date,
    created_by: String,
    tags: [String],
    usage_count: Number,
    average_rating: Number,
    is_active: Boolean,
    is_public: Boolean
  },

  // Parent/child relationships
  parent_template_id: String,     // If derived from another template
  variants: [String]              // IDs of template variants
};

/**
 * Create a new template with defaults
 */
function createTemplate(data = {}) {
  const now = new Date();

  return {
    id: data.id || uuidv4(),
    name: data.name || 'Untitled Template',
    slug: data.slug || slugify(data.name || 'untitled'),
    version: data.version || '1.0.0',

    type: data.type || 'general',
    category: data.category || 'blueprint',
    description: data.description || '',

    structure: {
      title_pattern: data.structure?.title_pattern || '{{topic}} Blueprint for {{user_name}}',
      word_count: data.structure?.word_count || 1500,
      sections: data.structure?.sections || []
    },

    follow_up_questions: data.follow_up_questions || [],

    context_data: {
      required_placements: {
        planets: data.context_data?.required_placements?.planets || [],
        houses: data.context_data?.required_placements?.houses || [],
        aspects: data.context_data?.required_placements?.aspects || [],
        dashas: data.context_data?.required_placements?.dashas || ['current'],
        yogas: data.context_data?.required_placements?.yogas || [],
        nakshatras: data.context_data?.required_placements?.nakshatras || []
      },
      user_preferences: {
        tone: data.context_data?.user_preferences?.tone || 'balanced',
        focus: data.context_data?.user_preferences?.focus || 'balanced',
        timeframe: data.context_data?.user_preferences?.timeframe || 'both',
        depth: data.context_data?.user_preferences?.depth || 'standard',
        language_style: data.context_data?.user_preferences?.language_style || 'simple'
      },
      reading_params: {
        include_remedies: data.context_data?.reading_params?.include_remedies ?? true,
        include_timing: data.context_data?.reading_params?.include_timing ?? true,
        include_examples: data.context_data?.reading_params?.include_examples ?? false,
        include_comparisons: data.context_data?.reading_params?.include_comparisons ?? false,
        include_warnings: data.context_data?.reading_params?.include_warnings ?? true
      }
    },

    prompts: {
      template_generation: data.prompts?.template_generation || '',
      expansion: data.prompts?.expansion || '',
      system_context: data.prompts?.system_context || '',
      examples: data.prompts?.examples || []
    },

    quality_criteria: {
      min_word_count: data.quality_criteria?.min_word_count || 1200,
      max_word_count: data.quality_criteria?.max_word_count || 2000,
      required_keywords: data.quality_criteria?.required_keywords || [],
      required_placements: data.quality_criteria?.required_placements || [],
      tone_requirements: data.quality_criteria?.tone_requirements || [],
      structure_requirements: data.quality_criteria?.structure_requirements || []
    },

    metadata: {
      created_at: now,
      updated_at: now,
      created_by: data.metadata?.created_by || 'system',
      tags: data.metadata?.tags || [],
      usage_count: 0,
      average_rating: 0,
      is_active: data.metadata?.is_active ?? true,
      is_public: data.metadata?.is_public ?? false
    },

    parent_template_id: data.parent_template_id || null,
    variants: data.variants || []
  };
}

/**
 * Validate template structure
 */
function validateTemplate(template) {
  const errors = [];

  if (!template.name || template.name.trim() === '') {
    errors.push('Template name is required');
  }

  if (!template.type) {
    errors.push('Template type is required');
  }

  if (!template.structure || !template.structure.sections || template.structure.sections.length === 0) {
    errors.push('Template must have at least one section');
  }

  if (template.structure.word_count < 100) {
    errors.push('Word count must be at least 100');
  }

  // Validate follow-up questions
  if (template.follow_up_questions) {
    template.follow_up_questions.forEach((q, i) => {
      if (!q.question || q.question.trim() === '') {
        errors.push(`Follow-up question ${i + 1} is missing question text`);
      }
      if (!q.type) {
        errors.push(`Follow-up question ${i + 1} is missing type`);
      }
      if ((q.type === 'single_choice' || q.type === 'multiple_choice') && (!q.options || q.options.length === 0)) {
        errors.push(`Follow-up question ${i + 1} is missing options`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Slugify string
 */
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

/**
 * Template builder helper
 */
class TemplateBuilder {
  constructor() {
    this.template = createTemplate();
  }

  setName(name) {
    this.template.name = name;
    this.template.slug = slugify(name);
    return this;
  }

  setType(type) {
    this.template.type = type;
    return this;
  }

  setDescription(description) {
    this.template.description = description;
    return this;
  }

  setWordCount(count) {
    this.template.structure.word_count = count;
    return this;
  }

  addSection(section) {
    this.template.structure.sections.push({
      heading: section.heading || 'Untitled Section',
      purpose: section.purpose || '',
      word_count: section.word_count || 250,
      key_placements: section.key_placements || [],
      points_to_cover: section.points_to_cover || [],
      questions_to_answer: section.questions_to_answer || [],
      subsections: section.subsections || []
    });
    return this;
  }

  addFollowUpQuestion(question) {
    this.template.follow_up_questions.push({
      id: question.id || uuidv4(),
      question: question.question,
      type: question.type || 'text',
      options: question.options || [],
      required: question.required ?? false,
      condition: question.condition || null,
      weight: question.weight || 5,
      purpose: question.purpose || ''
    });
    return this;
  }

  setRequiredPlacements(placements) {
    this.template.context_data.required_placements = {
      ...this.template.context_data.required_placements,
      ...placements
    };
    return this;
  }

  setUserPreferences(preferences) {
    this.template.context_data.user_preferences = {
      ...this.template.context_data.user_preferences,
      ...preferences
    };
    return this;
  }

  addTag(tag) {
    if (!this.template.metadata.tags.includes(tag)) {
      this.template.metadata.tags.push(tag);
    }
    return this;
  }

  build() {
    const validation = validateTemplate(this.template);
    if (!validation.valid) {
      throw new Error(`Template validation failed: ${validation.errors.join(', ')}`);
    }
    return this.template;
  }
}

module.exports = {
  TemplateSchema,
  createTemplate,
  validateTemplate,
  TemplateBuilder,
  slugify
};
