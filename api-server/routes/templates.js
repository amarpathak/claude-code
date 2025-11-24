/**
 * Template Management Routes
 *
 * CRUD operations for managing blueprint templates
 * with metadata, follow-up questions, and context data.
 */

const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { createTemplate, validateTemplate, TemplateBuilder, slugify } = require('../src/templateSchema');

// Template storage directory
const TEMPLATES_DIR = path.join(__dirname, '../data/templates');

// Ensure templates directory exists
async function ensureTemplatesDir() {
  try {
    await fs.mkdir(TEMPLATES_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating templates directory:', error);
  }
}

ensureTemplatesDir();

/**
 * GET /api/templates
 * List all templates with optional filtering
 */
router.get('/', async (req, res) => {
  try {
    const { type, category, tag, active_only } = req.query;

    const files = await fs.readdir(TEMPLATES_DIR);
    const templateFiles = files.filter(f => f.endsWith('.json'));

    let templates = [];
    for (const file of templateFiles) {
      try {
        const content = await fs.readFile(path.join(TEMPLATES_DIR, file), 'utf8');
        const template = JSON.parse(content);
        templates.push(template);
      } catch (error) {
        console.error(`Error reading template ${file}:`, error);
      }
    }

    // Apply filters
    if (type) {
      templates = templates.filter(t => t.type === type);
    }
    if (category) {
      templates = templates.filter(t => t.category === category);
    }
    if (tag) {
      templates = templates.filter(t => t.metadata?.tags?.includes(tag));
    }
    if (active_only === 'true') {
      templates = templates.filter(t => t.metadata?.is_active !== false);
    }

    // Sort by usage count and creation date
    templates.sort((a, b) => {
      const usageDiff = (b.metadata?.usage_count || 0) - (a.metadata?.usage_count || 0);
      if (usageDiff !== 0) return usageDiff;
      return new Date(b.metadata?.created_at) - new Date(a.metadata?.created_at);
    });

    res.json({
      success: true,
      count: templates.length,
      templates: templates.map(t => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        type: t.type,
        category: t.category,
        description: t.description,
        version: t.version,
        usage_count: t.metadata?.usage_count || 0,
        is_active: t.metadata?.is_active ?? true,
        created_at: t.metadata?.created_at,
        updated_at: t.metadata?.updated_at,
        tags: t.metadata?.tags || []
      }))
    });
  } catch (error) {
    console.error('Error listing templates:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/templates/:id
 * Get a specific template by ID or slug
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Try to find by ID first, then by slug
    const files = await fs.readdir(TEMPLATES_DIR);
    let template = null;

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      try {
        const content = await fs.readFile(path.join(TEMPLATES_DIR, file), 'utf8');
        const t = JSON.parse(content);

        if (t.id === id || t.slug === id) {
          template = t;
          break;
        }
      } catch (error) {
        console.error(`Error reading template ${file}:`, error);
      }
    }

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    res.json({
      success: true,
      template
    });
  } catch (error) {
    console.error('Error getting template:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/templates
 * Create a new template
 */
router.post('/', async (req, res) => {
  try {
    const templateData = req.body;

    // Create template with defaults
    const template = createTemplate(templateData);

    // Validate
    const validation = validateTemplate(template);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Template validation failed',
        errors: validation.errors
      });
    }

    // Save to file
    const filename = `${template.slug}-${template.id}.json`;
    const filepath = path.join(TEMPLATES_DIR, filename);

    await fs.writeFile(filepath, JSON.stringify(template, null, 2), 'utf8');

    res.status(201).json({
      success: true,
      template,
      message: 'Template created successfully'
    });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/templates/:id
 * Update an existing template
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Find existing template
    const files = await fs.readdir(TEMPLATES_DIR);
    let existingTemplate = null;
    let existingFilepath = null;

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const filepath = path.join(TEMPLATES_DIR, file);
      try {
        const content = await fs.readFile(filepath, 'utf8');
        const t = JSON.parse(content);

        if (t.id === id || t.slug === id) {
          existingTemplate = t;
          existingFilepath = filepath;
          break;
        }
      } catch (error) {
        console.error(`Error reading template ${file}:`, error);
      }
    }

    if (!existingTemplate) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    // Merge updates
    const updatedTemplate = {
      ...existingTemplate,
      ...updates,
      id: existingTemplate.id, // Don't allow ID changes
      metadata: {
        ...existingTemplate.metadata,
        ...updates.metadata,
        updated_at: new Date()
      }
    };

    // If name changed, update slug
    if (updates.name && updates.name !== existingTemplate.name) {
      updatedTemplate.slug = slugify(updates.name);
    }

    // Validate
    const validation = validateTemplate(updatedTemplate);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Template validation failed',
        errors: validation.errors
      });
    }

    // Save
    await fs.writeFile(existingFilepath, JSON.stringify(updatedTemplate, null, 2), 'utf8');

    // If slug changed, rename file
    if (updatedTemplate.slug !== existingTemplate.slug) {
      const newFilename = `${updatedTemplate.slug}-${updatedTemplate.id}.json`;
      const newFilepath = path.join(TEMPLATES_DIR, newFilename);
      await fs.rename(existingFilepath, newFilepath);
    }

    res.json({
      success: true,
      template: updatedTemplate,
      message: 'Template updated successfully'
    });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/templates/:id
 * Delete a template
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent } = req.query;

    // Find template
    const files = await fs.readdir(TEMPLATES_DIR);
    let templateFile = null;

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      try {
        const content = await fs.readFile(path.join(TEMPLATES_DIR, file), 'utf8');
        const t = JSON.parse(content);

        if (t.id === id || t.slug === id) {
          templateFile = file;
          break;
        }
      } catch (error) {
        console.error(`Error reading template ${file}:`, error);
      }
    }

    if (!templateFile) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    const filepath = path.join(TEMPLATES_DIR, templateFile);

    if (permanent === 'true') {
      // Permanently delete
      await fs.unlink(filepath);
      res.json({
        success: true,
        message: 'Template deleted permanently'
      });
    } else {
      // Soft delete - mark as inactive
      const content = await fs.readFile(filepath, 'utf8');
      const template = JSON.parse(content);
      template.metadata.is_active = false;
      template.metadata.updated_at = new Date();
      await fs.writeFile(filepath, JSON.stringify(template, null, 2), 'utf8');

      res.json({
        success: true,
        message: 'Template deactivated'
      });
    }
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/templates/:id/duplicate
 * Duplicate an existing template
 */
