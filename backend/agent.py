import os
import certifi

# Fix for macOS SSL Certificate errors - MUST be before other imports
os.environ['SSL_CERT_FILE'] = certifi.where()

import asyncio
import logging
import json
import time
import aiohttp
from dotenv import load_dotenv
from pathlib import Path

from livekit import agents, api
from livekit.agents import AgentSession, Agent, RoomInputOptions
from livekit.plugins import (
    openai,
    cartesia,
    deepgram,
    noise_cancellation,
    silero,
    sarvam,
)
from livekit.agents import llm
from typing import Annotated, Optional

# Single source of truth: root .env
_root = Path(__file__).resolve().parent
load_dotenv(_root / ".env")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("outbound-agent")

import config

# --- Supabase call logging (optional — skipped if env vars are missing) ---
_supabase_client = None
try:
    _sb_url = os.getenv("SUPABASE_URL")
    _sb_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if _sb_url and _sb_key:
        from supabase import create_client
        _supabase_client = create_client(_sb_url, _sb_key)
        logger.info("Supabase call logging enabled")
    else:
        logger.info("Supabase env vars not set — call logging disabled")
except Exception as e:
    logger.warning(f"Failed to init Supabase client: {e}")

async def _trigger_classify(call_id: str):
    """Fire-and-forget POST to classify-pending-calls so write-back happens
    within seconds of the call ending, without waiting for the pg_cron sweep."""
    url = os.getenv("NEXT_PUBLIC_APP_URL", "").rstrip("/")
    secret = os.getenv("CRON_BEARER", "")
    if not url or not secret or not call_id:
        return
    try:
        async with aiohttp.ClientSession() as session:
            await session.post(
                f"{url}/api/cron/classify-pending-calls",
                json={"call_id": call_id},
                headers={"Authorization": f"Bearer {secret}", "Content-Type": "application/json"},
                timeout=aiohttp.ClientTimeout(total=30),
            )
        logger.info(f"Triggered classify for call {call_id}")
    except Exception as e:
        logger.warning(f"classify trigger failed: {e}")


def _fetch_knowledge_base(user_id: str = None) -> str | None:
    """Fetch all knowledge base content for this user. Returns combined text or None."""
    if not _supabase_client:
        return None
    try:
        query = _supabase_client.table("knowledge_files").select("content_text")
        if user_id:
            query = query.eq("user_id", user_id)
        res = query.execute()
        if res.data:
            texts = [r["content_text"] for r in res.data if r.get("content_text")]
            if texts:
                combined = "\n\n---\n\n".join(texts)
                # Cap at 50k chars to avoid blowing up the context window
                if len(combined) > 50000:
                    combined = combined[:50000] + "\n\n[... truncated ...]"
                logger.info(f"Loaded {len(texts)} knowledge file(s) ({len(combined)} chars)")
                return combined
    except Exception as e:
        logger.warning(f"Failed to fetch knowledge base: {e}")
    return None


def _query_knowledge_base_sync(user_id: str, query: str, top_k: int = 5, api_keys: dict = None) -> str | None:
    """Synchronous helper: embed query via OpenAI and search Pinecone.
    Run from async code via asyncio.to_thread."""
    pinecone_key = os.getenv("PINECONE_API_KEY")
    if not pinecone_key or not user_id or not query:
        return None
    try:
        from openai import OpenAI as OpenAIClient
        from pinecone import Pinecone

        keys = api_keys or {}
        oai_key = keys.get("openai_api_key") or os.getenv("OPENAI_API_KEY")
        if not oai_key:
            logger.warning("No OpenAI key for embeddings — skipping KB vector query")
            return None

        # Embed the query
        client = OpenAIClient(api_key=oai_key)
        emb_resp = client.embeddings.create(
            model="text-embedding-3-small",
            input=[query],
        )
        query_vector = emb_resp.data[0].embedding

        # Query Pinecone
        index_name = os.getenv("PINECONE_INDEX_NAME", "knowledge-base")
        pc = Pinecone(api_key=pinecone_key)
        index = pc.Index(index_name)
        namespace = index.namespace(user_id)

        results = namespace.query(
            vector=query_vector,
            top_k=top_k,
            include_metadata=True,
        )

        if not results.get("matches"):
            return None

        # Filter by relevance score and collect chunk texts
        chunks = []
        for match in results["matches"]:
            if match.get("score", 0) < 0.3:
                continue
            text = match.get("metadata", {}).get("chunk_text", "")
            if text:
                chunks.append(text)

        if not chunks:
            return None

        combined = "\n\n---\n\n".join(chunks)
        logger.info(f"KB vector query returned {len(chunks)} relevant chunk(s) ({len(combined)} chars)")
        return combined
    except Exception as e:
        logger.warning(f"Knowledge base vector query failed: {e}")
        return None


async def _query_knowledge_base(user_id: str, query: str, top_k: int = 5, api_keys: dict = None) -> str | None:
    """Query the Pinecone vector store for relevant knowledge chunks (async wrapper)."""
    return await asyncio.to_thread(_query_knowledge_base_sync, user_id, query, top_k, api_keys)


def _fetch_agent_config(user_id: str = None, config_id: str = None) -> dict | None:
    """Fetch an agent config from Supabase.

    If config_id is provided, fetch that specific row (verifying user_id matches
    when available). Otherwise fall back to the user's currently active config.
    Returns a dict or None.
    """
    if not _supabase_client:
        return None
    try:
        # Explicit pick: fetch by id
        if config_id:
            query = _supabase_client.table("agent_configs").select("*").eq("id", config_id)
            if user_id:
                query = query.eq("user_id", user_id)
            res = query.limit(1).execute()
            if res.data and len(res.data) > 0:
                logger.info(f"Loaded agent config {config_id} from Supabase")
                return res.data[0]
            logger.warning(f"Agent config {config_id} not found — falling back to active")

        # Fallback: active config for this user
        query = _supabase_client.table("agent_configs").select("*").eq("is_active", True)
        if user_id:
            query = query.eq("user_id", user_id)
        res = query.order("updated_at", desc=True).limit(1).execute()
        if res.data and len(res.data) > 0:
            logger.info("Loaded active agent config from Supabase")
            return res.data[0]
    except Exception as e:
        logger.warning(f"Failed to fetch agent config: {e}")
    return None


