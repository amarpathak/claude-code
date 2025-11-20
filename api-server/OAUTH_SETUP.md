# OAuth 2.0 Setup Guide

This guide explains how to configure the Claude Code API Server with OAuth 2.0 authentication using JWT tokens.

## Overview

The API server uses **OAuth 2.0 with JWT tokens** for authentication. It supports:

- ✅ JWT token validation with signature verification
- ✅ JWKS (JSON Web Key Set) for public key retrieval
- ✅ Multiple OAuth providers (Google, Auth0, GitHub, Azure AD, Okta, etc.)
- ✅ Custom OAuth servers
- ✅ Token expiration validation
- ✅ Audience and issuer validation

## How It Works

1. **Client obtains token**: User authenticates with OAuth provider and receives a JWT token
2. **Client sends token**: Include token in `Authorization: Bearer <token>` header
3. **Server validates token**: Server verifies signature, expiration, audience, and issuer
4. **Request processed**: If valid, the Claude Code command is executed

## Configuration

### Environment Variables

Configure these in your `.env` file:

```bash
# Enable authentication
ENABLE_AUTH=true

# OAuth Issuer (who issued the token)
OAUTH_ISSUER=https://accounts.google.com

# OAuth Audience (who the token is intended for - usually your client ID)
OAUTH_AUDIENCE=your-client-id.apps.googleusercontent.com

# JWKS URL (where to fetch public keys for verification)
OAUTH_JWKS_URL=https://www.googleapis.com/oauth2/v3/certs

# Supported algorithms (comma-separated)
OAUTH_ALGORITHMS=RS256
```

## Provider-Specific Setup

### Google OAuth

**1. Create OAuth Client:**
- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Navigate to "APIs & Services" → "Credentials"
- Create OAuth 2.0 Client ID
- Note your Client ID

**2. Configure .env:**
```bash
OAUTH_ISSUER=https://accounts.google.com
OAUTH_AUDIENCE=your-client-id.apps.googleusercontent.com
OAUTH_JWKS_URL=https://www.googleapis.com/oauth2/v3/certs
OAUTH_ALGORITHMS=RS256
```

**3. Get Token:**
```bash
# Use Google's OAuth playground or your own auth flow
# Example using gcloud:
gcloud auth print-identity-token
```

**4. Make Request:**
```bash
TOKEN="your-google-jwt-token"
curl -X POST http://localhost:8000/api/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "List files"}'
```

---

### Auth0

