# 🎨 VISUAL SUMMARY & QUICK REFERENCE

## Project At A Glance

```
YOUR APPLICATION: Multi-User AI Voice Assistant Platform

┌─────────────────────────────────────────────────────────────────┐
│                     WHAT USERS SEE                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  LOGIN / SIGNUP                                                  │
│  ├─ Email + Password                                            │
│  └─ Stored securely with JWT tokens                            │
│                                                                  │
│  DASHBOARD                                                       │
│  ├─ List of assistants                                          │
│  ├─ Create new assistant                                        │
│  ├─ Edit existing assistant                                     │
│  └─ Delete assistant                                            │
│                                                                  │
│  CREATE/EDIT ASSISTANT                                          │
│  ├─ Name                                                         │
│  ├─ System Prompt (custom instructions)                         │
│  ├─ Model Config:                                               │
│  │  └─ OpenAI/Anthropic/Google/OpenRouter/Azure/xAI/Mistral   │
│  ├─ Voice Config:                                               │
│  │  └─ ElevenLabs/Deepgram/Saarvam + Voice ID                 │
│  ├─ Transcriber Config:                                         │
│  │  └─ Deepgram/Assembly AI/Saarvam/ElevenLabs                │
│  ├─ Knowledge Base:                                             │
│  │  └─ Upload PDF/DOCX/TXT files                              │
│  └─ Assign Phone Number                                         │
│                                                                  │
│  SETTINGS                                                        │
│  ├─ Twilio Credentials (Account SID + Auth Token)              │
│  ├─ Vobiz Credentials (SIP Trunking)                           │
│  ├─ Model Provider Credentials (OpenAI, Anthropic, etc.)       │
│  ├─ Voice Provider Credentials (ElevenLabs, Deepgram, etc.)    │
│  ├─ Transcriber Credentials (Deepgram, Assembly AI, etc.)      │
│  └─ Pinecone Credentials (Vector DB)                           │
│                                                                  │
│  PHONE NUMBERS                                                   │
│  ├─ Import from Twilio/Vobiz                                   │
│  ├─ Assign to Assistant                                         │
│  └─ Configure webhook (manual setup)                            │
│                                                                  │
│  CALL LOGS                                                       │
│  ├─ View all past calls                                         │
│  ├─ See transcript for each call                                │
│  ├─ Filter by assistant/date/number                            │
│  └─ See call duration and status                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## System Architecture (Simple)

```
┌──────────────────────────────────────────────────────────────────┐
│                     CALLER                                        │
│               (Dials Twilio Number)                              │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                    TWILIO/VOBIZ                                   │
│                 (Phone Provider)                                  │
│        ├─ Receives call                                          │
│        ├─ Sends webhook to backend                              │
│        └─ Handles audio streaming                               │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                       BACKEND                                     │
│                   (Node.js/Express)                              │
│        ├─ Receives webhook                                       │
│        ├─ Fetches assistant config from DB                      │
│        ├─ Decrypts API keys                                     │
│        ├─ Transcribes audio (STT)                               │
│        ├─ Generates response (LLM)                              │
│        ├─ Synthesizes audio (TTS)                               │
│        ├─ Streams back to Twilio                                │
│        ├─ Saves call + transcript to DB                         │
│        └─ Queries knowledge base from Pinecone                  │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                ┌────────────┼────────────┐
                │            │            │
                ▼            ▼            ▼
         ┌──────────┐  ┌──────────┐  ┌──────────┐
         │PostgreSQL│  │ Pinecone │  │ External │
         │ (DB)     │  │(Vector DB)  │ APIs    │
         └──────────┘  └──────────┘  └──────────┘
                
┌──────────────────────────────────────────────────────────────────┐
│                       FRONTEND                                    │
│                    (React App)                                    │
│        ├─ Shows assistant configs                                │
│        ├─ Shows call logs                                        │
│        ├─ Polls backend for updates                              │
│        └─ Users never see raw API keys                           │
└──────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Creating an Assistant

