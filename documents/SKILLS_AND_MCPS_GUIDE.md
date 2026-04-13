# 🛠️ SKILLS & MCPs CONFIGURATION FOR CLAUDE CODE

## Overview

This guide tells you **exactly** which skills and MCPs to enable in Claude Code for **zero interruptions** during development.

---

## 1. SKILLS NEEDED

### 1.1 Frontend Design Skill ✅ **CRITICAL**

**When to use:** Building React components, UI pages, styling

**Location:** `/mnt/skills/public/frontend-design/SKILL.md`

**What it covers:**
- Design tokens (colors, spacing, typography)
- Component patterns (buttons, forms, modals)
- CSS/Tailwind best practices
- Responsive design rules
- Accessibility guidelines

**Enable by:** Asking Claude Code to build any React component
- "Create the Dashboard page"
- "Build the Settings form"
- "Design the AssistantConfig UI"

---

### 1.2 Product Self-Knowledge Skill ✅ **RECOMMENDED**

**When to use:** If integrating Anthropic API (e.g., Claude for chat responses)

**Location:** `/mnt/skills/public/product-self-knowledge/SKILL.md`

**What it covers:**
- Claude API endpoints and models
- Authentication with Anthropic
- Streaming responses
- Function calling / tool use
- Rate limits and pricing
- Latest Claude models (Claude Opus, Sonnet, Haiku)

**Enable by:** Asking Claude Code about Anthropic integration
- "Use Anthropic API for LLM responses"
- "Integrate Claude with the chat endpoint"

---

## 2. MCPs (Model Context Protocol) CONFIGURATION

MCPs allow Claude Code to interact with external services **directly**.

### 2.1 GitHub MCP ✅ **ESSENTIAL**

**Purpose:** Version control, commit code, manage branches

**Why needed:**
- Automatically push code to your GitHub repo
- Create branches for features
- Open pull requests
- Manage issues
- No manual `git push` needed

**How to enable in Claude Code:**
1. Open Claude Code settings
2. Navigate to "MCPs" section
3. Click "Add MCP" → Search "GitHub"
4. Connect your GitHub account (OAuth)
5. Select your repository

**Configuration:**
```json
{
  "mcp_github": {
    "enabled": true,
    "repository": "your-username/ai-voice-assistant",
    "branch": "main",
    "auto_commit": true,
    "commit_message_template": "[Claude Code] ${change_type}: ${description}"
  }
}
```

**Example uses:**
```
"Claude, commit these changes with message 'feat: add authentication endpoints'"
"Create a branch called 'feature/knowledge-base' and push the code"
"Open a PR for the call-handling feature"
```

---

### 2.2 PostgreSQL MCP ✅ **HIGHLY RECOMMENDED**

**Purpose:** Query database, run migrations, inspect schemas

**Why needed:**
- Debug data issues without CLI
- Validate migrations
- Check user data
- Test queries
- No need to SSH into database

**How to enable in Claude Code:**
1. Open Claude Code settings
2. Navigate to "MCPs" section
3. Click "Add MCP" → Search "PostgreSQL"
4. Enter database connection string
5. Test connection

**Configuration:**
```json
{
  "mcp_postgresql": {
    "enabled": true,
    "connection_string": "${DATABASE_URL}",
    "host": "your-db-host",
    "port": 5432,
    "database": "ai_voice_assistant",
    "user": "${DB_USER}",
    "password": "${DB_PASSWORD}",
    "ssl": true
  }
}
```

**Example uses:**
```
"Claude, query the users table and show me all users"
"Run this migration to add the knowledge_base_documents table"
"Show me the schema for the assistants table"
"Delete all test data from the calls table"
```

---

### 2.3 Pinecone MCP ✅ **RECOMMENDED (if using knowledge base)**

**Purpose:** Manage vector database, test embeddings, query vectors

**Why needed:**
- Debug embedding issues
- Test semantic search
- Manage knowledge base indexes
- Query vectors without API calls

**How to enable in Claude Code:**
1. Open Claude Code settings
2. Navigate to "MCPs" section
3. Click "Add MCP" → Search "Pinecone"
4. Enter Pinecone API key and environment
5. Select index name

**Configuration:**
```json
{
  "mcp_pinecone": {
    "enabled": true,
    "api_key": "${PINECONE_API_KEY}",
    "environment": "us-west1-gcp",
    "index_name": "knowledge-base",
    "dimension": 1536
  }
}
```

**Example uses:**
```
"Claude, query Pinecone for embeddings related to 'return policy'"
"Show me all vectors for assistant with ID xyz"
"Delete embeddings from document abc123"
"Create a test vector in Pinecone"
```

---

### 2.4 Slack MCP ⭐ **OPTIONAL (Nice-to-have)**

**Purpose:** Send notifications to Slack channel

**Why needed:**
- Get deployment notifications
- Alert on build failures
- Notify team when features are ready
- Better collaboration visibility

**How to enable in Claude Code:**
1. Open Claude Code settings
2. Navigate to "MCPs" section
3. Click "Add MCP" → Search "Slack"
4. Create a Slack app at api.slack.com
5. Generate bot token
6. Enter token in Claude Code

