-- 筆順描字本: 包打聽 (every 俠客 at a glance), 捎信 (letters with gifts) and the one 管理員.
-- Run once in the Supabase SQL editor after schema.sql (Dashboard → SQL Editor → New query → paste → Run).
-- Running it again is safe.
--
-- To make yourself the 管理員 afterwards (there can be only one), run with your 江湖名字:
--   update public.profiles set is_admin = true where alias = '你的江湖名字';
--
-- Like profiles, the letters table is closed (RLS on, no policies); the page reaches it only through
-- the functions below, each of which checks the caller's passcode first.

alter table public.profiles add column if not exists is_admin boolean not null default false;
create unique index if not exists profiles_one_admin on public.profiles (is_admin) where is_admin;

create table if not exists public.letters (
  id         bigserial primary key,
  to_alias   text not null references public.profiles (alias) on delete cascade,
  from_alias text not null,
  body       jsonb not null,
  created_at timestamptz not null default now(),
  claimed_at timestamptz
);
alter table public.letters enable row level security;
create index if not exists letters_unclaimed on public.letters (to_alias) where claimed_at is null;

-- The caller's profile row, or an error when the alias or passcode is wrong. Internal only.
create or replace function public.hero_check(p_alias text, p_pass text)
returns public.profiles
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  r public.profiles;
begin
  select * into r from public.profiles where alias = lower(trim(p_alias));
  if not found or r.pass_hash <> crypt(p_pass, r.pass_hash) then
    raise exception 'wrong passcode' using errcode = '28P01';
  end if;
  return r;
end;
$$;

-- As in schema.sql, now also telling the page whether this 俠客 is the 管理員.
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
  return jsonb_build_object('data', r.data, 'updated_at', r.updated_at, 'admin', r.is_admin);
end;
$$;

-- 包打聽: name, gender, experience, money, worn gear and 稱號 of every 俠客, most recently active first.
create or replace function public.hero_list(p_alias text, p_pass text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform public.hero_check(p_alias, p_pass);
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'alias', alias,
      'admin', is_admin,
      'gender', data -> 'settings' -> 'gender',
      'xp', data -> 'purse' -> 'xp',
      'taels', data -> 'purse' -> 'taels',
      'ingots', data -> 'purse' -> 'ingots',
      'gear', data -> 'purse' -> 'gear',
      'honor', data -> 'purse' -> 'honor',
      'customHonor', data -> 'purse' -> 'customHonor',
      'updated_at', updated_at
    ) order by updated_at desc)
    from public.profiles
  ), '[]'::jsonb);
end;
$$;

-- 捎信: body = { text, taels, ingots, items: [item ids], gender?, honor? }. The sender's page takes the
-- gifts out of its own purse once this succeeds. Only the 管理員 may set a gender or grant a 稱號.
create or replace function public.letter_send(p_alias text, p_pass text, p_to text, p_body jsonb)
returns bigint
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  r public.profiles;
  t text := lower(trim(p_to));
  new_id bigint;
begin
  r := public.hero_check(p_alias, p_pass);
  if t = r.alias or not exists (select 1 from public.profiles where alias = t) then
    raise exception 'no such hero' using errcode = '22023';
  end if;
  if length(coalesce(p_body ->> 'text', '')) > 200 or length(coalesce(p_body ->> 'honor', '')) > 12 then
    raise exception 'letter too long' using errcode = '22023';
  end if;
  if (p_body ? 'gender' or p_body ? 'honor') and not r.is_admin then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  insert into public.letters (to_alias, from_alias, body) values (t, r.alias, p_body) returning id into new_id;
  return new_id;
end;
$$;

-- The caller's unread letters, marked read in the same step so a gift is never received twice.
create or replace function public.letter_inbox(p_alias text, p_pass text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  r public.profiles;
  out jsonb;
begin
  r := public.hero_check(p_alias, p_pass);
  with claimed as (
    update public.letters set claimed_at = now()
    where to_alias = r.alias and claimed_at is null
    returning id, from_alias, body, created_at
  )
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'from', from_alias, 'body', body, 'at', created_at) order by created_at), '[]'::jsonb)
  into out from claimed;
  return out;
end;
$$;

-- 逐出江湖: the 管理員 removes a 俠客 for good (their letters go with them). Cannot be undone.
create or replace function public.hero_delete(p_alias text, p_pass text, p_target text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  r public.profiles;
  t text := lower(trim(p_target));
begin
  r := public.hero_check(p_alias, p_pass);
  if not r.is_admin then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if t = r.alias then
    raise exception 'cannot remove yourself' using errcode = '22023';
  end if;
  delete from public.profiles where alias = t;
  return found;
end;
$$;

revoke all on public.letters from anon, authenticated;
revoke execute on function public.hero_check(text, text) from public, anon, authenticated;
grant execute on function public.profile_load(text, text) to anon;
grant execute on function public.hero_list(text, text) to anon;
grant execute on function public.letter_send(text, text, text, jsonb) to anon;
grant execute on function public.letter_inbox(text, text) to anon;
grant execute on function public.hero_delete(text, text, text) to anon;
