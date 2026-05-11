# Voice Agent Platform

A production-ready **AI voice calling platform** built with LiveKit, Deepgram, and Groq LLM. The system combines an intelligent voice agent with a full-featured dashboard for managing leads, call campaigns, and integrations.

**Perfect for:** Lead generation, sales outreach, customer surveys, appointment scheduling, and conversational research.

---

## 🏗️ System Architecture

This project follows the **WAT Framework** (Workflows, Agents, Tools):

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Workflows (Decision Logic)                         │
│ → Markdown SOPs in workflows/ define what to do & how       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: Agent Orchestration (Your Intelligence)            │
│ → Backend agent.py coordinates calls, logging, callbacks    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: Tools & Services (Deterministic Execution)         │
│ → Python backend scripts handle APIs, database ops          │
│ → Next.js dashboard provides UI & webhooks                  │
└─────────────────────────────────────────────────────────────┘
```

**Key principle:** Deterministic tools ensure reliability; orchestration handles the intelligence.

---

## 🎯 Features

- **📞 Intelligent Voice Calls** — Real-time conversation with Groq Llama 3.3 LLM
- **🎤 High-Quality Audio** — Deepgram Nova-3 STT + Sarvam TTS with sub-100ms latency
- **📊 Lead Management Dashboard** — Create, track, and manage call campaigns
- **🔄 Multi-Source Integration** — Google Sheets, HubSpot, webhook-based lead sources
- **📈 Call Analytics** — Detailed reporting on call outcomes, duration, transcripts
- **🔐 Secure Authentication** — OAuth2 for Google Sheets & HubSpot integration
- **☁️ Cloud Storage** — Call recordings stored in Supabase S3
- **🚀 Scalable SIP Trunking** — Vobiz PSTN integration for unlimited outbound calls

---

## 🛠️ Technology Stack

### Backend
- **Runtime:** Python 3.10+
- **Voice Framework:** LiveKit Server SDK
- **LLM:** Groq (Llama 3.3-70b-versatile)
- **Speech:** Deepgram (Nova-3 STT, TTS)
- **Database:** Supabase (PostgreSQL)
- **Task Queue:** Supabase pg_net for async job scheduling

### Frontend
- **Framework:** Next.js 16 (React 19)
- **Styling:** Tailwind CSS 4
- **UI Components:** Lucide React
- **Charts:** Recharts
- **Real-time Client:** LiveKit Client SDK

### Infrastructure
- **VoIP:** Vobiz SIP Trunking
- **File Storage:** Supabase Storage (S3 compatible)
- **Deployment:** Vercel (dashboard), Docker/standalone (agent)

---

## 📦 Prerequisites

### Required Accounts & API Keys
1. **LiveKit** — https://cloud.livekit.io (room hosting, SIP trunking)
2. **Deepgram** — https://console.deepgram.com (speech-to-text, text-to-speech)
3. **Groq** — https://console.groq.com (LLM inference)
4. **Supabase** — https://supabase.com (database, storage, auth)
5. **Sarvam** — https://sarvam.ai (optional Indian language TTS)
6. **Google Cloud** — OAuth credentials for Google Sheets integration
7. **HubSpot** — Public App credentials for CRM integration (optional)

### Local Setup
- **Python:** 3.10 or later
- **Node.js:** 18+ (for dashboard development)
- **npm/yarn:** Latest version
- **Git:** For version control

---

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/voice-agent.git
cd voice-agent
```

### 2. Set Up Environment Variables
Copy the example file and fill in your credentials:
```bash
cp .env.example .env
nano .env  # Edit with your API keys
```

**Critical variables:**
- `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`
- `DEEPGRAM_API_KEY`
- `GROQ_API_KEY`
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `VOBIZ_SIP_TRUNK_ID`, `VOBIZ_OUTBOUND_NUMBER`

### 3. Set Up Python Backend
```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r backend/requirements.txt
```

### 4. Set Up Next.js Dashboard
```bash
cd dashboard
npm install
```

---

## ▶️ Running the Application

### Start the Voice Agent (Terminal 1)
```bash
# From project root with venv activated
python backend/agent.py start
```

The agent will:
- Listen for incoming LiveKit room connections on port 8081
- Log all calls to Supabase
- Automatically dispatch leads from your configured sources

