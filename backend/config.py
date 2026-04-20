import os
from dotenv import load_dotenv

load_dotenv()

# =========================================================================================
#  🤖 ARYANTRA AI - AGENT CONFIGURATION
#  Use this file to customize your agent's personality, models, and behavior.
# =========================================================================================

# --- 1. AGENT PERSONA & PROMPTS ---
# The main instructions for the A-I. Defines who it is and how it behaves.
SYSTEM_PROMPT = """
You are a prospective client making an inquiry about ad creatives from an agency called "Aryantra".

**Your Goal:** Make a detailed inquiry about Aryantra and the services they provide.

**Agency Context (What you know):**
- Aryantra's founder is Abhi Jai.
- They provide AI ad creatives, static ads, and A-I videos (like UGC).

**Key Behaviors:**
1. **Curious & Professional:** You run an e-commerce brand and you are looking for ad creatives to scale your business.
2. **Ask Questions:** Ask about their services, how their AI UGC videos work, what the process is, and how static ads compare to AI videos.
3. **Conversational Pacing:** Ask ONE clear question at a time. Keep your responses short (1-2 sentences). Listen carefully to what the agency rep tells you.
4. **Founder Reference:** If the person on the phone introduces themselves as Abhi Jai, acknowledge that you know he is the founder.

**CRITICAL:**
- You are the BUYER inquiring about their services. You are NOT the one selling.
- Be naturally inquisitive. Make them pitch their services to you.
- If it's a good pitch, express interest in moving forward.
"""

# The explicit first message the agent speaks when the user picks up.
INITIAL_GREETING = "Hi there, I heard about Aryantra's ad services and wanted to make an inquiry. Am I speaking with Abhi Jai or someone from the sales team?"

# If the user initiates the call (inbound) or is already there:
fallback_greeting = "Hello? I am calling to inquire about Aryantra's ad creatives."


# --- 2. SPEECH-TO-TEXT (STT) SETTINGS ---
# We use Deepgram for high-speed transcription.
STT_PROVIDER = "deepgram"
STT_MODEL = "nova-3"  # "nova-3" (newest, faster) or "nova-2" (balanced fallback)
STT_LANGUAGE = "en"   # "en" supports multi-language code switching in Nova 2


# --- 3. TEXT-TO-SPEECH (TTS) SETTINGS ---
# Choose your voice provider: "openai", "sarvam" (Indian voices), or "cartesia" (Ultra-fast)
DEFAULT_TTS_PROVIDER = "sarvam" 
DEFAULT_TTS_VOICE = "anushka"  # Sarvam Indian English voices: anushka, aravind, amartya, dhruv

# Sarvam AI Specifics (for Indian Context)
SARVAM_MODEL = "bulbul:v2"
SARVAM_LANGUAGE = "en-IN" # or hi-IN

# Cartesia Specifics
CARTESIA_MODEL = "sonic-2"
CARTESIA_VOICE = "f786b574-daa5-4673-aa0c-cbe3e8534c02"


# --- 4. LARGE LANGUAGE MODEL (LLM) SETTINGS ---
# Choose "openai" or "groq"
DEFAULT_LLM_PROVIDER = "openai"
DEFAULT_LLM_MODEL = "gpt-4o-mini" # OpenAI default

# Groq Specifics (Faster inference)
GROQ_MODEL = "llama-3.3-70b-versatile"
GROQ_TEMPERATURE = 0.7


# --- 5. TELEPHONY & TRANSFERS ---
# Default number to transfer calls to if no specific destination is asked.
DEFAULT_TRANSFER_NUMBER = os.getenv("DEFAULT_TRANSFER_NUMBER")

# Vobiz Trunk Details (Loaded from .env usually, but you can hardcode if needed)
SIP_TRUNK_ID = os.getenv("VOBIZ_SIP_TRUNK_ID")
SIP_DOMAIN = os.getenv("VOBIZ_SIP_DOMAIN")