def _fetch_user_settings(user_id: str = None) -> dict | None:
    """Fetch per-user settings (API keys, SIP config) from Supabase. Returns settings dict or None."""
    if not _supabase_client or not user_id:
        return None
    try:
        res = _supabase_client.table("user_settings").select("settings") \
            .eq("user_id", user_id).limit(1).execute()
        if res.data and len(res.data) > 0:
            settings = res.data[0].get("settings")
            if settings:
                logger.info("Loaded user settings from Supabase")
                return settings
    except Exception as e:
        logger.warning(f"Failed to fetch user settings: {e}")
    return None


def _fetch_inbound_config(called_number: str) -> tuple:
    """Look up a phone number mapping to find the right agent config for inbound calls.
    Returns (agent_config, user_id) or (None, None)."""
    if not _supabase_client or not called_number:
        return None, None
    try:
        # Clean the number (remove sip: prefix, domain, etc.)
        clean = called_number.replace("sip:", "").split("@")[0]
        # Try exact match first, then with/without + prefix
        candidates = [clean]
        if not clean.startswith("+"):
            candidates.append(f"+{clean}")
        else:
            candidates.append(clean.lstrip("+"))

        for num in candidates:
            res = _supabase_client.table("phone_numbers") \
                .select("agent_config_id, user_id") \
                .eq("phone_number", num) \
                .eq("is_active", True) \
                .limit(1).execute()
            if res.data and res.data[0].get("agent_config_id"):
                config_id = res.data[0]["agent_config_id"]
                user_id = res.data[0]["user_id"]
                cfg = _supabase_client.table("agent_configs") \
                    .select("*").eq("id", config_id).limit(1).execute()
                if cfg.data:
                    logger.info(f"Loaded inbound config for {num}: {cfg.data[0].get('name')}")
                    return cfg.data[0], user_id
    except Exception as e:
        logger.warning(f"Failed to fetch inbound config: {e}")
    return None, None


def _render_lead_template(text: str, lead: dict | None) -> str:
    """Mustache-lite substitution for {{lead.field}} and {{lead.custom.field}}.

    Unknown variables are replaced with empty string so a prompt that references
    {{lead.name}} never dumps literal braces onto the wire. Loading lead data into
    the prompt is how a single agent config can handle every lead individually."""
    if not text or not lead:
        return text or ""
    import re

    def _lookup(path: str) -> str:
        parts = path.strip().split(".")
        if not parts or parts[0] != "lead":
            return ""
        cur: object = lead
        for p in parts[1:]:
            if isinstance(cur, dict) and p in cur:
                cur = cur[p]
            else:
                return ""
        if cur is None:
            return ""
        return str(cur)

    return re.sub(r"\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}", lambda m: _lookup(m.group(1)), text)


def _log_call_start(phone_number: str, room_name: str, config_dict: dict) -> str | None:
    """Insert a call record into Supabase. Returns the call ID or None."""
    if not _supabase_client:
        return None
    try:
        row = {
            "phone_number": phone_number,
            "room_name": room_name,
            "status": "initiated",
            "model_provider": config_dict.get("model_provider"),
            "voice_id": config_dict.get("voice_id"),
            "user_prompt": config_dict.get("user_prompt"),
            "direction": config_dict.get("direction", "outbound"),
        }
        user_id = config_dict.get("user_id")
        if user_id:
            row["user_id"] = user_id
        lead_id = config_dict.get("lead_id")
        if lead_id:
            row["lead_id"] = lead_id
        res = _supabase_client.table("calls").insert(row).execute()
        if res.data:
            return res.data[0]["id"]
    except Exception as e:
        logger.warning(f"Failed to log call start: {e}")
    return None


def _log_call_end(call_id: str, status: str, duration_secs: int):
    """Update the call record when it ends."""
    if not _supabase_client or not call_id:
        return
    try:
        _supabase_client.table("calls").update({
            "status": status,
            "duration_secs": duration_secs,
            "ended_at": "now()",
        }).eq("id", call_id).execute()
    except Exception as e:
        logger.warning(f"Failed to log call end: {e}")


def _log_transcript(call_id: str, speaker: str, text: str, timestamp_ms: int = None):
    """Insert a transcript segment."""
    if not _supabase_client or not call_id:
        return
    try:
        _supabase_client.table("transcripts").insert({
            "call_id": call_id,
            "speaker": speaker,
            "text": text,
            "timestamp_ms": timestamp_ms,
        }).execute()
        logger.info(f"Logged transcript: {speaker} / {text[:60]}")
    except Exception as e:
        logger.warning(f"Failed to log transcript: {e}")