**Output:**
```
[INFO] Listening for room connections on ws://localhost:8081
[INFO] Agent ready — waiting for incoming calls
```

### Start the Dashboard (Terminal 2)
```bash
cd dashboard
npm run dev
```

Visit **http://localhost:3000** to access the dashboard.

**Output:**
```
▲ Next.js 16.1.6
  - Local:        http://localhost:3000
  - Environments: .env.local
```

### Make an Outbound Call (Terminal 3)
```bash
# With venv activated
python backend/make_call.py --to +1-555-123-4567
```

---

## 📂 Project Structure

```
voice-agent/
├── backend/
│   ├── agent.py              # Main voice agent logic
│   ├── config.py             # Agent configuration (prompts, models)
│   ├── make_call.py          # Outbound call script
│   ├── requirements.txt       # Python dependencies
│   └── migrations/            # Database schema migrations
├── dashboard/
│   ├── app/
│   │   ├── page.tsx          # Dashboard home
│   │   ├── api/              # Next.js API routes (webhooks, exports)
│   │   └── layout.tsx        # Layout + providers
│   ├── lib/
│   │   ├── supabase.ts       # Supabase client
│   │   ├── lead-sources/     # Lead source integrations
│   │   └── api/              # API utility functions
│   ├── components/           # Reusable React components
│   ├── package.json          # JavaScript dependencies
│   └── tailwind.config.ts    # Styling configuration
├── database/
│   └── migrations/           # SQL schema migrations
├── docs/                     # Project documentation
├── .env.example              # Environment variable template
├── CLAUDE.md                 # Development guidelines (WAT framework)
├── docker-compose.yml        # Local dev environment
└── README.md                 # This file
```

---

## ⚙️ Configuration

### Agent Persona & Prompts
Edit [backend/config.py](backend/config.py) to customize:
- `SYSTEM_PROMPT` — Agent personality and behavior
- `INITIAL_GREETING` — First message when connecting
- `STT_MODEL` — Speech recognition model (nova-3 recommended)
- `TTS_PROVIDER` — Text-to-speech provider (sarvam | deepgram | cartesia)

**Example:** Change the system prompt to make the agent a customer support representative, sales person, or surveyor.

### Speech Settings
```python
STT_PROVIDER = "deepgram"      # Speech-to-text provider
STT_MODEL = "nova-3"           # Latest Deepgram model (faster)
STT_LANGUAGE = "en"            # Language code
STT_KEYTERMS = [...]           # Proper nouns to boost recognition

TTS_PROVIDER = "sarvam"        # Text-to-speech provider
SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")
```

### LLM Selection
Set via `.env`:
```bash
LLM_PROVIDER=groq
GROQ_MODEL=llama-3.3-70b-versatile  # Fast & capable (recommended)
# Or: llama-3.1-8b-instant (faster, lighter)
```

### Lead Sources
Configure in the dashboard UI:
1. **Google Sheets** — Read leads from a Google Sheet
2. **HubSpot** — Sync contacts from HubSpot CRM
3. **Webhooks** — Accept leads via HTTP POST
4. **CSV Upload** — Manually upload lead lists

---

## 📊 Dashboard Features

### Pages

| Page | Purpose |
|------|---------|
| **Calls** | View all completed calls, transcripts, outcomes |
| **Leads** | Manage lead list, assign to campaigns, track status |
| **Campaigns** | Create call campaigns, set targeting, view metrics |
| **Lead Sources** | Connect Google Sheets, HubSpot, webhooks |
| **Settings** | Configure agent behavior, API keys, SIP trunk |

### Key Workflows

**Creating a Call Campaign:**
1. Go to **Lead Sources** → Connect your data source (Google Sheets / HubSpot / webhook)
2. Go to **Campaigns** → Click "New Campaign"
3. Select source, upload/sync leads
4. Set call schedule, agent prompt, and restrictions
5. Review & deploy

**Monitoring Calls:**
1. Go to **Calls** tab to see live/recent calls
2. Click any call to view:
   - Full transcript
   - Call recording (if enabled)
   - Duration, disposition (answered/declined/hangup)
   - AI analysis of conversation

**Exporting Results:**
- Export call results to Google Sheets for further analysis
- HubSpot integration auto-syncs outcomes back to CRM

---

## 🔐 API Integrations