**Configuration:**
```json
{
  "mcp_slack": {
    "enabled": true,
    "bot_token": "${SLACK_BOT_TOKEN}",
    "channel": "#development",
    "notifications": {
      "on_build_start": true,
      "on_build_success": true,
      "on_build_failure": true
    }
  }
}
```

**Example uses:**
```
"When the backend is ready, notify #development channel"
"Send a message to Slack: 'Authentication endpoints complete'"
```

---

### 2.5 OpenAI MCP ⭐ **OPTIONAL (if Claude Code needs to test LLM)**

**Purpose:** Test OpenAI API integration directly

**Why needed:**
- Test LLM responses from Claude Code
- Debug prompt engineering
- Validate API integration

**How to enable in Claude Code:**
1. Open Claude Code settings
2. Navigate to "MCPs" section
3. Click "Add MCP" → Search "OpenAI"
4. Enter OpenAI API key
5. Test connection

**Configuration:**
```json
{
  "mcp_openai": {
    "enabled": true,
    "api_key": "${OPENAI_API_KEY}",
    "default_model": "gpt-4",
    "test_mode": true
  }
}
```

---

### 2.6 Twilio MCP ⭐ **OPTIONAL (if testing phone integration)**

**Purpose:** Test Twilio API, manage phone numbers, send test calls

**Why needed:**
- Test phone number import without browser
- Debug Twilio integration
- Send test SMS/calls

**How to enable in Claude Code:**
1. Open Claude Code settings
2. Navigate to "MCPs" section
3. Click "Add MCP" → Search "Twilio"
4. Enter Twilio Account SID and Auth Token
5. Test connection

**Configuration:**
```json
{
  "mcp_twilio": {
    "enabled": true,
    "account_sid": "${TWILIO_ACCOUNT_SID}",
    "auth_token": "${TWILIO_AUTH_TOKEN}",
    "phone_numbers": ["your-twilio-numbers"]
  }
}
```

---

## 3. ENVIRONMENT VARIABLES FOR CLAUDE CODE

Create a `.env.claude` file in your project root with all API keys:

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/ai_voice_assistant
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# Authentication
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef

# External APIs
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
DEEPGRAM_API_KEY=...
ELEVENLABS_API_KEY=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...

# Pinecone
PINECONE_API_KEY=...
PINECONE_ENVIRONMENT=us-west1-gcp

# GitHub MCP
GITHUB_TOKEN=ghp_...
GITHUB_REPO=your-username/ai-voice-assistant

# Slack MCP (optional)
SLACK_BOT_TOKEN=xoxb-...

# Application
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000
WEBHOOK_BASE_URL=http://localhost:5000
```

---

## 4. STEP-BY-STEP: ENABLE MCPs IN CLAUDE CODE

### 4.1 Before Starting Development

**In Claude Code terminal or settings:**

```bash
# 1. Create .env.claude file with all keys
cp .env.example .env.claude

# 2. Install dependencies
npm install

# 3. Test database connection
npm run db:test

# 4. List available MCPs
claude-code mcp:list
```

### 4.2 Enable Each MCP

**Option A: Via Claude Code UI**
1. Open Claude Code
2. Click ⚙️ Settings
3. Select "MCPs"
4. Click "Add MCP" for each:
   - [ ] GitHub
   - [ ] PostgreSQL
   - [ ] Pinecone (if using knowledge base)
   - [ ] Slack (optional)
   - [ ] OpenAI (optional)

**Option B: Via config file**

Create `claude-code.config.json`:
```json
{
  "mcps": [
    {
      "name": "github",
      "enabled": true,
      "config": {
        "token": "${GITHUB_TOKEN}",
        "repo": "${GITHUB_REPO}"
      }
    },
    {
      "name": "postgresql",
      "enabled": true,
      "config": {
        "connectionString": "${DATABASE_URL}"
      }
    },
    {
      "name": "pinecone",
      "enabled": true,
      "config": {
        "apiKey": "${PINECONE_API_KEY}",
        "environment": "${PINECONE_ENVIRONMENT}"
      }
    },
    {
      "name": "slack",
      "enabled": false,
      "config": {
        "token": "${SLACK_BOT_TOKEN}",
        "channel": "#development"
      }
    }
  ],
  "skills": [
    {
      "name": "frontend-design",
      "enabled": true
    },
    {
      "name": "product-self-knowledge",
      "enabled": false
    }
  ]
}
```

---

## 5. WHAT CLAUDE CODE CAN DO WITH EACH MCP

### 5.1 GitHub MCP

**Without MCP:** You manually run `git add`, `git commit`, `git push`

**With MCP:** Claude Code does it automatically

```
You:    "Claude, commit the authentication endpoints"
Claude: ✅ Committed to github with message "[Claude Code] feat: add auth endpoints"
         ✅ Pushed to main branch
         ✅ No manual git commands needed
```

### 5.2 PostgreSQL MCP

**Without MCP:** You manually SSH into database or use pgAdmin

**With MCP:** Claude Code queries database directly

```
You:    "Show me the assistants table schema"
Claude: ✅ Ran DESCRIBE assistants
         ✅ Returns:
            id (UUID)
            user_id (UUID)
            name (VARCHAR)
            system_prompt (TEXT)
            ...
