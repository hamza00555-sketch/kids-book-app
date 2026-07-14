-- Kids Book AR — initial schema.
-- Run in the Supabase SQL editor (or supabase db push) on a fresh project.

create table if not exists public.books (
  id text primary key,
  title text not null,
  description text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  cover_url text,
  mind_url text,
  mind_compiled_at timestamptz,
  config jsonb not null default '{}'::jsonb,
  total_views integer not null default 0,
  last_viewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.book_pages (
  id text primary key,
  book_id text not null references public.books (id) on delete cascade,
  target_index integer not null,
  title text not null,
  target_image_url text not null,
  model_url text not null,
  audio_url text,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists book_pages_book_idx on public.book_pages (book_id, target_index);

create table if not exists public.scans (
  id bigint generated always as identity primary key,
  book_id text not null references public.books (id) on delete cascade,
  device_type text not null default 'unknown',
  os text not null default 'unknown',
  browser text not null default 'unknown',
  referrer text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists scans_book_idx on public.scans (book_id, created_at desc);

-- RLS on, and deliberately NO anon policies: browser keys can never touch data.
-- All access goes through the app's API routes using the secret key.
alter table public.books enable row level security;
alter table public.book_pages enable row level security;
alter table public.scans enable row level security;

-- Record a view and bump the denormalized counters in one transaction.
create or replace function public.record_scan(
  p_book_id text,
  p_device_type text,
  p_os text,
  p_browser text,
  p_referrer text default null,
  p_user_agent text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into scans (book_id, device_type, os, browser, referrer, user_agent)
  values (p_book_id, p_device_type, p_os, p_browser, p_referrer, p_user_agent);

  update books
  set total_views = total_views + 1,
      last_viewed_at = now()
  where id = p_book_id;
end;
$$;

-- Public bucket for all uploaded assets (reference images, GLB models, audio, .mind).
insert into storage.buckets (id, name, public)
values ('book-assets', 'book-assets', true)
on conflict (id) do nothing;
