-- Aryantra Voice Agent — Supabase Schema
-- Run this in the Supabase SQL Editor to create the tables.

-- Calls table
create table if not exists public.calls (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete set null,
  phone_number text not null,
  room_name text,
  status text default 'initiated' check (status in ('initiated', 'ringing', 'answered', 'completed', 'failed', 'transferred')),
  duration_secs integer,
  model_provider text,
  voice_id text,
  user_prompt text,
  recording_url text,
  created_at timestamptz default now(),
  ended_at timestamptz
);

-- Transcripts table
create table if not exists public.transcripts (
  id uuid default gen_random_uuid() primary key,
  call_id uuid references public.calls(id) on delete cascade not null,
  speaker text not null check (speaker in ('agent', 'user')),
  text text not null,
  timestamp_ms integer,
  created_at timestamptz default now()
);

-- Agent configs table
create table if not exists public.agent_configs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text default 'Default Agent',
  system_prompt text,
  greeting text,
  voice_id text default 'anushka',
  model_provider text default 'openai',
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Knowledge files table
create table if not exists public.knowledge_files (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  file_name text not null,
  storage_path text not null,
  content_text text,
  file_size integer,
  created_at timestamptz default now()
);

-- Indexes
create index if not exists idx_calls_user_id on public.calls(user_id);
create index if not exists idx_calls_created_at on public.calls(created_at desc);
create index if not exists idx_transcripts_call_id on public.transcripts(call_id);
create index if not exists idx_agent_configs_user_id on public.agent_configs(user_id);
create index if not exists idx_knowledge_files_user_id on public.knowledge_files(user_id);

-- Row Level Security
alter table public.calls enable row level security;
alter table public.transcripts enable row level security;
alter table public.agent_configs enable row level security;
alter table public.knowledge_files enable row level security;

-- Policies: users can only access their own data
create policy "Users can read own calls" on public.calls
  for select using (auth.uid() = user_id);

create policy "Users can insert own calls" on public.calls
  for insert with check (auth.uid() = user_id);

create policy "Users can update own calls" on public.calls
  for update using (auth.uid() = user_id);

create policy "Service role full access calls" on public.calls
  for all using (auth.role() = 'service_role');

create policy "Users can read own transcripts" on public.transcripts
  for select using (
    call_id in (select id from public.calls where user_id = auth.uid())
  );

create policy "Service role full access transcripts" on public.transcripts
  for all using (auth.role() = 'service_role');

create policy "Users can manage own agent configs" on public.agent_configs
  for all using (auth.uid() = user_id);

create policy "Users can manage own knowledge files" on public.knowledge_files
  for all using (auth.uid() = user_id);

-- User settings table (per-user API keys and platform config)
create table if not exists public.user_settings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  settings jsonb default '{}' not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_user_settings_user_id on public.user_settings(user_id);

alter table public.user_settings enable row level security;

create policy "Users can manage own settings" on public.user_settings
  for all using (auth.uid() = user_id);

create policy "Service role full access settings" on public.user_settings
  for all using (auth.role() = 'service_role');

-- Phone numbers table (maps inbound numbers to agent configs)
create table if not exists public.phone_numbers (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  phone_number text not null,
  agent_config_id uuid references public.agent_configs(id) on delete set null,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, phone_number)
);

create index if not exists idx_phone_numbers_user_id on public.phone_numbers(user_id);
create index if not exists idx_phone_numbers_phone on public.phone_numbers(phone_number);

alter table public.phone_numbers enable row level security;

create policy "Users can manage own phone numbers" on public.phone_numbers
  for all using (auth.uid() = user_id);

create policy "Service role full access phone numbers" on public.phone_numbers
  for all using (auth.role() = 'service_role');

