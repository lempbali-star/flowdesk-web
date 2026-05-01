-- FlowDesk 雲端資料儲存表
-- 請在 FlowDesk 專用 Supabase 專案的 SQL Editor 執行一次。

create extension if not exists pgcrypto;

create table if not exists public.flowdesk_workspace_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  data_key text not null,
  payload jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, data_key)
);

create or replace function public.set_flowdesk_workspace_data_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_flowdesk_workspace_data_updated_at on public.flowdesk_workspace_data;
create trigger trg_flowdesk_workspace_data_updated_at
before update on public.flowdesk_workspace_data
for each row
execute function public.set_flowdesk_workspace_data_updated_at();

alter table public.flowdesk_workspace_data enable row level security;

drop policy if exists "flowdesk_workspace_data_select_own" on public.flowdesk_workspace_data;
drop policy if exists "flowdesk_workspace_data_insert_own" on public.flowdesk_workspace_data;
drop policy if exists "flowdesk_workspace_data_update_own" on public.flowdesk_workspace_data;
drop policy if exists "flowdesk_workspace_data_delete_own" on public.flowdesk_workspace_data;

create policy "flowdesk_workspace_data_select_own"
on public.flowdesk_workspace_data
for select
to authenticated
using (auth.uid() = user_id);

create policy "flowdesk_workspace_data_insert_own"
on public.flowdesk_workspace_data
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "flowdesk_workspace_data_update_own"
on public.flowdesk_workspace_data
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "flowdesk_workspace_data_delete_own"
on public.flowdesk_workspace_data
for delete
to authenticated
using (auth.uid() = user_id);

grant select, insert, update, delete on table public.flowdesk_workspace_data to authenticated;
