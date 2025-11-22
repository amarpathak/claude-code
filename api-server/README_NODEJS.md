# Claude Code API Server - Node.js Version

Node.js implementation of the Claude Code API server with Express and Cloudflare tunnel support.

## Features

- ✅ REST API endpoints for Claude Code execution
- ✅ Real-time streaming responses
- ✅ API key authentication
- ✅ Cloudflare tunnel integration
- ✅ CORS support
- ✅ Environment variable configuration

## Quick Start

### Installation

```bash
npm install
```

### Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env`:

```env
CLAUDE_API_KEY=your-anthropic-api-key
ENABLE_AUTH=true
PORT=8000
HOST=0.0.0.0

# Enable Cloudflare tunnel (optional)
ENABLE_CLOUDFLARE=true

CLAUDE_CODE_PATH=claude
DEFAULT_WORKING_DIR=/path/to/working/directory
```

### Running the Server

```bash
# Production
npm start

# Development (with auto-reload)
npm run dev
```

### With Cloudflare Tunnel

Set `ENABLE_CLOUDFLARE=true` in your `.env` file. The server will automatically:
1. Start a Cloudflare tunnel
2. Print the public URL
3. Make your local server accessible from anywhere

Example output:
```
Starting Cloudflare tunnel...
✓ Cloudflare tunnel established!
Public URL: https://your-random-subdomain.trycloudflare.com
```

## API Endpoints

### Health Check
```bash
curl http://localhost:8000/health
```

### Execute Command (Non-streaming)
```bash
curl -X POST http://localhost:8000/api/execute \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "prompt": "List all Python files in the current directory",
    "timeout": 300
  }'
```

### Execute Command (Streaming)
```bash
curl -X POST http://localhost:8000/api/execute/stream \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "prompt": "Create a simple Node.js script"
  }'
```

## Using the Example Client

```bash
# Install dependencies
npm install

# Run the example client
node example_client.js
```

## Comparison with Python Version

| Feature | Python (FastAPI) | Node.js (Express) |
|---------|-----------------|-------------------|
| Framework | FastAPI | Express |
| Performance | High | High |
| Streaming | ✅ | ✅ |
| Auth | ✅ | ✅ |
| Cloudflare Tunnel | ❌ | ✅ |
| Auto Docs | ✅ (/docs) | Manual |
| Type Validation | Pydantic | Manual/Custom |

## Environment Variables

- `CLAUDE_API_KEY` - API key for authentication
- `ENABLE_AUTH` - Enable/disable authentication (default: true)
- `PORT` - Server port (default: 8000)
- `HOST` - Server host (default: 0.0.0.0)
- `ENABLE_CLOUDFLARE` - Enable Cloudflare tunnel (default: false)
- `CLAUDE_CODE_PATH` - Path to Claude Code CLI (default: claude)
- `DEFAULT_WORKING_DIR` - Default working directory
- `ANTHROPIC_BASE_URL` - Custom Anthropic API base URL (optional)

## Dependencies

- `express` - Web framework
- `cors` - CORS middleware
- `dotenv` - Environment variables
- `cloudflared` - Cloudflare tunnel integration

## License

MIT
