/**
 * Template-Job Integration
 *
 * Integrates the enhanced template system with the job queue,
 * allowing template-based job creation with rich context.
 */

const fs = require('fs').promises;
const path = require('path');

const TEMPLATES_DIR = path.join(__dirname, '../data/templates');

/**
 * Load template by ID or slug
 */
async function loadTemplate(idOrSlug) {
  try {
    const files = await fs.readdir(TEMPLATES_DIR);

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const filepath = path.join(TEMPLATES_DIR, file);
      const content = await fs.readFile(filepath, 'utf8');
      const template = JSON.parse(content);

      if (template.id === idOrSlug || template.slug === idOrSlug) {
        return template;
      }
    }

    throw new Error(`Template not found: ${idOrSlug}`);
  } catch (error) {
    throw new Error(`Error loading template: ${error.message}`);
  }
}

/**
 * Generate prompt from template
 */
function generatePromptFromTemplate(template, userData) {
  const {
    user_question,
    user_info = {},
    swiss_data = {},
    follow_up_answers = {},
    preferences = {}
  } = userData;

  // Start building the prompt
  let prompt = `Generate a comprehensive ${template.type} blueprint for this user.\n\n`;

  // Add user question
  if (user_question) {
    prompt += `USER QUESTION: "${user_question}"\n\n`;
  }

  // Add context from follow-up answers
  if (Object.keys(follow_up_answers).length > 0) {
    prompt += `ADDITIONAL CONTEXT:\n`;
    Object.entries(follow_up_answers).forEach(([questionId, answer]) => {
      const question = template.follow_up_questions?.find(q => q.id === questionId);
      if (question) {
        prompt += `Q: ${question.question}\nA: ${answer}\n\n`;
      }
    });
  }

  // Add user info
  if (user_info.name || user_info.birth_date) {
    prompt += `BIRTH DATA:\n`;
    if (user_info.name) prompt += `Name: ${user_info.name}\n`;
    if (user_info.birth_date) prompt += `Born: ${user_info.birth_date}`;
    if (user_info.birth_time) prompt += ` at ${user_info.birth_time}`;
    if (user_info.birth_place) prompt += ` in ${user_info.birth_place}`;
    prompt += `\n\n`;
  }

  // Add astrological highlights
  if (swiss_data.planets) {
    prompt += `KEY ASTROLOGICAL PLACEMENTS:\n`;
    if (swiss_data.planets.sun) {
      prompt += `- Sun: ${swiss_data.planets.sun.sign} at ${swiss_data.planets.sun.degree?.toFixed(2)}° in House ${swiss_data.planets.sun.house}\n`;
    }
    if (swiss_data.planets.moon) {
      prompt += `- Moon: ${swiss_data.planets.moon.sign} at ${swiss_data.planets.moon.degree?.toFixed(2)}° in House ${swiss_data.planets.moon.house}\n`;
    }
    if (swiss_data.houses?.[1]) {
      prompt += `- Ascendant: ${swiss_data.houses[1].sign} at ${swiss_data.houses[1].degree?.toFixed(2)}°\n`;
    }
    prompt += `\n`;
  }

  // Reference to full chart data
  prompt += `FULL CHART DATA:\n`;
  prompt += `The complete birth chart data is available in profile/swiss-data.json\n\n`;

  // Add template structure guidance
  prompt += `YOUR TASK:\n`;
  prompt += `1. Read the full birth chart data from profile/swiss-data.json\n`;
  prompt += `2. Generate a comprehensive, personalized ${template.type} blueprint (${template.structure.word_count} words)\n`;
  prompt += `3. Follow the structure defined in the template:\n\n`;

  // Add section structure
  if (template.structure.sections && template.structure.sections.length > 0) {
    prompt += `CONTENT STRUCTURE:\n`;
    template.structure.sections.forEach((section, i) => {
      prompt += `${i + 1}. ${section.heading} (${section.word_count} words):\n`;
      prompt += `   Purpose: ${section.purpose}\n`;
      if (section.key_placements && section.key_placements.length > 0) {
        prompt += `   Reference: ${section.key_placements.join(', ')}\n`;
      }
      if (section.points_to_cover && section.points_to_cover.length > 0) {
        prompt += `   Cover: ${section.points_to_cover.join('; ')}\n`;
      }
      prompt += `\n`;
    });
  }

  // Add tone and style guidelines
  const contextPrefs = template.context_data?.user_preferences || {};
  const userPrefs = preferences || {};

  prompt += `TONE & APPROACH:\n`;
  prompt += `- Tone: ${userPrefs.tone || contextPrefs.tone || 'balanced'}\n`;
  prompt += `- Focus: ${userPrefs.focus || contextPrefs.focus || 'balanced'}\n`;
  prompt += `- Timeframe: ${userPrefs.timeframe || contextPrefs.timeframe || 'both'}\n`;
  prompt += `- Depth: ${userPrefs.depth || contextPrefs.depth || 'standard'}\n\n`;

  // Add reading parameters
  const readingParams = template.context_data?.reading_params || {};
  if (readingParams.include_remedies) {
    prompt += `- Include remedies and solutions\n`;
  }
  if (readingParams.include_timing) {
    prompt += `- Include specific timing guidance using dashas\n`;
  }
  if (readingParams.include_warnings) {
    prompt += `- Include warnings about potential challenges\n`;
  }
  prompt += `\n`;

  // Output format
  prompt += `OUTPUT FORMAT:\n`;
  prompt += `Save as JSON file with this structure:\n`;
  prompt += `{\n`;
  prompt += `  "title": "Compelling title (under 60 characters)",\n`;
  prompt += `  "summary": "2-3 sentence summary of key insights",\n`;
  prompt += `  "content": "Full markdown content (${template.structure.word_count} words)"\n`;
  prompt += `}\n\n`;

  // Critical rules
  prompt += `CRITICAL RULES:\n`;
  prompt += `- Be SPECIFIC with placements (e.g., "Your Venus at 15° Scorpio in the 8th house...")\n`;
  prompt += `- Use compassionate, ${contextPrefs.tone || 'balanced'} language\n`;
  prompt += `- Write ${template.structure.word_count} words minimum\n`;
  prompt += `- Use markdown formatting (##, ###, bold, italic)\n`;
  prompt += `- Make it deeply personalized using their exact chart\n`;
  if (user_question) {
    prompt += `- Answer the user's question: "${user_question}"\n`;
  }

  return prompt;
}

