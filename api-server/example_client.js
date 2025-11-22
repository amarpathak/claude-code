/**
 * Example Node.js client for Claude Code API Server
 */

const https = require('https');
const http = require('http');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:8000';
const API_KEY = process.env.CLAUDE_API_KEY || 'your-api-key-here';

/**
 * Make API request
 */
async function executeClaudeCode(prompt, options = {}) {
  const {
    working_directory = null,
    timeout = 300,
    env_vars = {},
    stream = false
  } = options;

  const url = new URL(stream ? '/api/execute/stream' : '/api/execute', API_URL);
  const protocol = url.protocol === 'https:' ? https : http;

  const data = JSON.stringify({
    prompt,
    working_directory,
    timeout,
    env_vars,
    stream
  });

  return new Promise((resolve, reject) => {
    const req = protocol.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'X-API-Key': API_KEY
      }
    }, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        if (stream) {
          // Stream mode: print chunks as they arrive
          process.stdout.write(chunk.toString());
        } else {
          responseData += chunk.toString();
        }
      });

      res.on('end', () => {
        if (stream) {
          resolve({ success: true });
        } else {
          try {
            const result = JSON.parse(responseData);
            resolve(result);
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error.message}`));
          }
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

/**
 * Check server health
 */
async function healthCheck() {
  const url = new URL('/health', API_URL);
  const protocol = url.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    protocol.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk.toString();
      });

      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

// Example usage
async function main() {
  console.log('Claude Code API Client Demo\n');

  // Health check
  console.log('1. Checking server health...');
  try {
    const health = await healthCheck();
    console.log('Server Status:', health);
    console.log();
  } catch (error) {
    console.error('Health check failed:', error.message);
    return;
  }

  // Example 1: Simple execution
  console.log('2. Executing simple command (non-streaming)...');
  try {
    const result = await executeClaudeCode('List all Python files in the current directory');
    console.log('Success:', result.success);
    console.log('Output:', result.output);
    console.log('Execution time:', result.execution_time, 'seconds');
    console.log();
  } catch (error) {
    console.error('Execution failed:', error.message);
  }

  // Example 2: Streaming execution
  console.log('3. Executing with streaming...');
  try {
    await executeClaudeCode(
      'Create a simple "Hello World" Node.js script',
      { stream: true }
    );
    console.log();
  } catch (error) {
    console.error('Streaming execution failed:', error.message);
  }

  // Example 3: Custom working directory
  console.log('4. Executing with custom working directory...');
  try {
    const result = await executeClaudeCode(
      'What files are in this directory?',
      {
        working_directory: '/tmp',
        timeout: 60
      }
    );
    console.log('Success:', result.success);
    console.log('Output:', result.output);
    console.log();
  } catch (error) {
    console.error('Execution failed:', error.message);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  executeClaudeCode,
  healthCheck
};
