-- 筆順描字本: 包打聽 (every 俠客 at a glance) and 捎信 (letters with gifts between 俠客).
-- Run once in the Supabase SQL editor after schema.sql (Dashboard → SQL Editor → New query → paste → Run).
--
-- Like profiles, the letters table is closed (RLS on, no policies); the page reaches it only through
-- the functions below, each of which checks the caller's passcode first.

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

-- 包打聽: name, gender, experience, money and worn gear of every 俠客, most recently active first.
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
      'gender', data -> 'settings' -> 'gender',
      'xp', data -> 'purse' -> 'xp',
      'taels', data -> 'purse' -> 'taels',
      'ingots', data -> 'purse' -> 'ingots',
      'gear', data -> 'purse' -> 'gear',
      'updated_at', updated_at
    ) order by updated_at desc)
    from public.profiles
  ), '[]'::jsonb);
end;
$$;

-- 捎信: body = { text, taels, ingots, items: [item ids], gender? }. The sender's page takes the gifts
-- out of its own purse once this succeeds. Only a 雌雄難辨 (genderLock 'any') 俠客 may set a gender.
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
  if length(coalesce(p_body ->> 'text', '')) > 200 then
    raise exception 'letter too long' using errcode = '22023';
  end if;
  if p_body ? 'gender' and coalesce(r.data -> 'settings' ->> 'genderLock', '') <> 'any' then
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

revoke all on public.letters from anon, authenticated;
revoke execute on function public.hero_check(text, text) from public, anon, authenticated;
grant execute on function public.hero_list(text, text) to anon;
grant execute on function public.letter_send(text, text, text, jsonb) to anon;
grant execute on function public.letter_inbox(text, text) to anon;
