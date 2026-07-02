-- MIGRACAO CONSOLIDADA (compatível com robo_config.id bigint)
create extension if not exists "pgcrypto";

create table if not exists public.robo_config (
  id bigserial primary key
);

alter table public.robo_config
  add column if not exists intervalo_minutos integer not null default 15,
  add column if not exists tentativas integer not null default 3,
  add column if not exists notificacoes boolean not null default true,
  add column if not exists modo_seguro boolean not null default true,
  add column if not exists ambiente_execucao text not null default 'backend_fastapi',
  add column if not exists trigger_endpoint text not null default '/api/v1/trigger-rpa',
  add column if not exists rpa_service_url text not null default '',
  add column if not exists timeout_segundos integer not null default 120,
  add column if not exists operadoras jsonb not null default '[]'::jsonb,
  add column if not exists supabase_url text not null default '',
  add column if not exists supabase_service_role_key text not null default '',
  add column if not exists supabase_bucket_boletos text not null default 'boletos',
  add column if not exists log_nivel text not null default 'INFO',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

insert into public.robo_config (
  intervalo_minutos, tentativas, notificacoes, modo_seguro,
  ambiente_execucao, trigger_endpoint, rpa_service_url, timeout_segundos,
  operadoras, supabase_url, supabase_service_role_key, supabase_bucket_boletos, log_nivel
)
select
  15, 3, true, true,
  'backend_fastapi', '/api/v1/trigger-rpa', '', 120,
  '[]'::jsonb, '', '', 'boletos', 'INFO'
where not exists (select 1 from public.robo_config);

create table if not exists public.robo_execucoes (
  id uuid primary key default gen_random_uuid(),
  processo text not null,
  inicio timestamptz not null default now(),
  duracao text,
  status text not null,
  resultado jsonb,
  created_at timestamptz not null default now()
);
