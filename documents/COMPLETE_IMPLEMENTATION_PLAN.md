# 🎯 COMPLETE IMPLEMENTATION PLAN
## Multi-User AI Voice Assistant Platform (Frontend + Backend)

---

## 📋 TABLE OF CONTENTS
1. [System Architecture](#1-system-architecture)
2. [Technology Stack (Recommended)](#2-technology-stack-recommended)
3. [Database Schema](#3-database-schema)
4. [Backend API Specification](#4-backend-api-specification)
5. [Frontend Architecture](#5-frontend-architecture)
6. [Call Handling Flow](#6-call-handling-flow)
7. [Knowledge Base Processing](#7-knowledge-base-processing)
8. [Security & Encryption](#8-security--encryption)
9. [Integration Checklist](#9-integration-checklist)
10. [Skills & MCPs for Claude Code](#10-skills--mcps-for-claude-code)
11. [Implementation Roadmap](#11-implementation-roadmap)

---

## 1. SYSTEM ARCHITECTURE

### 1.1 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Login/Signup → Dashboard → Create Assistant Config      │   │
│  │ ├─ System Prompt                                        │   │
│  │ ├─ Model Config (OpenAI, Anthropic, Google, etc.)     │   │
│  │ ├─ Voice Config (Saarvam, ElevenLabs, Deepgram)       │   │
│  │ ├─ Transcriber Config (Deepgram, Assembly AI, etc.)   │   │
│  │ ├─ Knowledge Base Upload                              │   │
│  │ └─ Phone Number Assignment                            │   │
│  │                                                         │   │
│  │ Settings Page:                                          │   │
│  │ ├─ Twilio Credentials                                 │   │
│  │ ├─ Vobiz/SIP Credentials                              │   │
│  │ ├─ Voice Provider Credentials                         │   │
│  │ ├─ Model Provider Credentials                         │   │
│  │ └─ Transcriber Credentials                            │   │
│  │                                                         │   │
│  │ Call Logs Page:                                        │   │
│  │ ├─ View past calls                                    │   │
│  │ └─ View transcripts                                   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                            ↓ HTTPS
┌─────────────────────────────────────────────────────────────────┐
│                   BACKEND (Node.js/Express)                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Authentication Layer (JWT)                              │   │
│  │ ├─ POST /auth/signup                                   │   │
│  │ ├─ POST /auth/login                                    │   │
│  │ └─ POST /auth/logout                                   │   │
│  │                                                         │   │
│  │ Assistant Management                                   │   │
│  │ ├─ POST /assistants (create)                          │   │
│  │ ├─ GET /assistants (list)                             │   │
│  │ ├─ PUT /assistants/:id (update)                       │   │
│  │ └─ DELETE /assistants/:id (delete)                    │   │
│  │                                                         │   │
│  │ Credentials Management (Encrypted)                     │   │
│  │ ├─ POST /credentials (save API keys)                  │   │
│  │ ├─ GET /credentials (retrieve - decrypted on demand) │   │
│  │ └─ PUT /credentials/:id (update)                      │   │
│  │                                                         │   │
│  │ Phone Number Management                                │   │
│  │ ├─ POST /phone-numbers/import (fetch from Twilio)    │   │
│  │ ├─ GET /phone-numbers (list user's numbers)          │   │
│  │ └─ POST /phone-numbers/assign (assign to assistant)  │   │
│  │                                                         │   │
│  │ Call Handling                                          │   │
│  │ ├─ POST /calls/webhook (Twilio/Vobiz inbound)        │   │
│  │ ├─ GET /calls (call history)                         │   │
│  │ └─ GET /calls/:id (call details + transcript)        │   │
│  │                                                         │   │
│  │ Chat/Assistant Interaction                            │   │
│  │ └─ POST /assistant/:id/chat (message streaming)       │   │
│  │                                                         │   │
│  │ Knowledge Base Processing                             │   │
│  │ └─ POST /assistants/:id/knowledge-base (upload)      │   │
│  │                                                         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Internal Services                                       │   │
│  │ ├─ Credential Encryption/Decryption (AES-256)         │   │
│  │ ├─ LLM Integration Layer (OpenAI, Anthropic, etc.)    │   │
│  │ ├─ Speech-to-Text Service (Deepgram, Assembly AI)     │   │
│  │ ├─ Text-to-Speech Service (ElevenLabs, Saarvam)       │   │
│  │ ├─ Document Processing (PDF extraction → embeddings)  │   │
│  │ └─ Call State Management                              │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                            ↓ API Calls
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL PROVIDERS                            │
│                                                                  │
│ Phone Providers:           Model Providers:                     │
│ ├─ Twilio                 ├─ OpenAI                            │
│ └─ Vobiz (SIP)            ├─ Anthropic                         │
│                           ├─ Google Vertex                     │
│ Voice Providers:          ├─ OpenRouter                        │
│ ├─ Saarvam               ├─ Azure OpenAI                       │
│ ├─ ElevenLabs            ├─ xAI                                │
│ └─ Deepgram              ├─ Mistral                            │
│                          └─ Perplexity                         │
│ Transcriber Providers:                                          │
│ ├─ Saarvam                                                     │
│ ├─ Deepgram                                                    │
│ ├─ Assembly AI                                                 │
│ └─ ElevenLabs                                                  │
│                                                                  │
│ Vector Database:                                                │
│ └─ Pinecone (for knowledge base embeddings)                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Data Flow: Assistant Configuration

```
User → Frontend UI → Backend API → Database
                   → Encrypt credentials → Secure Storage
                   → Generate templates → Load predefined assistants
                   → Upload documents → Process → Vector DB
```

### 1.3 Data Flow: Inbound Call

```
Caller → Twilio/Vobiz → Backend Webhook
                      → Fetch Assistant Config + Credentials
                      → Initialize LLM Session
                      → Transcribe caller audio (STT)
                      → Generate response (LLM)
                      → Synthesize audio (TTS)
                      → Stream back to caller
                      → Log call + transcript to database
                      → Frontend polls for call history
```

---

## 2. TECHNOLOGY STACK (RECOMMENDED)

### 2.1 Frontend
- **Framework:** React 18+ (with TypeScript)
- **Routing:** React Router v6
- **State Management:** Zustand (lightweight, perfect for credentials + assistant state)
- **HTTP Client:** TanStack Query (React Query) + Axios
- **Form Handling:** React Hook Form + Zod (validation)
- **UI Components:** shadcn/ui + Tailwind CSS
- **Real-time:** Polling (no WebSocket for MVP)
- **File Upload:** React Dropzone + multer (backend)

### 2.2 Backend
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** PostgreSQL (relational data)
- **Vector DB:** Pinecone (knowledge base embeddings)
- **Authentication:** JWT (jsonwebtoken)
- **Encryption:** crypto (built-in) + bcrypt
- **Document Processing:** pdf-parse, pdfjs-dist (PDFs) → OpenAI Embeddings API
- **Twilio SDK:** twilio (phone integration)
- **Audio Processing:** Simple RAW audio streaming (no heavy processing)
- **Environment:** dotenv
- **Logging:** winston or pino
- **Rate Limiting:** express-rate-limit

### 2.3 External Integrations
- **Phone:** Twilio + Vobiz SDK
- **LLM:** OpenAI SDK + Anthropic SDK + others
- **Voice:** ElevenLabs SDK + Deepgram SDK + Saarvam API
- **Transcription:** Deepgram SDK + Assembly AI SDK
- **Embeddings:** OpenAI Embeddings API (for knowledge base)

---

## 3. DATABASE SCHEMA

### 3.1 PostgreSQL Tables

```sql
-- 1. USERS
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. ASSISTANTS
CREATE TABLE assistants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  system_prompt TEXT NOT NULL,
  model_provider VARCHAR(50) NOT NULL, -- 'openai', 'anthropic', 'google', etc.
  model_name VARCHAR(100) NOT NULL, -- 'gpt-4', 'claude-3-opus', etc.
  voice_provider VARCHAR(50), -- 'elevenlabs', 'deepgram', 'saarvam'
  voice_id VARCHAR(255), -- Voice ID from provider
  transcriber_provider VARCHAR(50), -- 'deepgram', 'assembly_ai', 'saarvam'
  knowledge_base_enabled BOOLEAN DEFAULT FALSE,
  temperature FLOAT DEFAULT 0.7,
  max_tokens INT DEFAULT 1024,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, name)
);

-- 3. CREDENTIALS (Encrypted)
CREATE TABLE credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_type VARCHAR(50) NOT NULL, -- 'twilio', 'vobiz', 'openai', 'elevenlabs', etc.
  provider_name VARCHAR(100) NOT NULL,
  encrypted_credentials TEXT NOT NULL, -- AES-256 encrypted JSON
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, provider_type, provider_name)
);

-- 4. PHONE NUMBERS
CREATE TABLE phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assistant_id UUID NOT NULL REFERENCES assistants(id) ON DELETE SET NULL,
  phone_number VARCHAR(20) NOT NULL,
  provider VARCHAR(50) NOT NULL, -- 'twilio', 'vobiz'
  provider_phone_id VARCHAR(255), -- SID for Twilio, etc.
  webhook_url VARCHAR(500),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, phone_number)
);

-- 5. CALL LOGS
CREATE TABLE calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assistant_id UUID NOT NULL REFERENCES assistants(id) ON DELETE CASCADE,
  phone_number_id UUID NOT NULL REFERENCES phone_numbers(id),
  caller_number VARCHAR(20) NOT NULL,
  call_started_at TIMESTAMP NOT NULL,
  call_ended_at TIMESTAMP,
  duration_seconds INT,
  transcript TEXT,
  call_status VARCHAR(50), -- 'completed', 'failed', 'missed'
  provider_call_id VARCHAR(255), -- Twilio Call SID
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. KNOWLEDGE BASE DOCUMENTS
CREATE TABLE knowledge_base_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assistant_id UUID NOT NULL REFERENCES assistants(id) ON DELETE CASCADE,
  document_name VARCHAR(255) NOT NULL,
  document_type VARCHAR(50), -- 'pdf', 'docx', 'txt'
  file_path VARCHAR(500), -- S3 or local storage
  extracted_text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. KNOWLEDGE BASE EMBEDDINGS (for Pinecone reference)
-- Note: Actual embeddings stored in Pinecone, this table stores metadata
CREATE TABLE knowledge_base_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES knowledge_base_documents(id) ON DELETE CASCADE,
  chunk_index INT,
  chunk_text TEXT,
  pinecone_vector_id VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. ASSISTANT TEMPLATES (Hardcoded in App)
-- This can be seeded at startup, not strictly needed in DB
CREATE TABLE assistant_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  system_prompt TEXT NOT NULL,
  default_model VARCHAR(100),
  default_voice_provider VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_assistants_user_id ON assistants(user_id);
CREATE INDEX idx_credentials_user_id ON credentials(user_id);
CREATE INDEX idx_phone_numbers_user_id ON phone_numbers(user_id);
CREATE INDEX idx_phone_numbers_assistant_id ON phone_numbers(assistant_id);
CREATE INDEX idx_calls_user_id ON calls(user_id);
CREATE INDEX idx_calls_assistant_id ON calls(assistant_id);
CREATE INDEX idx_knowledge_base_assistant_id ON knowledge_base_documents(assistant_id);
```

### 3.2 Pinecone Vector Database

**Index Structure:**
```
Index Name: "knowledge-base"
Dimension: 1536 (OpenAI embeddings)
Metric: cosine

Vector Metadata:
{
  "assistant_id": "uuid",
  "document_id": "uuid",
  "chunk_index": 0,
  "chunk_text": "...",
  "source": "pdf_name.pdf"
}
```

---

## 4. BACKEND API SPECIFICATION

### 4.1 Authentication Endpoints

#### POST /auth/signup
**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "first_name": "John",
  "last_name": "Doe"
}
```
**Response (201):**
```json
{
  "success": true,
  "message": "User created successfully",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "first_name": "John"
  }
}
```

#### POST /auth/login
**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```
**Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "first_name": "John"
  }
}
```

#### POST /auth/logout
**Request:** (with Authorization header)
**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### 4.2 Assistant Management Endpoints

#### POST /assistants
**Request:**
```json
{
  "name": "Customer Support Bot",
  "system_prompt": "You are a helpful customer support agent...",
  "model_provider": "openai",
  "model_name": "gpt-4",
  "voice_provider": "elevenlabs",
  "voice_id": "21m00Tcm4TlvDq8ikWAM",
  "transcriber_provider": "deepgram",
  "temperature": 0.7,
  "max_tokens": 1024,
  "knowledge_base_enabled": false
}
```
**Response (201):**
```json
{
  "success": true,
  "assistant": {
    "id": "uuid",
    "name": "Customer Support Bot",
    "system_prompt": "...",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

#### GET /assistants
**Response (200):**
```json
{
  "success": true,
  "assistants": [
    {
      "id": "uuid",
      "name": "Customer Support Bot",
      "model_provider": "openai",
      "voice_provider": "elevenlabs",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### PUT /assistants/:id
**Request:** (same structure as POST, but partial updates allowed)
**Response (200):** Updated assistant object

#### DELETE /assistants/:id
**Response (200):**
```json
{
  "success": true,
  "message": "Assistant deleted successfully"
}
```

---

### 4.3 Credentials Management Endpoints

#### POST /credentials
**Request:**
```json
{
  "provider_type": "openai",
  "provider_name": "OpenAI API Key",
  "credentials": {
    "api_key": "sk-..."
  },
  "is_primary": true
}
```
**Response (201):**
```json
{
  "success": true,
  "credential": {
    "id": "uuid",
    "provider_type": "openai",
    "provider_name": "OpenAI API Key",
    "is_primary": true,
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```
**Note:** API key is encrypted before storage. Frontend never sees the raw key again.

#### GET /credentials
**Response (200):**
```json
{
  "success": true,
  "credentials": [
    {
      "id": "uuid",
      "provider_type": "openai",
      "provider_name": "OpenAI API Key",
      "is_primary": true,
      "created_at": "2024-01-15T10:30:00Z"
      // ❌ API key is NOT returned
    }
  ]
}
```

#### PUT /credentials/:id
**Request:** (provide new credentials)
**Response (200):** Updated credential metadata (no keys exposed)

#### DELETE /credentials/:id
**Response (200):**
```json
{
  "success": true,
  "message": "Credential deleted successfully"
}
```

---

### 4.4 Phone Number Management Endpoints

#### POST /phone-numbers/import
**Request:**
```json
{
  "provider": "twilio",
  "phone_numbers": ["+1234567890", "+0987654321"]
}
```
**Response (200):**
```json
{
  "success": true,
  "imported": [
    {
      "id": "uuid",
      "phone_number": "+1234567890",
      "provider": "twilio",
      "provider_phone_id": "PN1234567890abc"
    }
  ]
}
```

#### GET /phone-numbers
**Response (200):**
```json
{
  "success": true,
  "phone_numbers": [
    {
      "id": "uuid",
      "phone_number": "+1234567890",
      "provider": "twilio",
      "assistant_id": "uuid",
      "assistant_name": "Customer Support Bot",
      "is_active": true,
      "webhook_url": "https://yourbackend.com/calls/webhook"
    }
  ]
}
```

#### POST /phone-numbers/assign
**Request:**
```json
{
  "phone_number_id": "uuid",
  "assistant_id": "uuid"
}
```
**Response (200):**
```json
{
  "success": true,
  "message": "Phone number assigned to assistant",
  "webhook_url": "https://yourbackend.com/calls/webhook"
}
```
**Note:** Frontend displays this webhook URL for user to manually configure in Twilio dashboard.

---

### 4.5 Call Handling Endpoints

#### POST /calls/webhook
**Received from Twilio (incoming call):**
```
POST Body (form-encoded):
From: +1234567890
To: +0987654321
CallSid: CA1234567890abcdef
```
**Backend Processing:**
1. Extract `To` phone number
2. Fetch associated assistant + credentials
3. Initiate LLM conversation
4. Handle audio streaming
5. Store transcript + call log

**Response (200):** TwiML XML
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Thank you for calling. Please hold while we connect you.</Say>
  <Redirect>https://yourbackend.com/calls/stream/:callId</Redirect>
</Response>
```

#### GET /calls
**Query Params:**
- `limit`: 20
- `offset`: 0
- `assistant_id` (optional)

**Response (200):**
```json
{
  "success": true,
  "calls": [
    {
      "id": "uuid",
      "assistant_id": "uuid",
      "assistant_name": "Customer Support Bot",
      "caller_number": "+1234567890",
      "call_started_at": "2024-01-15T10:30:00Z",
      "call_ended_at": "2024-01-15T10:35:45Z",
      "duration_seconds": 345,
      "call_status": "completed",
      "has_transcript": true
    }
  ],
  "total": 150,
  "offset": 0
}
```

#### GET /calls/:id
**Response (200):**
```json
{
  "success": true,
  "call": {
    "id": "uuid",
    "assistant_id": "uuid",
    "assistant_name": "Customer Support Bot",
    "caller_number": "+1234567890",
    "call_started_at": "2024-01-15T10:30:00Z",
    "call_ended_at": "2024-01-15T10:35:45Z",
    "duration_seconds": 345,
    "transcript": "Caller: Hello?\nBot: Hi, how can I help you today?\nCaller: I have a billing question...",
    "call_status": "completed"
  }
}
```

---

### 4.6 Chat/Assistant Interaction Endpoint

#### POST /assistant/:id/chat
**Request:**
```json
{
  "message": "What are your business hours?",
  "stream": true
}
```
**Response (200 - Streaming):**
```
Server-Sent Events (SSE):
data: {"type": "text", "content": "Our business hours are"}
data: {"type": "text", "content": " 9 AM to 6 PM"}
data: {"type": "text", "content": " EST daily."}
data: {"type": "done", "content": ""}
```

**Response (200 - Non-streaming):**
```json
{
  "success": true,
  "message": "Our business hours are 9 AM to 6 PM EST daily."
}
```

---

### 4.7 Knowledge Base Endpoints

#### POST /assistants/:id/knowledge-base
**Request:** (multipart/form-data)
```
Files: [document.pdf, document.docx, document.txt]
```
**Backend Processing:**
1. Extract text from documents
2. Split into chunks (500-token overlap)
3. Generate embeddings via OpenAI Embeddings API
4. Store in Pinecone + PostgreSQL metadata

**Response (202):**
```json
{
  "success": true,
  "message": "Documents processing...",
  "task_id": "uuid"
}
```

#### GET /assistants/:id/knowledge-base
**Response (200):**
```json
{
  "success": true,
  "documents": [
    {
      "id": "uuid",
      "document_name": "product_guide.pdf",
      "document_type": "pdf",
      "created_at": "2024-01-15T10:30:00Z",
      "status": "processed"
    }
  ]
}
```

#### DELETE /assistants/:id/knowledge-base/:doc_id
**Response (200):**
```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

---

### 4.8 Error Responses

**400 Bad Request:**
```json
{
  "success": false,
  "error": "Invalid request format",
  "details": ["email is required", "password must be at least 8 characters"]
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "error": "Unauthorized - invalid token"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "error": "Assistant not found"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "error": "Internal server error",
  "message": "Please try again later"
}
```

---

## 5. FRONTEND ARCHITECTURE

### 5.1 React Component Structure

```
src/
├── pages/
│   ├── Login.tsx
│   ├── Signup.tsx
│   ├── Dashboard.tsx
│   ├── CreateAssistant.tsx
│   ├── EditAssistant.tsx
│   ├── AssistantConfig.tsx
│   │   ├─ SystemPromptSection.tsx
│   │   ├─ ModelConfigSection.tsx
│   │   ├─ VoiceConfigSection.tsx
│   │   ├─ TranscriberConfigSection.tsx
│   │   └─ KnowledgeBaseSection.tsx
│   ├── Settings.tsx
│   │   ├─ CredentialsForm.tsx
│   │   ├─ TwilioCredentials.tsx
│   │   ├─ VobizCredentials.tsx
│   │   ├─ ModelProviderCredentials.tsx
│   │   ├─ VoiceProviderCredentials.tsx
│   │   └─ TranscriberProviderCredentials.tsx
│   └── CallLogs.tsx
│       ├─ CallLogList.tsx
│       └─ CallTranscriptModal.tsx
│
├── components/
│   ├── AssistantCard.tsx
│   ├── PhoneNumberSelector.tsx
│   ├── PhoneNumberImporter.tsx
│   ├── VoiceLibrarySelector.tsx
│   ├── DocumentUploader.tsx
│   ├── TemplateSelector.tsx
│   └── common/
│       ├─ Header.tsx
│       ├─ Sidebar.tsx
│       └─ ErrorBoundary.tsx
│
├── hooks/
│   ├── useAuth.ts (JWT token management)
│   ├── useAssistants.ts (CRUD operations)
│   ├── useCredentials.ts (API key management)
│   ├── usePhoneNumbers.ts (phone number management)
│   ├── useCalls.ts (call history with polling)
│   └── useApi.ts (generic API wrapper)
│
├── store/
│   ├── authStore.ts (Zustand: user, token)
│   ├── assistantStore.ts (Zustand: selected assistant, config)
│   ├── credentialStore.ts (Zustand: available credentials)
│   └── callStore.ts (Zustand: call history, polling state)
│
├── services/
│   ├── api.ts (Axios instance + interceptors)
│   ├── auth.ts (login, signup, logout)
│   ├── assistants.ts (CRUD)
│   ├── credentials.ts (manage API keys)
│   ├── phoneNumbers.ts (import, assign)
│   ├── calls.ts (fetch history, poll for updates)
│   └── templates.ts (load predefined templates)
│
├── utils/
│   ├── validators.ts (form validation)
│   ├── formatters.ts (phone numbers, dates, etc.)
│   └── storage.ts (localStorage for UI state only)
│
├── types/
│   ├── index.ts (TypeScript interfaces)
│   ├── assistant.ts
│   ├── credentials.ts
│   ├── calls.ts
│   └── api.ts
│
├── App.tsx (Router setup)
└── index.tsx (Entry point)
```

### 5.2 State Management (Zustand)

**authStore.ts:**
```typescript
create((set) => ({
  user: null,
  token: null,
  login: (user, token) => set({ user, token }),
  logout: () => set({ user: null, token: null }),
  isAuthenticated: () => !!token,
}))
```

**assistantStore.ts:**
```typescript
create((set) => ({
  assistants: [],
  selectedAssistant: null,
  setAssistants: (assistants) => set({ assistants }),
  setSelected: (assistant) => set({ selectedAssistant: assistant }),
  updateAssistant: (id, changes) => set((state) => ({
    assistants: state.assistants.map(a => a.id === id ? {...a, ...changes} : a)
  })),
}))
```

**credentialStore.ts:**
```typescript
create((set) => ({
  credentials: {},
  setCredentials: (provider, creds) => set((state) => ({
    credentials: { ...state.credentials, [provider]: creds }
  })),
}))
```

### 5.3 React Router Setup

```typescript
const router = createBrowserRouter([
  {
    path: '/',
    element: <ProtectedRoute><Dashboard /></ProtectedRoute>,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/signup',
    element: <Signup />,
  },
  {
    path: '/assistants/create',
    element: <ProtectedRoute><CreateAssistant /></ProtectedRoute>,
  },
  {
    path: '/assistants/:id/edit',
    element: <ProtectedRoute><EditAssistant /></ProtectedRoute>,
  },
  {
    path: '/settings',
    element: <ProtectedRoute><Settings /></ProtectedRoute>,
  },
  {
    path: '/calls',
    element: <ProtectedRoute><CallLogs /></ProtectedRoute>,
  },
]);
```

### 5.4 Call Polling (MVP Implementation)

```typescript
// In useCalls.ts
const [calls, setCalls] = useState([]);
const [isPolling, setIsPolling] = useState(true);

useEffect(() => {
  if (!isPolling) return;

  const interval = setInterval(async () => {
    const response = await api.get('/calls', {
      params: { limit: 20, offset: 0 }
    });
    setCalls(response.data.calls);
  }, 3000); // Poll every 3 seconds

  return () => clearInterval(interval);
}, [isPolling]);
```

---

## 6. CALL HANDLING FLOW

### 6.1 Inbound Call Sequence

```
1. Caller dials Twilio/Vobiz number
   ↓
2. Phone Provider sends webhook to backend:
   POST /calls/webhook
   {
     To: +0987654321,
     From: +1234567890,
     CallSid: CA1234567890
   }
   ↓
3. Backend:
   a) Fetch phone number record from DB
      SELECT * FROM phone_numbers WHERE phone_number = '+0987654321'
   
   b) Fetch associated assistant + credentials
      SELECT * FROM assistants WHERE id = phone_number.assistant_id
      SELECT encrypted_credentials FROM credentials WHERE user_id = assistant.user_id
   
   c) Decrypt credentials
      LLM_KEY, TTS_KEY, STT_KEY = decrypt(encrypted_credentials)
   
   d) Fetch knowledge base (if enabled)
      SELECT embeddings FROM pinecone WHERE assistant_id = assistant.id
   
   e) Initialize call state:
      {
        callSid: 'CA1234567890',
        assistantId: 'uuid',
        conversationHistory: [],
        voiceProvider: 'elevenlabs',
        transcriber: 'deepgram'
      }
   ↓
4. Handle audio streaming:
   a) Caller speaks → Twilio captures audio
   b) Send audio to STT (Deepgram, Assembly AI, Saarvam)
      STT → transcribed_text
   
   c) Send transcribed_text + knowledge_base + conversation_history to LLM
      POST https://api.openai.com/v1/chat/completions
      {
        model: assistant.model_name,
        messages: [
          { role: "system", content: assistant.system_prompt },
          { role: "system", content: knowledge_base_context },
          { role: "user", content: transcribed_text }
        ],
        temperature: assistant.temperature,
        max_tokens: assistant.max_tokens
      }
   
   d) LLM generates response
      llm_response = "Thank you for calling..."
   
   e) Send response to TTS (ElevenLabs, Saarvam, Deepgram)
      TTS(llm_response) → audio_file
   
   f) Stream audio back to caller via Twilio
   
   g) Loop: await next caller input
   ↓
