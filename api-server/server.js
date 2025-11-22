/**
 * Express server for executing Claude Code commands via HTTP API.
 *
 * This server provides REST endpoints to:
 * - Execute Claude Code commands
 * - Stream responses in real-time
 * - Handle authentication via API keys
 * - Support Cloudflare tunnel integration
 */

const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const cloudflared = require('cloudflared');
require('dotenv').config();

// Configuration
const API_KEY = process.env.CLAUDE_API_KEY || '';
const CLAUDE_CODE_PATH = process.env.CLAUDE_CODE_PATH || 'claude';
const DEFAULT_WORKING_DIR = process.env.DEFAULT_WORKING_DIR || process.cwd();
const ENABLE_AUTH = (process.env.ENABLE_AUTH || 'true').toLowerCase() === 'true';
const ANTHROPIC_BASE_URL = process.env.ANTHROPIC_BASE_URL || '';
const ENABLE_CLOUDFLARE = (process.env.ENABLE_CLOUDFLARE || 'false').toLowerCase() === 'true';
const PORT = parseInt(process.env.PORT || '8000', 10);
const HOST = process.env.HOST || '0.0.0.0';

// Usage tracking
const usageStats = {
  startTime: new Date(),
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  totalExecutionTime: 0,
  requestsByEndpoint: {},
  recentRequests: [],
  executeInsights: [] // Detailed insights for execute requests
};

// Express App
const app = express();

// Middleware
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Usage tracking middleware
app.use((req, res, next) => {
  const startTime = Date.now();

  // Track request
  usageStats.totalRequests++;
  const endpoint = req.path;
  usageStats.requestsByEndpoint[endpoint] = (usageStats.requestsByEndpoint[endpoint] || 0) + 1;

  // Override res.json to track response
  const originalJson = res.json.bind(res);
  res.json = function(data) {
    const executionTime = (Date.now() - startTime) / 1000;

    // Track success/failure
    if (res.statusCode >= 200 && res.statusCode < 300) {
      usageStats.successfulRequests++;
    } else {
      usageStats.failedRequests++;
    }

    // Track execution time for execute endpoints
    if (endpoint.includes('/execute') && data.execution_time) {
      usageStats.totalExecutionTime += data.execution_time;
    }

    // Store recent request (keep last 50)
    usageStats.recentRequests.unshift({
      timestamp: new Date().toISOString(),
      method: req.method,
      endpoint: endpoint,
      statusCode: res.statusCode,
      executionTime: executionTime,
      success: res.statusCode >= 200 && res.statusCode < 300
    });
    if (usageStats.recentRequests.length > 50) {
      usageStats.recentRequests.pop();
    }

    return originalJson(data);
  };

  next();
});

// Authentication middleware
const verifyApiKey = (req, res, next) => {
  if (!ENABLE_AUTH) {
    return next();
  }

  if (!API_KEY) {
    return res.status(500).json({
      error: 'Server authentication not configured'
    });
  }

  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== API_KEY) {
    return res.status(401).json({
      error: 'Invalid or missing API key'
    });
  }

  next();
};

// Utility functions
function checkClaudeCodeAvailable() {
  return new Promise((resolve) => {
    const process = spawn(CLAUDE_CODE_PATH, ['--version']);

    let timeout = setTimeout(() => {
      process.kill();
      resolve(false);
    }, 5000);

    process.on('close', (code) => {
      clearTimeout(timeout);
      resolve(code === 0);
    });

    process.on('error', () => {
      clearTimeout(timeout);
      resolve(false);
    });
  });
}

