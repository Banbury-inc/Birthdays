do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_name = 'users'
      and column_name = 'cognito_sub'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_name = 'users'
      and column_name = 'auth_subject'
  ) then
    alter table users rename column cognito_sub to auth_subject;
  end if;
end $$;

create unique index if not exists users_auth_subject_idx
  on users (auth_subject);