5. Call ends:
   a) Save call log to database
      INSERT INTO calls (
        user_id, assistant_id, caller_number, transcript, duration, status
      )
   
   b) Frontend polls /calls endpoint
      GET /calls → fetches updated call log
```

### 6.2 Phone Number Webhook Setup (User Guide)

**In Settings → Phone Numbers:**

1. User enters Twilio/Vobiz API credentials
2. App validates credentials
3. App fetches user's available numbers
4. User selects a number + assigns it to an assistant
5. App displays:
   ```
   ✅ Webhook URL:
   https://yourbackend.com/calls/webhook
   
   📋 SETUP INSTRUCTIONS:
   1. Go to Twilio Console → Phone Numbers → Manage Numbers
   2. Select your number: +1234567890
   3. Under "Voice & Fax" → Incoming Calls
   4. Set "Configure with": TwiML Bin or App
   5. Paste this webhook URL in the field
   6. Click Save
   
   ✓ Done!
   ```

---

## 7. KNOWLEDGE BASE PROCESSING

### 7.1 Document Upload & Processing Flow

```
1. User uploads PDF/DOCX/TXT in AssistantConfig
   ↓
2. Frontend sends multipart/form-data
   POST /assistants/:id/knowledge-base
   {
     files: [document.pdf, document.docx]
   }
   ↓
