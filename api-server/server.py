"""
FastAPI server for executing Claude Code commands via HTTP API.

This server provides REST endpoints to:
- Execute Claude Code commands
- Stream responses in real-time
- Handle authentication via OAuth 2.0 / JWT tokens
"""

import asyncio
import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Optional, Dict, Any, List
from datetime import datetime

from fastapi import FastAPI, HTTPException, Depends, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn
import jwt
from jwt import PyJWKClient
import requests


# Configuration
CLAUDE_CODE_PATH = os.getenv("CLAUDE_CODE_PATH", "claude")
DEFAULT_WORKING_DIR = os.getenv("DEFAULT_WORKING_DIR", os.getcwd())
ENABLE_AUTH = os.getenv("ENABLE_AUTH", "true").lower() == "true"

# OAuth Configuration
OAUTH_ISSUER = os.getenv("OAUTH_ISSUER", "")  # e.g., "https://accounts.google.com"
OAUTH_AUDIENCE = os.getenv("OAUTH_AUDIENCE", "")  # Your API audience/client ID
OAUTH_JWKS_URL = os.getenv("OAUTH_JWKS_URL", "")  # e.g., "https://www.googleapis.com/oauth2/v3/certs"
OAUTH_ALGORITHMS = os.getenv("OAUTH_ALGORITHMS", "RS256").split(",")  # Comma-separated algorithms

# Security scheme
security = HTTPBearer(auto_error=False)


# Request/Response Models
class ExecuteRequest(BaseModel):
    """Request model for executing Claude Code commands."""
    prompt: str = Field(..., description="The prompt/task for Claude Code to execute")
    working_directory: Optional[str] = Field(None, description="Working directory for execution")
    session_id: Optional[str] = Field(None, description="Optional session ID for continuity")
    stream: bool = Field(False, description="Enable streaming response")
    timeout: Optional[int] = Field(300, description="Timeout in seconds (default: 300)")
    env_vars: Optional[Dict[str, str]] = Field(None, description="Additional environment variables")


class ExecuteResponse(BaseModel):
    """Response model for Claude Code execution."""
    success: bool = Field(..., description="Whether execution was successful")
    output: str = Field(..., description="Complete output from Claude Code")
    error: Optional[str] = Field(None, description="Error message if execution failed")
    exit_code: int = Field(..., description="Exit code from Claude Code process")
    execution_time: float = Field(..., description="Execution time in seconds")
    timestamp: str = Field(..., description="ISO timestamp of execution")


class HealthResponse(BaseModel):
    """Health check response."""
    status: str = Field(..., description="Service status")
    version: str = Field(..., description="API version")
    claude_code_available: bool = Field(..., description="Whether Claude Code is accessible")


# FastAPI App
app = FastAPI(
    title="Claude Code API Server",
    description="HTTP API for executing Claude Code commands",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# OAuth Token Models
class TokenData(BaseModel):
    """Decoded token data."""
    sub: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None
    scopes: List[str] = []


# Initialize JWKS client if URL is provided
jwks_client = None
if OAUTH_JWKS_URL:
    try:
        jwks_client = PyJWKClient(OAUTH_JWKS_URL)
    except Exception as e:
        print(f"Warning: Failed to initialize JWKS client: {e}")


# Authentication
async def verify_oauth_token(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> TokenData:
    """
    Verify OAuth 2.0 JWT token from Authorization header.

    Supports:
    - JWT token validation with JWKS
    - Common OAuth providers (Google, GitHub, Auth0, etc.)
    - Custom OAuth servers

    Args:
        credentials: Bearer token from Authorization header

    Returns:
        TokenData with user information

    Raises:
        HTTPException: If token is invalid or missing
    """
    if not ENABLE_AUTH:
        # Auth disabled, return empty token data
        return TokenData()

    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    try:
        # Decode and verify JWT token
        if jwks_client:
            # Use JWKS for public key retrieval
            signing_key = jwks_client.get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=OAUTH_ALGORITHMS,
                audience=OAUTH_AUDIENCE if OAUTH_AUDIENCE else None,
                issuer=OAUTH_ISSUER if OAUTH_ISSUER else None,
                options={
                    "verify_signature": True,
                    "verify_exp": True,
                    "verify_aud": bool(OAUTH_AUDIENCE),
                    "verify_iss": bool(OAUTH_ISSUER),
                }
            )
        else:
            # Decode without verification (for development/testing)
            # WARNING: This is insecure for production
            payload = jwt.decode(
                token,
                options={"verify_signature": False},
                algorithms=OAUTH_ALGORITHMS
            )
            print("Warning: Token validation without signature verification!")

        # Extract user information
        token_data = TokenData(
            sub=payload.get("sub"),
            email=payload.get("email"),
            name=payload.get("name"),
            scopes=payload.get("scope", "").split() if "scope" in payload else []
        )

        return token_data

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidAudienceError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token audience",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidIssuerError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token issuer",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token validation failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


# Utility functions
def check_claude_code_available() -> bool:
    """Check if Claude Code CLI is available."""
    try:
        result = subprocess.run(
            [CLAUDE_CODE_PATH, "--version"],
            capture_output=True,
            timeout=5
        )
        return result.returncode == 0
    except Exception:
        return False


async def execute_claude_code(
    prompt: str,
    working_directory: Optional[str] = None,
    timeout: Optional[int] = 300,
    env_vars: Optional[Dict[str, str]] = None
) -> Dict[str, Any]:
    """
    Execute Claude Code with the given prompt.

    Args:
        prompt: The task/prompt for Claude Code
        working_directory: Directory to execute in
        timeout: Timeout in seconds
        env_vars: Additional environment variables

    Returns:
        Dictionary with execution results
    """
    start_time = datetime.now()
    work_dir = working_directory or DEFAULT_WORKING_DIR

    # Prepare environment
    env = os.environ.copy()
    if env_vars:
        env.update(env_vars)

    # Prepare command
    cmd = [CLAUDE_CODE_PATH]

    try:
        # Execute Claude Code
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=work_dir,
            env=env
        )

        # Send prompt and get output
        stdout, stderr = await asyncio.wait_for(
            process.communicate(input=prompt.encode()),
            timeout=timeout
        )

        end_time = datetime.now()
        execution_time = (end_time - start_time).total_seconds()

        output = stdout.decode('utf-8', errors='replace')
        error_output = stderr.decode('utf-8', errors='replace')

        return {
            "success": process.returncode == 0,
            "output": output,
            "error": error_output if error_output else None,
            "exit_code": process.returncode,
            "execution_time": execution_time,
            "timestamp": start_time.isoformat()
        }

    except asyncio.TimeoutError:
        end_time = datetime.now()
        execution_time = (end_time - start_time).total_seconds()

        return {
            "success": False,
            "output": "",
            "error": f"Execution timed out after {timeout} seconds",
            "exit_code": -1,
            "execution_time": execution_time,
            "timestamp": start_time.isoformat()
        }

    except Exception as e:
        end_time = datetime.now()
        execution_time = (end_time - start_time).total_seconds()

        return {
            "success": False,
            "output": "",
            "error": str(e),
            "exit_code": -1,
            "execution_time": execution_time,
            "timestamp": start_time.isoformat()
        }


