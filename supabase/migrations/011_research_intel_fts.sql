-- DS-5 follow-on: F-11 Phase 2 — article body storage + full-text search
--
-- Adds a `body` column to research_intel_notes for storing scraped article text
-- (up to 4000 chars). Adds a tsvector column + GIN index for Postgres FTS.
-- The ingest agent will populate body + tsv after this migration is applied.

alter table public.research_intel_notes
  add column if not exists body text,
  add column if not exists tsv  tsvector;

-- GIN index for fast full-text search over title + summary + body
create index if not exists research_intel_notes_tsv_idx
  on public.research_intel_notes using gin (tsv);

-- Trigger to keep tsv auto-updated on insert/update
create or replace function public.research_intel_notes_tsv_update()
returns trigger language plpgsql as $$
begin
  new.tsv :=
    setweight(to_tsvector('english', coalesce(new.title,   '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.summary, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.body,    '')), 'C');
  return new;
end;
$$;

drop trigger if exists research_intel_notes_tsv_trigger
  on public.research_intel_notes;

create trigger research_intel_notes_tsv_trigger
  before insert or update on public.research_intel_notes
  for each row execute function public.research_intel_notes_tsv_update();

-- Back-fill tsv for existing rows (title + summary only; body is null today)
update public.research_intel_notes
set tsv =
  setweight(to_tsvector('english', coalesce(title,   '')), 'A') ||
  setweight(to_tsvector('english', coalesce(summary, '')), 'B')
where tsv is null;