router.post('/:id/duplicate', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    // Find existing template
    const files = await fs.readdir(TEMPLATES_DIR);
    let existingTemplate = null;

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      try {
        const content = await fs.readFile(path.join(TEMPLATES_DIR, file), 'utf8');
        const t = JSON.parse(content);

        if (t.id === id || t.slug === id) {
          existingTemplate = t;
          break;
        }
      } catch (error) {
        console.error(`Error reading template ${file}:`, error);
      }
    }

    if (!existingTemplate) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    // Create duplicate
    const duplicateTemplate = createTemplate({
      ...existingTemplate,
      name: name || `${existingTemplate.name} (Copy)`,
      parent_template_id: existingTemplate.id
    });

    // Save
    const filename = `${duplicateTemplate.slug}-${duplicateTemplate.id}.json`;
    const filepath = path.join(TEMPLATES_DIR, filename);
    await fs.writeFile(filepath, JSON.stringify(duplicateTemplate, null, 2), 'utf8');

    res.status(201).json({
      success: true,
      template: duplicateTemplate,
      message: 'Template duplicated successfully'
    });
  } catch (error) {
    console.error('Error duplicating template:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/templates/types/list
 * Get list of available template types
 */
router.get('/types/list', async (req, res) => {
  try {
    const types = {
      types: ['love', 'money', 'career', 'health', 'spiritual', 'general', 'custom'],
      categories: ['blueprint', 'report', 'analysis', 'guide', 'reading'],
      tones: ['direct', 'gentle', 'balanced', 'spiritual', 'professional'],
      focuses: ['practical', 'spiritual', 'psychological', 'balanced', 'technical'],
      timeframes: ['immediate', 'short-term', 'long-term', 'both', 'life-span']
    };

    res.json({
      success: true,
      ...types
    });
  } catch (error) {
    console.error('Error getting template types:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/templates/:id/increment-usage
 * Increment usage counter for a template
 */
router.post('/:id/increment-usage', async (req, res) => {
  try {
    const { id } = req.params;

    // Find template
    const files = await fs.readdir(TEMPLATES_DIR);
    let template = null;
    let filepath = null;

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const fp = path.join(TEMPLATES_DIR, file);
      try {
        const content = await fs.readFile(fp, 'utf8');
        const t = JSON.parse(content);

        if (t.id === id || t.slug === id) {
          template = t;
          filepath = fp;
          break;
        }
      } catch (error) {
        console.error(`Error reading template ${file}:`, error);
      }
    }

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    // Increment usage
    template.metadata.usage_count = (template.metadata.usage_count || 0) + 1;
    template.metadata.updated_at = new Date();

    await fs.writeFile(filepath, JSON.stringify(template, null, 2), 'utf8');

    res.json({
      success: true,
      usage_count: template.metadata.usage_count
    });
  } catch (error) {
    console.error('Error incrementing usage:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
