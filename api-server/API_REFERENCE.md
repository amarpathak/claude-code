  # Claude Code API - Complete Reference

  Comprehensive API documentation for integrating Claude Code into your applications.

  ---

  ## Table of Contents

  1. [Overview](#overview)
  2. [Authentication](#authentication)
  3. [API Endpoints](#api-endpoints)
  4. [Request & Response Formats](#request--response-formats)
  5. [Environment Configuration](#environment-configuration)
  6. [Advanced Usage](#advanced-usage)
  7. [Error Handling](#error-handling)
  8. [Rate Limiting & Best Practices](#rate-limiting--best-practices)
  9. [Integration Examples](#integration-examples)
  10. [Troubleshooting](#troubleshooting)

  ---

  ## Overview

  **Base URL:** `http://localhost:8000`

  The Claude Code API allows you to programmatically execute Claude Code commands via HTTP. Claude Code itself connects to Anthropic's API (or a custom endpoint via `ANTHROPIC_BASE_URL`).

  ### Architecture Flow

  ```
  Your Application → API Server (port 8000) → Claude Code CLI → Anthropic API (or custom endpoint at port 8080)
  ```

  ### Key Features

  - ✅ Execute coding tasks programmatically
  - ✅ Stream responses in real-time
  - ✅ Customize working directories
  - ✅ Pass environment variables
  - ✅ Session management for context continuity
  - ✅ Configurable timeouts
  - ✅ Full authentication support

  ---

  ## Authentication

  ### API Key Authentication

  All requests require the `X-API-Key` header:

  ```http
  X-API-Key: N_46E33UCjDr9mmHkE__oGFFWhaeoyEQNLtECaIONl4
  ```

  ### Disabling Authentication (Development Only)

  Set in `.env`:
  ```bash
  ENABLE_AUTH=false
  ```

  ### Authentication Errors

  | Status Code | Error | Description |
  |------------|-------|-------------|
  | `401` | Invalid or missing API key | API key is incorrect or not provided |
  | `500` | Server authentication not configured | Server's API key not set |

  ---

  ## API Endpoints

  ### 1. Health Check

  **Endpoint:** `GET /health`

  **Description:** Check if the service is running and Claude Code CLI is accessible.

  **Authentication:** Not required

  **Request:**
  ```bash
  curl http://localhost:8000/health
  ```

  **Response:**
  ```json
  {
    "status": "healthy",
    "version": "1.0.0",
    "claude_code_available": true
  }
  ```

  **Response Fields:**
  - `status` (string): Service status ("healthy" or "unhealthy")
  - `version` (string): API version
  - `claude_code_available` (boolean): Whether Claude Code CLI is accessible

  ---

  ### 2. Execute Command (Complete Response)

  **Endpoint:** `POST /api/execute`

  **Description:** Execute a Claude Code command and receive the complete response after execution finishes.

  **Authentication:** Required

  **Request Body:**
  ```json
  {
    "prompt": "Your task for Claude Code",
    "working_directory": "/path/to/directory",
    "session_id": "optional-session-id",
    "timeout": 300,
    "env_vars": {
      "KEY": "value"
    }
  }
  ```

  **Request Parameters:**

  | Parameter | Type | Required | Default | Description |
  |-----------|------|----------|---------|-------------|
  | `prompt` | string | ✅ Yes | - | Task/command for Claude Code to execute |
  | `working_directory` | string | ❌ No | `/Users/amarpathak/claude-code` | Directory where Claude Code will run |
  | `session_id` | string | ❌ No | `null` | Session ID for maintaining context across requests |
  | `timeout` | integer | ❌ No | `300` | Maximum execution time in seconds (max: 600) |
  | `env_vars` | object | ❌ No | `null` | Additional environment variables to pass to Claude Code |

  **Example Request:**
  ```bash
  curl -X POST http://localhost:8000/api/execute \
    -H "X-API-Key: N_46E33UCjDr9mmHkE__oGFFWhaeoyEQNLtECaIONl4" \
    -H "Content-Type: application/json" \
    -d '{
      "prompt": "List all Python files and count lines in each",
      "working_directory": "/Users/amarpathak/claude-code",
      "timeout": 120
    }'
  ```

  **Response:**
  ```json
  {
    "success": true,
    "output": "Found 5 Python files:\n1. server.py - 344 lines\n2. example_client.py - 89 lines\n...",
    "error": null,
    "exit_code": 0,
    "execution_time": 3.45,
    "timestamp": "2025-11-20T22:37:38.809040"
  }
  ```

  **Response Fields:**
  - `success` (boolean): Whether execution completed successfully
  - `output` (string): Complete output from Claude Code
  - `error` (string|null): Error message if execution failed
  - `exit_code` (integer): Exit code from Claude Code process (0 = success)
  - `execution_time` (float): Total execution time in seconds
  - `timestamp` (string): ISO 8601 timestamp of execution start

  ---

  ### 3. Execute Command (Streaming)

  **Endpoint:** `POST /api/execute/stream`

  **Description:** Execute a Claude Code command and stream the response in real-time as it's generated.

  **Authentication:** Required

  **Request Body:**
  ```json
  {
    "prompt": "Your task for Claude Code",
    "working_directory": "/path/to/directory",
    "env_vars": {
      "KEY": "value"
    }
  }
  ```

  **Request Parameters:**

  | Parameter | Type | Required | Default | Description |
  |-----------|------|----------|---------|-------------|
  | `prompt` | string | ✅ Yes | - | Task/command for Claude Code to execute |
  | `working_directory` | string | ❌ No | `/Users/amarpathak/claude-code` | Directory where Claude Code will run |
  | `env_vars` | object | ❌ No | `null` | Additional environment variables |

  **Note:** Streaming endpoint does NOT support `timeout` or `session_id` parameters.

  **Example Request:**
  ```bash
  curl -X POST http://localhost:8000/api/execute/stream \
    -H "X-API-Key: N_46E33UCjDr9mmHkE__oGFFWhaeoyEQNLtECaIONl4" \
    -H "Content-Type: application/json" \
    -d '{
      "prompt": "Analyze the codebase structure and explain each file",
      "working_directory": "/Users/amarpathak/claude-code/api-server"
    }' \
    --no-buffer
  ```

  **Response:** `text/event-stream`

  Output streams line-by-line as Claude Code processes the request. Final line includes:
  ```
  [Execution completed with exit code: 0]
  ```

  ---

  ### 4. Root Endpoint

  **Endpoint:** `GET /`

  **Description:** Get basic API information and available endpoints.

  **Authentication:** Not required

  **Response:**
  ```json
  {
    "name": "Claude Code API Server",
    "version": "1.0.0",
    "endpoints": {
      "health": "GET /health",
      "execute": "POST /api/execute",
      "execute_stream": "POST /api/execute/stream"
    },
    "documentation": "/docs"
  }
  ```

  ---

  ### 5. Interactive Documentation

  **Endpoint:** `GET /docs`

  **Description:** Swagger/OpenAPI interactive API documentation

  **Authentication:** Not required

  **Access:** Visit `http://localhost:8000/docs` in your browser

  ---

  ### 6. Alternative Documentation

  **Endpoint:** `GET /redoc`

  **Description:** ReDoc interactive API documentation

  **Authentication:** Not required

  **Access:** Visit `http://localhost:8000/redoc` in your browser

  ---

  ## Request & Response Formats

  ### Content Type
  All POST requests must use:
  ```
  Content-Type: application/json
  ```

  ### Response Status Codes

  | Status Code | Meaning |
  |------------|---------|
  | `200` | Success |
  | `400` | Bad Request (invalid parameters) |
  | `401` | Unauthorized (missing/invalid API key) |
  | `500` | Internal Server Error |

  ### Success Response Schema
  ```typescript
  {
    success: boolean;
    output: string;
    error: string | null;
    exit_code: number;
    execution_time: number;
    timestamp: string;  // ISO 8601 format
  }
  ```

  ### Error Response Schema
  ```typescript
  {
    success: false;
    output: string;  // Empty or partial output
    error: string;   // Error description
    exit_code: number;  // -1 for internal errors
    execution_time: number;
    timestamp: string;
  }
  ```

  ---

  ## Environment Configuration

  ### Server Configuration (`.env`)

  ```bash
  # API Authentication
  ENABLE_AUTH=true
  CLAUDE_API_KEY=N_46E33UCjDr9mmHkE__oGFFWhaeoyEQNLtECaIONl4

  # Server Configuration
  HOST=0.0.0.0
  PORT=8000

  # Claude Code Configuration
  CLAUDE_CODE_PATH=/Users/amarpathak/.nvm/versions/node/v22.15.0/bin/claude
  DEFAULT_WORKING_DIR=/Users/amarpathak/claude-code

  # Anthropic API Configuration for Claude Code
  ANTHROPIC_BASE_URL=http://localhost:8080
  ```

  ### Configuration Options

  | Variable | Description | Default |
  |----------|-------------|---------|
  | `ENABLE_AUTH` | Enable/disable API key authentication | `true` |
  | `CLAUDE_API_KEY` | API key for authentication | - |
  | `HOST` | Server bind address | `0.0.0.0` |
  | `PORT` | Server port | `8000` |
  | `CLAUDE_CODE_PATH` | Path to Claude Code CLI | `claude` |
  | `DEFAULT_WORKING_DIR` | Default working directory | Current directory |
  | `ANTHROPIC_BASE_URL` | Custom Anthropic API endpoint | - |

  ### Custom Anthropic Endpoint

  The `ANTHROPIC_BASE_URL` is passed to Claude Code subprocess, allowing it to use a custom API endpoint instead of Anthropic's default API:

  ```bash
  # Use local proxy or custom endpoint
  ANTHROPIC_BASE_URL=http://localhost:8080

  # Use custom domain
  ANTHROPIC_BASE_URL=https://custom-api.example.com
  ```

  ---

  ## Advanced Usage

  ### 1. Session Management

  Use `session_id` to maintain context across multiple requests:

  ```python
  import requests

  API_URL = "http://localhost:8000"
  API_KEY = "N_46E33UCjDr9mmHkE__oGFFWhaeoyEQNLtECaIONl4"

  session_id = "project-review-session-1"

  # First request
  response1 = requests.post(
      f"{API_URL}/api/execute",
      headers={"X-API-Key": API_KEY, "Content-Type": "application/json"},
      json={
          "prompt": "Read the config.py file",
          "session_id": session_id
      }
  )

  # Second request - Claude remembers previous context
  response2 = requests.post(
      f"{API_URL}/api/execute",
      headers={"X-API-Key": API_KEY, "Content-Type": "application/json"},
      json={
          "prompt": "What database is configured in that file?",
          "session_id": session_id  # Same session
      }
  )
  ```

  ### 2. Custom Environment Variables

  Pass custom environment variables to Claude Code:

  ```bash
  curl -X POST http://localhost:8000/api/execute \
    -H "X-API-Key: N_46E33UCjDr9mmHkE__oGFFWhaeoyEQNLtECaIONl4" \
    -H "Content-Type: application/json" \
    -d '{
      "prompt": "Deploy the application",
      "env_vars": {
        "ENVIRONMENT": "staging",
        "DEBUG": "true",
        "CUSTOM_VAR": "custom_value"
      }
    }'
  ```

  ### 3. Long-Running Tasks

  For tasks that may take longer than 5 minutes:

  ```python
  response = requests.post(
      f"{API_URL}/api/execute",
      headers={"X-API-Key": API_KEY, "Content-Type": "application/json"},
      json={
          "prompt": "Run comprehensive test suite and generate coverage report",
          "timeout": 600  # 10 minutes
      }
  )
  ```

  ### 4. Working Directory Management

  Execute commands in specific directories:

  ```javascript
  const response = await fetch(`${API_URL}/api/execute`, {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt: 'Analyze TypeScript errors',
      working_directory: '/Users/amarpathak/projects/frontend'
    })
  });
  ```

  ### 5. Streaming with Progress Tracking

  ```python
  import requests

  def execute_with_progress(prompt):
      response = requests.post(
          f"{API_URL}/api/execute/stream",
          headers={
              "X-API-Key": API_KEY,
              "Content-Type": "application/json"
          },
          json={"prompt": prompt},
          stream=True
      )

      for line in response.iter_lines():
          if line:
              output = line.decode('utf-8')
              print(output)  # Real-time output

              # Check for completion
              if "[Execution completed" in output:
                  print("\n✓ Task completed")
                  break

  # Usage
  execute_with_progress("Refactor all utility functions with JSDoc comments")
  ```

  ---

  ## Error Handling

  ### Common Errors

  #### 1. Timeout Error
  ```json
  {
    "success": false,
    "output": "",
    "error": "Execution timed out after 300 seconds",
    "exit_code": -1,
    "execution_time": 300.0,
    "timestamp": "2025-11-20T22:37:38.809040"
  }
  ```

  **Solution:** Increase timeout or break task into smaller steps.

  #### 2. Claude Code Not Found
  ```json
  {
    "success": false,
    "output": "",
    "error": "[Errno 2] No such file or directory: 'claude'",
    "exit_code": -1,
    "execution_time": 0.01,
    "timestamp": "2025-11-20T22:37:38.809040"
  }
  ```

  **Solution:** Verify `CLAUDE_CODE_PATH` in `.env` is correct.

  #### 3. Working Directory Not Found
  ```json
  {
    "success": false,
    "output": "",
    "error": "[Errno 2] No such file or directory: '/invalid/path'",
    "exit_code": -1,
    "execution_time": 0.01,
    "timestamp": "2025-11-20T22:37:38.809040"
  }
  ```

  **Solution:** Use valid absolute paths for `working_directory`.

  #### 4. Authentication Error
  ```json
  {
    "detail": "Invalid or missing API key"
  }
  ```

  **Solution:** Check `X-API-Key` header matches `.env` configuration.

  ### Implementing Retry Logic

  ```python
  import time
  import requests

  def execute_with_retry(prompt, max_retries=3):
      for attempt in range(max_retries):
          try:
              response = requests.post(
                  f"{API_URL}/api/execute",
                  headers={
                      "X-API-Key": API_KEY,
                      "Content-Type": "application/json"
                  },
                  json={"prompt": prompt, "timeout": 120}
              )

              data = response.json()

              if data["success"]:
                  return data
              else:
                  print(f"Attempt {attempt + 1} failed: {data['error']}")

          except Exception as e:
              print(f"Attempt {attempt + 1} error: {str(e)}")

          if attempt < max_retries - 1:
              time.sleep(2 ** attempt)  # Exponential backoff

      return None
  ```

  ---

  ## Rate Limiting & Best Practices

  ### Best Practices

  1. **Use Appropriate Timeouts**
    - Simple queries: 30-60 seconds
    - File operations: 60-120 seconds
    - Complex analysis: 120-300 seconds
    - Long-running tasks: 300-600 seconds

  2. **Batch Related Tasks**
    - Use session IDs to maintain context
    - Combine related operations in single prompts

  3. **Handle Streaming Properly**
    - Use streaming for long-running tasks
    - Implement proper buffer handling
    - Handle disconnections gracefully

  4. **Security**
    - Keep API keys secret
    - Use HTTPS in production
    - Implement rate limiting in production
    - Validate working directories

  5. **Error Handling**
    - Implement retry logic with exponential backoff
    - Handle timeouts gracefully
    - Log errors for debugging

  ---

  ## Integration Examples

  ### 1. Python CLI Tool

  ```python
  #!/usr/bin/env python3
  import argparse
  import requests
  import sys

  API_URL = "http://localhost:8000"
  API_KEY = "N_46E33UCjDr9mmHkE__oGFFWhaeoyEQNLtECaIONl4"

  def ask_claude(prompt, working_dir=None, stream=False):
      headers = {
          "X-API-Key": API_KEY,
          "Content-Type": "application/json"
      }

      payload = {"prompt": prompt}
      if working_dir:
          payload["working_directory"] = working_dir

      endpoint = "/api/execute/stream" if stream else "/api/execute"

      if stream:
          response = requests.post(
              f"{API_URL}{endpoint}",
              headers=headers,
              json=payload,
              stream=True
          )
          for line in response.iter_lines():
              if line:
                  print(line.decode('utf-8'))
      else:
          response = requests.post(
              f"{API_URL}{endpoint}",
              headers=headers,
              json=payload
          )
          data = response.json()
          if data["success"]:
              print(data["output"])
          else:
              print(f"Error: {data['error']}", file=sys.stderr)
              sys.exit(1)

  if __name__ == "__main__":
      parser = argparse.ArgumentParser(description="Claude Code CLI")
      parser.add_argument("prompt", help="Task for Claude")
      parser.add_argument("-d", "--dir", help="Working directory")
      parser.add_argument("-s", "--stream", action="store_true", help="Stream output")

      args = parser.parse_args()
      ask_claude(args.prompt, args.dir, args.stream)
  ```

  **Usage:**
  ```bash
  ./claude_cli.py "List Python files" -d /path/to/project -s
  ```

  ---

  ### 2. Node.js Service

  ```javascript
  const express = require('express');
  const fetch = require('node-fetch');

  const app = express();
  app.use(express.json());

  const CLAUDE_API_URL = 'http://localhost:8000';
  const CLAUDE_API_KEY = 'N_46E33UCjDr9mmHkE__oGFFWhaeoyEQNLtECaIONl4';

  app.post('/code-review', async (req, res) => {
    const { files, repository } = req.body;

    const prompt = `Review the following files in ${repository}: ${files.join(', ')}.
                    Identify issues and suggest improvements.`;

    try {
      const response = await fetch(`${CLAUDE_API_URL}/api/execute`, {
        method: 'POST',
        headers: {
          'X-API-Key': CLAUDE_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: prompt,
          working_directory: repository,
          timeout: 300
        })
      });

      const result = await response.json();

      if (result.success) {
        res.json({
          review: result.output,
          execution_time: result.execution_time
        });
      } else {
        res.status(500).json({ error: result.error });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.listen(3000, () => {
    console.log('Code review service running on port 3000');
  });
  ```

  ---

  ### 3. GitHub Action Integration

  ```yaml
  name: Claude Code Review
  on: [pull_request]

  jobs:
    review:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v2

        - name: Run Claude Code Review
          run: |
            curl -X POST http://your-server:8000/api/execute \
              -H "X-API-Key: ${{ secrets.CLAUDE_API_KEY }}" \
              -H "Content-Type: application/json" \
              -d "{
                \"prompt\": \"Review the changes in this PR and provide feedback\",
                \"working_directory\": \"${{ github.workspace }}\"
              }" > review.json

            cat review.json
  ```

  ---

  ### 4. Web Dashboard

  ```html
  <!DOCTYPE html>
  <html>
  <head>
    <title>Claude Code Dashboard</title>
  </head>
  <body>
    <div id="dashboard">
      <h1>Claude Code Dashboard</h1>

      <div>
        <label>Task:</label>
        <textarea id="task" rows="3" cols="50"></textarea>
      </div>

      <div>
        <label>Working Directory:</label>
        <input type="text" id="workdir" value="/Users/amarpathak/claude-code">
      </div>

      <button onclick="executeTask()">Execute</button>

      <div id="output"></div>
    </div>

    <script>
      const API_URL = 'http://localhost:8000';
      const API_KEY = 'N_46E33UCjDr9mmHkE__oGFFWhaeoyEQNLtECaIONl4';

      async function executeTask() {
        const task = document.getElementById('task').value;
        const workdir = document.getElementById('workdir').value;
        const output = document.getElementById('output');

        output.innerHTML = 'Processing...';

        try {
          const response = await fetch(`${API_URL}/api/execute`, {
            method: 'POST',
            headers: {
              'X-API-Key': API_KEY,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              prompt: task,
              working_directory: workdir
            })
          });

          const result = await response.json();

          if (result.success) {
            output.innerHTML = `<pre>${result.output}</pre>`;
          } else {
            output.innerHTML = `<span style="color:red">Error: ${result.error}</span>`;
          }
        } catch (error) {
          output.innerHTML = `<span style="color:red">Error: ${error.message}</span>`;
        }
      }
    </script>
  </body>
  </html>
  ```

  ---

  ## Troubleshooting

  ### Issue: Port Already in Use

  **Error:**
  ```
  ERROR: [Errno 48] error while attempting to bind on address ('0.0.0.0', 8000): address already in use
  ```

  **Solution:**
  ```bash
  # Find process using port 8000
  lsof -i :8000

  # Kill the process
  kill -9 <PID>

  # Or use different port
  export PORT=8001
  python3 server.py
  ```

  ---

  ### Issue: CORS Errors in Browser

  **Error:**
  ```
  Access to fetch at 'http://localhost:8000/api/execute' from origin 'http://localhost:3000' has been blocked by CORS policy
  ```

  **Solution:** Server already has CORS enabled. If issues persist:
  1. Check browser console for specific error
  2. Ensure requests include proper headers
  3. Use same protocol (http/https)

  ---

  ### Issue: Slow Response Times

  **Symptoms:** Requests taking longer than expected

  **Solutions:**
  1. Check Claude Code CLI performance directly
  2. Verify `ANTHROPIC_BASE_URL` endpoint is responsive
  3. Use streaming for immediate feedback
  4. Reduce timeout for faster failure detection
  5. Monitor server resources (CPU/Memory)

  ---

  ### Issue: Authentication Fails

  **Error:**
  ```json
  {"detail": "Invalid or missing API key"}
  ```

  **Checklist:**
  - ✅ API key in `.env` matches request header
  - ✅ Header name is exactly `X-API-Key` (case-sensitive)
  - ✅ No extra spaces in header value
  - ✅ Server restarted after `.env` changes

  ---

  ## Support & Resources

  - **Quick Start Guide:** `/Users/amarpathak/claude-code/api-server/QUICK_START.md`
  - **Interactive Docs:** `http://localhost:8000/docs`
  - **Example Client:** `/Users/amarpathak/claude-code/api-server/example_client.py`
  - **Chat Demo:** `/Users/amarpathak/claude-code/api-server/chat-demo.html`

  ---

  **Last Updated:** 2025-11-20
  **API Version:** 1.0.0