/**
 * Create job from template
 */
async function createJobFromTemplate(templateId, userData, options = {}) {
  try {
    // Load template
    const template = await loadTemplate(templateId);

    // Validate required data
    if (!userData.swiss_data || !userData.swiss_data.planets) {
      throw new Error('Birth chart data (swiss_data) is required');
    }

    // Generate prompt
    const prompt = generatePromptFromTemplate(template, userData);

    // Build job data
    const jobData = {
      prompt,
      user_info: userData.user_info || {},
      swiss_data: userData.swiss_data || {},
      working_directory: userData.project_id || options.working_directory,
      project_id: userData.project_id,
      timeout: options.timeout || 300000,
      priority: options.priority || 'normal',
      save_data: options.save_data !== false,
      metadata: {
        template_id: template.id,
        template_name: template.name,
        template_type: template.type,
        template_version: template.version,
        user_question: userData.user_question,
        follow_up_answers: userData.follow_up_answers || {},
        preferences: userData.preferences || {},
        generated_at: new Date().toISOString()
      }
    };

    return jobData;
  } catch (error) {
    throw new Error(`Error creating job from template: ${error.message}`);
  }
}

/**
 * Validate template data before job creation
 */
function validateTemplateJobData(userData) {
  const errors = [];

  if (!userData.swiss_data) {
    errors.push('swiss_data is required');
  }

  if (!userData.project_id && !userData.working_directory) {
    errors.push('Either project_id or working_directory is required');
  }

  if (userData.follow_up_answers) {
    if (typeof userData.follow_up_answers !== 'object') {
      errors.push('follow_up_answers must be an object');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get template requirements (what data is needed)
 */
async function getTemplateRequirements(templateId) {
  try {
    const template = await loadTemplate(templateId);

    return {
      template_id: template.id,
      template_name: template.name,
      required_data: {
        swiss_data: true,
        user_info: false,
        project_id: true
      },
      follow_up_questions: template.follow_up_questions || [],
      required_placements: template.context_data?.required_placements || {},
      user_preferences: template.context_data?.user_preferences || {},
      reading_params: template.context_data?.reading_params || {}
    };
  } catch (error) {
    throw new Error(`Error getting template requirements: ${error.message}`);
  }
}

/**
 * Increment template usage counter
 */
async function incrementTemplateUsage(templateId) {
  try {
    const files = await fs.readdir(TEMPLATES_DIR);

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const filepath = path.join(TEMPLATES_DIR, file);
      const content = await fs.readFile(filepath, 'utf8');
      const template = JSON.parse(content);

      if (template.id === templateId || template.slug === templateId) {
        template.metadata.usage_count = (template.metadata.usage_count || 0) + 1;
        template.metadata.updated_at = new Date();

        await fs.writeFile(filepath, JSON.stringify(template, null, 2), 'utf8');
        return template.metadata.usage_count;
      }
    }

    return 0;
  } catch (error) {
    console.error('Error incrementing template usage:', error);
    return 0;
  }
}

module.exports = {
  loadTemplate,
  generatePromptFromTemplate,
  createJobFromTemplate,
  validateTemplateJobData,
  getTemplateRequirements,
  incrementTemplateUsage
};