```
User fills form in React
  │
  ├─ Name: "Customer Support Bot"
  ├─ System Prompt: "You are a helpful customer support agent..."
  ├─ Model: "gpt-4"
  ├─ Voice: "21m00Tcm4TlvDq8ikWAM" (ElevenLabs voice ID)
  ├─ Transcriber: "deepgram"
  └─ Knowledge Base: [document.pdf]
  
  ▼
  
Frontend sends to backend
  POST /assistants
  {
    name: "Customer Support Bot",
    system_prompt: "...",
    model_provider: "openai",
    model_name: "gpt-4",
    voice_provider: "elevenlabs",
    voice_id: "21m00Tcm4TlvDq8ikWAM",
    transcriber_provider: "deepgram",
    knowledge_base_enabled: true
  }
  
  ▼
  
Backend processes
  1. Verify user is authenticated (JWT)
  2. Validate input (system prompt not empty, etc.)
  3. Save to database (assistants table)
  4. Return assistant ID to frontend
  
  ▼
  
Backend processes knowledge base separately
  POST /assistants/:id/knowledge-base
  {
    files: [document.pdf]
  }
  
  1. Extract text from PDF
  2. Split into chunks (500 tokens)
  3. Generate embeddings via OpenAI API
  4. Upload to Pinecone
  5. Save metadata to PostgreSQL
  
  ▼
  
Frontend displays success
  "✅ Assistant created successfully!"
  
  ▼
  
Assistant is ready to receive calls!
```

---

## Data Flow: Inbound Call

```
CALLER DIALS TWILIO NUMBER
  │
  ├─ Twilio receives call
  ├─ Twilio sends webhook: POST /calls/webhook
  │  {
  │    To: "+1234567890",
  │    From: "+9876543210",
  │    CallSid: "CA1234567890"
  │  }
  │
  ▼
  
BACKEND RECEIVES WEBHOOK
  1. Extract phone number: "+1234567890"
  2. Query database:
     SELECT * FROM phone_numbers WHERE phone_number = '+1234567890'
  3. Fetch assistant:
     SELECT * FROM assistants WHERE id = phone_number.assistant_id
  4. Fetch encrypted credentials:
     SELECT encrypted_credentials FROM credentials WHERE ...
  5. Decrypt credentials (AES-256)
  
  ▼
  
INITIALIZE CALL STATE
  {
    callSid: "CA1234567890",
    assistantId: "uuid",
    modelProvider: "openai",
    modelApiKey: "decrypted_key",
    voiceProvider: "elevenlabs",
    voiceId: "21m00Tcm4TlvDq8ikWAM",
    transcriber: "deepgram",
    conversationHistory: [],
    systemPrompt: "You are a helpful customer support agent..."
  }
  
  ▼
  
AUDIO LOOP (repeats until call ends)
  
  STEP 1: RECEIVE AUDIO
    Caller speaks: "What's your return policy?"
    Twilio streams audio to backend
  
  STEP 2: TRANSCRIBE (STT)
    Backend sends audio to Deepgram API
    Deepgram returns: "What's your return policy?"
  
  STEP 3: QUERY KNOWLEDGE BASE (if enabled)
    Backend queries Pinecone:
      - Input: embedding of "What's your return policy?"
      - Output: Top 3 relevant document chunks
      - Result: "Our return policy allows returns within 30 days..."
  
  STEP 4: GENERATE RESPONSE (LLM)
    Backend sends to OpenAI API:
    {
      model: "gpt-4",
      system: "You are a helpful customer support agent...",
      messages: [
        {
          role: "system",
          content: "Knowledge Base:\nOur return policy allows returns within 30 days..."
        },
        {
          role: "user",
          content: "What's your return policy?"
        }
      ]
    }
    OpenAI returns: "Our return policy allows returns within 30 days from purchase..."
  
  STEP 5: SYNTHESIZE AUDIO (TTS)
    Backend sends to ElevenLabs API:
      - Text: "Our return policy allows returns within 30 days from purchase..."
      - Voice ID: "21m00Tcm4TlvDq8ikWAM"
    ElevenLabs returns: Audio file
  
  STEP 6: SEND AUDIO BACK
    Backend streams audio to Twilio
    Caller hears: "Our return policy allows returns within 30 days from purchase..."
    
  STEP 7: LOOP
    Wait for next caller input
    Go back to STEP 1
  
  ▼
  
CALL ENDS
  Backend:
    1. Save call to database
    2. Save transcript
    3. Calculate duration
    4. Save status: "completed"
  
  Frontend polls /calls endpoint
    Gets updated call list
    Shows in Call Logs page
```

