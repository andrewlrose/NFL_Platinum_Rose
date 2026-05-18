-- F-13: X/Twitter sharp-account tweet ingestion
--
-- Stores tweets from curated sharp NFL accounts fetched via RSSHub.
-- url_hash deduplicates tweets across runs. FTS tsvector on tweet text.

create table if not exists public.x_sharp_tweets (
  id             bigserial primary key,
  tweet_id       text unique,                       -- extracted from RSS item GUID / URL
  author_handle  text       not null,               -- twitter handle (no @)
  author_tier    text       not null default 'sharp', -- 'sharp' | 'analyst' | 'media' | 'creator'
  author_tags    text[]     not null default '{}',  -- tags from sharp-accounts.json
  text           text       not null,               -- full tweet text (up to ~560 chars)
  tweet_url      text       not null,               -- canonical https://x.com/... URL
  url_hash       text       not null unique,        -- sha256 of tweet_url for dedup
  published_at   timestamptz,                       -- when tweet was posted
  captured_at    timestamptz not null default now(),
  tsv            tsvector                           -- auto-populated by trigger below
);

-- Index for per-handle time-series queries
create index if not exists x_sharp_tweets_handle_published_idx
  on public.x_sharp_tweets (author_handle, published_at desc);

-- Index for recent capture window scans
create index if not exists x_sharp_tweets_captured_idx
  on public.x_sharp_tweets (captured_at desc);

-- GIN index for full-text search
create index if not exists x_sharp_tweets_tsv_idx
  on public.x_sharp_tweets using gin (tsv);

-- Auto-update tsv on insert/update
create or replace function public.x_sharp_tweets_tsv_update()
returns trigger language plpgsql as $$
begin
  new.tsv :=
    setweight(to_tsvector('english', coalesce(new.author_handle, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.text, '')), 'A');
  return new;
end;
$$;

drop trigger if exists x_sharp_tweets_tsv_trigger on public.x_sharp_tweets;

create trigger x_sharp_tweets_tsv_trigger
  before insert or update on public.x_sharp_tweets
  for each row execute function public.x_sharp_tweets_tsv_update();

-- RLS: public read, service-role write (ingest agent uses SERVICE_ROLE_KEY)
alter table public.x_sharp_tweets enable row level security;

create policy "public_read_x_sharp_tweets"
  on public.x_sharp_tweets for select
  using (true);
