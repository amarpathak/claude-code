# Claude Code API - Quick Start Guide

## Overview

Access Claude Code programmatically via HTTP API. Make requests from any application or programming language.

---

## 🚀 Starting the Server

### Option 1: Quick Start Script
```bash
cd /Users/amarpathak/claude-code/api-server
./start_server.sh
```

### Option 2: Manual Start
```bash
cd /Users/amarpathak/claude-code/api-server

# Set environment variables
export ENABLE_AUTH=true
export CLAUDE_API_KEY=N_46E33UCjDr9mmHkE__oGFFWhaeoyEQNLtECaIONl4
export CLAUDE_CODE_PATH=/Users/amarpathak/.nvm/versions/node/v22.15.0/bin/claude
export DEFAULT_WORKING_DIR=/Users/amarpathak/claude-code

# Start server
python3 server.py
```

Server will be available at:
- **API**: http://localhost:8000
- **Interactive Docs**: http://localhost:8000/docs
- **Alternative Docs**: http://localhost:8000/redoc

---

## 🔑 Authentication

All requests require the `X-API-Key` header:

```bash
X-API-Key: N_46E33UCjDr9mmHkE__oGFFWhaeoyEQNLtECaIONl4
```

To disable authentication (local dev only):
```bash
export ENABLE_AUTH=false
```

---

## 📡 API Endpoints

### 1. Health Check

Check if the service is running and Claude Code is available.

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

---

### 2. Execute Command (Complete Response)

Send a task to Claude Code and receive the complete response.

**Endpoint:** `POST /api/execute`

**Request:**
```bash
curl -X POST http://localhost:8000/api/execute \
  -H "X-API-Key: N_46E33UCjDr9mmHkE__oGFFWhaeoyEQNLtECaIONl4" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "List all Python files in the current directory",
    "working_directory": "/Users/amarpathak/claude-code",
    "timeout": 120
  }'
```

**Response:**
```json
{
  "success": true,
  "output": "... Claude Code response ...",
  "error": null,
  "exit_code": 0,
  "execution_time": 3.45,
  "timestamp": "2025-11-20T22:37:38.809040"
}
```

---

### 3. Execute Command (Streaming)

Stream Claude Code output in real-time.

**Endpoint:** `POST /api/execute/stream`

**Request:**
```bash
curl -X POST http://localhost:8000/api/execute/stream \
  -H "X-API-Key: N_46E33UCjDr9mmHkE__oGFFWhaeoyEQNLtECaIONl4" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Explain the server.py file",
    "working_directory": "/Users/amarpathak/claude-code/api-server"
  }' \
  --no-buffer
```

Output will stream line-by-line as Claude Code processes the request.

---

## 💻 Code Examples

### Python

```python
import requests

API_URL = "http://localhost:8000"
API_KEY = "N_46E33UCjDr9mmHkE__oGFFWhaeoyEQNLtECaIONl4"

def ask_claude(prompt, working_dir=None):
    """Send a prompt to Claude Code API"""
    headers = {
        "X-API-Key": API_KEY,
        "Content-Type": "application/json"
    }

    payload = {
        "prompt": prompt,
        "timeout": 120
    }

    if working_dir:
        payload["working_directory"] = working_dir

    response = requests.post(
        f"{API_URL}/api/execute",
        headers=headers,
        json=payload
    )

    return response.json()

# Example usage
result = ask_claude("What files are in the current directory?")

if result["success"]:
    print("Output:", result["output"])
else:
    print("Error:", result["error"])
```

### Python (Streaming)

```python
import requests

API_URL = "http://localhost:8000"
API_KEY = "N_46E33UCjDr9mmHkE__oGFFWhaeoyEQNLtECaIONl4"

def stream_claude(prompt):
    """Stream output from Claude Code"""
    headers = {
        "X-API-Key": API_KEY,
        "Content-Type": "application/json"
    }

    payload = {"prompt": prompt}

    response = requests.post(
        f"{API_URL}/api/execute/stream",
        headers=headers,
        json=payload,
        stream=True
    )

    for line in response.iter_lines():
        if line:
            print(line.decode('utf-8'))

# Example usage
stream_claude("Analyze the codebase structure")
```

### JavaScript/Node.js

```javascript
const fetch = require('node-fetch');

const API_URL = 'http://localhost:8000';
const API_KEY = 'N_46E33UCjDr9mmHkE__oGFFWhaeoyEQNLtECaIONl4';

async function askClaude(prompt, workingDir = null) {
  const response = await fetch(`${API_URL}/api/execute`, {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt: prompt,
      working_directory: workingDir,
      timeout: 120
    })
  });

  return await response.json();
}

// Example usage
askClaude('List all JavaScript files')
  .then(result => {
    if (result.success) {
      console.log('Output:', result.output);
    } else {
      console.error('Error:', result.error);
    }
  });
```

### cURL (Bash)

```bash
#!/bin/bash

API_URL="http://localhost:8000"
API_KEY="N_46E33UCjDr9mmHkE__oGFFWhaeoyEQNLtECaIONl4"

# Simple request
curl -X POST "$API_URL/api/execute" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"prompt\": \"Show git status\",
    \"timeout\": 30
  }"
```

---

## 🎯 Common Use Cases