3. Backend Processing:
   
   a) Extract text from files
      - PDF: use pdf-parse
      - DOCX: use mammoth or docx library
      - TXT: read directly
   
   b) Split into chunks (max 500 tokens, 50 token overlap)
      document_text = "Lorem ipsum dolor sit amet..."
      chunks = [
        "Lorem ipsum dolor sit amet...",
        "sit amet consectetur adipiscing...",
        ...
      ]
   
   c) Generate embeddings for each chunk
      for each chunk:
        embedding = await openai.createEmbedding(chunk)
        // Returns 1536-dimensional vector
   
   d) Store in Pinecone
      for i, (chunk, embedding) in enumerate(chunks):
        pinecone.upsert(vectors=[
          {
            id: f"{document_id}_{i}",
            values: embedding,
            metadata: {
              assistant_id: assistant.id,
              document_id: document.id,
              chunk_index: i,
              chunk_text: chunk,
              source: filename
            }
          }
        ])
   
   e) Store metadata in PostgreSQL
      INSERT INTO knowledge_base_embeddings (...)
      INSERT INTO knowledge_base_documents (...)
   ↓
4. Return to frontend
   {
     success: true,
     message: "Documents processed"
   }
```

### 7.2 Knowledge Base Retrieval During Call

```
During LLM prompt:
1. Transcribed text received: "What's your return policy?"

