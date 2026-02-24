-- 002_add_disposition_to_contacts.sql
-- Adds disposition column to contacts: tracks whether a "ready" contact
-- is assigned to a campaign or a call queue.
-- Values: null (unassigned), 'campaign', 'call'

alter table public.contacts
  add column if not exists disposition text;