-- Knowledge chunks table (vector embedding metadata, actual vectors in Pinecone)
create table if not exists public.knowledge_chunks (
  id uuid default gen_random_uuid() primary key,
  knowledge_file_id uuid references public.knowledge_files(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  chunk_index integer not null,
  chunk_text text not null,
  pinecone_vector_id text unique,
  token_count integer,
  created_at timestamptz default now()
);

create index if not exists idx_knowledge_chunks_file_id on public.knowledge_chunks(knowledge_file_id);
create index if not exists idx_knowledge_chunks_user_id on public.knowledge_chunks(user_id);

alter table public.knowledge_chunks enable row level security;

create policy "Users can manage own chunks" on public.knowledge_chunks
  for all using (auth.uid() = user_id);

create policy "Service role full access chunks" on public.knowledge_chunks
  for all using (auth.role() = 'service_role');

-- Add direction column to calls (inbound vs outbound)
alter table public.calls add column if not exists direction text default 'outbound'
  check (direction in ('inbound', 'outbound'));

-- Add embedding status to knowledge files
alter table public.knowledge_files add column if not exists embedding_status text default 'pending'
  check (embedding_status in ('pending', 'processing', 'completed', 'failed'));

-- Enable real-time on the calls table so the dashboard auto-refreshes
alter publication supabase_realtime add table public.calls;

-- =============================================================
-- Call recording auto-cleanup (deletes files older than 7 days)
-- Runs nightly via pg_cron. Requires pg_cron extension.
-- =============================================================
create extension if not exists pg_cron;

create or replace function cleanup_old_recordings() returns void as $$
begin
  -- Delete storage objects older than 7 days from the call-recordings bucket
  delete from storage.objects
  where bucket_id = 'call-recordings'
    and created_at < now() - interval '7 days';

  -- Null out the recording_url on calls whose recordings have expired
  update public.calls
    set recording_url = null
    where recording_url is not null
      and created_at < now() - interval '7 days';
end;
$$ language plpgsql security definer;

-- Schedule nightly at 03:00 UTC. Safe to re-run.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'cleanup-recordings') then
    perform cron.unschedule('cleanup-recordings');
  end if;
  perform cron.schedule('cleanup-recordings', '0 3 * * *', 'select cleanup_old_recordings()');
end $$;

-- =============================================================
-- Lead-source integrations (Google Sheets, HubSpot, Pipedrive)
-- =============================================================