```

### 5.3 Pinecone MCP

**Without MCP:** You use Pinecone dashboard or Python script

**With MCP:** Claude Code queries vectors directly

```
You:    "Query Pinecone for embeddings about 'customer service'"
Claude: ✅ Searched knowledge-base index
         ✅ Found 5 matching vectors:
            1. "Our customer support hours..."
            2. "Return policy applies to..."
            ...
```

### 5.4 Slack MCP

**Without MCP:** You manually copy-paste to Slack

**With MCP:** Claude Code sends messages automatically

```
You:    "Tell the team in #development that auth is done"
Claude: ✅ Sent message to #development
         ✅ Message: "✅ Authentication endpoints complete"
```

---

## 6. RECOMMENDED MCP PRIORITY

**Must Enable (for MVP):**
1. ✅ **GitHub** — Essential for version control
2. ✅ **PostgreSQL** — Essential for database debugging

**Should Enable (for efficiency):**
3. ✅ **Pinecone** — If implementing knowledge base
4. ⭐ **Slack** — Optional but nice for team updates

**Can Enable Later (if needed):**
5. ⭐ **OpenAI** — For testing LLM responses
6. ⭐ **Twilio** — For testing phone integration

---

## 7. TROUBLESHOOTING MCP CONNECTION ISSUES

### Problem: GitHub MCP not authenticating

**Solution:**
```bash
# 1. Check token is valid
echo $GITHUB_TOKEN

# 2. Regenerate token at https://github.com/settings/tokens
# Required permissions: repo, workflow

# 3. Update in Claude Code settings

# 4. Test connection
claude-code mcp:test github
```

### Problem: PostgreSQL MCP connection fails

**Solution:**
```bash
# 1. Check connection string format
echo $DATABASE_URL
# Should be: postgresql://user:password@host:port/database

# 2. Verify database is running
psql $DATABASE_URL -c "SELECT 1;"

# 3. Check firewall/network access
nc -zv your-db-host 5432

# 4. Update in Claude Code settings

# 5. Test connection
claude-code mcp:test postgresql
```

### Problem: Pinecone MCP returns empty results

**Solution:**
```bash
# 1. Check API key is correct
echo $PINECONE_API_KEY

# 2. Verify index exists
# Log into https://app.pinecone.io and check index name

# 3. Check vectors were uploaded
# Pinecone → Index → Overview → Vector Count

# 4. Try querying with broader params
# Increase top_k or adjust filter
```

---

## 8. QUICK REFERENCE: COMMANDS IN CLAUDE CODE

### With GitHub MCP:
```
"Commit this code with message 'feature: add XYZ'"
"Create a new branch called 'feature/knowledge-base'"
"Push changes to main"
"Create a pull request for this feature"
```

### With PostgreSQL MCP:
```
"Show me the schema of the users table"
"Query the database for all assistants created today"
"Run this migration: CREATE TABLE..."
"How many users are in the database?"
```

### With Pinecone MCP:
```
"Query Pinecone for documents about 'billing'"
"Show me embeddings for assistant ID xyz"
"How many vectors are in the knowledge-base index?"
```

### With Slack MCP:
```
"Send a message to #development: 'Feature complete!'"
"Notify the team that deployment is ready"
```

---

## 9. FINAL CHECKLIST: BEFORE YOU START

- [ ] Create `.env.claude` file with all API keys
- [ ] Enable GitHub MCP (most critical)
- [ ] Enable PostgreSQL MCP (for database access)
- [ ] Enable Frontend Design Skill (for UI building)
- [ ] Test each MCP connection
- [ ] Create `claude-code.config.json` with MCP settings
- [ ] Verify `.gitignore` includes `.env*` files
- [ ] Create GitHub repository
- [ ] Install Node.js dependencies locally
- [ ] Test local database connection

---

## 10. NO INTERRUPTIONS GUARANTEE

With these MCPs configured, Claude Code can:

✅ Write code → automatically commit to GitHub
✅ Create database tables → verify with PostgreSQL MCP
✅ Test knowledge base → query Pinecone directly
✅ Notify team → send Slack messages
✅ No need to stop and wait for manual steps

**Result:** Continuous, uninterrupted development flow! 🚀

---

## 11. AFTER EACH PHASE COMPLETION

**After Phase 1 (Authentication):**
```
"Claude, commit the auth endpoints with message 'feat: add authentication'"
"Query the database to verify the users table was created"
"Send a message to Slack: 'Phase 1 complete: authentication endpoints ready'"
```

**After Phase 2 (Assistants):**
```
"Show me the assistants table schema"
"Push the assistant CRUD endpoints to GitHub"
"Notify #development that assistant management is complete"
```

**After Phase 7 (Calls):**
```
"Query Pinecone to verify embeddings are stored correctly"
"Test a semantic search query in Pinecone"
"Commit the call handling code with full tests"
```

---

**You're all set! Start Claude Code development with confidence! 🎯**

