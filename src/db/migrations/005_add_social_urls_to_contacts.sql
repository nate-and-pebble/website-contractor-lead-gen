-- 005_add_social_urls_to_contacts.sql
-- Adds linkedin_url and instagram_url columns to contacts table
-- so they can be edited directly like email/phone.

ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS linkedin_url text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS instagram_url text;