2. Generate embedding for query
   query_embedding = await openai.createEmbedding(
     "What's your return policy?"
   )

3. Query Pinecone (semantic search)
   results = pinecone.query(
     vector=query_embedding,
     top_k=3,
     filter={
       "assistant_id": assistant.id
     }
   )
   
   Returns: [
     {
       metadata: {
         chunk_text: "Our return policy allows returns within 30 days...",
         source: "policies.pdf"
       }
     },
     ...
   ]

4. Build prompt with context
   system_prompt = """
   You are a customer support agent.
   
   Knowledge Base:
   ${results.map(r => r.metadata.chunk_text).join('\n\n')}
   """

5. Send to LLM with enriched context
```

---

## 8. SECURITY & ENCRYPTION

### 8.1 API Key Encryption (AES-256-GCM)

**Backend Service:**
```javascript
const crypto = require('crypto');

const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
// Must be 32 bytes (256 bits)

function encryptCredentials(credentials) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    'aes-256-gcm',
    ENCRYPTION_KEY,
    iv
  );
  
  let encrypted = cipher.update(
    JSON.stringify(credentials),
    'utf8',
    'hex'
  );
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    iv: iv.toString('hex'),
    encryptedData: encrypted,
    authTag: authTag.toString('hex')
  };
}

function decryptCredentials(encryptedObj) {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    ENCRYPTION_KEY,
    Buffer.from(encryptedObj.iv, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(encryptedObj.authTag, 'hex'));
  
  let decrypted = decipher.update(
    encryptedObj.encryptedData,
    'hex',
    'utf8'
  );
  decrypted += decipher.final('utf8');
  
  return JSON.parse(decrypted);
}
```

### 8.2 Environment Variables (Backend)

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/ai_voice_assistant

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRY=7d

# Encryption
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef (hex, 32 bytes)

# External APIs (only backend stores these)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
DEEPGRAM_API_KEY=...
ELEVENLABS_API_KEY=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...

# Pinecone
PINECONE_API_KEY=...
PINECONE_INDEX_NAME=knowledge-base

# Application
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://yourfrontend.com
WEBHOOK_BASE_URL=https://yourbackend.com
```

