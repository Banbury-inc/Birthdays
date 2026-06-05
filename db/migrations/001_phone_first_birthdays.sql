create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  cognito_sub text not null unique,
  phone_number text not null unique,
  phone_hash text not null unique,
  display_name text not null,
  birthday date not null,
  birthday_confirmed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists contact_syncs (
  owner_user_id uuid not null references users(id) on delete cascade,
  contact_phone_hash text not null,
  local_display_name text not null,
  synced_at timestamptz not null default now(),
  primary key (owner_user_id, contact_phone_hash)
);

create index if not exists contact_syncs_contact_phone_hash_idx
  on contact_syncs (contact_phone_hash);

create or replace view contact_matches as
select
  synced.owner_user_id,
  matched.id as matched_user_id,
  matched.phone_number,
  matched.display_name,
  matched.birthday,
  synced.local_display_name,
  synced.synced_at
from contact_syncs synced
join users matched on matched.phone_hash = synced.contact_phone_hash
where matched.id <> synced.owner_user_id;