### 1. File Operations

```bash
curl -X POST http://localhost:8000/api/execute \
  -H "X-API-Key: N_46E33UCjDr9mmHkE__oGFFWhaeoyEQNLtECaIONl4" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Create a hello.py file that prints Hello World"
  }'
```

### 2. Code Analysis

```bash
curl -X POST http://localhost:8000/api/execute \
  -H "X-API-Key: N_46E33UCjDr9mmHkE__oGFFWhaeoyEQNLtECaIONl4" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Find all TODO comments in Python files"
  }'
```

### 3. Git Operations

```bash
curl -X POST http://localhost:8000/api/execute \
  -H "X-API-Key: N_46E33UCjDr9mmHkE__oGFFWhaeoyEQNLtECaIONl4" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Show git status and list uncommitted changes"
  }'
```

### 4. Documentation

```bash
curl -X POST http://localhost:8000/api/execute \
  -H "X-API-Key: N_46E33UCjDr9mmHkE__oGFFWhaeoyEQNLtECaIONl4" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Explain what the server.py file does"
  }'
```

### 5. Code Generation

```bash
curl -X POST http://localhost:8000/api/execute \
  -H "X-API-Key: N_46E33UCjDr9mmHkE__oGFFWhaeoyEQNLtECaIONl4" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Write a function to validate email addresses",
    "timeout": 60
  }'
```

---

## ⚙️ Request Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `prompt` | string | ✅ Yes | - | Task for Claude Code to execute |
| `working_directory` | string | ❌ No | `/Users/amarpathak/claude-code` | Directory to execute in |
| `session_id` | string | ❌ No | null | Session ID for continuity |
| `timeout` | integer | ❌ No | 300 | Timeout in seconds |
| `env_vars` | object | ❌ No | null | Additional environment variables |

---

## 📊 Response Format

### Success Response
```json
{
  "success": true,
  "output": "Claude Code's response...",
  "error": null,
  "exit_code": 0,
  "execution_time": 2.34,
  "timestamp": "2025-11-20T22:37:38.809040"
}
```

### Error Response
```json
{
  "success": false,
  "output": "",
  "error": "Error message",
  "exit_code": 1,
  "execution_time": 1.23,
  "timestamp": "2025-11-20T22:37:38.809040"
}
```

---

## 🛠️ Configuration

Edit `/Users/amarpathak/claude-code/api-server/.env`:

```bash
# Enable/disable authentication
ENABLE_AUTH=true

# API key for authentication
CLAUDE_API_KEY=N_46E33UCjDr9mmHkE__oGFFWhaeoyEQNLtECaIONl4

# Server host and port
HOST=0.0.0.0
PORT=8000

# Claude Code CLI path
CLAUDE_CODE_PATH=/Users/amarpathak/.nvm/versions/node/v22.15.0/bin/claude

# Default working directory
DEFAULT_WORKING_DIR=/Users/amarpathak/claude-code
```

---

## 🐛 Troubleshooting

### Server won't start

**Check if port is in use:**
```bash
lsof -i :8000
```

**Use different port:**
```bash
export PORT=8001
python3 server.py
```

### Authentication errors

**Error:** `Invalid or missing API key`

**Solution:** Check your API key matches the one in `.env`:
```bash
cat /Users/amarpathak/claude-code/api-server/.env | grep CLAUDE_API_KEY
```

### Claude Code not found

**Error:** `claude_code_available: false`

**Solution:** Verify Claude path:
```bash
which claude
# Update CLAUDE_CODE_PATH in .env if needed
```

### Timeout errors

**Error:** `Execution timed out after 300 seconds`

**Solution:** Increase timeout in request:
```json
{
  "prompt": "your task",
  "timeout": 600
}
```

---

## 🔒 Security Notes

1. **API Key**: Keep your API key secret. Don't commit `.env` to git
2. **Local Network**: Server binds to `0.0.0.0` (accessible on local network)
3. **Production**: Use HTTPS via reverse proxy for production
4. **CORS**: Currently allows all origins - restrict in production
5. **Rate Limiting**: Consider adding rate limiting for production use

---

## 📚 Additional Resources

- **Interactive API Docs**: http://localhost:8000/docs
- **Full README**: `/Users/amarpathak/claude-code/api-server/README.md`
- **Example Client**: `/Users/amarpathak/claude-code/api-server/example_client.py`
- **Usage Examples**: `/Users/amarpathak/claude-code/api-server/USAGE_EXAMPLES.md`

---

## 🎉 Quick Test

Verify everything works:

```bash
# 1. Start server
cd /Users/amarpathak/claude-code/api-server
./start_server.sh

# 2. In another terminal, test:
curl -X POST http://localhost:8000/api/execute \
  -H "X-API-Key: N_46E33UCjDr9mmHkE__oGFFWhaeoyEQNLtECaIONl4" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "What is 2+2?"}'
```

Expected output:
```json
{
  "success": true,
  "output": "4\n",
  "error": null,
  "exit_code": 0,
  ...
}
```

---

## Using Claudex Alias

The `claudex` command is now available as an alias for `claude`:

```bash
# Open a new terminal, then:
claudex
claudex --help
claudex --version
```

---

**Questions?** Check http://localhost:8000/docs for interactive API documentation.