### 8.3 Authentication Flow

```
1. User signs up/logs in
   POST /auth/login
   {
     email: "user@example.com",
     password: "password123"
   }

2. Backend validates password (bcrypt)
   const isValid = await bcrypt.compare(password, user.password_hash);

3. Backend generates JWT token
   const token = jwt.sign(
     { userId: user.id, email: user.email },
     process.env.JWT_SECRET,
     { expiresIn: '7d' }
   );

4. Frontend stores token in localStorage
   localStorage.setItem('token', token);

5. Frontend includes token in all API requests
   Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

6. Backend verifies token on each request
   const decoded = jwt.verify(token, process.env.JWT_SECRET);
   // Extract userId from decoded token
```

---

## 9. INTEGRATION CHECKLIST

### 9.1 External SDK Installations

**Backend:**
```bash
npm install express dotenv pg pinecone-client bcrypt jsonwebtoken
npm install axios twilio openai @anthropic-ai/sdk
npm install deepgram-sdk elevenlabs-sdk @deepgram/sdk
npm install pdf-parse mammoth docx
npm install multer crypto
npm install rate-limit helmet cors
```

**Frontend:**
```bash
npm install react react-router-dom zustand axios react-hook-form zod
npm install react-dropzone react-query @tanstack/react-query
npm install shadcn/ui tailwindcss
npm install date-fns phone-formatter
```

