#!/bin/bash

# Start script for Claude Code API Server (Node.js version)

set -e

echo "=== Claude Code API Server (Node.js) Startup Script ==="
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found"
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo "✅ Created .env file"
    echo "⚠️  Please edit .env with your configuration before running again"
    exit 1
fi

# Check if node_modules exists
if [ ! -d node_modules ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo "✅ Dependencies installed"
    echo ""
fi

# Load environment variables
source .env

# Validate configuration
echo "🔍 Validating configuration..."
if [ "$ENABLE_AUTH" = "true" ] && [ -z "$CLAUDE_API_KEY" ]; then
    echo "❌ Error: CLAUDE_API_KEY is required when ENABLE_AUTH=true"
    exit 1
fi

# Check if Claude Code is available
if ! command -v "$CLAUDE_CODE_PATH" &> /dev/null; then
    echo "⚠️  Warning: Claude Code CLI not found at: $CLAUDE_CODE_PATH"
    echo "Please install Claude Code or update CLAUDE_CODE_PATH in .env"
fi

echo "✅ Configuration validated"
echo ""

# Display configuration
echo "📋 Server Configuration:"
echo "  - Host: $HOST"
echo "  - Port: $PORT"
echo "  - Auth: $ENABLE_AUTH"
echo "  - Cloudflare Tunnel: ${ENABLE_CLOUDFLARE:-false}"
echo "  - Claude Code Path: $CLAUDE_CODE_PATH"
echo "  - Working Directory: $DEFAULT_WORKING_DIR"
echo ""

# Start server
echo "🚀 Starting server..."
echo ""

# Use nodemon for development if available
if command -v nodemon &> /dev/null; then
    echo "Using nodemon for auto-reload..."
    npm run dev
else
    npm start
fi
