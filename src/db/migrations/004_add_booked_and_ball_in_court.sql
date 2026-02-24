-- 004_add_booked_and_ball_in_court.sql
-- Adds ball_in_court tracking for booked contacts:
--   ball_in_court: 'mine' | 'theirs' | 'scheduled'
--   ball_in_court_note: short description of what's next ("Send proposal", "Demo call")

alter table public.contacts
  add column if not exists ball_in_court text,
  add column if not exists ball_in_court_note text;