async def stream_claude_code(
    prompt: str,
    working_directory: Optional[str] = None,
    env_vars: Optional[Dict[str, str]] = None
):
    """
    Stream Claude Code output in real-time.

    Yields lines of output as they become available.
    """
    work_dir = working_directory or DEFAULT_WORKING_DIR

    # Prepare environment
    env = os.environ.copy()
    if env_vars:
        env.update(env_vars)

    # Prepare command
    cmd = [CLAUDE_CODE_PATH]

    try:
        # Start process
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            cwd=work_dir,
            env=env
        )

        # Send prompt
        process.stdin.write(prompt.encode())
        process.stdin.close()

        # Stream output
        while True:
            line = await process.stdout.readline()
            if not line:
                break

            yield line.decode('utf-8', errors='replace')

        # Wait for process to complete
        await process.wait()

        # Send final status
        yield f"\n[Execution completed with exit code: {process.returncode}]\n"

    except Exception as e:
        yield f"\n[Error during execution: {str(e)}]\n"


# API Endpoints
@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        claude_code_available=check_claude_code_available()
    )


@app.post("/api/execute", response_model=ExecuteResponse)
async def execute(
    request: ExecuteRequest,
    token_data: TokenData = Depends(verify_oauth_token)
):
    """
    Execute a Claude Code command and return the complete response.

    Requires Authorization: Bearer <token> header for authentication (if ENABLE_AUTH=true).
    """
    if request.stream:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Use /api/execute/stream endpoint for streaming responses"
        )

    result = await execute_claude_code(
        prompt=request.prompt,
        working_directory=request.working_directory,
        timeout=request.timeout,
        env_vars=request.env_vars
    )

    return ExecuteResponse(**result)


@app.post("/api/execute/stream")
async def execute_stream(
    request: ExecuteRequest,
    token_data: TokenData = Depends(verify_oauth_token)
):
    """
    Execute a Claude Code command and stream the response in real-time.

    Requires Authorization: Bearer <token> header for authentication (if ENABLE_AUTH=true).
    Returns a text/event-stream response.
    """
    return StreamingResponse(
        stream_claude_code(
            prompt=request.prompt,
            working_directory=request.working_directory,
            env_vars=request.env_vars
        ),
        media_type="text/event-stream"
    )


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "name": "Claude Code API Server",
        "version": "1.0.0",
        "endpoints": {
            "health": "GET /health",
            "execute": "POST /api/execute",
            "execute_stream": "POST /api/execute/stream"
        },
        "documentation": "/docs"
    }


# Main entry point
if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "0.0.0.0")

    print(f"Starting Claude Code API Server on {host}:{port}")
    print(f"Authentication: {'OAuth 2.0 / JWT' if ENABLE_AUTH else 'disabled'}")
    if ENABLE_AUTH:
        print(f"OAuth Issuer: {OAUTH_ISSUER or 'Not configured'}")
        print(f"OAuth Audience: {OAUTH_AUDIENCE or 'Not configured'}")
        print(f"JWKS URL: {OAUTH_JWKS_URL or 'Not configured (insecure!)'}")
    print(f"Claude Code path: {CLAUDE_CODE_PATH}")
    print(f"Default working directory: {DEFAULT_WORKING_DIR}")
    print(f"\nAPI Documentation: http://{host}:{port}/docs")

    uvicorn.run(
        app,
        host=host,
        port=port,
        log_level="info"
    )
