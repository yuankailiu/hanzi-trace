-- 筆順描字本: cloud profiles keyed by 江湖名字 + 4-digit passcode.
-- Run once in the Supabase SQL editor (Dashboard → SQL Editor → New query → paste → Run).
--
-- The table itself is closed (RLS on, no policies). The page can only reach it through
-- the two functions below, which check the passcode server-side against a bcrypt hash.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.profiles (
  alias      text primary key,
  pass_hash  text not null,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Returns {data, updated_at}, or null when the alias does not exist yet.
create or replace function public.profile_load(p_alias text, p_pass text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  r public.profiles;
begin
  select * into r from public.profiles where alias = lower(trim(p_alias));
  if not found then
    return null;
  end if;
  if r.pass_hash <> crypt(p_pass, r.pass_hash) then
    raise exception 'wrong passcode' using errcode = '28P01';
  end if;
  return jsonb_build_object('data', r.data, 'updated_at', r.updated_at);
end;
$$;

-- Creates the profile on first save; afterwards the passcode must match.
create or replace function public.profile_save(p_alias text, p_pass text, p_data jsonb)
returns timestamptz
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  r public.profiles;
  a text := lower(trim(p_alias));
begin
  if length(a) = 0 or length(a) > 24 or p_pass !~ '^[0-9]{4}$' then
    raise exception 'bad alias or passcode' using errcode = '22023';
  end if;
  select * into r from public.profiles where alias = a;
  if not found then
    insert into public.profiles (alias, pass_hash, data)
    values (a, crypt(p_pass, gen_salt('bf')), p_data);
    return now();
  end if;
  if r.pass_hash <> crypt(p_pass, r.pass_hash) then
    raise exception 'wrong passcode' using errcode = '28P01';
  end if;
  update public.profiles set data = p_data, updated_at = now() where alias = a;
  return now();
end;
$$;

revoke all on public.profiles from anon, authenticated;
grant execute on function public.profile_load(text, text) to anon;
grant execute on function public.profile_save(text, text, jsonb) to anon;
