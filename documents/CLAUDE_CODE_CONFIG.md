# Claude Code Configuration Files

## File 1: `.env.claude` (Environment Variables)

Copy this template and fill in your actual API keys:

```bash
# ============================================================================
# DATABASE CONFIGURATION
# ============================================================================

DATABASE_URL=postgresql://username:password@hostname:5432/ai_voice_assistant
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ai_voice_assistant

# ============================================================================
# AUTHENTICATION & SECURITY
# ============================================================================

JWT_SECRET=your-super-secret-jwt-key-must-be-at-least-32-characters-long
JWT_EXPIRY=7d

# Generate 32-byte hex string for ENCRYPTION_KEY:
# In Node.js: require('crypto').randomBytes(32).toString('hex')
# Or use: openssl rand -hex 32
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# ============================================================================
# LLM PROVIDERS (Model API Keys)
# ============================================================================

# OpenAI (GPT-4, GPT-3.5-Turbo, etc.)
# Get from: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-...

# Anthropic (Claude, Claude Opus, Claude Sonnet, etc.)
# Get from: https://console.anthropic.com
ANTHROPIC_API_KEY=sk-ant-...

# Google Vertex AI
# Requires: Project ID, Service Account Key
GOOGLE_PROJECT_ID=your-project-id
GOOGLE_CREDENTIALS_PATH=./path/to/service-account-key.json

# OpenRouter (Model aggregator - access to 100+ models)
# Get from: https://openrouter.ai
OPENROUTER_API_KEY=sk-...

# Azure OpenAI
AZURE_OPENAI_API_KEY=your-azure-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/

# xAI (Grok)
# Get from: xAI platform
XAI_API_KEY=...

# Mistral AI
# Get from: https://console.mistral.ai
MISTRAL_API_KEY=...

# Perplexity AI
PERPLEXITY_API_KEY=...

# ============================================================================
# VOICE PROVIDERS (Text-to-Speech)
# ============================================================================

# ElevenLabs (Voice synthesis)
# Get from: https://elevenlabs.io/app/settings/api-keys
ELEVENLABS_API_KEY=...

# Deepgram (Voice synthesis + Speech-to-Text)
# Get from: https://console.deepgram.com
DEEPGRAM_API_KEY=...

# Saarvam (Indian voice provider)
SAARVAM_API_KEY=...

# ============================================================================
# SPEECH-TO-TEXT PROVIDERS (Transcription)
# ============================================================================

# Deepgram (STT)
# Get from: https://console.deepgram.com
DEEPGRAM_STT_API_KEY=... # Can use same as DEEPGRAM_API_KEY

# Assembly AI (STT)
# Get from: https://www.assemblyai.com/app
ASSEMBLY_AI_API_KEY=...

# Saarvam (STT)
SAARVAM_STT_API_KEY=... # Can use same as SAARVAM_API_KEY

# ElevenLabs (STT)
# Get from: https://elevenlabs.io/app/settings/api-keys
ELEVENLABS_STT_API_KEY=... # Can use same as ELEVENLABS_API_KEY

# ============================================================================
# PHONE PROVIDERS
# ============================================================================

# Twilio (Phone calls & SMS)
# Get from: https://console.twilio.com
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here

# Vobiz (SIP Trunking)
# Get from: Your Vobiz account
VOBIZ_USERNAME=your_vobiz_username
VOBIZ_PASSWORD=your_vobiz_password
VOBIZ_SIP_DOMAIN=your_sip_domain.vobiz.com

# ============================================================================
# VECTOR DATABASE (Knowledge Base)
# ============================================================================

# Pinecone (Vector DB for document embeddings)
# Get from: https://app.pinecone.io
PINECONE_API_KEY=...
PINECONE_ENVIRONMENT=us-west1-gcp
PINECONE_INDEX_NAME=knowledge-base

# Alternative: Weaviate
# WEAVIATE_URL=http://localhost:8080
# WEAVIATE_API_KEY=...

# Alternative: Qdrant
# QDRANT_URL=http://localhost:6333
# QDRANT_COLLECTION_NAME=knowledge-base

# ============================================================================
# EMBEDDINGS (for knowledge base)
# ============================================================================

# OpenAI Embeddings (recommended)
# Uses same OPENAI_API_KEY above
EMBEDDINGS_MODEL=text-embedding-3-small
EMBEDDINGS_DIMENSION=1536

# ============================================================================
# MCP INTEGRATIONS
# ============================================================================

# GitHub MCP (for version control)
# Generate from: https://github.com/settings/tokens
# Required permissions: repo, workflow
GITHUB_TOKEN=ghp_...
GITHUB_REPO=your-username/ai-voice-assistant
GITHUB_BRANCH=main

# Slack MCP (for notifications)
# Create bot at: https://api.slack.com
# Get token from: OAuth & Permissions
SLACK_BOT_TOKEN=xoxb-...
SLACK_CHANNEL=#development

# PostgreSQL MCP
# Uses DATABASE_URL above

# Pinecone MCP
# Uses PINECONE_API_KEY and PINECONE_ENVIRONMENT above

# ============================================================================
# APPLICATION CONFIGURATION
# ============================================================================

# Node environment
NODE_ENV=development
PORT=5000

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# Backend URL (for frontend API calls)
BACKEND_URL=http://localhost:5000

# Webhook URL (for Twilio to call backend)
# In production: https://yourdomain.com
WEBHOOK_BASE_URL=http://localhost:5000

# ============================================================================
# LOGGING & MONITORING
# ============================================================================

LOG_LEVEL=info
LOG_FILE=./logs/app.log

# Optional: Sentry (error tracking)
SENTRY_DSN=

# Optional: DataDog (monitoring)
DATADOG_API_KEY=

# ============================================================================
# NOTES FOR SETUP
# ============================================================================
# 1. Copy this file to .env.claude
# 2. Fill in all API keys from provider dashboards (see comments above)
# 3. NEVER commit this file to GitHub
# 4. Use .env.example for template without secrets
# 5. For development: set NODE_ENV=development
# 6. For production: set NODE_ENV=production
# 7. Ensure all API keys have minimal required permissions
# 8. Rotate keys periodically (especially in production)

```