**1. Create API in Auth0:**
- Go to [Auth0 Dashboard](https://manage.auth0.com/)
- Navigate to "Applications" → "APIs"
- Create new API
- Note the API Identifier (audience)

**2. Configure .env:**
```bash
OAUTH_ISSUER=https://your-domain.auth0.com/
OAUTH_AUDIENCE=your-api-identifier
OAUTH_JWKS_URL=https://your-domain.auth0.com/.well-known/jwks.json
OAUTH_ALGORITHMS=RS256
```

**3. Get Token:**
```bash
curl --request POST \
  --url https://your-domain.auth0.com/oauth/token \
  --header 'content-type: application/json' \
  --data '{
    "client_id":"your-client-id",
    "client_secret":"your-client-secret",
    "audience":"your-api-identifier",
    "grant_type":"client_credentials"
  }'
```

**4. Make Request:**
```bash
TOKEN="your-auth0-access-token"
curl -X POST http://localhost:8000/api/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "List files"}'
```

---

### GitHub Actions (OIDC)

**1. Enable GitHub OIDC:**
- No setup required, GitHub Actions automatically provides OIDC tokens

**2. Configure .env:**
```bash
OAUTH_ISSUER=https://token.actions.githubusercontent.com
OAUTH_AUDIENCE=your-audience
OAUTH_JWKS_URL=https://token.actions.githubusercontent.com/.well-known/jwks
OAUTH_ALGORITHMS=RS256
```

**3. Use in GitHub Actions:**
```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
    steps:
      - name: Get OIDC Token
        id: token
        run: |
          TOKEN=$(curl -H "Authorization: bearer $ACTIONS_ID_TOKEN_REQUEST_TOKEN" \
            "$ACTIONS_ID_TOKEN_REQUEST_URL&audience=your-audience" | jq -r '.value')
          echo "::set-output name=token::$TOKEN"

      - name: Call API
        run: |
          curl -X POST http://your-api/api/execute \
            -H "Authorization: Bearer ${{ steps.token.outputs.token }}" \
            -H "Content-Type: application/json" \
            -d '{"prompt": "Deploy application"}'
```

---

### Azure AD (Microsoft Entra ID)

**1. Register Application:**
- Go to [Azure Portal](https://portal.azure.com/)
- Navigate to "Azure Active Directory" → "App registrations"
- Register new application
- Add API permissions
- Create client secret
- Note: Tenant ID, Client ID, Client Secret

**2. Configure .env:**
```bash
OAUTH_ISSUER=https://login.microsoftonline.com/{tenant-id}/v2.0
OAUTH_AUDIENCE=api://your-client-id
OAUTH_JWKS_URL=https://login.microsoftonline.com/{tenant-id}/discovery/v2.0/keys
OAUTH_ALGORITHMS=RS256
```

**3. Get Token:**
```bash
curl -X POST https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=your-client-id" \
  -d "scope=api://your-client-id/.default" \
  -d "client_secret=your-client-secret" \
  -d "grant_type=client_credentials"
```

**4. Make Request:**
```bash
TOKEN="your-azure-access-token"
curl -X POST http://localhost:8000/api/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "List files"}'
```

---

### Okta

**1. Create Authorization Server:**
- Go to [Okta Admin Console](https://your-domain.okta.com/admin)
- Navigate to "Security" → "API" → "Authorization Servers"
- Use default or create new
- Create scopes and claims

**2. Configure .env:**
```bash
OAUTH_ISSUER=https://your-domain.okta.com/oauth2/default
OAUTH_AUDIENCE=api://default
OAUTH_JWKS_URL=https://your-domain.okta.com/oauth2/default/v1/keys
OAUTH_ALGORITHMS=RS256
```

**3. Get Token:**
```bash
curl -X POST https://your-domain.okta.com/oauth2/default/v1/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=your-client-id" \
  -d "client_secret=your-client-secret" \
  -d "grant_type=client_credentials" \
  -d "scope=custom_scope"
```

**4. Make Request:**
```bash
TOKEN="your-okta-access-token"
curl -X POST http://localhost:8000/api/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "List files"}'
```

---

### Custom OAuth Server

If you have your own OAuth 2.0 server:

**1. Requirements:**
- Must issue JWT tokens
- Must expose JWKS endpoint for public keys
- Tokens should include standard claims: `iss`, `aud`, `exp`, `sub`

**2. Configure .env:**
```bash
OAUTH_ISSUER=https://your-oauth-server.com
OAUTH_AUDIENCE=your-api-audience
OAUTH_JWKS_URL=https://your-oauth-server.com/.well-known/jwks.json
OAUTH_ALGORITHMS=RS256,ES256
```

**3. Token Format:**
Ensure tokens have these claims:
```json
{
  "iss": "https://your-oauth-server.com",
  "aud": "your-api-audience",
  "sub": "user-id",
  "exp": 1234567890,
  "iat": 1234567000,
  "email": "user@example.com",
  "name": "User Name"
}
```

## Testing OAuth Setup

### 1. Disable Auth for Testing

For development, you can disable auth:

```bash
ENABLE_AUTH=false
```

### 2. Decode JWT Token

Verify your token structure:

```bash
# Install jwt-cli: cargo install jwt-cli
jwt decode your-token-here
```

Or use [jwt.io](https://jwt.io) to decode and inspect tokens.

### 3. Test Token Validation

```bash
TOKEN="your-jwt-token"

# Test health endpoint (no auth required)
curl http://localhost:8000/health

# Test execute endpoint (requires auth)
curl -X POST http://localhost:8000/api/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "echo test"}' \
  -v
```

Expected responses:
- **401 Unauthorized**: Token invalid/missing
- **200 OK**: Token valid, request processed

### 4. Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Missing authorization token` | No Authorization header | Add `Authorization: Bearer <token>` |
| `Token has expired` | Token exp claim is in the past | Get a new token |
| `Invalid token audience` | Token aud doesn't match OAUTH_AUDIENCE | Check OAUTH_AUDIENCE configuration |
| `Invalid token issuer` | Token iss doesn't match OAUTH_ISSUER | Check OAUTH_ISSUER configuration |
| `Invalid token signature` | Signature verification failed | Check JWKS URL and token |

## Security Best Practices

### 1. Always Use JWKS in Production

```bash
# Good: Uses JWKS for signature verification
OAUTH_JWKS_URL=https://provider.com/.well-known/jwks.json

# Bad: No JWKS = no signature verification (insecure!)
OAUTH_JWKS_URL=
```

### 2. Validate Audience

```bash
# Always specify audience
OAUTH_AUDIENCE=your-api-identifier
```

### 3. Use HTTPS in Production

```bash
# Configure reverse proxy (nginx, traefik, etc.) with SSL/TLS
```

### 4. Rotate Secrets Regularly

- OAuth client secrets should be rotated
- Monitor token usage and revoke suspicious tokens

### 5. Set Token Expiration

Configure your OAuth provider to issue short-lived tokens:
- Access tokens: 15-60 minutes
- Use refresh tokens for longer sessions

### 6. Scope Validation (Optional)

To add scope validation, modify the `verify_oauth_token` function in `server.py`:

```python
def verify_oauth_token(credentials: HTTPAuthorizationCredentials = Security(security)) -> TokenData:
    # ... existing validation code ...

    # Add scope validation
    required_scopes = {"api:execute"}
    token_scopes = set(payload.get("scope", "").split())

    if not required_scopes.issubset(token_scopes):
        raise HTTPException(
            status_code=403,
            detail="Insufficient permissions"
        )
```

## Client Examples

### Python Client with OAuth

```python
import requests

# Get token from your OAuth provider
def get_oauth_token():
    # Implementation depends on your OAuth provider
    # Example for client credentials flow:
    response = requests.post(
        "https://oauth-provider.com/oauth/token",
        data={
            "grant_type": "client_credentials",
            "client_id": "your-client-id",
            "client_secret": "your-client-secret",
            "audience": "your-api-audience"
        }
    )
    return response.json()["access_token"]

# Use token to call API
def execute_claude(prompt: str):
    token = get_oauth_token()

    response = requests.post(
        "http://localhost:8000/api/execute",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        },
        json={"prompt": prompt}
    )

    return response.json()

# Usage
result = execute_claude("List all files")
print(result['output'])
```

### JavaScript Client with OAuth

```javascript
// Get token from OAuth provider
async function getOAuthToken() {
  const response = await fetch('https://oauth-provider.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: 'your-client-id',
      client_secret: 'your-client-secret',
      audience: 'your-api-audience'
    })
  });

  const data = await response.json();
  return data.access_token;
}

// Use token to call API
async function executeClaude(prompt) {
  const token = await getOAuthToken();

  const response = await fetch('http://localhost:8000/api/execute', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ prompt })
  });

  return await response.json();
}

// Usage
executeClaude('List all files')
  .then(result => console.log(result.output));
```

## Troubleshooting

### JWKS Client Initialization Failed

**Error**: `Warning: Failed to initialize JWKS client`

**Solution**: Check that OAUTH_JWKS_URL is accessible:
```bash
curl https://your-oauth-provider.com/.well-known/jwks.json
```

### Token Validation Without Signature Verification

**Warning**: `Warning: Token validation without signature verification!`

**Cause**: OAUTH_JWKS_URL is not configured

**Solution**: Configure JWKS URL in `.env`

### Cannot Verify Token Signature

**Error**: `Invalid token signature`

**Causes**:
1. Wrong JWKS URL
2. Token signed with different key
3. Token from different issuer

**Solution**: Verify issuer and JWKS URL match your OAuth provider

## Advanced Configuration

### Multiple Algorithms

Support multiple signing algorithms:

```bash
OAUTH_ALGORITHMS=RS256,RS384,RS512,ES256,ES384
```

### Custom Token Claims

Access custom claims in your endpoints:

```python
@app.post("/api/execute")
async def execute(
    request: ExecuteRequest,
    token_data: TokenData = Depends(verify_oauth_token)
):
    # Access user info from token
    user_email = token_data.email
    user_id = token_data.sub

    # Log or use for access control
    print(f"Request from: {user_email}")

    # ... rest of execution
```

### Token Caching

For better performance, cache validated tokens (be careful with expiration):

```python
from functools import lru_cache
from datetime import datetime, timedelta

token_cache = {}

def get_cached_token_data(token: str) -> Optional[TokenData]:
    if token in token_cache:
        cached_data, cached_time = token_cache[token]
        if datetime.now() - cached_time < timedelta(minutes=5):
            return cached_data
    return None
```

## Migration from API Keys

If migrating from API key authentication:

1. **Update client code** to use OAuth tokens instead of API keys
2. **Update headers** from `X-API-Key` to `Authorization: Bearer`
3. **Test thoroughly** before deploying to production
4. **Communicate changes** to all API consumers

## Support

For issues with OAuth setup:
1. Check server logs for detailed error messages
2. Verify token claims using jwt.io
3. Test JWKS endpoint accessibility
4. Review provider-specific documentation

## References

- [OAuth 2.0 RFC 6749](https://tools.ietf.org/html/rfc6749)
- [JWT RFC 7519](https://tools.ietf.org/html/rfc7519)
- [JWKS RFC 7517](https://tools.ietf.org/html/rfc7517)
- [OpenID Connect](https://openid.net/connect/)
