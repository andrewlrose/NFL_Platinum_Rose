-- Migration 018: add public read policy for player_injuries
-- Without this, the frontend anon key returns [] silently (RLS blocks it)

create policy "public_read_player_injuries"
  on public.player_injuries
  for select
  using (true);