---

## Database Schema (Simplified)

```
USERS
├─ id (UUID)
├─ email (TEXT) - unique
├─ password_hash (TEXT)
├─ first_name
├─ last_name
└─ created_at

ASSISTANTS (belongs to USERS)
├─ id (UUID)
├─ user_id (UUID) ← USERS.id
├─ name (TEXT)
├─ system_prompt (TEXT) - the AI's instructions
├─ model_provider (TEXT) - "openai", "anthropic", etc.
├─ model_name (TEXT) - "gpt-4", "claude-3-opus", etc.
├─ voice_provider (TEXT) - "elevenlabs", "deepgram", etc.
├─ voice_id (TEXT) - voice ID from provider
├─ transcriber_provider (TEXT) - "deepgram", "assembly_ai", etc.
├─ temperature (FLOAT) - LLM creativity (0-1)
├─ max_tokens (INT) - max response length
└─ created_at

CREDENTIALS (belongs to USERS, ENCRYPTED)
├─ id (UUID)
├─ user_id (UUID) ← USERS.id
├─ provider_type (TEXT) - "openai", "twilio", "elevenlabs", etc.
├─ provider_name (TEXT) - display name
├─ encrypted_credentials (TEXT) ← encrypted with AES-256
├─ is_primary (BOOLEAN)
└─ created_at

PHONE_NUMBERS (belongs to USERS & ASSISTANTS)
├─ id (UUID)
├─ user_id (UUID) ← USERS.id
├─ assistant_id (UUID) ← ASSISTANTS.id
├─ phone_number (TEXT) - "+1234567890"
├─ provider (TEXT) - "twilio", "vobiz"
├─ provider_phone_id (TEXT) - Twilio SID
├─ webhook_url (TEXT) - for Twilio configuration
├─ is_active (BOOLEAN)
└─ created_at

CALLS (belongs to USERS, ASSISTANTS, PHONE_NUMBERS)
├─ id (UUID)
├─ user_id (UUID) ← USERS.id
├─ assistant_id (UUID) ← ASSISTANTS.id
├─ phone_number_id (UUID) ← PHONE_NUMBERS.id
├─ caller_number (TEXT) - who called
├─ call_started_at (TIMESTAMP)
├─ call_ended_at (TIMESTAMP)
├─ duration_seconds (INT)
├─ transcript (TEXT) - full conversation
├─ call_status (TEXT) - "completed", "failed", "missed"
├─ provider_call_id (TEXT) - Twilio Call SID
└─ created_at

KNOWLEDGE_BASE_DOCUMENTS (belongs to ASSISTANTS)
├─ id (UUID)
├─ assistant_id (UUID) ← ASSISTANTS.id
├─ document_name (TEXT) - filename
├─ document_type (TEXT) - "pdf", "docx", "txt"
├─ file_path (TEXT) - S3 or local path
├─ extracted_text (TEXT) - full document text
└─ created_at

KNOWLEDGE_BASE_EMBEDDINGS (belongs to DOCUMENTS)
├─ id (UUID)
├─ document_id (UUID) ← KNOWLEDGE_BASE_DOCUMENTS.id
├─ chunk_index (INT) - which chunk (0, 1, 2, ...)
├─ chunk_text (TEXT) - 500-token chunk
├─ pinecone_vector_id (TEXT) - reference to Pinecone
└─ created_at
```

