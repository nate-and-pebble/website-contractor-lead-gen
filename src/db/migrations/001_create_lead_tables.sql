-- 001_create_lead_tables.sql
-- Creates the core lead-gen tables: contacts, raw_leads, zoominfo_leads, contact_research
-- Order: contacts first (referenced by others), then raw_leads, zoominfo_leads, contact_research

-- ============================================================================
-- Helper: updated_at trigger function (reusable)
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================================
-- 1. contacts
-- ============================================================================
create table if not exists public.contacts (
  id               uuid        primary key default gen_random_uuid(),
  first_name       text        not null,
  last_name        text        not null,
  email            text,
  phone            text,
  title            text,
  company          text,
  status           text        not null default 'new',
  quality_score    int,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger contacts_updated_at
  before update on public.contacts
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 2. raw_leads
-- ============================================================================
create table if not exists public.raw_leads (
  id                       uuid        primary key default gen_random_uuid(),
  source                   text        not null,
  source_url               text,
  source_id                text,
  name                     text,
  email                    text,
  title                    text,
  company                  text,
  raw_data                 jsonb       not null default '{}'::jsonb,
  found_via                text,
  status                   text        not null default 'pending',
  rejection_reason         text,
  promoted_to_contact_id   uuid        references public.contacts(id),
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),

  unique (source, source_id)
);

create trigger raw_leads_updated_at
  before update on public.raw_leads
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 3. zoominfo_leads
-- ============================================================================
create table if not exists public.zoominfo_leads (
  id                    uuid        primary key default gen_random_uuid(),
  contact_id            uuid        not null references public.contacts(id),
  zoominfo_contact_id   text,
  profile_url           text,
  direct_email          text,
  direct_phone          text,
  mobile_phone          text,
  work_phone            text,
  title                 text,
  seniority             text,
  company_name          text,
  company_industry      text,
  company_size          text,
  company_location      text,
  employment_history    jsonb,
  intent_signals        jsonb,
  technographics        jsonb,
  verification_status   text,
  raw_data              jsonb,
  fetched_at            timestamptz not null default now(),
  created_at            timestamptz not null default now()
);

-- ============================================================================
-- 4. contact_research
-- ============================================================================
create table if not exists public.contact_research (
  id              uuid        primary key default gen_random_uuid(),
  contact_id      uuid        not null unique references public.contacts(id),
  summary         text,
  research_data   jsonb       not null default '{}'::jsonb,
  researched_at   timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger contact_research_updated_at
  before update on public.contact_research
  for each row execute function public.set_updated_at();