### 9.2 API Keys Needed

| Provider | Type | Where to Get |
|----------|------|-------------|
| OpenAI | Model + Embeddings | https://platform.openai.com/api-keys |
| Anthropic | Model | https://console.anthropic.com |
| Google | Vertex AI | https://console.cloud.google.com |
| Twilio | Phone | https://console.twilio.com |
| Vobiz | SIP Trunking | Vobiz portal |
| ElevenLabs | Voice + Transcription | https://elevenlabs.io/app/settings/api-keys |
| Deepgram | Voice + Transcription | https://console.deepgram.com |
| Assembly AI | Transcription | https://www.assemblyai.com/app |
| Saarvam | Voice + Transcription | Saarvam portal |
| Pinecone | Vector DB | https://app.pinecone.io |
| OpenRouter | Model Aggregator | https://openrouter.ai |
| xAI | Model | xAI platform |
| Mistral | Model | https://console.mistral.ai |
| Perplexity | Model | Perplexity API |

### 9.3 Provider Configuration Examples

**OpenAI (Model + Embeddings):**
```javascript
const OpenAI = require('openai');
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Chat completion
const response = await client.chat.completions.create({
  model: "gpt-4",
  messages: [{ role: "user", content: "..." }],
  temperature: 0.7,
  max_tokens: 1024,
  stream: true,
});

// Embeddings
const embedding = await client.embeddings.create({
  model: "text-embedding-3-small",
  input: "Your text here",
  dimensions: 1536,
});
```