---

## API Endpoints Quick Reference

```
AUTHENTICATION
POST   /auth/signup           → Create account
POST   /auth/login            → Get JWT token
POST   /auth/logout           → Invalidate token

ASSISTANTS
POST   /assistants            → Create assistant
GET    /assistants            → List user's assistants
PUT    /assistants/:id        → Update assistant
DELETE /assistants/:id        → Delete assistant

CREDENTIALS
POST   /credentials           → Save API key (encrypted)
GET    /credentials           → List credentials
PUT    /credentials/:id       → Update credential
DELETE /credentials/:id       → Delete credential

PHONE NUMBERS
POST   /phone-numbers/import  → Import from Twilio/Vobiz
GET    /phone-numbers         → List user's numbers
POST   /phone-numbers/assign  → Assign to assistant

CALLS
POST   /calls/webhook         → Receive inbound call (from Twilio)
GET    /calls                 → Get call history (pagination)
GET    /calls/:id             → Get call details + transcript

CHAT
POST   /assistant/:id/chat    → Send message to assistant (for testing)

KNOWLEDGE BASE
POST   /assistants/:id/knowledge-base       → Upload documents
GET    /assistants/:id/knowledge-base       → List documents
DELETE /assistants/:id/knowledge-base/:doc_id → Delete document
```

---

## Frontend Routes Quick Reference

```
/ (Root)
  └─ Protected Route
     ├─ /                      → Dashboard (list assistants)
     ├─ /assistants/create     → Create Assistant
     ├─ /assistants/:id/edit   → Edit Assistant
     ├─ /settings              → Settings (credentials)
     └─ /calls                 → Call Logs & History

/login                          → Login Page
/signup                         → Signup Page
```

---

## Technologies & Libraries

```
BACKEND
├─ Express.js              (Web server)
├─ PostgreSQL              (Database)
├─ Pinecone                (Vector DB)
├─ JWT                     (Authentication)
├─ bcrypt                  (Password hashing)
├─ crypto (AES-256)        (API key encryption)
├─ Twilio SDK              (Phone integration)
├─ OpenAI SDK              (LLM)
├─ Anthropic SDK           (LLM)
├─ Deepgram SDK            (STT + TTS)
├─ ElevenLabs SDK          (Voice)
├─ pdf-parse               (PDF extraction)
└─ Winston                 (Logging)

FRONTEND
├─ React 18                (UI Framework)
├─ TypeScript              (Type safety)
├─ React Router            (Routing)
├─ Zustand                 (State management)
├─ TanStack Query          (Server state)
├─ React Hook Form         (Forms)
├─ Zod                     (Validation)
├─ shadcn/ui + Tailwind    (UI Components)
├─ Axios                   (HTTP client)
└─ React Dropzone          (File upload)
```

---

## Implementation Timeline

```
Week 1-2    Phase 1: Foundation (Auth)
Week 2-3    Phase 2: Assistants
Week 3-4    Phase 3: Credentials (Encryption)
Week 4-5    Phase 4: Provider Config
Week 5-6    Phase 5: Phone Numbers
Week 6-7    Phase 6: Knowledge Base
Week 7-9    Phase 7: Call Handling (Critical)
Week 9-10   Phase 8: Call Logs
Week 10-11  Phase 9: Testing
Week 11-12  Phase 10: Deployment

Total: ~12 weeks (3 months)
```

---

## Security Checklist