async def _start_recording(ctx, room_name: str) -> str | None:
    """Start a RoomCompositeEgress writing to Supabase Storage (S3-compatible).
    Returns egress_id on success, None if recording is disabled or fails."""
    endpoint = os.getenv("SUPABASE_S3_ENDPOINT")
    if not endpoint:
        return None
    try:
        req = api.RoomCompositeEgressRequest(
            room_name=room_name,
            audio_only=True,
            file_outputs=[api.EncodedFileOutput(
                file_type=api.EncodedFileType.OGG,
                filepath=f"{room_name}.ogg",
                s3=api.S3Upload(
                    access_key=os.getenv("SUPABASE_S3_ACCESS_KEY", ""),
                    secret=os.getenv("SUPABASE_S3_SECRET_KEY", ""),
                    region=os.getenv("SUPABASE_S3_REGION", ""),
                    bucket=os.getenv("SUPABASE_STORAGE_BUCKET", "call-recordings"),
                    endpoint=endpoint,
                    force_path_style=True,
                ),
            )],
        )
        info = await ctx.api.egress.start_room_composite_egress(req)
        logger.info(f"Recording started: egress_id={info.egress_id}")
        return info.egress_id
    except Exception as e:
        logger.warning(f"Failed to start recording: {e}")
        return None


async def _stop_egress_safely(ctx, egress_id: str) -> None:
    """Stop the running egress on call disconnect. RoomCompositeEgress will
    auto-stop when the room empties, but with ~20s of trailing latency that
    bloats the recording. Stopping explicitly cuts that tail."""
    try:
        await ctx.api.egress.stop_egress(api.StopEgressRequest(egress_id=egress_id))
        logger.info(f"Egress stopped: {egress_id}")
    except Exception as e:
        logger.warning(f"Failed to stop egress {egress_id}: {e}")


def _recording_public_url(room_name: str) -> str:
    """Construct the public URL for a recording object in Supabase Storage."""
    sb_url = os.getenv("SUPABASE_URL", "").rstrip("/")
    bucket = os.getenv("SUPABASE_STORAGE_BUCKET", "call-recordings")
    return f"{sb_url}/storage/v1/object/public/{bucket}/{room_name}.ogg"


def _resolve_key(keys: dict, key_name: str, env_name: str, is_user_scoped: bool) -> str | None:
    """Pick a per-user key first; only fall through to env when the call is not
    tied to a dashboard user (local CLI dev, unmatched inbound). When the call
    is user-scoped we deliberately ignore the .env value so that deleting the
    key in the dashboard actually disables calls."""
    val = (keys or {}).get(key_name)
    if val:
        return val
    if is_user_scoped:
        return None
    return os.getenv(env_name)


_SARVAM_V2_VOICES = {"anushka", "abhilash", "manisha", "vidya", "arya", "karun", "hitesh"}
_OPENAI_TTS_VOICES = {"alloy", "echo", "fable", "onyx", "nova", "shimmer"}

# Load Silero VAD once at worker startup — loading it inside entrypoint() would
# re-run the ONNX model setup on every call, adding ~300-500ms of cold latency.
_VAD = silero.VAD.load()


def _build_tts(config_provider: str = None, config_voice: str = None,
               api_keys: dict = None, is_user_scoped: bool = False):
    """Configure the Text-to-Speech provider based on env vars or dynamic config.
    api_keys: optional per-user API keys from user_settings.
    is_user_scoped: when True, only per-user keys are honoured (no env fallback)."""
    keys = api_keys or {}
    provider = (config_provider or os.getenv("TTS_PROVIDER", config.DEFAULT_TTS_PROVIDER)).lower()

    # Voice name is the source of truth for TTS provider — the env-level
    # TTS_PROVIDER is only a fallback for CLI dev when no voice is picked.
    # Without this, picking an OpenAI voice like "echo" while the default
    # provider is Sarvam would hand "echo" to sarvam.TTS and crash the
    # session before the SIP call even starts.
    voice_norm = (config_voice or "").strip().lower()
    if voice_norm in _SARVAM_V2_VOICES:
        provider = "sarvam"
    elif voice_norm in _OPENAI_TTS_VOICES:
        provider = "openai"

    if provider == "cartesia":
        logger.info("Using Cartesia TTS")
        model = os.getenv("CARTESIA_TTS_MODEL", config.CARTESIA_MODEL)
        voice = os.getenv("CARTESIA_TTS_VOICE", config.CARTESIA_VOICE)
        return cartesia.TTS(model=model, voice=voice)

    if provider == "sarvam":
        sarvam_key = _resolve_key(keys, "sarvam_api_key", "SARVAM_API_KEY", is_user_scoped)
        if not sarvam_key:
            raise RuntimeError("Sarvam API key missing — add it in dashboard Settings.")

        logger.info(f"Using Sarvam TTS (Voice: {config_voice})")
        model = os.getenv("SARVAM_TTS_MODEL", config.SARVAM_MODEL)
        voice = config_voice or os.getenv("SARVAM_VOICE", "anushka")
        language = os.getenv("SARVAM_LANGUAGE", config.SARVAM_LANGUAGE)
        min_buf = int(os.getenv("SARVAM_MIN_BUFFER_SIZE", "15"))
        return sarvam.TTS(
            model=model,
            speaker=voice,
            target_language_code=language,
            min_buffer_size=min_buf,
            api_key=sarvam_key,
        )

    if provider == "deepgram":
        logger.info("Using Deepgram TTS")
        dg_key = _resolve_key(keys, "deepgram_api_key", "DEEPGRAM_API_KEY", is_user_scoped)
        if not dg_key:
            raise RuntimeError("Deepgram API key missing — add it in dashboard Settings.")
        model = os.getenv("DEEPGRAM_TTS_MODEL", "aura-asteria-en")
        return deepgram.TTS(model=model, api_key=dg_key)

    # Default to OpenAI
    oai_key = _resolve_key(keys, "openai_api_key", "OPENAI_API_KEY", is_user_scoped)
    if not oai_key:
        raise RuntimeError("OpenAI API key missing — add it in dashboard Settings.")

    logger.info(f"Using OpenAI TTS (Voice: {config_voice})")
    model = os.getenv("OPENAI_TTS_MODEL", "tts-1")
    voice = config_voice or os.getenv("OPENAI_TTS_VOICE", config.DEFAULT_TTS_VOICE)
    return openai.TTS(model=model, voice=voice, api_key=oai_key)


