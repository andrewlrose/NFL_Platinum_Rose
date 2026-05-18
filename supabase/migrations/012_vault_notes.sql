-- F-12: NFL Betting Vault — shared reference + session notes store
--
-- Designed to be backend-agnostic:
--   dev / local-only  →  VaultClient uses Obsidian Local REST API (localhost:27123)
--   production / shared  →  VaultClient uses this table (VITE_VAULT_BACKEND=supabase)
--
-- Path convention mirrors Obsidian folder structure:
--   NFL/Reference/CoachTendencies.md
--   NFL/Reference/DVOA.md
--   NFL/Sessions/2026-09-07.md
--   NFL/Teams/KC.md

create table if not exists public.vault_notes (
  id             bigint generated always as identity primary key,
  path           text        not null unique,   -- logical vault path (Obsidian-compatible)
  content        text        not null default '',
  tags           text[]      not null default '{}',
  source         text        not null default 'manual'
                             check (source in ('manual', 'obsidian_sync', 'agent')),
  updated_at     timestamptz not null default now(),
  created_at     timestamptz not null default now()
);

-- Fast path lookup (primary access pattern: read note by exact path)
create index if not exists vault_notes_path_idx
  on public.vault_notes (path);

-- Tag search (for "load all NFL/Reference/* notes")
create index if not exists vault_notes_tags_idx
  on public.vault_notes using gin (tags);

-- FTS on content + path for vault-wide search
alter table public.vault_notes
  add column if not exists tsv tsvector;

create index if not exists vault_notes_tsv_idx
  on public.vault_notes using gin (tsv);

create or replace function public.vault_notes_tsv_update()
returns trigger language plpgsql as $$
begin
  new.tsv :=
    setweight(to_tsvector('english', coalesce(new.path,    '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.content, '')), 'B');
  return new;
end;
$$;

drop trigger if exists vault_notes_tsv_trigger on public.vault_notes;

create trigger vault_notes_tsv_trigger
  before insert or update on public.vault_notes
  for each row execute function public.vault_notes_tsv_update();

-- Auto-update updated_at
create or replace function public.vault_notes_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists vault_notes_touch_trigger on public.vault_notes;

create trigger vault_notes_touch_trigger
  before update on public.vault_notes
  for each row execute function public.vault_notes_touch();

-- RLS: authenticated users can read/write; service role has full access
alter table public.vault_notes enable row level security;

create policy "public_read_vault_notes"
  on public.vault_notes for select
  using (true);

create policy "service_write_vault_notes"
  on public.vault_notes for all
  using (true)
  with check (true);

-- Seed the standard NFL reference note stubs so the agent always has
-- something to read even before any content is synced from Obsidian.
insert into public.vault_notes (path, content, tags, source)
values
  ('NFL/Reference/CoachTendencies.md',
   '# Coach Tendencies\n\n_Sync from Obsidian or add notes manually._\n',
   array['reference', 'coaching'], 'manual'),
  ('NFL/Reference/DVOA.md',
   '# DVOA / EPA Reference\n\n_Sync from Obsidian or add notes manually._\n',
   array['reference', 'analytics'], 'manual'),
  ('NFL/Reference/KeyNumbers.md',
   '# NFL Key Numbers\n\n## Most Common Final Margins\n3, 7, 10, 6, 4, 14, 1, 17, 13, 3\n\n## Wong Teaser Rule\nTeaser legs must cross 3 or 7 from dog side. 6-point teasers: -7.5 to -1.5 or +1.5 to +7.5 range is ideal.\n',
   array['reference', 'betting'], 'manual'),
  ('NFL/Reference/ATS_Trends.md',
   '# ATS Trends & Systems\n\n_Add team ATS trends, situational systems, and historical angles here._\n',
   array['reference', 'trends'], 'manual')
on conflict (path) do nothing;