**Deepgram (STT + Voice):**
```javascript
const { Deepgram } = require('@deepgram/sdk');
const deepgram = new Deepgram(process.env.DEEPGRAM_API_KEY);

// STT
const response = await deepgram.transcription.preRecorded({
  buffer: audioBuffer,
  mimetype: 'audio/wav',
});

// TTS
const ttsResponse = await deepgram.speak.request({
  text: "Hello world",
});
```

**ElevenLabs (Voice):**
```javascript
const ElevenLabs = require('elevenlabs-node');

// TTS
const audio = await ElevenLabs.textToSpeech({
  voiceId: "21m00Tcm4TlvDq8ikWAM",
  text: "Hello world",
  apiKey: process.env.ELEVENLABS_API_KEY,
});
```

**Twilio (Phone):**
```javascript
const twilio = require('twilio');
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// List phone numbers
const phoneNumbers = await client.incomingPhoneNumbers.list();

// Update phone number webhook
await client.incomingPhoneNumbers(phoneNumberSid).update({
  voiceUrl: 'https://yourbackend.com/calls/webhook',
  voiceMethod: 'POST',
});
```

---

## 10. SKILLS & MCPs FOR CLAUDE CODE

### 10.1 Required Skills

1. **Frontend Design**
   - Use for polished React UI
   - Reference: `/mnt/skills/public/frontend-design/SKILL.md`

2. **Product Self-Knowledge** (Optional but recommended)
   - For any Anthropic integrations
   - Reference: `/mnt/skills/public/product-self-knowledge/SKILL.md`

### 10.2 MCPs (Model Context Protocol) to Enable

**For Claude Code:**

| MCP | Purpose | Why |
|-----|---------|-----|
| **GitHub** | Manage code repo, push commits | Version control for your project |
| **Slack** | Send deployment notifications | Alert team when features are ready |
| **PostgreSQL** | Query database directly | Debug data, inspect schemas |
| **Pinecone** | Manage vector DB | Update/query knowledge base |
| **Stripe** (optional) | Handle payments | If you monetize the platform |

### 10.3 MCP Configuration for Claude Code

**In Claude Code settings, enable:**

```json
{
  "mcps": [
    {
      "name": "github",
      "config": {
        "token": "${GITHUB_TOKEN}",
        "repo": "your-username/ai-voice-assistant"
      }
    },
    {
      "name": "postgresql",
      "config": {
        "connectionString": "${DATABASE_URL}"
      }
    },
    {
      "name": "pinecone",
      "config": {
        "apiKey": "${PINECONE_API_KEY}",
        "indexName": "knowledge-base"
      }
    }
  ]
}
```

### 10.4 What Claude Code Can Do With These

- **GitHub MCP:** Create branches, commit code, open PRs, manage issues
- **PostgreSQL MCP:** Run queries, inspect schemas, validate migrations
- **Pinecone MCP:** Test vector queries, debug embeddings, manage indexes
- **Slack MCP:** Send build status, deployment notifications

---

## 11. IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Week 1-2)
- [ ] Set up Node.js backend + Express server
- [ ] Set up React frontend + routing
- [ ] Create PostgreSQL database + schema
- [ ] Implement authentication (signup/login/logout)
- [ ] Set up JWT token management
- [ ] Create basic Zustand stores

**Deliverable:** Users can sign up, log in, and see a blank dashboard.

---

### Phase 2: Assistant Management (Week 2-3)
- [ ] Build Create/Edit Assistant pages
- [ ] Implement assistant CRUD endpoints
- [ ] Build system prompt editor
- [ ] Load predefined templates
- [ ] Store assistants in database

**Deliverable:** Users can create and manage assistants with system prompts.

---

### Phase 3: Credentials & Security (Week 3-4)
- [ ] Implement credential encryption (AES-256)
- [ ] Build Settings page for API keys
- [ ] Create credential management endpoints
- [ ] Add validation for each provider's credentials

**Deliverable:** Users can securely save API keys for all providers.

---

### Phase 4: Provider Configuration (Week 4-5)
- [ ] Build Model Config section (OpenAI, Anthropic, etc.)
- [ ] Build Voice Config section (ElevenLabs, Deepgram, etc.)
- [ ] Build Transcriber Config section
- [ ] Add voice library selector (optional)

**Deliverable:** Users can configure which providers to use per assistant.

---

### Phase 5: Phone Number Integration (Week 5-6)
- [ ] Integrate Twilio SDK for number import
- [ ] Build Phone Number Importer UI
- [ ] Implement phone number assignment
- [ ] Generate webhook URLs for user setup

**Deliverable:** Users can import Twilio numbers and assign them to assistants.

---

### Phase 6: Knowledge Base (Week 6-7)
- [ ] Build document uploader
- [ ] Implement PDF/DOCX/TXT extraction
- [ ] Integrate Pinecone for vector storage
- [ ] Set up OpenAI embeddings
- [ ] Store document metadata

**Deliverable:** Users can upload documents and generate embeddings.

---

### Phase 7: Inbound Call Handling (Week 7-9)
- [ ] Build Twilio webhook endpoint
- [ ] Implement call state management
- [ ] Integrate LLM (OpenAI/Anthropic) for responses
- [ ] Integrate STT (Deepgram/Assembly AI)
- [ ] Integrate TTS (ElevenLabs/Saarvam)
- [ ] Handle audio streaming
- [ ] Save call logs and transcripts