_LLM_OPENAI_COMPAT = {
    # provider -> (key_name, env_var, base_url, default_model)
    "groq":       ("groq_api_key",       "GROQ_API_KEY",       "https://api.groq.com/openai/v1",                       "llama-3.3-70b-versatile"),
    "xai":        ("xai_api_key",        "XAI_API_KEY",        "https://api.x.ai/v1",                                  "grok-beta"),
    "openrouter": ("openrouter_api_key", "OPENROUTER_API_KEY", "https://openrouter.ai/api/v1",                         "openai/gpt-4o-mini"),
    "mistral":    ("mistral_api_key",    "MISTRAL_API_KEY",    "https://api.mistral.ai/v1",                            "mistral-small-latest"),
    "google":     ("google_api_key",     "GOOGLE_API_KEY",     "https://generativelanguage.googleapis.com/v1beta/openai/", "gemini-2.0-flash"),
}


def _build_llm(config_provider: str = None, api_keys: dict = None, is_user_scoped: bool = False):
    """Configure the LLM provider based on config or env vars.
    api_keys: optional per-user API keys from user_settings.
    is_user_scoped: when True, only per-user keys are honoured (no env fallback)."""
    keys = api_keys or {}
    provider = (config_provider or os.getenv("LLM_PROVIDER", config.DEFAULT_LLM_PROVIDER)).lower()

    # Most providers expose an OpenAI-compatible endpoint, so route them all
    # through openai.LLM with a base_url override. Anthropic and Azure get
    # special handling below.
    if provider in _LLM_OPENAI_COMPAT:
        key_name, env_name, base_url, default_model = _LLM_OPENAI_COMPAT[provider]
        api_key = _resolve_key(keys, key_name, env_name, is_user_scoped)
        if not api_key:
            raise RuntimeError(f"{provider} API key missing — add it in dashboard Settings.")
        model_env = f"{provider.upper()}_MODEL"
        model = os.getenv(model_env, default_model)
        # Groq keeps its existing temperature override for backwards compat.
        kwargs = {"base_url": base_url, "api_key": api_key, "model": model}
        if provider == "groq":
            kwargs["temperature"] = float(os.getenv("GROQ_TEMPERATURE", str(config.GROQ_TEMPERATURE)))
        logger.info(f"Using {provider} LLM (model={model})")
        return openai.LLM(**kwargs)

    if provider == "anthropic":
        anth_key = _resolve_key(keys, "anthropic_api_key", "ANTHROPIC_API_KEY", is_user_scoped)
        if not anth_key:
            raise RuntimeError("Anthropic API key missing — add it in dashboard Settings.")
        try:
            from livekit.plugins import anthropic as anthropic_plugin  # type: ignore
        except ImportError as e:
            raise RuntimeError(
                "livekit-plugins-anthropic is not installed. Run "
                "`pip install livekit-plugins-anthropic` to enable Anthropic."
            ) from e
        model = os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001")
        logger.info(f"Using Anthropic LLM (model={model})")
        return anthropic_plugin.LLM(model=model, api_key=anth_key)

    if provider == "azure":
        az_key = _resolve_key(keys, "azure_openai_api_key", "AZURE_OPENAI_API_KEY", is_user_scoped)
        az_endpoint = (keys.get("azure_openai_endpoint")
                       if is_user_scoped else
                       (keys.get("azure_openai_endpoint") or os.getenv("AZURE_OPENAI_ENDPOINT")))
        az_deployment = (keys.get("azure_openai_deployment")
                         if is_user_scoped else
                         (keys.get("azure_openai_deployment") or os.getenv("AZURE_OPENAI_DEPLOYMENT")))
        if not az_key or not az_endpoint or not az_deployment:
            raise RuntimeError(
                "Azure OpenAI requires api_key + endpoint + deployment — set all three in Settings."
            )
        api_version = os.getenv("AZURE_OPENAI_API_VERSION", "2024-08-01-preview")
        logger.info(f"Using Azure OpenAI LLM (deployment={az_deployment})")
        return openai.LLM.with_azure(
            azure_endpoint=az_endpoint,
            azure_deployment=az_deployment,
            api_key=az_key,
            api_version=api_version,
        )

    # Default to OpenAI
    oai_key = _resolve_key(keys, "openai_api_key", "OPENAI_API_KEY", is_user_scoped)
    if not oai_key:
        raise RuntimeError("OpenAI API key missing — add it in dashboard Settings.")

    logger.info("Using OpenAI LLM")
    return openai.LLM(model=config.DEFAULT_LLM_MODEL, api_key=oai_key)