### Google Sheets
- **OAuth flow:** User grants permission to read sheet
- **Token storage:** Encrypted in Supabase (AES-256-GCM)
- **Sync:** Reads lead list every time campaign starts

### HubSpot
- **Setup:** Create a public app in HubSpot developer portal
- **Integration:** Pull contacts, post call outcomes as activities
- **Webhook:** Optional: Receive contact updates in real-time

### Webhooks
- **Endpoint:** `POST /api/lead-sources/webhook/[token]/incoming`
- **Auth:** Bearer token (set in `.env`)
- **Payload:**
```json
{
  "name": "John Doe",
  "phone": "+1-555-123-4567",
  "email": "john@example.com",
  "metadata": { "company": "Acme Inc" }
}
```

---

## 🐛 Troubleshooting

### Agent Won't Start
**Error:** `ModuleNotFoundError: No module named 'livekit'`
- **Fix:** Ensure virtual environment is active and dependencies installed
```bash
source venv/bin/activate
pip install -r backend/requirements.txt
```

### Calls Connect But No Audio
**Cause:** TTS provider failure or WebSocket connection issue
- **Fix:** 
  1. Check `.env` for valid Sarvam/Deepgram API key
  2. Check backend logs for APIStatusError
  3. Switch to Deepgram TTS: `TTS_PROVIDER=deepgram` in `.env`
  4. Restart agent

### "Address already in use" on Port 8081
**Cause:** Another agent instance running
- **Fix:**
```bash
# Find the process
lsof -i :8081

# Kill it
kill -9 <PID>
```

### Dashboard Can't Connect to Agent
**Cause:** Agent not running or network issue
- **Fix:**
  1. Ensure agent is running: `python backend/agent.py start`
  2. Check `.env` for correct `LIVEKIT_URL` and credentials
  3. Check backend logs for errors

### Calls Disconnecting Unexpectedly
**Cause:** Network timeout, SIP trunk issue, or Groq rate limit
- **Fix:**
  1. Check backend logs for timeout errors
  2. Verify Vobiz SIP credentials in `.env`
  3. Check Groq console for rate limit warnings
  4. Reduce `STT_KEYTERMS` length if over 10 items

---

## 📝 Environment Variables Reference

See [.env.example](.env.example) for a complete list. Key variables:

| Variable | Purpose | Required |
|----------|---------|----------|
| `LIVEKIT_URL` | LiveKit server address | ✅ Yes |
| `LIVEKIT_API_KEY` | LiveKit auth key | ✅ Yes |
| `DEEPGRAM_API_KEY` | Deepgram STT/TTS | ✅ Yes |
| `GROQ_API_KEY` | Groq LLM | ✅ Yes |
| `SUPABASE_URL` | Supabase database | ✅ Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service key | ✅ Yes |
| `VOBIZ_SIP_TRUNK_ID` | SIP trunk ID | ✅ Yes (for outbound) |
| `SARVAM_API_KEY` | Sarvam TTS (optional) | ❌ No |
| `CREDENTIALS_ENCRYPTION_KEY` | OAuth token encryption (32 hex chars) | ⚠️ Recommended |

---

## 🚀 Deployment

### Dashboard (Vercel)
1. Push to GitHub
2. Import repo in Vercel
3. Add environment variables
4. Deploy

### Backend (Docker)
```bash
docker build -f backend/Dockerfile -t voice-agent .
docker run -e LIVEKIT_URL=... -e DEEPGRAM_API_KEY=... voice-agent
```

### Backend (Standalone)
```bash
# Create a systemd service or supervisor daemon
python backend/agent.py start
```

---

## 📖 Documentation

- **[CLAUDE.md](CLAUDE.md)** — Development guidelines & WAT framework
- **[docs/](docs/)** — Additional guides and API documentation
- **[workflows/](workflows/)** — Standard operating procedures

---

## 🤝 Contributing

This project uses the **WAT framework** for all contributions:
1. Check `workflows/` for relevant SOPs
2. Use `tools/` for deterministic execution
3. Update workflows as you learn
4. Test thoroughly before pushing

---

## 📄 License

[Add your license here]

---

## 🆘 Support

- **Issues:** Check [Troubleshooting](#-troubleshooting) above
- **Documentation:** See [docs/](docs/) folder
- **Questions:** Refer to relevant [workflow](workflows/)

---

**Built with ❤️ by the Aryantra team**