async function executeClaudeCode(prompt, workingDirectory = null, timeout = 300, envVars = {}) {
  const startTime = new Date();
  const workDir = workingDirectory || DEFAULT_WORKING_DIR;

  // Prepare environment
  const env = { ...process.env };
  if (ANTHROPIC_BASE_URL) {
    env.ANTHROPIC_BASE_URL = ANTHROPIC_BASE_URL;
  }
  Object.assign(env, envVars);

  return new Promise((resolve) => {
    let output = '';
    let errorOutput = '';
    let completed = false;

    // Start Claude Code process
    const claudeProcess = spawn(CLAUDE_CODE_PATH, [], {
      cwd: workDir,
      env: env,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Set timeout
    const timeoutId = setTimeout(() => {
      if (!completed) {
        claudeProcess.kill();
        const endTime = new Date();
        const executionTime = (endTime - startTime) / 1000;

        completed = true;
        resolve({
          success: false,
          output: output,
          error: `Execution timed out after ${timeout} seconds`,
          exit_code: -1,
          execution_time: executionTime,
          timestamp: startTime.toISOString()
        });
      }
    }, timeout * 1000);

    // Capture output
    claudeProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    claudeProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    // Handle process completion
    claudeProcess.on('close', (code) => {
      if (!completed) {
        clearTimeout(timeoutId);
        completed = true;

        const endTime = new Date();
        const executionTime = (endTime - startTime) / 1000;

        resolve({
          success: code === 0,
          output: output,
          error: errorOutput || null,
          exit_code: code,
          execution_time: executionTime,
          timestamp: startTime.toISOString()
        });
      }
    });

    claudeProcess.on('error', (err) => {
      if (!completed) {
        clearTimeout(timeoutId);
        completed = true;

        const endTime = new Date();
        const executionTime = (endTime - startTime) / 1000;

        resolve({
          success: false,
          output: output,
          error: err.message,
          exit_code: -1,
          execution_time: executionTime,
          timestamp: startTime.toISOString()
        });
      }
    });

    // Send prompt
    claudeProcess.stdin.write(prompt);
    claudeProcess.stdin.end();
  });
}

async function* streamClaudeCode(prompt, workingDirectory = null, envVars = {}) {
  const workDir = workingDirectory || DEFAULT_WORKING_DIR;

  // Prepare environment
  const env = { ...process.env };
  if (ANTHROPIC_BASE_URL) {
    env.ANTHROPIC_BASE_URL = ANTHROPIC_BASE_URL;
  }
  Object.assign(env, envVars);

  const claudeProcess = spawn(CLAUDE_CODE_PATH, [], {
    cwd: workDir,
    env: env,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  // Send prompt
  claudeProcess.stdin.write(prompt);
  claudeProcess.stdin.end();

  // Stream stdout
  for await (const chunk of claudeProcess.stdout) {
    yield chunk.toString();
  }

  // Stream stderr
  for await (const chunk of claudeProcess.stderr) {
    yield chunk.toString();
  }

  // Wait for exit
  const exitCode = await new Promise((resolve) => {
    claudeProcess.on('close', resolve);
  });

  yield `\n[Execution completed with exit code: ${exitCode}]\n`;
}

// Helper functions
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

// API Endpoints
app.get('/health', async (req, res) => {
  const claudeAvailable = await checkClaudeCodeAvailable();

  res.json({
    status: 'healthy',
    version: '1.0.0',
    claude_code_available: claudeAvailable
  });
});

app.post('/api/execute', verifyApiKey, async (req, res) => {
  const {
    prompt,
    working_directory,
    session_id,
    stream,
    timeout = 300,
    env_vars
  } = req.body;

  if (!prompt) {
    return res.status(400).json({
      error: 'Prompt is required'
    });
  }

  if (stream) {
    return res.status(400).json({
      error: 'Use /api/execute/stream endpoint for streaming responses'
    });
  }

  try {
    const result = await executeClaudeCode(
      prompt,
      working_directory,
      timeout,
      env_vars
    );

    // Store detailed insights
    const insight = {
      timestamp: result.timestamp,
      prompt: prompt.substring(0, 200) + (prompt.length > 200 ? '...' : ''),
      promptLength: prompt.length,
      outputLength: result.output.length,
      executionTime: result.execution_time,
      success: result.success,
      exitCode: result.exit_code,
      error: result.error,
      workingDirectory: working_directory || DEFAULT_WORKING_DIR,
      timeout: timeout
    };

    usageStats.executeInsights.unshift(insight);
    if (usageStats.executeInsights.length > 100) {
      usageStats.executeInsights.pop();
    }

    res.json(result);
  } catch (error) {
    const errorResult = {
      success: false,
      output: '',
      error: error.message,
      exit_code: -1,
      execution_time: 0,
      timestamp: new Date().toISOString()
    };

    // Store error insight
    const insight = {
      timestamp: errorResult.timestamp,
      prompt: prompt.substring(0, 200) + (prompt.length > 200 ? '...' : ''),
      promptLength: prompt.length,
      outputLength: 0,
      executionTime: 0,
      success: false,
      exitCode: -1,
      error: error.message,
      workingDirectory: working_directory || DEFAULT_WORKING_DIR,
      timeout: timeout
    };

    usageStats.executeInsights.unshift(insight);
    if (usageStats.executeInsights.length > 100) {
      usageStats.executeInsights.pop();
    }

    res.status(500).json(errorResult);
  }
});

app.post('/api/execute/stream', verifyApiKey, async (req, res) => {
  const {
    prompt,
    working_directory,
    env_vars
  } = req.body;

  if (!prompt) {
    return res.status(400).json({
      error: 'Prompt is required'
    });
  }

  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    for await (const chunk of streamClaudeCode(prompt, working_directory, env_vars)) {
      res.write(chunk);
    }

    res.end();
  } catch (error) {
    res.write(`\n[Error during execution: ${error.message}]\n`);
    res.end();
  }
});

app.get('/usage', (req, res) => {
  const uptime = (Date.now() - usageStats.startTime.getTime()) / 1000;
  const avgExecutionTime = usageStats.totalRequests > 0
    ? usageStats.totalExecutionTime / usageStats.totalRequests
    : 0;

  // Calculate execute-specific stats
  const totalExecutes = usageStats.executeInsights.length;
  const successfulExecutes = usageStats.executeInsights.filter(i => i.success).length;
  const avgExecuteTime = totalExecutes > 0
    ? usageStats.executeInsights.reduce((sum, i) => sum + i.executionTime, 0) / totalExecutes
    : 0;
  const avgPromptLength = totalExecutes > 0
    ? usageStats.executeInsights.reduce((sum, i) => sum + i.promptLength, 0) / totalExecutes
    : 0;
  const avgOutputLength = totalExecutes > 0
    ? usageStats.executeInsights.reduce((sum, i) => sum + i.outputLength, 0) / totalExecutes
    : 0;

  res.json({
    uptime: uptime,
    uptimeFormatted: formatUptime(uptime),
    startTime: usageStats.startTime.toISOString(),
    totalRequests: usageStats.totalRequests,
    successfulRequests: usageStats.successfulRequests,
    failedRequests: usageStats.failedRequests,
    successRate: usageStats.totalRequests > 0
      ? ((usageStats.successfulRequests / usageStats.totalRequests) * 100).toFixed(2) + '%'
      : '0%',
    totalExecutionTime: usageStats.totalExecutionTime.toFixed(2),
    averageExecutionTime: avgExecutionTime.toFixed(2),
    requestsByEndpoint: usageStats.requestsByEndpoint,
    recentRequests: usageStats.recentRequests.slice(0, 20),
    executeStats: {
      totalExecutes: totalExecutes,
      successfulExecutes: successfulExecutes,
      failedExecutes: totalExecutes - successfulExecutes,
      successRate: totalExecutes > 0
        ? ((successfulExecutes / totalExecutes) * 100).toFixed(2) + '%'
        : '0%',
      averageExecutionTime: avgExecuteTime.toFixed(2),
      averagePromptLength: Math.round(avgPromptLength),
      averageOutputLength: Math.round(avgOutputLength)
    },
    recentExecutes: usageStats.executeInsights.slice(0, 20)
  });
});

app.get('/dashboard', (req, res) => {
  const uptime = (Date.now() - usageStats.startTime.getTime()) / 1000;
  const avgExecutionTime = usageStats.totalRequests > 0
    ? usageStats.totalExecutionTime / usageStats.totalRequests
    : 0;

  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Claude Code API Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            color: white;
            margin-bottom: 30px;
        }
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
        }
        .header p {
            opacity: 0.9;
            font-size: 1.1rem;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: white;
            border-radius: 12px;
            padding: 25px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            transition: transform 0.2s;
        }
        .stat-card:hover {
            transform: translateY(-5px);
        }
        .stat-card h3 {
            color: #667eea;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 10px;
        }
        .stat-card .value {
            font-size: 2.5rem;
            font-weight: bold;
            color: #333;
        }
        .stat-card .label {
            color: #666;
            font-size: 0.9rem;
            margin-top: 5px;
        }
        .chart-card {
            background: white;
            border-radius: 12px;
            padding: 25px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            margin-bottom: 20px;
        }
        .chart-card h2 {
            color: #667eea;
            margin-bottom: 20px;
            font-size: 1.5rem;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        thead {
            background: #f7f7f7;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #eee;
        }
        th {
            font-weight: 600;
            color: #667eea;
        }
        .success { color: #10b981; font-weight: bold; }
        .failed { color: #ef4444; font-weight: bold; }
        .endpoint-bar {
            height: 30px;
            background: linear-gradient(90deg, #667eea, #764ba2);
            border-radius: 5px;
            margin: 5px 0;
            display: flex;
            align-items: center;
            padding: 0 10px;
            color: white;
            font-weight: bold;
        }
        .refresh-btn {
            background: white;
            color: #667eea;
            border: 2px solid white;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 1rem;
            font-weight: bold;
            margin-top: 20px;
            transition: all 0.2s;
        }
        .refresh-btn:hover {
            background: #667eea;
            color: white;
        }
        .auto-refresh {
            color: white;
            text-align: center;
            margin-top: 10px;
            opacity: 0.8;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Claude Code API Dashboard</h1>
            <p>Real-time monitoring and statistics</p>
            <button class="refresh-btn" onclick="location.reload()">🔄 Refresh</button>
            <div class="auto-refresh">Auto-refresh every 10 seconds</div>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <h3>Uptime</h3>
                <div class="value">${formatUptime(uptime)}</div>
                <div class="label">Since ${new Date(usageStats.startTime).toLocaleString()}</div>
            </div>
            <div class="stat-card">
                <h3>Total Requests</h3>
                <div class="value">${usageStats.totalRequests}</div>
                <div class="label">All endpoints</div>
            </div>
            <div class="stat-card">
                <h3>Success Rate</h3>
                <div class="value">${usageStats.totalRequests > 0 ? ((usageStats.successfulRequests / usageStats.totalRequests) * 100).toFixed(1) : 0}%</div>
                <div class="label">${usageStats.successfulRequests} successful / ${usageStats.failedRequests} failed</div>
            </div>
            <div class="stat-card">
                <h3>Avg Execution Time</h3>
                <div class="value">${avgExecutionTime.toFixed(2)}s</div>
                <div class="label">Per request</div>
            </div>
        </div>

        <div class="chart-card">
            <h2>📊 Requests by Endpoint</h2>
            ${Object.entries(usageStats.requestsByEndpoint)
              .sort((a, b) => b[1] - a[1])
              .map(([endpoint, count]) => {
                const maxCount = Math.max(...Object.values(usageStats.requestsByEndpoint));
                const width = (count / maxCount) * 100;
                return `
                  <div style="margin: 10px 0;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                      <span style="font-weight: bold;">${endpoint}</span>
                      <span style="color: #667eea; font-weight: bold;">${count} requests</span>
                    </div>
                    <div style="background: #f0f0f0; border-radius: 5px; overflow: hidden;">
                      <div class="endpoint-bar" style="width: ${width}%"></div>
                    </div>
                  </div>
                `;
              }).join('')}
        </div>

        <div class="chart-card">
            <h2>📝 Recent Requests (Last 20)</h2>
            <table>
                <thead>
                    <tr>
                        <th>Timestamp</th>
                        <th>Method</th>
                        <th>Endpoint</th>
                        <th>Status</th>
                        <th>Time (s)</th>
                    </tr>
                </thead>
                <tbody>
                    ${usageStats.recentRequests.slice(0, 20).map(req => `
                        <tr>
                            <td>${new Date(req.timestamp).toLocaleString()}</td>
                            <td><strong>${req.method}</strong></td>
                            <td>${req.endpoint}</td>
                            <td class="${req.success ? 'success' : 'failed'}">${req.statusCode}</td>
                            <td>${req.executionTime.toFixed(3)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        ${usageStats.executeInsights.length > 0 ? `
        <div class="chart-card">
            <h2>🤖 Execute Request Insights (Last 20)</h2>
            <div style="margin-bottom: 20px; padding: 15px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; color: white;">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
                    <div>
                        <div style="font-size: 0.9rem; opacity: 0.9;">Total Executes</div>
                        <div style="font-size: 1.5rem; font-weight: bold;">${usageStats.executeInsights.length}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.9rem; opacity: 0.9;">Success Rate</div>
                        <div style="font-size: 1.5rem; font-weight: bold;">${((usageStats.executeInsights.filter(i => i.success).length / usageStats.executeInsights.length) * 100).toFixed(1)}%</div>
                    </div>
                    <div>
                        <div style="font-size: 0.9rem; opacity: 0.9;">Avg Time</div>
                        <div style="font-size: 1.5rem; font-weight: bold;">${(usageStats.executeInsights.reduce((sum, i) => sum + i.executionTime, 0) / usageStats.executeInsights.length).toFixed(2)}s</div>
                    </div>
                    <div>
                        <div style="font-size: 0.9rem; opacity: 0.9;">Avg Prompt Size</div>
                        <div style="font-size: 1.5rem; font-weight: bold;">${Math.round(usageStats.executeInsights.reduce((sum, i) => sum + i.promptLength, 0) / usageStats.executeInsights.length)} chars</div>
                    </div>
                </div>
            </div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 140px;">Timestamp</th>
                        <th>Prompt</th>
                        <th style="width: 80px;">Status</th>
                        <th style="width: 90px;">Time (s)</th>
                        <th style="width: 90px;">Prompt</th>
                        <th style="width: 90px;">Output</th>
                    </tr>
                </thead>
                <tbody>
                    ${usageStats.executeInsights.slice(0, 20).map(insight => `
                        <tr>
                            <td style="font-size: 0.85rem;">${new Date(insight.timestamp).toLocaleTimeString()}</td>
                            <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${insight.prompt}">${insight.prompt}</td>
                            <td class="${insight.success ? 'success' : 'failed'}">${insight.success ? '✓ Success' : '✗ Failed'}</td>
                            <td><strong>${insight.executionTime.toFixed(2)}</strong></td>
                            <td style="color: #667eea;">${insight.promptLength} chars</td>
                            <td style="color: #764ba2;">${insight.outputLength} chars</td>
                        </tr>
                        ${insight.error ? `
                        <tr style="background: #fff3f3;">
                            <td colspan="6" style="padding: 8px 12px; color: #ef4444; font-size: 0.85rem;">
                                <strong>Error:</strong> ${insight.error}
                            </td>
                        </tr>
                        ` : ''}
                    `).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}
    </div>

    <script>
        // Auto-refresh every 10 seconds
        setTimeout(() => location.reload(), 10000);
    </script>
</body>
</html>
  `);
});

app.get('/', (req, res) => {
  res.json({
    name: 'Claude Code API Server',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      execute: 'POST /api/execute',
      execute_stream: 'POST /api/execute/stream',
      usage: 'GET /usage',
      dashboard: 'GET /dashboard'
    },
    documentation: '/docs'
  });
});

// Start server
async function startServer() {
  console.log(`Starting Claude Code API Server on ${HOST}:${PORT}`);
  console.log(`Authentication: ${ENABLE_AUTH ? 'enabled' : 'disabled'}`);
  console.log(`Claude Code path: ${CLAUDE_CODE_PATH}`);
  console.log(`Default working directory: ${DEFAULT_WORKING_DIR}`);
  console.log(`Cloudflare Tunnel: ${ENABLE_CLOUDFLARE ? 'enabled' : 'disabled'}`);

  const server = app.listen(PORT, HOST, () => {
    console.log(`\nAPI Documentation: http://${HOST}:${PORT}/`);
    console.log(`Health Check: http://${HOST}:${PORT}/health`);
  });

  // Setup Cloudflare tunnel if enabled
  if (ENABLE_CLOUDFLARE) {
    try {
      console.log('\nStarting Cloudflare tunnel...');
      const tunnel = cloudflared.tunnel({
        '--url': `http://localhost:${PORT}`
      });

      // Wait for URL to resolve (it's a Promise)
      const tunnelUrl = await tunnel.url;

      console.log(`\n✓ Cloudflare tunnel established!`);
      console.log(`Public URL: ${tunnelUrl}`);
      if (tunnel.connections && tunnel.connections.length > 0) {
        console.log(`Connection ID: ${tunnel.connections[0].id}`);
      }

      // Handle tunnel shutdown
      process.on('SIGINT', () => {
        console.log('\nShutting down tunnel...');
        tunnel.stop();
        server.close();
        process.exit(0);
      });
    } catch (error) {
      console.error('Failed to start Cloudflare tunnel:', error.message);
      console.log('Server will continue without tunnel support');
    }
  }

  return server;
}

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Main
if (require.main === module) {
  startServer();
}

module.exports = app;