class TransferFunctions(llm.ToolContext):
    def __init__(self, ctx: agents.JobContext, phone_number: str = None):
        super().__init__(tools=[])
        self.ctx = ctx
        self.phone_number = phone_number
        self._session = None  # set after AgentSession is created

    @llm.function_tool(description="Look up user details by phone number.")
    async def lookup_user(self, phone: str):
        """
        Mock function to look up user details.

        Args:
            phone: The phone number to look up
        """
        logger.info(f"Looking up user: {phone}")
        return f"Contact found: Abhi Jai. Role: Founder of Aryantra. Notes: Provides AI ad creatives, static ads, and AI UGC videos."

    @llm.function_tool(description="Transfer the call to a human support agent or another phone number.")
    async def transfer_call(self, destination: Optional[str] = None):
        """
        Transfer the call.
        """
        if destination is None:
            destination = config.DEFAULT_TRANSFER_NUMBER
            if not destination:
                 return "Error: No default transfer number configured."
        if "@" not in destination:
            # If no domain is provided, append the SIP domain
            if config.SIP_DOMAIN:
                # Ensure clean number (strip tel: or sip: prefix if present but no domain)
                clean_dest = destination.replace("tel:", "").replace("sip:", "")
                destination = f"sip:{clean_dest}@{config.SIP_DOMAIN}"
            else:
                # Fallback to tel URI if no domain configured
                if not destination.startswith("tel:") and not destination.startswith("sip:"):
                     destination = f"tel:{destination}"
        elif not destination.startswith("sip:"):
             destination = f"sip:{destination}"
        
        logger.info(f"Transferring call to {destination}")
        
        # Determine the participant identity
        # For outbound calls initiated by this agent, the participant identity is typically "sip_<phone_number>"
        # For inbound, we might need to find the remote participant.
        participant_identity = None
        
        # If we stored the phone number from metadata, we can construct the identity
        if self.phone_number:
            participant_identity = f"sip_{self.phone_number}"
        else:
            # Try to find a participant that is NOT the agent
            for p in self.ctx.room.remote_participants.values():
                participant_identity = p.identity
                break
        
        if not participant_identity:
            logger.error("Could not determine participant identity for transfer")
            return "Failed to transfer: could not identify the caller."

        try:
            logger.info(f"Transferring participant {participant_identity} to {destination}")
            await self.ctx.api.sip.transfer_sip_participant(
                api.TransferSIPParticipantRequest(
                    room_name=self.ctx.room.name,
                    participant_identity=participant_identity,
                    transfer_to=destination,
                    play_dialtone=False
                )
            )
            return "Transfer initiated successfully."
        except Exception as e:
            logger.error(f"Transfer failed: {e}")
            return f"Error executing transfer: {e}"

    @llm.function_tool(
        description=(
            "End the call and hang up. Use this when: the conversation is naturally "
            "complete, the customer has said goodbye or declined further conversation, "
            "you've reached voicemail and finished leaving a message, you've confirmed "
            "it's a wrong number, or the customer is unresponsive after two attempts "
            "to re-engage. Always say a short farewell before calling this."
        )
    )
    async def end_call(self, farewell: Optional[str] = None) -> str:
        """
        End the call gracefully by removing the SIP participant from the room.

        Args:
            farewell: Short farewell phrase to speak before hanging up (optional).
        """
        if farewell and self._session:
            try:
                handle = self._session.say(farewell, allow_interruptions=False)
                await handle.wait_for_playout()
                await asyncio.sleep(0.4)
            except Exception as e:
                logger.warning(f"end_call farewell TTS error: {e}")

        # Resolve the SIP participant identity
        participant_identity = None
        if self.phone_number:
            participant_identity = f"sip_{self.phone_number}"
        else:
            for p in self.ctx.room.remote_participants.values():
                participant_identity = p.identity
                break

        if participant_identity:
            try:
                logger.info(f"end_call: removing participant {participant_identity}")
                await self.ctx.api.room.remove_participant(
                    api.RoomParticipantIdentity(
                        room=self.ctx.room.name,
                        identity=participant_identity,
                    )
                )
            except Exception as e:
                logger.warning(f"end_call remove_participant error: {e}")

        return "Call ended."


