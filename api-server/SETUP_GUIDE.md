# Claude Code API Server - Setup Guide

## Overview

This API server allows HTTP access to Claude Code functionality, enabling you to use Claude Code as a file-based data storage and manipulation system through REST APIs.

## Architecture

```
HTTP API Request → FastAPI Server → Claude Code CLI → File Operations in Working Directory
```

The server spawns Claude Code as a subprocess, sets the working directory, sends prompts via stdin, and captures output via stdout/stderr.

## Prerequisites

1. **Claude Code CLI** installed and accessible
2. **Python 3.8+** with pip
3. **Anthropic API Key** (for Claude Code authentication)

## Installation Steps

### 1. Install Dependencies

```bash
pip install fastapi uvicorn pydantic
```

### 2. Set Environment Variables

```bash
# Required: Your API key for server authentication
export CLAUDE_API_KEY="your-secret-api-key"

# Required: Your Anthropic API key for Claude Code
export ANTHROPIC_AUTH_TOKEN="your-anthropic-api-key"

# Optional: Path to Claude Code CLI (defaults to 'claude')
export CLAUDE_CODE_PATH="claude"

# Optional: Default working directory (defaults to current directory)
export DEFAULT_WORKING_DIR="/path/to/data/folder"

# Optional: Custom Anthropic base URL
export ANTHROPIC_BASE_URL="https://your-custom-gateway.com"

# Optional: Disable authentication (not recommended for production)
export ENABLE_AUTH="true"

# Optional: Server configuration
export HOST="0.0.0.0"
export PORT="8000"
```

### 3. Run the Server

```bash
python server.py
```

Or with inline environment variables:

```bash
CLAUDE_API_KEY="your-key" \
ANTHROPIC_AUTH_TOKEN="sk-ant-xxx" \
DEFAULT_WORKING_DIR="/path/to/data" \
python server.py
```

## API Usage

### Health Check

```bash
curl http://localhost:8000/health
```

### Execute Command (Non-Streaming)

```bash
curl -X POST http://localhost:8000/api/execute \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-api-key" \
  -d '{
    "prompt": "Create a file called users.json with sample user data",
    "working_directory": "/path/to/data/folder",
    "timeout": 300
  }'
```

### Execute Command (Streaming)

```bash
curl -X POST http://localhost:8000/api/execute/stream \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-api-key" \
  -d '{
    "prompt": "Read and analyze all JSON files in this directory",
    "working_directory": "/path/to/data/folder"
  }'
```

## Use Cases for File-Based Data Storage

### 1. Store Data

```bash
curl -X POST http://localhost:8000/api/execute \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-key" \
  -d '{
    "prompt": "Create a file called customer_123.json with: {\"id\": \"123\", \"name\": \"Alice\", \"email\": \"alice@example.com\"}",
    "working_directory": "/data/customers"
  }'
```

### 2. Retrieve Data

```bash
curl -X POST http://localhost:8000/api/execute \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-key" \
  -d '{
    "prompt": "Read customer_123.json and return its contents",
    "working_directory": "/data/customers"
  }'
```

### 3. Update Data

```bash
curl -X POST http://localhost:8000/api/execute \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-key" \
  -d '{
    "prompt": "Update customer_123.json: change the email to newemail@example.com",
    "working_directory": "/data/customers"
  }'
```

### 4. Query/Search Data

```bash
curl -X POST http://localhost:8000/api/execute \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-key" \
  -d '{
    "prompt": "Find all JSON files where the status field is active",
    "working_directory": "/data/customers"
  }'
```

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `prompt` | string | Yes | The task for Claude Code to execute |
| `working_directory` | string | No | Directory where Claude Code operates (defaults to DEFAULT_WORKING_DIR) |
| `timeout` | integer | No | Timeout in seconds (default: 300) |
| `env_vars` | object | No | Additional environment variables to pass |
| `stream` | boolean | No | Enable streaming (only for /api/execute/stream) |

## Response Format

```json
{
  "success": true,
  "output": "File created successfully...",
  "error": null,
  "exit_code": 0,
  "execution_time": 2.5,
  "timestamp": "2025-11-22T10:30:00"
}
```

## Security Considerations

1. **Enable Authentication**: Set `ENABLE_AUTH=true` and use strong API keys
2. **Restrict Access**: Use firewall rules to limit access to trusted IPs
3. **Working Directory Permissions**: Ensure Claude Code only has access to intended directories
4. **HTTPS**: Use a reverse proxy (nginx, Caddy) with SSL certificates in production
5. **Rate Limiting**: Implement rate limiting to prevent abuse

## Production Deployment

### Using systemd (Linux)

Create `/etc/systemd/system/claude-api.service`:

```ini
[Unit]
Description=Claude Code API Server
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/api-server
Environment="CLAUDE_API_KEY=your-key"
Environment="ANTHROPIC_AUTH_TOKEN=sk-ant-xxx"
Environment="DEFAULT_WORKING_DIR=/data"
ExecStart=/usr/bin/python3 /path/to/api-server/server.py
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable claude-api
sudo systemctl start claude-api
```

### Using Docker

Create `Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY server.py .
RUN pip install fastapi uvicorn pydantic

# Install Claude Code CLI
RUN pip install anthropic-claude-code

ENV CLAUDE_API_KEY=""
ENV ANTHROPIC_AUTH_TOKEN=""
ENV DEFAULT_WORKING_DIR="/data"

EXPOSE 8000

CMD ["python", "server.py"]
```

Build and run:

```bash
docker build -t claude-api .
docker run -d -p 8000:8000 \
  -e CLAUDE_API_KEY="your-key" \
  -e ANTHROPIC_AUTH_TOKEN="sk-ant-xxx" \
  -v /path/to/data:/data \
  claude-api
```

## Multiple API Servers (Different Accounts/URLs)

To run multiple instances with different accounts or base URLs:

```bash
# Server 1 - Account A
CLAUDE_API_KEY="key1" \
ANTHROPIC_AUTH_TOKEN="sk-ant-account-a" \
PORT="8001" \
DEFAULT_WORKING_DIR="/data/account-a" \
python server.py &

# Server 2 - Account B
CLAUDE_API_KEY="key2" \
ANTHROPIC_AUTH_TOKEN="sk-ant-account-b" \
PORT="8002" \
DEFAULT_WORKING_DIR="/data/account-b" \
python server.py &

# Server 3 - Custom Base URL
CLAUDE_API_KEY="key3" \
ANTHROPIC_BASE_URL="https://custom-gateway.com" \
PORT="8003" \
DEFAULT_WORKING_DIR="/data/custom" \
python server.py &
```

## Troubleshooting

### Claude Code Not Found

```bash
# Install Claude Code CLI
npm install -g @anthropics/claude-code

# Or set path explicitly
export CLAUDE_CODE_PATH="/path/to/claude"
```

### Authentication Errors

- Verify `ANTHROPIC_AUTH_TOKEN` is set correctly
- Check API key has proper permissions
- Ensure `X-API-Key` header matches `CLAUDE_API_KEY`

### Permission Denied

- Ensure working directory exists and is writable
- Check file permissions: `chmod 755 /path/to/data`

### Timeout Issues

- Increase timeout: `"timeout": 600` in request
- For long-running tasks, use streaming endpoint

## API Documentation

Interactive API documentation available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Support

For issues or questions:
- Check logs: `journalctl -u claude-api -f` (systemd)
- Review Claude Code docs: https://code.claude.com/docs
- API Reference: See `API_REFERENCE.md`