**Deliverable:** Inbound calls work end-to-end.

---

### Phase 8: Call Logs & UI (Week 9-10)
- [ ] Build Call Logs page with list
- [ ] Implement call history polling
- [ ] Build transcript viewer
- [ ] Add call filtering and search

**Deliverable:** Users can view past calls and transcripts.

---

### Phase 9: Testing & Optimization (Week 10-11)
- [ ] Unit tests for API endpoints
- [ ] Integration tests for call flow
- [ ] Load testing (simulate concurrent calls)
- [ ] Security audit (OWASP Top 10)
- [ ] Performance optimization

**Deliverable:** Production-ready, tested application.

---

### Phase 10: Deployment (Week 11-12)
- [ ] Deploy backend (Heroku, Railway, AWS)
- [ ] Deploy frontend (Vercel, Netlify)
- [ ] Set up CI/CD pipeline
- [ ] Configure monitoring & logging
- [ ] Create user documentation

**Deliverable:** Live, monitoring application.

---

## 12. DETAILED IMPLEMENTATION NOTES

### 12.1 Backend Technologies (Recommended)

**Option 1: Node.js/Express (Recommended - Fastest MVP)**
```javascript
// Server setup
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));
app.use(express.json());

// Middleware for JWT
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

app.post('/assistants', authMiddleware, async (req, res) => {
  // Handler
});
```

**Option 2: Python/FastAPI (If preferred)**
- Better for NLP/ML tasks
- Slower development for this MVP
- More complex deployment

**Recommendation:** Use Node.js/Express for rapid MVP development.

### 12.2 Frontend Technologies

**State Management:**
- **Zustand** over Redux: Simpler syntax, less boilerplate
- **TanStack Query** for server state (optional, but recommended for call polling)

**UI Framework:**
- shadcn/ui + Tailwind CSS: Pre-built, accessible components
- No need for Material-UI (overkill)

### 12.3 Database Migrations

```bash
# Install migration tool
npm install -g knex

# Create migration
knex migrate:make initial_schema

# Run migration
knex migrate:latest

# Rollback
knex migrate:rollback
```

### 12.4 Error Handling & Logging

**Backend:**
```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console(),
  ],
});

try {
  // Your code
} catch (error) {
  logger.error('Error details:', error);
  res.status(500).json({ error: 'Internal server error' });
}
```

### 12.5 Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

app.use(limiter);
```

### 12.6 CORS Configuration

```javascript
const cors = require('cors');

app.use(cors({
  origin: process.env.FRONTEND_URL, // Only allow your frontend
  credentials: true, // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

---

## 13. QUICK REFERENCE: FILE STRUCTURE

```
your-project/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── auth.js
│   │   │   ├── assistants.js
│   │   │   ├── credentials.js
│   │   │   ├── phoneNumbers.js
│   │   │   ├── calls.js
│   │   │   └── chat.js
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── Assistant.js
│   │   │   ├── Credential.js
│   │   │   └── Call.js
│   │   ├── services/
│   │   │   ├── llmService.js (OpenAI, Anthropic, etc.)
│   │   │   ├── sttService.js (Deepgram, Assembly AI)
│   │   │   ├── ttsService.js (ElevenLabs, Saarvam)
│   │   │   ├── phoneService.js (Twilio SDK)
│   │   │   ├── encryptionService.js (AES-256)
│   │   │   ├── knowledgeBaseService.js (Pinecone)
│   │   │   └── callService.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   ├── errorHandler.js
│   │   │   └── validation.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── assistants.js
│   │   │   ├── credentials.js
│   │   │   ├── phoneNumbers.js
│   │   │   ├── calls.js
│   │   │   └── chat.js
│   │   ├── database/
│   │   │   ├── config.js
│   │   │   └── migrations/
│   │   ├── utils/
│   │   │   ├── logger.js
│   │   │   └── validators.js
│   │   └── app.js
│   ├── .env
│   ├── .env.example
│   ├── package.json
│   └── README.md
│
├── frontend/
│   ├── src/
│   │   ├── pages/ (as listed in 5.1)
│   │   ├── components/ (as listed in 5.1)
│   │   ├── hooks/ (as listed in 5.1)
│   │   ├── store/ (as listed in 5.1)
│   │   ├── services/ (as listed in 5.1)
│   │   ├── utils/ (as listed in 5.1)
│   │   ├── types/ (as listed in 5.1)
│   │   ├── App.tsx
│   │   ├── index.tsx
│   │   └── index.css
│   ├── .env.local
│   ├── package.json
│   ├── tailwind.config.js
│   └── README.md
│
└── docs/
    ├── API_SPEC.md (Backend endpoints)
    ├── DEPLOYMENT.md
    ├── CONTRIBUTING.md
    └── TROUBLESHOOTING.md
```

---

## 14. NEXT STEPS: WHAT TO DO NOW

1. **Confirm this plan** — Any changes or clarifications needed?

2. **Choose your deployment platforms:**
   - Backend: Heroku, Railway.app, AWS EC2, DigitalOcean, Render
   - Frontend: Vercel, Netlify
   - Database: Managed PostgreSQL (Supabase, Railway, AWS RDS)

3. **Gather API Keys** (listed in section 9.2)

4. **Create GitHub repo** with structure from section 13

5. **Start Phase 1** with Claude Code:
   - Initialize Node.js + Express backend
   - Initialize React frontend
   - Set up PostgreSQL schema
   - Implement authentication

---

**You're ready to start building! Let me know if you need clarifications on any section.** 🚀