---

## File 2: `.env.example` (Template without secrets)

```bash
# Copy this to .env.claude and fill in your actual values

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ai_voice_assistant
DB_USER=
DB_PASSWORD=
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ai_voice_assistant

# Security
JWT_SECRET=
JWT_EXPIRY=7d
ENCRYPTION_KEY=

# LLM Providers
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_PROJECT_ID=
GOOGLE_CREDENTIALS_PATH=
OPENROUTER_API_KEY=
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_ENDPOINT=
XAI_API_KEY=
MISTRAL_API_KEY=
PERPLEXITY_API_KEY=

# Voice Providers
ELEVENLABS_API_KEY=
DEEPGRAM_API_KEY=
SAARVAM_API_KEY=

# Speech-to-Text Providers
DEEPGRAM_STT_API_KEY=
ASSEMBLY_AI_API_KEY=
SAARVAM_STT_API_KEY=
ELEVENLABS_STT_API_KEY=

# Phone Providers
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
VOBIZ_USERNAME=
VOBIZ_PASSWORD=
VOBIZ_SIP_DOMAIN=

# Vector Database
PINECONE_API_KEY=
PINECONE_ENVIRONMENT=
PINECONE_INDEX_NAME=knowledge-base
EMBEDDINGS_MODEL=text-embedding-3-small
EMBEDDINGS_DIMENSION=1536

# MCP Integrations
GITHUB_TOKEN=
GITHUB_REPO=
GITHUB_BRANCH=main
SLACK_BOT_TOKEN=
SLACK_CHANNEL=

# Application
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000
WEBHOOK_BASE_URL=http://localhost:5000

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log

```

---

## File 3: `claude-code.config.json` (MCP Configuration)

```json
{
  "environment": "development",
  "language": "typescript",
  
  "skills": [
    {
      "name": "frontend-design",
      "enabled": true,
      "description": "For building React components and UI"
    },
    {
      "name": "product-self-knowledge",
      "enabled": false,
      "description": "Optional: for Anthropic API integration"
    }
  ],
  
  "mcps": [
    {
      "name": "github",
      "enabled": true,
      "critical": true,
      "description": "Version control - required for commits/pushes",
      "config": {
        "token": "${GITHUB_TOKEN}",
        "repository": "${GITHUB_REPO}",
        "branch": "${GITHUB_BRANCH}",
        "autoCommit": true,
        "commitTemplate": "[Claude Code] ${type}: ${description}",
        "pushOnCommit": true
      }
    },
    {
      "name": "postgresql",
      "enabled": true,
      "critical": true,
      "description": "Database - for queries, migrations, debugging",
      "config": {
        "connectionString": "${DATABASE_URL}",
        "host": "${DB_HOST}",
        "port": "${DB_PORT}",
        "database": "${DB_NAME}",
        "user": "${DB_USER}",
        "password": "${DB_PASSWORD}",
        "ssl": {
          "enabled": false,
          "rejectUnauthorized": true
        },
        "poolSize": 10
      }
    },
    {
      "name": "pinecone",
      "enabled": true,
      "critical": false,
      "description": "Vector DB - for knowledge base debugging",
      "config": {
        "apiKey": "${PINECONE_API_KEY}",
        "environment": "${PINECONE_ENVIRONMENT}",
        "indexName": "${PINECONE_INDEX_NAME}",
        "dimension": 1536,
        "metric": "cosine"
      }
    },
    {
      "name": "slack",
      "enabled": false,
      "critical": false,
      "description": "Notifications - optional for team updates",
      "config": {
        "botToken": "${SLACK_BOT_TOKEN}",
        "channel": "${SLACK_CHANNEL}",
        "notifications": {
          "onBuildStart": true,
          "onBuildSuccess": true,
          "onBuildFailure": true,
          "onPhaseComplete": true
        }
      }
    },
    {
      "name": "openai",
      "enabled": false,
      "critical": false,
      "description": "Optional - for testing LLM responses",
      "config": {
        "apiKey": "${OPENAI_API_KEY}",
        "defaultModel": "gpt-4",
        "maxTokens": 1024
      }
    },
    {
      "name": "twilio",
      "enabled": false,
      "critical": false,
      "description": "Optional - for testing phone integration",
      "config": {
        "accountSid": "${TWILIO_ACCOUNT_SID}",
        "authToken": "${TWILIO_AUTH_TOKEN}"
      }
    }
  ],
  
  "development": {
    "hotReload": true,
    "watchFiles": [
      "src/**/*.ts",
      "src/**/*.tsx"
    ],
    "logLevel": "debug"
  },
  
  "testing": {
    "framework": "jest",
    "coverage": {
      "enabled": true,
      "threshold": 70
    }
  }
}
```