create table if not exists public.lead_sources (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  provider text not null check (provider in ('google_sheets', 'hubspot', 'pipedrive')),
  display_name text not null,
  credentials_ref text not null,
  config jsonb default '{}' not null,
  field_mapping jsonb default '{}' not null,
  webhook_token text unique not null,
  webhook_secret text not null,
  is_active boolean default true,
  polling_enabled boolean default true,
  poll_interval_secs integer default 300,
  call_window jsonb default '{"tz":"UTC","days":[1,2,3,4,5],"start":"09:00","end":"18:00"}'::jsonb,
  concurrency_cap integer default 3,
  last_synced_at timestamptz,
  last_error text,
  consecutive_errors integer default 0,
  status text default 'ok' check (status in ('ok','needs_reauth','error','paused')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_lead_sources_user_id on public.lead_sources(user_id);
create index if not exists idx_lead_sources_webhook_token on public.lead_sources(webhook_token);
create index if not exists idx_lead_sources_active_poll on public.lead_sources(is_active, polling_enabled, last_synced_at)
  where is_active and polling_enabled;

alter table public.lead_sources enable row level security;

create policy "Users can manage own lead sources" on public.lead_sources
  for all using (auth.uid() = user_id);

create policy "Service role full access lead sources" on public.lead_sources
  for all using (auth.role() = 'service_role');

create table if not exists public.leads (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  lead_source_id uuid references public.lead_sources(id) on delete cascade not null,
  external_id text not null,
  phone text,
  name text,
  email text,
  raw_fields jsonb default '{}' not null,
  status text default 'new' check (status in ('new','queued','calling','called','failed','do_not_call','expired')),
  attempts integer default 0,
  max_attempts integer default 3,
  next_retry_at timestamptz,
  last_called_at timestamptz,
  outcome_code text,
  locked_at timestamptz,
  locked_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (lead_source_id, external_id)
);

create index if not exists idx_leads_user_status_retry on public.leads(user_id, status, next_retry_at);
create index if not exists idx_leads_source on public.leads(lead_source_id);
create index if not exists idx_leads_phone on public.leads(phone);

alter table public.leads enable row level security;

create policy "Users can manage own leads" on public.leads
  for all using (auth.uid() = user_id);

create policy "Service role full access leads" on public.leads
  for all using (auth.role() = 'service_role');

create table if not exists public.call_outcomes (
  call_id uuid primary key references public.calls(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  outcome_code text not null,
  sentiment text check (sentiment in ('positive','neutral','negative')),
  captured_fields jsonb default '{}' not null,
  summary text,
  follow_up_at timestamptz,
  classifier_model text,
  classifier_confidence numeric,
  classifier_raw jsonb,
  writeback_status text default 'pending' check (writeback_status in ('pending','done','failed','skipped')),
  writeback_attempts integer default 0,
  writeback_last_error text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_call_outcomes_lead on public.call_outcomes(lead_id);
create index if not exists idx_call_outcomes_writeback on public.call_outcomes(writeback_status)
  where writeback_status in ('pending','failed');

alter table public.call_outcomes enable row level security;

create policy "Users can read own call outcomes" on public.call_outcomes
  for select using (
    exists (select 1 from public.calls c where c.id = call_outcomes.call_id and c.user_id = auth.uid())
  );

create policy "Service role full access call outcomes" on public.call_outcomes
  for all using (auth.role() = 'service_role');

create table if not exists public.lead_source_sync_log (
  id uuid default gen_random_uuid() primary key,
  lead_source_id uuid references public.lead_sources(id) on delete cascade not null,
  started_at timestamptz default now(),
  finished_at timestamptz,
  trigger text check (trigger in ('cron','webhook','manual')),
  leads_found integer default 0,
  leads_new integer default 0,
  leads_skipped integer default 0,
  error text,
  http_status integer
);

create index if not exists idx_sync_log_source on public.lead_source_sync_log(lead_source_id, started_at desc);

alter table public.lead_source_sync_log enable row level security;

create policy "Users can read own sync logs" on public.lead_source_sync_log
  for select using (
    exists (select 1 from public.lead_sources ls where ls.id = lead_source_sync_log.lead_source_id and ls.user_id = auth.uid())
  );

create policy "Service role full access sync logs" on public.lead_source_sync_log
  for all using (auth.role() = 'service_role');

create table if not exists public.lead_source_webhook_seen (
  lead_source_id uuid references public.lead_sources(id) on delete cascade not null,
  event_hash text not null,
  seen_at timestamptz default now(),
  primary key (lead_source_id, event_hash)
);

create index if not exists idx_webhook_seen_ttl on public.lead_source_webhook_seen(seen_at);

alter table public.lead_source_webhook_seen enable row level security;

create policy "Service role full access webhook seen" on public.lead_source_webhook_seen
  for all using (auth.role() = 'service_role');

-- Extend existing calls table with lead linkage and denormalized outcome
alter table public.calls add column if not exists lead_id uuid references public.leads(id) on delete set null;
alter table public.calls add column if not exists outcome_code text;
create index if not exists idx_calls_lead_id on public.calls(lead_id);

-- Cron secret is stored in user_settings.settings.system.cron_secret (service-role only).
-- The three cron jobs below POST to the dashboard with a bearer token the app verifies.
-- Set the dashboard base URL and cron bearer in the `system` key on any service-role row,
-- or override here via a DO block in your environment.

create or replace function _lead_source_cron_config() returns table(base_url text, bearer text) as $$
  select
    coalesce(current_setting('app.dashboard_base_url', true), ''),
    coalesce(current_setting('app.cron_bearer', true), '')
$$ language sql stable;

create or replace function cleanup_webhook_seen() returns void as $$
begin
  delete from public.lead_source_webhook_seen where seen_at < now() - interval '10 minutes';
end;
$$ language plpgsql security definer;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'poll-lead-sources') then
    perform cron.unschedule('poll-lead-sources');
  end if;
  if exists (select 1 from cron.job where jobname = 'classify-pending-calls') then
    perform cron.unschedule('classify-pending-calls');
  end if;
  if exists (select 1 from cron.job where jobname = 'retry-writebacks') then
    perform cron.unschedule('retry-writebacks');
  end if;
  if exists (select 1 from cron.job where jobname = 'cleanup-webhook-seen') then
    perform cron.unschedule('cleanup-webhook-seen');
  end if;

  -- Poll every 5 minutes
  perform cron.schedule(
    'poll-lead-sources',
    '*/5 * * * *',
    $job$
      select net.http_post(
        url := current_setting('app.dashboard_base_url', true) || '/api/cron/poll-lead-sources',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || current_setting('app.cron_bearer', true),
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
      );
    $job$
  );

  -- Classify completed calls every minute
  perform cron.schedule(
    'classify-pending-calls',
    '* * * * *',
    $job$
      select net.http_post(
        url := current_setting('app.dashboard_base_url', true) || '/api/cron/classify-pending-calls',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || current_setting('app.cron_bearer', true),
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
      );
    $job$
  );

  -- Retry failed write-backs every 5 minutes
  perform cron.schedule(
    'retry-writebacks',
    '*/5 * * * *',
    $job$
      select net.http_post(
        url := current_setting('app.dashboard_base_url', true) || '/api/cron/retry-writebacks',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || current_setting('app.cron_bearer', true),
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
      );
    $job$
  );

  -- Clean dedupe table every 10 minutes
  perform cron.schedule(
    'cleanup-webhook-seen',
    '*/10 * * * *',
    'select cleanup_webhook_seen()'
  );
end $$;