```
✅ Authentication
  └─ JWT tokens, password hashing (bcrypt)

✅ Authorization
  └─ Each user can only see their own data

✅ API Key Encryption
  └─ AES-256-GCM at rest, HTTPS in transit

✅ CORS
  └─ Only your frontend domain allowed

✅ Rate Limiting
  └─ 100 requests per 15 minutes per IP

✅ Database
  └─ Parameterized queries (SQL injection protection)

✅ Environment Variables
  └─ All secrets in .env, not in code

✅ Logging
  └─ Errors logged but sensitive data redacted

✅ OWASP Top 10
  └─ A1: Broken Access Control ✅
  └─ A2: Cryptographic Failures ✅
  └─ A3: Injection ✅
  └─ A4: Insecure Design ✅
  └─ A5: Security Misconfiguration ✅
  └─ A6: Vulnerable Components ✅
  └─ A7: Identification and Auth ✅
  └─ A8: Data Integrity Failures ✅
  └─ A9: Logging Failures ✅
  └─ A10: SSRF ✅
```

---

## File Structure Overview

```
your-project/
│
├── backend/
│   ├── src/
│   │   ├── controllers/      (Route handlers)
│   │   ├── models/           (Database schemas)
│   │   ├── services/         (Business logic)
│   │   ├── middleware/       (Auth, validation)
│   │   ├── routes/           (API endpoints)
│   │   ├── database/         (DB config, migrations)
│   │   ├── utils/            (Helpers)
│   │   └── app.js            (Express server)
│   ├── .env
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── pages/            (Full pages)
│   │   ├── components/       (Reusable components)
│   │   ├── hooks/            (Custom React hooks)
│   │   ├── store/            (Zustand stores)
│   │   ├── services/         (API calls)
│   │   ├── utils/            (Helpers)
│   │   ├── types/            (TypeScript interfaces)
│   │   ├── App.tsx           (Main app)
│   │   └── index.tsx         (Entry point)
│   ├── .env.local
│   └── package.json
│
└── docs/
    ├── COMPLETE_IMPLEMENTATION_PLAN.md
    ├── SKILLS_AND_MCPS_GUIDE.md
    ├── QUICK_START_CHECKLIST.md
    └── VISUAL_SUMMARY.md (this file)
```

---

## Common Questions & Answers

**Q: Do users see their API keys after saving?**
A: No! Keys are encrypted with AES-256. Only you (the backend) can decrypt them.

**Q: How are calls handled?**
A: Twilio → sends webhook → Backend receives → LLM responds → TTS converts → Audio back to caller

**Q: Can I add more voice providers later?**
A: Yes! The architecture supports any provider with an API.

**Q: How long until live?**
A: ~3 months (12 weeks) if building full-time.

**Q: Can users import phone numbers multiple times?**
A: Yes! Each import adds new numbers. Duplicates are checked.

**Q: What if a call fails?**
A: Backend logs error, saves call status as "failed", frontend displays error.

**Q: How does knowledge base work during calls?**
A: Deepgram transcribes caller text → Pinecone searches for relevant docs → LLM includes docs in context.

**Q: Is this GDPR compliant?**
A: Mostly yes (encryption, user deletion possible), but you should add Terms & Privacy Policy.

---

## Success Indicators

✅ **Phase 1:** Users can log in
✅ **Phase 2:** Users can create assistants
✅ **Phase 3:** API keys are encrypted
✅ **Phase 4:** Providers are configurable per assistant
✅ **Phase 5:** Phone numbers can be imported
✅ **Phase 6:** Documents are embedded
✅ **Phase 7:** Inbound calls work end-to-end
✅ **Phase 8:** Call logs are visible
✅ **Phase 9:** All tests pass
✅ **Phase 10:** Live at your domain

---

## Next Action

**Start here:**
1. Read `COMPLETE_IMPLEMENTATION_PLAN.md` (10 minutes overview)
2. Read `SKILLS_AND_MCPS_GUIDE.md` (5 minutes setup)
3. Complete pre-development checklist
4. Enable MCPs in Claude Code
5. Start Phase 1 development

**You're ready! 🚀**

