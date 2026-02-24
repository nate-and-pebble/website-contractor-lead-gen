-- 003_add_call_log_and_follow_up.sql
-- Adds call tracking: a call_log table for logging call outcomes,
-- and a follow_up_at timestamp on contacts for snooze/scheduling.

-- Call log: one row per call attempt
create table if not exists public.call_log (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  outcome text not null,  -- no_answer, voicemail, not_interested, follow_up, moved_to_campaign, booked_meeting
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_call_log_contact_id on public.call_log(contact_id);

-- Follow-up scheduling on contacts
alter table public.contacts
  add column if not exists follow_up_at timestamptz;