---

## File 4: `.gitignore` (What NOT to commit)

```bash
# Environment variables
.env
.env.claude
.env.local
.env.*.local

# Node modules
node_modules/
package-lock.json
yarn.lock

# Build outputs
dist/
build/
out/

# IDE
.vscode/
.idea/
*.swp
*.swo
*~
.DS_Store

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*

# Temporary files
tmp/
temp/
*.tmp

# Database
*.db
*.sqlite

# OS
Thumbs.db
.DS_Store

# Credentials
*.pem
*.key
service-account-key.json

# Testing
coverage/
.nyc_output/

# Uploads (if storing locally)
uploads/

```

---

## How to Use These Files

### Step 1: Create Environment Files

```bash
# In your project root
cp .env.example .env.claude
nano .env.claude  # Fill in all API keys
```

### Step 2: Create Claude Code Config

```bash
# In your project root
cat > claude-code.config.json << 'EOF'
{paste the config above}
EOF
```

### Step 3: Create .gitignore

```bash
# In your project root
cat > .gitignore << 'EOF'
{paste the gitignore above}
EOF
```

### Step 4: Verify Setup

```bash
# Test each MCP
claude-code mcp:test github
claude-code mcp:test postgresql
claude-code mcp:test pinecone

# All should return: ✅ Connection successful
```

### Step 5: Initialize Claude Code

```bash
# In Claude Code terminal
claude-code init
claude-code config:load claude-code.config.json
claude-code env:load .env.claude
```

---

## Getting Your API Keys

| Provider | How to Get | Note |
|----------|-----------|------|
| OpenAI | https://platform.openai.com/api-keys | Free tier available |
| Anthropic | https://console.anthropic.com | Need to request access |
| Deepgram | https://console.deepgram.com | Free tier: 50k minutes/month |
| ElevenLabs | https://elevenlabs.io/app/settings/api-keys | Free tier: 10k chars/month |
| Assembly AI | https://www.assemblyai.com/app | Free trial available |
| Twilio | https://console.twilio.com | Free trial: $15.50 credit |
| Pinecone | https://app.pinecone.io | Free tier: 1 pod, 1M vectors |
| GitHub | https://github.com/settings/tokens | Personal access token |
| Slack | https://api.slack.com | Create bot app |

---

## Minimal Setup (MVP)

If you want to start small, these are the ESSENTIAL keys:

1. ✅ **PostgreSQL** (local or managed)
2. ✅ **OPENAI_API_KEY** (LLM)
3. ✅ **TWILIO** credentials (phone)
4. ✅ **DEEPGRAM** (voice)
5. ✅ **ELEVENLABS** (voice output)
6. ✅ **PINECONE** (vector DB)
7. ✅ **GITHUB_TOKEN** (version control)

You can add more providers later!

---

## Testing Credentials

Before starting development, test each credential:

```bash
# Test OpenAI
node -e "
const OpenAI = require('openai');
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
client.chat.completions.create({
  model: 'gpt-4',
  messages: [{role: 'user', content: 'test'}],
  max_tokens: 10
}).then(() => console.log('✅ OpenAI works')).catch(e => console.log('❌', e.message))
"

# Test Twilio
node -e "
const twilio = require('twilio');
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
client.api.accounts.list({limit: 1}).then(() => console.log('✅ Twilio works')).catch(e => console.log('❌', e.message))
"

# Test PostgreSQL
psql $DATABASE_URL -c "SELECT 1" && echo "✅ PostgreSQL works"

# Test Pinecone
node -e "
const { Pinecone } = require('@pinecone-database/pinecone');
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
pc.listIndexes().then(() => console.log('✅ Pinecone works')).catch(e => console.log('❌', e.message))
"
```

---

## Security Best Practices

1. ✅ **Never commit .env files** - use .gitignore
2. ✅ **Use different keys** for development vs production
3. ✅ **Rotate keys periodically** (quarterly minimum)
4. ✅ **Limit key permissions** (use minimal scopes)
5. ✅ **Store in secure vaults** (1Password, Vault, etc.)
6. ✅ **Use environment variables** instead of hardcoding
7. ✅ **Disable keys immediately** if compromised
8. ✅ **Use separate accounts** for staging vs prod

---

## Quick Commands

```bash
# Load environment
source .env.claude

# Test database connection
npm run db:test

# Test all MCPs
npm run mcp:test

# Start development
npm run dev

# Run tests
npm run test

# View logs
tail -f logs/app.log

# Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

**You're ready to configure Claude Code! 🚀**