async def _wait_for_remote_audio(room, timeout: float = 1.0) -> None:
    """Block (briefly) until a remote participant has a subscribed audio track.
    SIP participants only publish audio, so any subscribed track is the one we
    want. Returns immediately if the audio path is already up; capped by
    ``timeout`` so we never freeze the call."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        for p in room.remote_participants.values():
            for pub in p.track_publications.values():
                if getattr(pub, "subscribed", False):
                    return
        await asyncio.sleep(0.05)


async def _speak_opening_line(session: AgentSession, text: str, room=None) -> None:
    """Speak a fixed script via TTS (not LLM streaming) so PSTN hears the full sentence from the start.

    TTS synthesis is kicked off immediately on call, then we wait for the audio
    path (SIP RTP track) in parallel — this hides TTS API latency behind the
    carrier setup time instead of adding to it.

    Emits per-step timing logs so we can see where greeting latency is spent."""
    line = (text or "").strip()
    if not line:
        return
    t0 = time.time()

    # Fire TTS synthesis NOW — don't wait for the audio path first.
    # LiveKit will buffer the outbound audio until the subscriber is ready.
    handle = session.say(line, allow_interruptions=False)
    t_say = time.time()

    # Concurrently wait for the remote audio track to be subscribed.
    # This ensures the SIP media path is established before playout begins.
    if room is not None:
        await _wait_for_remote_audio(
            room,
            timeout=float(os.getenv("GREETING_AUDIO_READY_TIMEOUT_SEC", "0.5")),
        )
    t_ready = time.time()

    await handle.wait_for_playout()
    t_done = time.time()
    logger.info(
        "greeting timings — say_call=%.2fs audio_ready=%.2fs playout=%.2fs total=%.2fs",
        t_say - t0,
        t_ready - t0,
        t_done - t_ready,
        t_done - t0,
    )


class OutboundAssistant(Agent):
    def __init__(self, tools: list, system_prompt_override: str = None, call_context: str = None,
                 user_id: str = None, user_api_keys: dict = None) -> None:
        base_instructions = system_prompt_override or config.SYSTEM_PROMPT
        if call_context:
            base_instructions += f"\n\n**CRITICAL CONTEXT FOR THIS CALL:**\n{call_context}"
            logger.info(f"Added call context: {call_context[:100]}...")
        base_instructions += (
            "\n\n**CALL CONTROL:** You have an end_call() tool. Use it when: "
            "the conversation is naturally complete, the customer says goodbye or declines further conversation, "
            "you detect voicemail (leave a brief message then end the call), "
            "it's a wrong number (apologize briefly then end), "
            "or the customer is unresponsive after two re-engagement attempts. "
            "Always say a natural farewell as the `farewell` argument to end_call() — never hang up silently."
        )

        super().__init__(
            instructions=base_instructions,
            tools=tools,
        )
        self._kb_user_id = user_id
        self._kb_api_keys = user_api_keys or {}
        self._use_vector_kb = bool(os.getenv("PINECONE_API_KEY"))

    async def on_user_turn_completed(self, turn_ctx: llm.ChatContext, new_message: llm.ChatMessage) -> None:
        """Inject relevant knowledge base chunks before the LLM responds."""
        if not self._use_vector_kb or not self._kb_user_id:
            return

        # Extract the user's message text
        user_text = ""
        if hasattr(new_message, "text_content"):
            user_text = new_message.text_content or ""
        elif hasattr(new_message, "content"):
            content = new_message.content
            if isinstance(content, str):
                user_text = content
            elif isinstance(content, list):
                user_text = " ".join(str(c) for c in content if isinstance(c, str))

        if not user_text.strip():
            return

        # Query Pinecone for relevant chunks (capped at 3s to avoid stalling the LLM)
        try:
            relevant = await asyncio.wait_for(
                _query_knowledge_base(
                    self._kb_user_id, user_text, top_k=5, api_keys=self._kb_api_keys
                ),
                timeout=3.0,
            )
        except asyncio.TimeoutError:
            logger.warning("KB vector query timed out after 3s, skipping context injection")
            relevant = None
        if relevant:
            turn_ctx.add_message(
                role="system",
                content=f"[Relevant knowledge base information for this query]\n\n{relevant}",
            )
            logger.info("Injected KB context into chat for this turn")




async def entrypoint(ctx: agents.JobContext):
    """
    Main entrypoint for the agent.
    
    For outbound calls:
    1. Checks for 'phone_number' in the job metadata.
    2. Connects to the room.
    3. Initiates the SIP call to the phone number.
    4. Waits for answer before speaking.
    """
    t_entry = time.time()
    logger.info(f"Connecting to room: {ctx.room.name}")

    # parse the phone number AND config from the metadata
    phone_number = None
    config_dict = {}
    
    # Check Job Metadata (Legacy/Dispatch)
    try:
        if ctx.job.metadata:
            data = json.loads(ctx.job.metadata)
            phone_number = data.get("phone_number")
            config_dict = data
    except Exception:
        pass
        
    # Check Room Metadata (Dashboard/Route.ts) - Overrides Job Metadata if present
    try:
        if ctx.room.metadata:
            data = json.loads(ctx.room.metadata)
            if data.get("phone_number"):
                phone_number = data.get("phone_number")
            config_dict.update(data) # Merge configs
    except Exception:
        logger.warning("No valid JSON metadata found in Room.")

    # --- Detect inbound calls ---
    # If no phone_number in metadata and room name starts with "inbound-",
    # this is an inbound call routed by a SIP Dispatch Rule.
    is_inbound = False
    if not phone_number and ctx.room.name.startswith("inbound-"):
        is_inbound = True
        config_dict["direction"] = "inbound"
        logger.info("Detected inbound call — waiting for SIP participant...")
        # Wait up to 15s for the SIP participant to appear. Slow carriers can
        # take longer than the previous 5s budget, causing us to bail before
        # the trunk finishes connecting the leg.
        for _ in range(30):
            if ctx.room.remote_participants:
                break
            await asyncio.sleep(0.5)
        # Extract caller and called numbers from SIP participant attributes
        for p in ctx.room.remote_participants.values():
            attrs = p.attributes or {}
            if attrs.get("sip.callID") or "sip_" in p.identity:
                caller_number = attrs.get("sip.phoneNumber", p.identity.replace("sip_", ""))
                called_number = attrs.get("sip.trunkPhoneNumber", "")
                phone_number = caller_number
                logger.info(f"Inbound call from {caller_number} to {called_number}")
                # Look up the called number to find the right agent config
                inbound_config, inbound_user_id = _fetch_inbound_config(called_number)
                if inbound_config:
                    config_dict["user_id"] = inbound_user_id
                    config_dict["user_prompt"] = inbound_config.get("system_prompt", "")
                    config_dict["voice_id"] = inbound_config.get("voice_id", "anushka")
                    config_dict["model_provider"] = inbound_config.get("model_provider", "openai")
                    config_dict["greeting"] = inbound_config.get("greeting", "Hello, how can I help you?")
                    logger.info(f"Using inbound config: {inbound_config.get('name')}")
                else:
                    logger.warning(f"No config found for called number {called_number}, using defaults")
                    config_dict["greeting"] = config_dict.get("greeting", "Hello, how can I help you?")
                break

    # --- Supabase: fetch agent config, user keys, and knowledge base ---
    # These three fetches are independent — run them in parallel via threads
    # so they don't block the asyncio event loop (each is a sync HTTP call).
    t_meta = time.time()
    logger.info(f"[TIMING] metadata_parse={t_meta - t_entry:.2f}s")
    is_user_scoped = bool(config_dict.get("user_id"))
    _need_kb = not os.getenv("PINECONE_API_KEY")

    async def _async_noop():
        return None

    agent_config_coro = (
        _async_noop() if is_inbound
        else asyncio.to_thread(
            _fetch_agent_config,
            config_dict.get("user_id"),
            config_dict.get("agent_config_id"),
        )
    )
    user_keys_coro = asyncio.to_thread(
        _fetch_user_settings, config_dict.get("user_id")
    )
    kb_coro = (
        asyncio.to_thread(_fetch_knowledge_base, config_dict.get("user_id"))
        if _need_kb else _async_noop()
    )

    agent_config, user_api_keys, knowledge_text = await asyncio.gather(
        agent_config_coro, user_keys_coro, kb_coro
    )
    t_fetch = time.time()
    logger.info(f"[TIMING] parallel_fetch={t_fetch - t_meta:.2f}s")
    user_api_keys = user_api_keys or {}

    if agent_config:
        if agent_config.get("system_prompt") and not config_dict.get("user_prompt"):
            config_dict["user_prompt"] = agent_config["system_prompt"]
        if agent_config.get("voice_id") and not config_dict.get("voice_id"):
            config_dict["voice_id"] = agent_config["voice_id"]
        if agent_config.get("model_provider") and not config_dict.get("model_provider"):
            config_dict["model_provider"] = agent_config["model_provider"]
        if agent_config.get("greeting"):
            config_dict["greeting"] = agent_config["greeting"]

    # Lead templating: if this call was enqueued by the lead-source poller,
    # the dispatch metadata includes a `lead` object. Substitute {{lead.x}}
    # tokens in the system prompt and greeting so a single agent config can
    # personalize per lead without a per-lead config row.
    lead_obj = config_dict.get("lead")
    if lead_obj:
        if config_dict.get("user_prompt"):
            config_dict["user_prompt"] = _render_lead_template(config_dict["user_prompt"], lead_obj)
        if config_dict.get("greeting"):
            config_dict["greeting"] = _render_lead_template(config_dict["greeting"], lead_obj)

    # Inject knowledge base text into system prompt (when Pinecone is NOT configured)
    if knowledge_text:
        kb_context = f"\n\n**KNOWLEDGE BASE (reference this information during the call):**\n{knowledge_text}"
        existing_prompt = config_dict.get("user_prompt", "")
        config_dict["user_prompt"] = existing_prompt + kb_context

    # --- Supabase: log call start (non-blocking) ---
    call_id = await asyncio.to_thread(
        _log_call_start, phone_number or "unknown", ctx.room.name, config_dict
    )
    call_start_time = time.time()
    # answered_at is set the moment the remote side picks up (inbound: on entry;
    # outbound: after create_sip_participant(wait_until_answered=True) returns).
    # All downstream duration math keys off this, not call_start_time — otherwise
    # the "duration" would include the ringing/session-setup window and diverge
    # from what the carrier reports.
    answered_at: float | None = None
    sip_disconnected_at: float | None = None  # set when SIP participant hangs up
    egress_id: str | None = None
    logger.info(f"call_id={call_id}, supabase_client={bool(_supabase_client)}")

    # Initialize function context
    fnc_ctx = TransferFunctions(ctx, phone_number)
    # end_call is always available so the agent can hang up in any scenario.
    # transfer_call / lookup_user are only exposed when the agent config opts in.
    agent_tools = [fnc_ctx.end_call]
    if agent_config and agent_config.get("enable_tools"):
        agent_tools += [fnc_ctx.lookup_user, fnc_ctx.transfer_call]
        logger.info(f"Extra tools enabled: lookup_user, transfer_call")

    # Initialize the Agent Session with plugins
    # When the call is tied to a dashboard user, only the per-user key is honoured.
    # Local CLI dev (no user_id) keeps the env fallback for convenience.
    dg_key = _resolve_key(user_api_keys, "deepgram_api_key", "DEEPGRAM_API_KEY", is_user_scoped)
    if not dg_key:
        raise RuntimeError("Deepgram API key missing — add it in dashboard Settings.")
    stt_kwargs = {"model": config.STT_MODEL, "language": config.STT_LANGUAGE, "api_key": dg_key}

    session = AgentSession(
        vad=_VAD,
        stt=deepgram.STT(**stt_kwargs),
        llm=_build_llm(config_dict.get("model_provider"), api_keys=user_api_keys, is_user_scoped=is_user_scoped),
        tts=_build_tts(os.getenv("TTS_PROVIDER"), config_dict.get("voice_id"), api_keys=user_api_keys, is_user_scoped=is_user_scoped),
    )
    # Give end_call access to the session so it can speak farewells
    fnc_ctx._session = session

    # --- Supabase: log transcripts via conversation_item_added ---
    # livekit-agents 0.8+ emits `conversation_item_added` instead of the old
    # user_speech_committed / agent_speech_committed events. The event gives us
    # the full ChatMessage, from which we extract role ("user"/"assistant") and text.
    @session.on("conversation_item_added")
    def _on_conversation_item(event):
        try:
            msg = getattr(event, "item", None) or event
            role = getattr(msg, "role", None)
            if role not in ("user", "assistant"):
                return
            # Extract text content (may be string or list)
            text = ""
            if hasattr(msg, "text_content"):
                tc = msg.text_content
                text = tc() if callable(tc) else (tc or "")
            elif hasattr(msg, "content"):
                c = msg.content
                if isinstance(c, str):
                    text = c
                elif isinstance(c, list):
                    text = " ".join(str(x) for x in c if isinstance(x, str))
            if not text.strip():
                return
            speaker = "agent" if role == "assistant" else "user"
            start_ref = answered_at if answered_at is not None else call_start_time
            elapsed = int((time.time() - start_ref) * 1000)
            # Fire-and-forget in a thread so the sync HTTP call doesn't block audio
            asyncio.create_task(
                asyncio.to_thread(_log_transcript, call_id, speaker, text, elapsed)
            )
        except Exception as e:
            logger.warning(f"Transcript event error: {e}")

    # Start the session
    await session.start(
        room=ctx.room,
        agent=OutboundAssistant(
            tools=agent_tools,
            system_prompt_override=agent_config.get("system_prompt") if agent_config else None,
            call_context=config_dict.get("user_prompt"),
            user_id=config_dict.get("user_id"),
            user_api_keys=user_api_keys,
        ),
        room_input_options=RoomInputOptions(
            noise_cancellation=noise_cancellation.BVCTelephony(),
            close_on_disconnect=True,
        ),
    )
    t_session = time.time()
    logger.info(f"[TIMING] session_start={t_session - t_fetch:.2f}s")

    # Logic to dial out or greet inbound:
    if is_inbound:
        # Inbound call — caller is already in the room, just greet them
        logger.info("Inbound call — greeting caller...")
        answered_at = time.time()
        if call_id:
            asyncio.create_task(asyncio.to_thread(_log_call_end, call_id, "answered", 0))
        egress_id = await _start_recording(ctx, ctx.room.name)
        greeting = config_dict.get("greeting") or "Hello, how can I help you?"
        await _speak_opening_line(session, greeting, room=ctx.room)

    # For outbound:
    # 1. If 'phone_number' is present, we MIGHT need to dial.
    # 2. Check if a SIP participant is already in the room (Dashboard dispatch case).
    should_dial = False
    if not is_inbound and phone_number:
        user_already_here = False
        for p in ctx.room.remote_participants.values():
            if f"sip_{phone_number}" in p.identity or "sip_" in p.identity:
                user_already_here = True
                break

        if not user_already_here:
            should_dial = True
            logger.info("User not in room. Agent will initiate dial-out.")
        else:
            logger.info("User already in room (Dashboard dispatched).")

    if not is_inbound and should_dial:
        logger.info(f"Initiating outbound SIP call to {phone_number}...")
        try:
            if call_id:
                asyncio.create_task(asyncio.to_thread(_log_call_end, call_id, "ringing", 0))
            await ctx.api.sip.create_sip_participant(
                api.CreateSIPParticipantRequest(
                    room_name=ctx.room.name,
                    sip_trunk_id=config.SIP_TRUNK_ID,
                    sip_call_to=phone_number,
                    participant_identity=f"sip_{phone_number}",
                    wait_until_answered=True,
                )
            )
            t_dial = time.time()
            logger.info(f"Call answered! Agent is now listening.")
            logger.info(f"[TIMING] sip_dial={t_dial - t_session:.2f}s total={t_dial - t_entry:.2f}s")
            answered_at = time.time()
            if call_id:
                asyncio.create_task(asyncio.to_thread(_log_call_end, call_id, "answered", 0))
            egress_id = await _start_recording(ctx, ctx.room.name)

            greeting = config_dict.get("greeting") or config.INITIAL_GREETING
            await _speak_opening_line(session, greeting, room=ctx.room)

        except Exception as e:
            logger.error(f"Failed to place outbound call: {e}")
            duration = int(time.time() - (answered_at or call_start_time))
            await asyncio.to_thread(_log_call_end, call_id, "failed", duration)
            ctx.shutdown()
    elif not is_inbound:
        # Dashboard dispatch path: SIP participant was already in the room when
        # the agent joined, so "answered" is now.
        logger.info("Detecting if we should greet...")
        answered_at = time.time()
        if call_id:
            asyncio.create_task(asyncio.to_thread(_log_call_end, call_id, "answered", 0))
        egress_id = await _start_recording(ctx, ctx.room.name)
        fallback = config_dict.get("greeting") or config.fallback_greeting
        await _speak_opening_line(session, fallback, room=ctx.room)

    # Track the exact moment the SIP participant hangs up — this is the true
    # call end time.  The room "disconnected" event fires later (after session
    # cleanup / egress stop), so using time.time() there inflates duration.
    @ctx.room.on("participant_disconnected")
    def _on_participant_left(participant):
        nonlocal sip_disconnected_at
        if "sip_" in participant.identity:
            sip_disconnected_at = time.time()
            logger.info(f"SIP participant disconnected: {participant.identity}")

    # Log completion when the room disconnects.
    # All Supabase calls are offloaded to threads so they never block the
    # event loop (which previously froze the worker for seconds).
    @ctx.room.on("disconnected")
    def _on_disconnect(*_args):
        async def _cleanup():
            # Use the SIP participant's actual hangup time for accurate duration
            end_time = sip_disconnected_at or time.time()
            start_ref = answered_at if answered_at is not None else call_start_time
            duration = int(end_time - start_ref)
            await asyncio.to_thread(_log_call_end, call_id, "completed", duration)
            logger.info(f"Call completed — duration: {duration}s")
            # Explicitly stop egress instead of relying on the room-empty auto-stop,
            # which adds ~20s of trailing silence to the recording.
            if egress_id:
                await _stop_egress_safely(ctx, egress_id)
            # Persist recording URL if egress was started.
            if egress_id and call_id and _supabase_client:
                try:
                    url = _recording_public_url(ctx.room.name)
                    await asyncio.to_thread(
                        lambda: _supabase_client.table("calls").update(
                            {"recording_url": url}
                        ).eq("id", call_id).execute()
                    )
                    logger.info(f"Recording URL saved: {url}")
                except Exception as e:
                    logger.warning(f"Failed to save recording URL: {e}")
            # Move the lead out of 'queued' so it can be retried or re-dispatched.
            lead_id = config_dict.get("lead_id")
            if lead_id and _supabase_client:
                try:
                    await asyncio.to_thread(
                        lambda: _supabase_client.table("leads").update({
                            "status": "called",
                            "updated_at": "now()",
                        }).eq("id", lead_id).eq("status", "queued").execute()
                    )
                    logger.info(f"Lead {lead_id} marked as called")
                except Exception as e:
                    logger.warning(f"Failed to update lead status: {e}")
            # Immediately trigger classification so write-back to CRM happens
            # within seconds instead of waiting up to 60s for the pg_cron sweep.
            if call_id:
                await _trigger_classify(call_id)
        asyncio.create_task(_cleanup())


if __name__ == "__main__":
    # The agent name "outbound-caller" is used by the dispatch script to find this worker
    agents.cli.run_app(
        agents.WorkerOptions(
            entrypoint_fnc=entrypoint,
            agent_name="outbound-caller", 
        )
    )
